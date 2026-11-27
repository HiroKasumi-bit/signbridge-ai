"""Kiểm tra model xuất ra đúng: tự tính lại bằng numpy phải ra đúng xác suất của model gốc."""
import base64, json, os

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, "..", "web")
model_path = lambda lang: os.path.join(WEB, "public", "model", f"{lang}.json")
words_path = lambda lang: os.path.join(WEB, "src", "words", f"{lang}.json")
LANGS = [lang for lang in ("vsl", "asl") if os.path.exists(model_path(lang))]  # mỗi ngôn ngữ ký hiệu một model
MODEL = model_path("vsl")
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "parity.json")


def f32(s):
    return np.frombuffer(base64.b64decode(s), "<f4")


def weights(layer):
    """Trọng số lưu dạng số nguyên 8-bit, mỗi cột một hệ số tỉ lệ."""
    q = np.frombuffer(base64.b64decode(layer["W"]), np.int8).reshape(layer["shape"])
    return q * f32(layer["scale"])


def test_export_roundtrip():
    m, fx = json.load(open(MODEL, encoding="utf-8")), json.load(open(FIXTURE))
    x = (np.array(fx["vector"], np.float32) - f32(m["mean"])) / f32(m["std"])
    for i, layer in enumerate(m["layers"]):
        x = x @ weights(layer) + f32(layer["b"])
        if i < len(m["layers"]) - 1:
            x = np.maximum(x, 0)
    p = np.exp(x - x.max()); p /= p.sum()
    assert np.allclose(p, fx["probs"], atol=1e-5)


def test_labels_end_with_not_a_sign_and_match_vocab_page():
    """Nhãn cuối là "không phải từ nào"; trang Từ vựng liệt kê đúng các từ của bộ não đang trả lời
    (mạng nơ-ron nếu có, không thì LDA); có ngưỡng tự tin."""
    assert "vsl" in LANGS
    for lang in LANGS:
        m = json.load(open(model_path(lang), encoding="utf-8"))
        words = json.load(open(words_path(lang), encoding="utf-8"))
        labels = m["net"]["labels"] if "net" in m else m["labels"]
        assert m["labels"][-1] == "_khác" and labels[-1] == "_khác"
        assert labels[:-1] == words
        assert 0 <= m["minProb"] < 1


def test_weights_are_int8_so_phones_download_little():
    """389 từ x 2024 số: để số thực 32-bit thì model nặng ~4 MB; 8-bit thì ~1 MB."""
    for lang in LANGS:
        m = json.load(open(model_path(lang), encoding="utf-8"))
        for layer in m["layers"]:
            rows, cols = layer["shape"]
            assert len(base64.b64decode(layer["W"])) == rows * cols  # 1 byte mỗi trọng số
            assert len(f32(layer["scale"])) == cols
        assert os.path.getsize(model_path(lang)) < 2e6
