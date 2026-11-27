"""Xuất mạng nơ-ron (data/nn_<ngôn ngữ>_<tag>.pt) cho web: ghép vào web/public/model/<ngôn ngữ>.json dưới khoá "net".
Phần LDA cũ trong file vẫn giữ: các từ người dùng tự dạy (web/src/custom.js) so sánh trong "không gian" của LDA,
nên mẫu đã dạy vẫn dùng được.

- Gộp BatchNorm vào lớp trước nó, nén trọng số lớp tuyến tính về 8-bit (mỗi cột một hệ số).
- Chạy lại bằng numpy đúng như web (web/src/net.js) để kiểm tra: kết quả sau khi nén gần như không đổi.
- Ghi tests/fixtures/parity_nn.json: vài mẫu thật (khung 149 số) + xác suất, để web tự kiểm tra khớp Python.
Chạy: uv run python -m nn.export asl --tag final --metrics data/nn_asl_conv_cv_metrics.json
"""
import argparse, base64, csv, json, os

import numpy as np
import torch

from nn.train import ConvNet, Model
from sign.features import F, per_frame

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "..", "web")
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "parity_nn.json")
b64 = lambda a: base64.b64encode(np.ascontiguousarray(a, "<f4").tobytes()).decode()
t2n = lambda t: t.detach().cpu().double().numpy()


def lin(W, b):
    """W (vào, ra), b (ra) -> 8-bit, mỗi cột một hệ số tỉ lệ. Trả về (bản cho web, W sau khi nén để kiểm tra)."""
    scale = np.abs(W).max(0) / 127
    scale[scale == 0] = 1
    q = np.round(W / scale).astype(np.int8)
    return {"W": base64.b64encode(q.tobytes()).decode(), "scale": b64(scale), "b": b64(b), "shape": list(W.shape)}, q * scale


def bn_fold(bn):
    k = t2n(bn.weight) / np.sqrt(t2n(bn.running_var) + bn.eps)
    return k, t2n(bn.bias) - t2n(bn.running_mean) * k


def convert(model, L):
    """Mạng PyTorch -> (dict cho web, dict số thực để numpy chạy lại)."""
    net = model.net
    ref, out = {}, {"L": L, "mean": b64(t2n(model.mean)), "std": b64(t2n(model.std))}
    ref["mean"], ref["std"] = t2n(model.mean), t2n(model.std)

    def linear(layer, k=None, b0=None):
        W = t2n(layer.weight).T
        b = t2n(layer.bias) if layer.bias is not None else np.zeros(W.shape[1])
        if k is not None:
            W, b = W * k, b * k + b0
        web, Wq = lin(W, b)
        return web, (Wq, b)

    k, b0 = bn_fold(net.bn0)
    out["stem"], ref["stem"] = linear(net.stem, k, b0 - 0)
    out["blocks"], ref["blocks"] = [], []
    for blk in net.blocks:
        if hasattr(blk, "dw"):
            k, b0 = bn_fold(blk.bn)
            dw = t2n(blk.dw.weight)[:, 0, :] * k[:, None]
            dwb = t2n(blk.dw.bias) * k + b0
            fc1, r1 = linear(blk.fc1)
            fc2, r2 = linear(blk.fc2)
            eca = t2n(blk.eca.conv.weight).ravel()
            out["blocks"].append({"conv": {"fc1": fc1, "fc2": fc2, "dw": b64(dw), "dwb": b64(dwb), "k": int(dw.shape[1]), "eca": b64(eca)}})
            ref["blocks"].append(("conv", r1, r2, dw, dwb, eca))
        else:
            parts = {n: linear(getattr(blk, n)) for n in ["qkv", "out", "ff1", "ff2"]}
            ln = lambda l: {"g": b64(t2n(l.weight)), "b": b64(t2n(l.bias))}
            out["blocks"].append({"attn": {**{n: p[0] for n, p in parts.items()}, "ln1": ln(blk.ln1), "ln2": ln(blk.ln2), "heads": blk.heads}})
            ref["blocks"].append(("attn", {n: p[1] for n, p in parts.items()}, (t2n(blk.ln1.weight), t2n(blk.ln1.bias)),
                                  (t2n(blk.ln2.weight), t2n(blk.ln2.bias)), blk.heads))
    out["top"], ref["top"] = linear(net.top)
    out["head"], ref["head"] = linear(net.head)
    return out, ref


def net_input(frames, L):
    """Giống hệt web/src/net.js netInput: bỏ khung không tay ở đầu/cuối, L khung đều, 184 số + tốc độ."""
    frames = np.asarray(frames, np.float64)
    has = frames[:, -2:].any(1)
    if has.any():
        i = np.flatnonzero(has)
        frames = frames[i[0]: i[-1] + 1]
    n = len(frames)
    pos = np.array([n - 1 if t == L - 1 else t * (n - 1) / (L - 1) for t in range(L)])
    lo = np.floor(pos).astype(int)
    hi = np.minimum(lo + 1, n - 1)
    w = (pos - lo)[:, None]
    f = per_frame((frames[lo] * (1 - w) + frames[hi] * w).astype(np.float32)).astype(np.float64)
    return np.concatenate([f, np.vstack([np.zeros((1, f.shape[1])), np.diff(f, axis=0)])], 1)


def forward(ref, frames, L):
    """Chạy mạng bằng numpy, y hệt web/src/net.js (để kiểm tra bản xuất)."""
    silu = lambda z: z / (1 + np.exp(-z))
    ln = lambda z, g, b: (z - z.mean(1, keepdims=True)) / np.sqrt(z.var(1, keepdims=True) + 1e-5) * g + b
    ap = lambda z, p: z @ p[0] + p[1]
    x = ap((net_input(frames, L) - ref["mean"]) / ref["std"], ref["stem"])
    for blk in ref["blocks"]:
        if blk[0] == "conv":
            _, fc1, fc2, dw, dwb, eca = blk
            h = silu(ap(x, fc1))
            k = dw.shape[1]
            hp = np.pad(h, ((k // 2, k // 2), (0, 0)))
            g = np.stack([(hp[t: t + k] * dw.T).sum(0) for t in range(L)]) + dwb
            m = np.pad(g.mean(0), (len(eca) // 2,) * 2)
            gate = 1 / (1 + np.exp(-np.array([(m[c: c + len(eca)] * eca).sum() for c in range(g.shape[1])])))
            x = x + ap(g * gate, fc2)
        else:
            _, p, (g1, b1), (g2, b2), heads = blk
            d = x.shape[1]
            dh = d // heads
            z = ap(ln(x, g1, b1), p["qkv"])
            a = np.zeros((L, d))
            for h in range(heads):
                q, k_, v = (z[:, s * d + h * dh: s * d + (h + 1) * dh] for s in range(3))
                s_ = q @ k_.T / np.sqrt(dh)
                s_ = np.exp(s_ - s_.max(1, keepdims=True))
                a[:, h * dh:(h + 1) * dh] = (s_ / s_.sum(1, keepdims=True)) @ v
            x = x + ap(a, p["out"])
            x = x + ap(silu(ap(ln(x, g2, b2), p["ff1"])), p["ff2"])
    return ap(silu(ap(x, ref["top"])).mean(0), ref["head"])


def main():
    p = argparse.ArgumentParser()
    p.add_argument("lang", nargs="?", default="asl")
    p.add_argument("--tag", default="final")
    p.add_argument("--metrics", required=True)
    a = p.parse_args()
    ck = torch.load(os.path.join(ROOT, "data", f"nn_{a.lang}_{a.tag}.pt"), map_location="cpu", weights_only=False)
    args, labels = ck["args"], ck["labels"]
    n_in = ck["state"]["mean"].numel()
    model = Model(ConvNet(n_in, len(labels), args["dim"], args["kernel"], args["groups"]), ck["state"]["mean"], ck["state"]["std"])
    model.load_state_dict(ck["state"])
    model.eval()
    L = args["L"]
    web, ref = convert(model, L)
    metrics = json.load(open(a.metrics, encoding="utf-8"))

    # kiểm tra trên vài mẫu thật: torch (chưa nén) so với numpy (đã nén, đúng cách web chạy)
    data = os.path.join(ROOT, "data", a.lang)
    rows = list(csv.DictReader(open(os.path.join(data, "labels.csv"), encoding="utf-8")))
    rng = np.random.default_rng(1)
    picks, agree, tried = [], 0, 0
    import nn.train as tr
    from nn.cache import compact
    tr.ARGS = argparse.Namespace(**args)
    for i in rng.permutation(len(rows))[:200]:
        f = np.load(os.path.join(data, "frames", rows[i]["ID_video"] + ".npy"))
        if not (5 <= len(f) <= 90) or not f[:, -2:].any():
            continue
        z = forward(ref, f, L)
        with torch.no_grad():
            c = torch.tensor(compact(f))[None]
            zt = model(tr.inputs(c, torch.tensor([len(c[0])]), "conv", False, 0)).numpy()[0]
        tried += 1
        agree += int(z.argmax() == zt.argmax())
        if len(picks) < 3:
            pr = np.exp(z - z.max())
            picks.append({"frames": f.tolist(), "probs": (pr / pr.sum()).tolist(), "label": rows[i]["Meaning"]})
    print(f"Bản nén (numpy, như web) và bản gốc (torch) đoán cùng từ ở {agree}/{tried} mẫu")
    os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
    json.dump({"L": L, "samples": picks}, open(FIXTURE, "w"))

    path = os.path.join(WEB, "public", "model", f"{a.lang}.json")
    m = json.load(open(path, encoding="utf-8"))
    m["metrics"] = {"lda": m["metrics"].get("lda", m["metrics"]), "net": {k: v for k, v in metrics.items() if k not in ("words_over_40", "args")}}
    m["minProb"] = metrics["threshold"]
    m["net"] = {**web, "labels": labels}
    json.dump(m, open(path, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(labels[:-1], open(os.path.join(WEB, "src", "words", f"{a.lang}.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"Đã xuất {path} ({os.path.getsize(path) / 1e6:.1f} MB), {len(labels) - 1} từ, ngưỡng {metrics['threshold']}")


if __name__ == "__main__":
    main()
