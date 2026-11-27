"""Dạy MẠNG NƠ-RON nhận ký hiệu (thay LDA), chấm điểm trên người lạ giống hệt train.py, xuất cho web.

Khác LDA ở chỗ nào:
- LDA chỉ chia các từ bằng "đường thẳng" trên một vector tóm tắt. Mạng nơ-ron xem cả chuỗi khung (L khung đều nhau),
  học được cử động phức tạp hơn. Kiến trúc học theo lời giải hạng nhất cuộc thi Kaggle "Isolated Sign Language
  Recognition": tích chập theo thời gian + Transformer, thu nhỏ để chạy được trên web.
- Nhân bản dữ liệu ngay trên GPU mỗi lượt học (lật gương, cắt đầu/cuối, xoay, co giãn, tay run, mất tay vài khung).

Dữ liệu: data/<ngôn ngữ>/nn_cache.npz (chạy nn.cache trước).
Chạy:
  uv run python -m nn.train asl --arch conv --folds 0      # thử nhanh trên 1 phần
  uv run python -m nn.train asl --arch conv --folds all    # chấm đủ 5 phần (số báo cáo)
"""
import argparse, collections, json, math, os, sys, time

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as Fn

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from train import MAX_FALSE, MIN_VIDEOS, OTHER, splits  # noqa: E402  (cùng cách chia người lạ với LDA)

dev = "cuda"
MIN_PRECISION = 0.8  # khi app hiện chữ, ít nhất 8/10 lần phải đúng (mạng ít khi dịch bừa nên điều kiện MAX_FALSE quá dễ)
POSE_SWAP = [0, 2, 1, 4, 3, 6, 5]
MIRROR = torch.tensor(POSE_SWAP + list(range(28, 49)) + list(range(7, 28)))


# ---------------- dữ liệu ----------------
def load(lang):
    path = os.path.join(ROOT, "data", lang, "nn_cache.npz") if lang != "vsl" else os.path.join(ROOT, "data", "nn_cache.npz")
    z = np.load(path)
    meaning, signer = z["meaning"], z["signer"]
    counts = collections.Counter(meaning.tolist())
    words = sorted(w for w, n in counts.items() if n >= MIN_VIDEOS and ":" not in w)
    index = {w: i for i, w in enumerate(words)}
    y = np.array([index.get(m, len(words)) for m in meaning.tolist()])
    rows = [{"Signer": s, "Meaning": m} for s, m in zip(signer.tolist(), meaning.tolist())]
    return torch.from_numpy(z["X"]), torch.from_numpy(z["lens"].astype(np.int64)), y, words, rows


def mirror(x):
    """Lật gương: đổi dấu x, đổi bên trái <-> phải (vai, khuỷu, cổ tay, hai bàn tay, ô có tay)."""
    m = MIRROR.to(x.device)
    return torch.cat([-x[..., :49][..., m], x[..., 49:98][..., m], x[..., 98:].flip(-1)], -1)


def resample(x, lens, L, crop):
    """Lấy L khung đều nhau (nội suy tuyến tính, giống sign/features.py). crop: cắt ngẫu nhiên tới 1/8 ở đầu/cuối."""
    B, T, C = x.shape
    n = lens.float()
    a = torch.zeros(B, device=x.device)
    end = n - 1
    if crop:
        m = torch.floor(n / 8) + 1
        a = torch.floor(torch.rand(B, device=x.device) * m)
        b = torch.floor(torch.rand(B, device=x.device) * m)
        end = torch.minimum(torch.maximum(a + 1, n - 1 - b), n - 1)
    u = torch.linspace(0, 1, L, device=x.device).expand(B, L)
    if crop and ARGS.aug == "strong":  # ký nhanh chậm không đều: bẻ cong trục thời gian (vẫn giữ thứ tự)
        u = u + torch.empty(B, 1, device=x.device).uniform_(-0.2, 0.2) * 4 * u * (1 - u)
    pos = a[:, None] + (end - a)[:, None] * u
    lo = pos.floor().long().clamp(0, T - 1)
    hi = torch.minimum(lo + 1, (lens - 1)[:, None])
    w = (pos - lo)[..., None]
    g = lambda i: torch.gather(x, 1, i[..., None].expand(-1, -1, C))
    return g(lo) * (1 - w) + g(hi) * w


def jitter(x, stretch):
    """Xoay ±10°, to nhỏ ±10%, co giãn ngang, tay hơi run, thỉnh thoảng mất tay vài khung (như camera thật)."""
    B, L, _ = x.shape
    d = x.device
    strong = ARGS.aug == "strong"
    U = lambda lo, hi, *shape: torch.empty(B, *shape, device=d).uniform_(lo, hi)
    deg = 15 if strong else 10
    ang = U(-deg, deg, 1, 1) * math.pi / 180
    c, s = torch.cos(ang), torch.sin(ang)
    xs, ys, pr = x[..., :49].clone(), x[..., 49:98].clone(), x[..., 98:].clone()
    if strong:  # mỗi người ký một kiểu: từng bàn tay xoay/to nhỏ quanh cổ tay và dời chỗ một chút
        for k in range(2):
            h = slice(7 + 21 * k, 28 + 21 * k)
            wx, wy = xs[..., 7 + 21 * k: 8 + 21 * k], ys[..., 7 + 21 * k: 8 + 21 * k]
            a_ = U(-15, 15, 1, 1) * math.pi / 180
            ca, sa, sc = torch.cos(a_), torch.sin(a_), U(0.85, 1.15, 1, 1)
            dx, dy = xs[..., h] - wx, ys[..., h] - wy
            xs[..., h] = wx + sc * (ca * dx - sa * dy) + U(-0.15, 0.15, 1, 1)
            ys[..., h] = wy + sc * (sa * dx + ca * dy) + U(-0.15, 0.15, 1, 1)
    nx, ny = c * xs - s * ys, s * xs + c * ys
    k = U(0.8, 1.2, 1, 1) if strong else U(0.9, 1.1, 1, 1)
    nx, ny = nx * k, ny * k
    if strong:  # nghiêng (shear) nhẹ
        nx = nx + U(-0.15, 0.15, 1, 1) * ny
    if stretch:
        nx = nx * torch.empty(B, 1, 1, device=d).uniform_(1 - stretch, 1 + stretch)
    drop = (torch.rand(B, L, 2, device=d) < 0.08) & (torch.rand(B, 1, 1, device=d) < 0.5)
    pr = pr * ~drop
    present = torch.cat([torch.ones(B, L, 7, device=d), pr[..., :1].expand(-1, -1, 21), pr[..., 1:].expand(-1, -1, 21)], -1)
    sd = 0.015 if strong else 0.01
    nx = (nx + torch.randn_like(nx) * sd) * present
    ny = (ny + torch.randn_like(ny) * sd) * present
    return torch.cat([nx, ny, pr], -1)


def per_frame(x):
    """(B,L,100) -> (B,L,184), y hệt sign/features.py per_frame: 7 điểm người, mỗi tay [vị trí, hình dạng], 2 ô có tay."""
    pts = torch.stack([x[..., :49], x[..., 49:98]], -1)
    out = [pts[:, :, :7].flatten(2)]
    for k in range(2):
        h = pts[:, :, 7 + 21 * k: 28 + 21 * k]
        rel = h - h[:, :, :1]
        size = rel[:, :, 9].norm(dim=-1)[..., None, None]
        shape = torch.where(size > 1e-6, rel / size.clamp(min=1e-6), torch.zeros_like(rel))
        out += [h.flatten(2), shape.flatten(2)]
    out.append(x[..., 98:])
    return torch.cat(out, -1)


def inputs(x, lens, arch, train, stretch):
    """Mẫu thô -> đầu vào của mạng. conv: (B,L,368) = 184 số mỗi khung + tốc độ. mlp: (B,2024) = sequence_vector."""
    if train and arch != "none":
        flip = torch.rand(x.shape[0], device=x.device) < 0.5
        x = torch.where(flip[:, None, None], mirror(x), x)
    L = 8 if arch == "mlp" else ARGS.L
    x = resample(x, lens, L, crop=train)
    if train:
        x = jitter(x, stretch)
    f = per_frame(x)
    if arch == "mlp":
        return torch.cat([f.flatten(1), f.mean(1), f.std(1, unbiased=False), f.diff(dim=1).std(1, unbiased=False)], 1)
    return torch.cat([f, torch.cat([torch.zeros_like(f[:, :1]), f.diff(dim=1)], 1)], -1)


# ---------------- mạng ----------------
class ECA(nn.Module):
    """Chú ý theo kênh: trung bình theo thời gian -> tích chập 1 chiều trên các kênh -> sigmoid -> nhân lại."""
    def __init__(s, k=5):
        super().__init__()
        s.conv = nn.Conv1d(1, 1, k, padding=k // 2, bias=False)

    def forward(s, x):  # (B,C,L)
        w = torch.sigmoid(s.conv(x.mean(-1, keepdim=True).transpose(1, 2))).transpose(1, 2)
        return x * w


class ConvBlock(nn.Module):
    def __init__(s, d, k, expand=2, drop=0.2):
        super().__init__()
        e = d * expand
        s.fc1, s.dw, s.bn, s.eca, s.fc2 = nn.Linear(d, e), nn.Conv1d(e, e, k, padding=k // 2, groups=e), nn.BatchNorm1d(e), ECA(), nn.Linear(e, d)
        s.drop = drop

    def forward(s, x):  # (B,L,d)
        h = Fn.silu(s.fc1(x)).transpose(1, 2)
        h = s.fc2(s.eca(s.bn(s.dw(h))).transpose(1, 2))
        if s.training and s.drop:
            h = h * (torch.rand(h.shape[0], 1, 1, device=h.device) > s.drop) / (1 - s.drop)
        return x + h


class TBlock(nn.Module):
    def __init__(s, d, heads=4, expand=2, drop=0.2):
        super().__init__()
        s.ln1, s.qkv, s.out, s.ln2 = nn.LayerNorm(d), nn.Linear(d, 3 * d), nn.Linear(d, d), nn.LayerNorm(d)
        s.ff1, s.ff2, s.heads, s.drop = nn.Linear(d, d * expand), nn.Linear(d * expand, d), heads, drop

    def forward(s, x):
        B, L, d = x.shape
        q, k, v = s.qkv(s.ln1(x)).view(B, L, 3, s.heads, d // s.heads).permute(2, 0, 3, 1, 4)
        a = Fn.scaled_dot_product_attention(q, k, v).transpose(1, 2).reshape(B, L, d)
        x = x + Fn.dropout(s.out(a), s.drop, s.training)
        return x + Fn.dropout(s.ff2(Fn.silu(s.ff1(s.ln2(x)))), s.drop, s.training)


class ConvNet(nn.Module):
    def __init__(s, n_in, n_out, d, k, groups):
        super().__init__()
        s.stem, s.bn0 = nn.Linear(n_in, d, bias=False), nn.BatchNorm1d(d)
        blocks = []
        for _ in range(groups):
            blocks += [ConvBlock(d, k), ConvBlock(d, k), ConvBlock(d, k), TBlock(d)]
        s.blocks = nn.ModuleList(blocks)
        s.top, s.head = nn.Linear(d, 2 * d), nn.Linear(2 * d, n_out)

    def forward(s, x):
        x = s.bn0(s.stem(x).transpose(1, 2)).transpose(1, 2)
        for b in s.blocks:
            x = b(x)
        x = Fn.silu(s.top(x)).mean(1)  # trung bình theo thời gian
        return s.head(Fn.dropout(x, 0.4, s.training))


class MLP(nn.Module):
    def __init__(s, n_in, n_out, d=512):
        super().__init__()
        s.net = nn.Sequential(nn.Linear(n_in, d), nn.ReLU(), nn.Dropout(0.4), nn.Linear(d, d), nn.ReLU(), nn.Dropout(0.4), nn.Linear(d, n_out))

    def forward(s, x):
        return s.net(x)


class Model(nn.Module):
    """Chuẩn hoá đầu vào (trung bình/độ lệch của dữ liệu học) + mạng."""
    def __init__(s, net, mean, std):
        super().__init__()
        s.net = net
        s.register_buffer("mean", mean)
        s.register_buffer("std", std)

    def forward(s, x):
        return s.net((x - s.mean) / s.std)


# ---------------- dạy và chấm ----------------
def batches(idx, bs, shuffle):
    idx = idx[torch.randperm(len(idx))] if shuffle else idx
    for i in range(0, len(idx), bs):
        yield idx[i: i + bs]


def fit(X, lens, Y, tr, n_out, log):
    a = ARGS
    stretch = 0.1 if a.lang == "asl" else 0.0
    tr = torch.as_tensor(tr, device=dev)
    with torch.no_grad():  # thống kê để chuẩn hoá: trên dữ liệu học, chưa nhân bản
        sample = tr[torch.randperm(len(tr), device=dev)[:8192]]
        f = inputs(X[sample].float(), lens[sample], a.arch, False, 0)
        f = f.reshape(-1, f.shape[-1])
        mean, std = f.mean(0), f.std(0).clamp(min=1e-3)
    n_in = mean.numel()
    net = MLP(n_in, n_out) if a.arch == "mlp" else ConvNet(n_in, n_out, a.dim, a.kernel, a.groups)
    model = Model(net, mean, std).to(dev)
    params = sum(p.numel() for p in model.parameters())
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr, weight_decay=a.wd)
    steps = a.epochs * math.ceil(len(tr) / a.bs)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, a.lr, total_steps=steps, pct_start=0.1)
    log(f"  mạng {a.arch}: {params / 1e6:.2f} triệu tham số, {len(tr)} mẫu học, {a.epochs} lượt")
    t0 = time.time()
    for ep in range(a.epochs):
        model.train()
        tot = 0.0
        for b in batches(tr, a.bs, True):
            with torch.autocast("cuda", dtype=torch.bfloat16):
                loss = Fn.cross_entropy(model(inputs(X[b].float(), lens[b], a.arch, True, stretch)), Y[b], label_smoothing=a.smooth)
            opt.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 2.0)
            opt.step()
            sched.step()
            tot += loss.item() * len(b)
        if ep % 10 == 9 or ep == a.epochs - 1:
            log(f"  lượt {ep + 1}/{a.epochs}: loss {tot / len(tr):.3f} ({time.time() - t0:.0f} giây)")
    return model


@torch.no_grad()
def predict(model, X, lens, idx):
    model.eval()
    idx = torch.as_tensor(idx, device=dev)
    return torch.cat([Fn.softmax(model(inputs(X[b].float(), lens[b], ARGS.arch, False, 0)).float(), -1) for b in batches(idx, 1024, False)])


def main():
    a = ARGS
    log_path = os.path.join(ROOT, "data", f"nn_{a.lang}_{a.arch}_{a.tag}.log")
    logf = open(log_path, "a", encoding="utf-8")

    def log(msg):
        print(msg, flush=True)
        logf.write(msg + "\n"); logf.flush()

    torch.manual_seed(0)
    X, lens, y, words, rows = load(a.lang)
    other = len(words)
    X, lens = X.to(dev), lens.to(dev)
    Y = torch.as_tensor(y, device=dev)
    log(f"=== {time.strftime('%Y-%m-%d %H:%M')} {vars(a)}")
    log(f"{len(y)} mẫu, {len(set(r['Signer'] for r in rows))} người, {other} từ + 'không phải từ nào' ({(y == other).sum()} mẫu)")

    if a.final:  # bản cuối: học trên toàn bộ dữ liệu (từ khó đã được gộp vào "không phải từ nào" nếu có --drop)
        keep = [w for w in words if w not in set(a.drop.split(","))] if a.drop else words
        remap = np.array([keep.index(w) if w in keep else len(keep) for w in words] + [len(keep)])
        Yf = torch.as_tensor(remap[y], device=dev)
        model = fit(X, lens, Yf, np.arange(len(y)), len(keep) + 1, log)
        out = os.path.join(ROOT, "data", f"nn_{a.lang}_{a.tag}.pt")
        torch.save({"state": model.state_dict(), "args": vars(a), "labels": keep + [OTHER]}, out)
        log(f"Đã lưu {out}: {len(keep)} từ")
        return

    n = len(y)
    P = np.full((n, other + 1), np.nan, np.float32)
    folds = range(5) if a.folds == "all" else [int(f) for f in a.folds.split(",")]
    if a.split == "random":  # chia ngẫu nhiên theo mẫu: người trong bài kiểm tra ĐÃ xuất hiện lúc học (chỉ để so sánh)
        part = np.random.default_rng(0).integers(0, 5, len(y))
        folds_iter = [(part != f, part == f) for f in range(5)]
    else:
        folds_iter = splits(rows, y, other)
    for f, (train, test) in enumerate(folds_iter):
        if f not in folds:
            continue
        log(f"Phần {f + 1}/5:")
        model = fit(X, lens, Y, np.where(train)[0], other + 1, log)
        te = np.where(test)[0]
        P[te] = predict(model, X, lens, te).cpu().numpy()
        pos = te[y[te] != other]
        log(f"  người lạ: đúng ngay lần đầu {(P[pos, :-1].argmax(1) == y[pos]).mean():.1%}")

    done = ~np.isnan(P[:, 0])
    pos = done & (y != other)
    neg = done & (y == other)
    top5 = np.argsort(-P[:, :-1], 1)[:, :5]
    top1 = float((top5[pos, 0] == y[pos]).mean())
    top5r = float((top5[pos] == y[pos, None]).any(1).mean())
    log(f"TỔNG ({pos.sum()} mẫu từ thật): đúng ngay lần đầu {top1:.1%}, trong 5 gợi ý đầu {top5r:.1%}")
    best = P.argmax(1)
    conf = P.max(1)
    guess = np.where(best < other, best, -1)
    log(" ngưỡng  nhận đúng  nhận nhầm  bỏ sót  cử động lạ bị nhận thành chữ")
    table = {}
    for t in np.round(np.arange(0, 0.96, 0.05), 2):
        said = (guess >= 0) & (conf >= t)
        right = guess == y
        r = {"correct": float((said & right)[pos].mean()), "wrong": float((said & ~right)[pos].mean()),
             "missed": float((~said)[pos].mean()), "false_alarm": float(said[neg].mean())}
        table[float(t)] = r
        log(f"  {t:.2f}    {r['correct']:6.1%}    {r['wrong']:6.1%}   {r['missed']:6.1%}   {r['false_alarm']:6.1%}")
    ok = lambda r: r["false_alarm"] <= MAX_FALSE and r["correct"] >= MIN_PRECISION * (r["correct"] + r["wrong"])
    t = next((t for t, r in table.items() if ok(r)), max(table))
    log(f"Chọn ngưỡng {t:.2f}: " + ", ".join(f"{k} {v:.1%}" for k, v in table[t].items()))
    acc = np.array([(P[pos & (y == w), :-1].argmax(1) == w).mean() if (pos & (y == w)).any() else np.nan for w in range(other)])
    log(f"Số từ nhận đúng >= 40%: {(acc >= 0.4).sum()}/{other}; 10 từ khó nhất: " +
        ", ".join(f"{words[i]} {acc[i]:.0%}" for i in np.argsort(acc)[:10]))
    np.savez(os.path.join(ROOT, "data", f"nn_{a.lang}_{a.arch}_{a.tag}_oof.npz"), P=P, y=y, words=np.array(words))
    json.dump({"signer_independent": top1, "top5": top5r, **table[t], "threshold": t, "folds": a.folds,
               "words_over_40": [words[i] for i in np.where(acc >= 0.4)[0]], "args": vars(a)},
              open(os.path.join(ROOT, "data", f"nn_{a.lang}_{a.arch}_{a.tag}_metrics.json"), "w", encoding="utf-8"), ensure_ascii=False)


ARGS = None
if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("lang", nargs="?", default="asl")
    p.add_argument("--arch", default="conv", choices=["conv", "mlp"])
    p.add_argument("--folds", default="0")
    p.add_argument("--epochs", type=int, default=60)
    p.add_argument("--bs", type=int, default=256)
    p.add_argument("--lr", type=float, default=2e-3)
    p.add_argument("--wd", type=float, default=0.05)
    p.add_argument("--smooth", type=float, default=0.1)
    p.add_argument("--dim", type=int, default=160)
    p.add_argument("--kernel", type=int, default=11)
    p.add_argument("--groups", type=int, default=2)
    p.add_argument("--L", type=int, default=32)
    p.add_argument("--tag", default="try")
    p.add_argument("--final", action="store_true")
    p.add_argument("--split", default="signer", choices=["signer", "random"])
    p.add_argument("--aug", default="basic", choices=["basic", "strong"])
    p.add_argument("--drop", default="", help="các từ gộp vào 'không phải từ nào', cách nhau bởi dấu phẩy")
    ARGS = p.parse_args()
    main()
