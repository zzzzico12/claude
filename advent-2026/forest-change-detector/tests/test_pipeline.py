"""検知の処理のテスト（合成した画像を使う。ダウンロードはしない）"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import eval as E  # noqa: E402
import pipeline as P  # noqa: E402

G = {"west": -65.0, "north": -9.0, "px": P.HANSEN_PX / P.SCALE, "width": 120, "height": 120}


def scene(nir: np.ndarray, red: np.ndarray) -> dict:
    z = np.zeros_like(nir)
    return {"red": red, "green": z, "blue": z, "nir": nir, "scl": np.full(nir.shape, 4, dtype=np.uint8)}


def make_pair(year_shift=0.0):
    """左半分は牧草地（NDVI 約0.33）、右半分は森（約0.75）。後の年は右上の 30×30 画素の森が切られる"""
    red = np.full((120, 120), 0.04, np.float32)
    nir = np.full((120, 120), 0.08, np.float32)
    nir[:, 60:] = 0.28  # 森
    after_nir = nir.copy()
    after_nir[10:40, 70:100] = 0.08  # 切られた森
    # 年ごとのずれ：後の年は全体が少し緑っぽい（干ばつの年の後など）
    after_red = red * (1 - year_shift)
    return scene(nir, red), scene(after_nir, after_red)


def test_ndvi():
    assert np.isclose(P.ndvi(np.array([0.1]), np.array([0.3]))[0], 0.5)
    assert np.isnan(P.ndvi(np.array([0.0]), np.array([0.0]))[0])


def test_otsu_splits_two_groups():
    v = np.concatenate([np.full(500, 0.3), np.full(500, 0.75)])
    assert 0.3 < P.otsu(v) < 0.75


def test_detect_finds_the_cleared_patch():
    before, after = make_pair()
    r = P.detect(before, after, G, min_area_ha=0.01)
    assert len(r["patches"]) == 1
    p = r["patches"][0]
    assert p.pixel_bbox == [10, 70, 40, 100]
    assert p.ndvi_drop > 0.3
    assert r["change"].sum() == 900


def test_year_shift_is_removed():
    """全体が緑っぽくなっても、変化したのは切られた所だけ"""
    before, after = make_pair(year_shift=0.5)
    r = P.detect(before, after, G, min_area_ha=0.01)
    assert r["shift"] < 0  # 全体として NDVI は上がった
    assert len(r["patches"]) == 1


def test_clouds_are_ignored():
    before, after = make_pair()
    after["scl"][10:40, 70:100] = 9  # 切られた所に雲
    r = P.detect(before, after, G, min_area_ha=0.01)
    assert r["change"].sum() == 0


def test_blocks_and_score():
    m = np.zeros((6, 6), bool)
    m[:3, :3] = True  # 1つの 3×3 が全部変化
    m[3:, 3:5] = True  # 6画素だけ変化（5以上なので検知）
    b = E.blocks(m)
    assert b.tolist() == [[True, False], [False, True]]
    s = E.score(b, np.array([[True, True], [False, False]]))
    assert (s["precision"], s["recall"]) == (0.5, 0.5)
