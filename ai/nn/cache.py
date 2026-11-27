"""Gom mọi mẫu (data/<ngôn ngữ>/frames/*.npy, mỗi file N khung x 149 số) vào một file để dạy mạng nơ-ron nhanh.
Mỗi mẫu: bỏ khung không có tay ở đầu/cuối (giống sign/features.py), giữ x, y (bỏ z) của 49 điểm + 2 ô "có tay?",
tối đa MAXLEN khung (dài hơn thì lấy đều). Lưu data/<ngôn ngữ>/nn_cache.npz.
Chạy: uv run python -m nn.cache asl"""
import csv, os, sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAXLEN = 96
XY = np.r_[np.arange(0, 147, 3), np.arange(1, 147, 3)]  # cột x rồi cột y của 49 điểm


def compact(f):
    """(N,149) -> (n,100): [x của 49 điểm, y của 49 điểm, có tay trái?, có tay phải?]."""
    f = np.asarray(f, np.float32)
    has = f[:, -2:].any(1)
    if has.any():
        i = np.flatnonzero(has)
        f = f[i[0]: i[-1] + 1]
    if len(f) > MAXLEN:
        f = f[np.round(np.linspace(0, len(f) - 1, MAXLEN)).astype(int)]
    return np.concatenate([f[:, XY], f[:, -2:]], 1)


def main(lang="asl"):
    data = os.path.join(ROOT, "data", lang) if lang != "vsl" else os.path.join(ROOT, "data")
    rows = list(csv.DictReader(open(os.path.join(data, "labels.csv"), encoding="utf-8")))
    with ThreadPoolExecutor(16) as ex:
        seqs = list(ex.map(lambda r: compact(np.load(os.path.join(data, "frames", r["ID_video"] + ".npy"))), rows))
    lens = np.array([len(s) for s in seqs], np.int16)
    X = np.zeros((len(seqs), MAXLEN, 100), np.float16)
    for i, s in enumerate(seqs):
        X[i, : len(s)] = s
    out = os.path.join(data, "nn_cache.npz")
    np.savez(out, X=X, lens=lens, meaning=np.array([r["Meaning"] for r in rows]),
             signer=np.array([r["Signer"] for r in rows]), vid=np.array([r["ID_video"] for r in rows]))
    print(f"{len(rows)} mẫu, độ dài khung: trung vị {np.median(lens):.0f}, 90% {np.percentile(lens, 90):.0f}, "
          f"bị cắt {(lens == MAXLEN).mean():.1%} -> {out} ({os.path.getsize(out) / 1e9:.2f} GB)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "asl")
