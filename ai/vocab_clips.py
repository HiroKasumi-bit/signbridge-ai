"""Cắt mỗi từ VSL một video ngắn (VieSign-10K, CC BY 4.0) cho trang Từ vựng: bấm vào từ là xem cách ký.

Chọn video: ưu tiên người làm ký hiệu có nhiều video nhất (cách ký đều, quen mặt), trong số các video của từ đó.
Nén nhỏ: cao 360 điểm ảnh, không tiếng, H.264 (khoảng 50-150 KB mỗi từ), lưu web/public/signs/vsl/<từ>.mp4.
Chạy: uv run python vocab_clips.py
"""
import collections, csv, json, os, subprocess
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(ROOT, "..", "web", "public", "signs", "vsl")


def main():
    rows = [r for r in csv.DictReader(open(os.path.join(DATA, "labels.csv"), encoding="utf-8"))
            if os.path.exists(os.path.join(DATA, "videos", r["ID_video"] + ".mp4"))]
    rank = collections.Counter(r["Signer"] for r in rows)
    words = json.load(open(os.path.join(ROOT, "..", "web", "src", "words", "vsl.json"), encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    jobs = []
    for w in words:
        cands = [r for r in rows if r["Meaning"] == w]
        if not cands:
            print("thiếu video:", w)
            continue
        best = max(cands, key=lambda r: rank[r["Signer"]])
        jobs.append((os.path.join(DATA, "videos", best["ID_video"] + ".mp4"), os.path.join(OUT, w + ".mp4")))

    def encode(job):
        src, dst = job
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-an", "-vf", "scale=-2:360,format=yuv420p",
                        "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-movflags", "+faststart", dst], check=True)

    with ThreadPoolExecutor(6) as ex:
        list(ex.map(encode, jobs))
    size = sum(os.path.getsize(d) for _, d in jobs)
    print(f"{len(jobs)}/{len(words)} từ -> {OUT} ({size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
