"""Day05 のデータ処理：Sentinel-2 の NDVI の変化で森の減少を検知する。

    uv run python scripts/pipeline.py            （画像の取得から画面用のファイルまで）

- 衛星画像：Sentinel-2 L2A（AWS のオープンデータ、Element 84 Earth Search）。キー不要
- 正解：Hansen ら Global Forest Change（GFC-2025-v1.13、CC BY 4.0）。キー不要
- すべてを、Hansen の30mの格子にぴったり合う緯度経度の格子（その1/3、約9m）にそろえる。
  Hansen の1画素がこちらの 3×3 画素に対応するので、評価で比べやすい
"""

from __future__ import annotations

import json
import math
import sys
import time
import urllib.request
from dataclasses import asdict, dataclass
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_origin
from rasterio.vrt import WarpedVRT
from scipy import ndimage

APP = Path(__file__).resolve().parent.parent
DATA = APP / "data"
PUBLIC = APP / "public" / "data"  # 画面（地球全体の地図・地域ごとの数字）が使うファイル
RONDONIA = APP / "analysis" / "rondonia"  # ロンドニア州の分析の結果（画面には出さない。README と評価で使う）
UA = "advent-2026-forest-change (https://github.com/zzzzico12/claude)"

# ---------- 対象の地域と時期 ----------

@dataclass(frozen=True)
class Area:
    name: str
    center_lat: float
    center_lon: float
    half_km: float = 10.0


AREA = Area("ブラジル・ロンドニア州ポルト・ヴェーリョ（アクレ州との境の近く）", -9.768, -65.028)
# 乾季の終わりの雲の少ない画像を選ぶ（Hansen の減少は暦年ごとなので、前の年の終わり〜後の年の終わりに近づける）
BEFORE_WINDOW = ("2024-08-15", "2024-10-31")
AFTER_WINDOW = ("2025-08-15", "2025-10-31")
HANSEN_VERSION = "GFC-2025-v1.13"
HANSEN_TILE = "00N_070W"  # 北緯0度・西経70度が左上の10度四方
HANSEN_PX = 0.00025  # 度（約28m）
SCALE = 3  # Sentinel-2 の格子は Hansen の1/3

# ---------- 検知の決まり（コードで決める。評価に合わせて調整しない） ----------

# 森の境目は、決まった値ではなく画像ごとに大津の方法で決める（NDVI の分布を2つの山に分ける）。
# 2024年は記録的な干ばつと火災の煙で、9月の森の NDVI が例年より低かった（中央値 0.66）。決まった値 0.7 では森の大半を見落とした
FOREST_NDVI: float | str = "otsu"
DROP_NDVI = 0.25  # NDVI がこれ以上下がったら変化（年ごとの全体のずれを除いた後の値）
MIN_AREA_HA = 0.5  # これより小さいまとまりはノイズとして除く

# SCL（シーン分類）の値。4 植生、5 裸地、6 水、7 分類なし、11 雪 を使い、雲・影・欠損は除く
SCL_VALID = {4, 5, 6, 7, 11}


def grid():
    """Hansen の格子にそろえた、対象の範囲の格子（左上の経度・緯度、画素の大きさ、幅・高さ）"""
    dlat = AREA.half_km / 111.32
    dlon = AREA.half_km / (111.32 * math.cos(math.radians(AREA.center_lat)))
    west, east = AREA.center_lon - dlon, AREA.center_lon + dlon
    south, north = AREA.center_lat - dlat, AREA.center_lat + dlat
    # Hansen のタイルは経度 -70、緯度 0 が左上。その画素の境目にそろえる
    snap = lambda v, origin: origin + math.floor((v - origin) / HANSEN_PX) * HANSEN_PX  # noqa: E731
    west, north_snapped = snap(west, -70.0), -snap(-north, 0.0)
    px = HANSEN_PX / SCALE
    width = math.ceil((east - west) / HANSEN_PX) * SCALE
    height = math.ceil((north_snapped - south) / HANSEN_PX) * SCALE
    return {"west": west, "north": north_snapped, "px": px, "width": width, "height": height}


def transform_of(g):
    return from_origin(g["west"], g["north"], g["px"], g["px"])


def bounds_of(g):
    return (g["west"], g["north"] - g["height"] * g["px"], g["west"] + g["width"] * g["px"], g["north"])


# ---------- Sentinel-2 ----------

def stac_search(window: tuple[str, str], bbox) -> list[dict]:
    body = {
        "collections": ["sentinel-2-l2a"],
        "bbox": list(bbox),
        "datetime": f"{window[0]}T00:00:00Z/{window[1]}T23:59:59Z",
        "query": {"eo:cloud_cover": {"lt": 20}},
        "limit": 50,
    }
    req = urllib.request.Request(
        "https://earth-search.aws.element84.com/v1/search",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "User-Agent": UA},
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)["features"]


def read_band(href: str, g, resampling=Resampling.bilinear) -> np.ndarray:
    """COG の必要な範囲だけを、こちらの格子にそろえて読む"""
    with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", GDAL_HTTP_USERAGENT=UA):
        with rasterio.open(href) as src:
            with WarpedVRT(
                src,
                crs="EPSG:4326",
                transform=transform_of(g),
                width=g["width"],
                height=g["height"],
                resampling=resampling,
            ) as vrt:
                return vrt.read(1)


def window_clear_fraction(item: dict, g) -> float:
    scl = read_band(item["assets"]["scl"]["href"], g, Resampling.nearest)
    return float(np.isin(scl, list(SCL_VALID)).mean())


def choose_scene(window: tuple[str, str], g) -> tuple[dict, float]:
    """範囲の中がいちばん晴れている画像。同じくらいなら遅い日付（乾季の終わり）を選ぶ"""
    items = sorted(stac_search(window, bounds_of(g)), key=lambda f: f["properties"]["datetime"], reverse=True)
    best, best_clear = None, -1.0
    for item in items[:8]:
        clear = window_clear_fraction(item, g)
        print(f"  {item['properties']['datetime'][:10]} 範囲の中の晴れの割合 {clear:.3f}", file=sys.stderr)
        if clear > best_clear + 0.005:
            best, best_clear = item, clear
        if clear >= 0.995:
            break
    return best, best_clear


def load_scene(item: dict, g) -> dict[str, np.ndarray]:
    cache = DATA / "scenes" / f"{item['id']}.npz"
    if cache.exists():
        return dict(np.load(cache))
    cache.parent.mkdir(parents=True, exist_ok=True)
    a = item["assets"]
    bands = {k: read_band(a[k]["href"], g).astype(np.float32) for k in ("red", "green", "blue", "nir")}
    bands["scl"] = read_band(a["scl"]["href"], g, Resampling.nearest)
    np.savez_compressed(cache, **bands)
    return bands


# ---------- NDVI と検知 ----------

def ndvi(red: np.ndarray, nir: np.ndarray) -> np.ndarray:
    with np.errstate(invalid="ignore", divide="ignore"):
        v = (nir - red) / (nir + red)
    return np.where(np.isfinite(v), v, np.nan)


@dataclass
class Patch:
    id: int
    area_ha: float
    lat: float
    lon: float
    ndvi_before: float
    ndvi_after: float
    ndvi_drop: float
    bbox: list[float]  # [west, south, east, north]
    pixel_bbox: list[int]  # [row0, col0, row1, col1]


def otsu(values: np.ndarray, bins: int = 256) -> float:
    """大津の方法：分布を2つに分けたとき、2つの間のばらつきが最も大きくなる境目"""
    v = values[np.isfinite(values)]
    hist, edges = np.histogram(v, bins=bins, range=(-0.2, 1.0))
    centers = (edges[:-1] + edges[1:]) / 2
    w0 = np.cumsum(hist)
    w1 = w0[-1] - w0
    m0 = np.cumsum(hist * centers) / np.maximum(w0, 1)
    m1 = (np.sum(hist * centers) - np.cumsum(hist * centers)) / np.maximum(w1, 1)
    between = w0 * w1 * (m0 - m1) ** 2
    # 境目は「下のグループの最後のビンの上の端」。同じ値の候補が並ぶとき（2つの山がはっきり離れているとき）は真ん中を取る
    best = np.flatnonzero(between >= between.max() * (1 - 1e-9))
    i = int(best[len(best) // 2])
    return float(edges[i + 1])


def detect(before: dict, after: dict, g, forest=FOREST_NDVI, drop=DROP_NDVI, min_area_ha=MIN_AREA_HA, use_scl=True, normalize=True):
    """前の年は森で、後の年に NDVI が drop 以上下がった画素を変化とし、まとまりごとに数字を出す

    normalize：年ごとの全体のずれ（干ばつ・煙・季節）を除く。森の大部分は変化していないので、
    森の NDVI の変化の中央値を「変化なし」とみなして差し引く
    """
    n0, n1 = ndvi(before["red"], before["nir"]), ndvi(after["red"], after["nir"])
    valid = np.isfinite(n0) & np.isfinite(n1)
    if use_scl:
        valid &= np.isin(before["scl"], list(SCL_VALID)) & np.isin(after["scl"], list(SCL_VALID))
    forest_threshold = otsu(n0[valid]) if forest == "otsu" else float(forest)
    is_forest = valid & (n0 >= forest_threshold)
    shift = float(np.median((n0 - n1)[is_forest])) if normalize else 0.0
    change = is_forest & ((n0 - n1 - shift) >= drop)

    px_m2 = pixel_area_m2(g)
    labels, n = ndimage.label(change, structure=np.ones((3, 3)))
    sizes = ndimage.sum(change, labels, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, dtype=bool)
    keep[1:] = sizes * px_m2 / 10_000 >= min_area_ha
    mask = keep[labels]

    patches: list[Patch] = []
    objects = ndimage.find_objects(labels)
    for idx in np.flatnonzero(keep):
        sl = objects[idx - 1]
        sub = labels[sl] == idx
        rows, cols = np.nonzero(sub)
        r0, c0 = sl[0].start, sl[1].start
        cy, cx = rows.mean() + r0, cols.mean() + c0
        b0, b1 = n0[sl][sub], n1[sl][sub]
        patches.append(
            Patch(
                id=0,
                area_ha=round(float(sub.sum() * px_m2 / 10_000), 2),
                lat=round(g["north"] - (cy + 0.5) * g["px"], 5),
                lon=round(g["west"] + (cx + 0.5) * g["px"], 5),
                ndvi_before=round(float(np.mean(b0)), 3),
                ndvi_after=round(float(np.mean(b1)), 3),
                ndvi_drop=round(float(np.mean(b0 - b1)), 3),
                bbox=[
                    round(g["west"] + sl[1].start * g["px"], 6),
                    round(g["north"] - sl[0].stop * g["px"], 6),
                    round(g["west"] + sl[1].stop * g["px"], 6),
                    round(g["north"] - sl[0].start * g["px"], 6),
                ],
                pixel_bbox=[sl[0].start, sl[1].start, sl[0].stop, sl[1].stop],
            )
        )
    patches.sort(key=lambda p: p.area_ha, reverse=True)
    for i, p in enumerate(patches, 1):
        p.id = i
    for p in patches:  # 表示用：ずれを除いた後の下がり方
        p.ndvi_drop = round(p.ndvi_drop - shift, 3)
    return {
        "ndvi_before": n0,
        "ndvi_after": n1,
        "valid": valid,
        "forest": is_forest,
        "change": mask,
        "patches": patches,
        "forest_threshold": round(forest_threshold, 3),
        "shift": round(shift, 3),
    }


def pixel_area_m2(g) -> float:
    lat = math.radians(AREA.center_lat)
    return (g["px"] * 111_320) * (g["px"] * 111_320 * math.cos(lat))


# ---------- Hansen（正解） ----------

def hansen_url(layer: str) -> str:
    return (
        f"https://storage.googleapis.com/earthenginepartners-hansen/{HANSEN_VERSION}/"
        f"Hansen_{HANSEN_VERSION}_{layer}_{HANSEN_TILE}.tif"
    )


def read_hansen(layer: str, g) -> np.ndarray:
    """Hansen の層を、こちらの格子（1/3の細かさ）で読む。lossyear はダウンロード済みのタイル、treecover2000 は必要な範囲だけ"""
    cache = DATA / "hansen" / f"{layer}_window.npy"
    if cache.exists():
        return np.load(cache)
    local = DATA / "hansen" / f"{layer}_{HANSEN_TILE}.tif"
    path = str(local) if local.exists() else f"/vsicurl/{hansen_url(layer)}"
    with rasterio.Env(GDAL_HTTP_USERAGENT=UA):
        with rasterio.open(path) as src:
            with WarpedVRT(src, crs="EPSG:4326", transform=transform_of(g), width=g["width"], height=g["height"], resampling=Resampling.nearest) as vrt:
                arr = vrt.read(1)
    cache.parent.mkdir(parents=True, exist_ok=True)
    np.save(cache, arr)
    return arr


# ---------- 画面用のファイル ----------

def to_rgb8(scene: dict) -> np.ndarray:
    """トゥルーカラー（反射率を見やすく引き伸ばす）"""
    rgb = np.stack([scene["red"], scene["green"], scene["blue"]], axis=-1)
    lo, hi = np.nanpercentile(rgb, 2), np.nanpercentile(rgb, 98)
    out = np.clip((rgb - lo) / (hi - lo), 0, 1) ** (1 / 1.2)
    return (np.nan_to_num(out) * 255).astype(np.uint8)


def save_outputs(before_item, after_item, before, after, result, g, clear):
    from PIL import Image

    RONDONIA.mkdir(parents=True, exist_ok=True)
    (RONDONIA / "crops").mkdir(exist_ok=True)
    rgb0, rgb1 = to_rgb8(before), to_rgb8(after)
    Image.fromarray(rgb0).save(RONDONIA / "before.jpg", quality=85)
    Image.fromarray(rgb1).save(RONDONIA / "after.jpg", quality=85)

    # 変化した場所を赤で塗った透明な画像
    overlay = np.zeros((*result["change"].shape, 4), dtype=np.uint8)
    overlay[result["change"]] = (230, 40, 40, 200)
    Image.fromarray(overlay, "RGBA").save(RONDONIA / "change.png", optimize=True)

    # まとまりごとの前後の切り抜き（AI と画面で使う）。周りも少し入れる
    for p in result["patches"][:30]:
        r0, c0, r1, c1 = p.pixel_bbox
        pad = max(30, (r1 - r0) // 2, (c1 - c0) // 2)
        sl = (slice(max(0, r0 - pad), min(g["height"], r1 + pad)), slice(max(0, c0 - pad), min(g["width"], c1 + pad)))
        for tag, rgb in (("before", rgb0), ("after", rgb1)):
            img = Image.fromarray(rgb[sl])
            img.thumbnail((320, 320))
            img.save(RONDONIA / "crops" / f"{p.id}-{tag}.jpg", quality=85)

    west, south, east, north = bounds_of(g)
    meta = {
        "area": AREA.name,
        "bounds": {"west": west, "south": south, "east": east, "north": north},
        "pixel_m": round(g["px"] * 111_320, 1),
        "before": {"id": before_item["id"], "date": before_item["properties"]["datetime"][:10], "clear": round(clear[0], 3)},
        "after": {"id": after_item["id"], "date": after_item["properties"]["datetime"][:10], "clear": round(clear[1], 3)},
        "rules": {
            "forest_ndvi": result["forest_threshold"],
            "forest_method": "大津の方法" if FOREST_NDVI == "otsu" else "固定",
            "drop_ndvi": DROP_NDVI,
            "year_shift": result["shift"],
            "min_area_ha": MIN_AREA_HA,
        },
        "total_change_ha": round(sum(p.area_ha for p in result["patches"]), 1),
        "patch_count": len(result["patches"]),
        "forest_before_ha": round(float(result["forest"].sum() * pixel_area_m2(g) / 10_000), 1),
        "patches": [asdict(p) for p in result["patches"]],
    }
    (RONDONIA / "result.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    return meta


def main():
    g = grid()
    print(f"格子：{g['width']}×{g['height']} 画素（約{g['px'] * 111_320:.1f}m）", file=sys.stderr)
    print("前の年の画像を選んでいます…", file=sys.stderr)
    before_item, c0 = choose_scene(BEFORE_WINDOW, g)
    print("後の年の画像を選んでいます…", file=sys.stderr)
    after_item, c1 = choose_scene(AFTER_WINDOW, g)
    print(f"前：{before_item['id']}（晴れ {c0:.3f}） 後：{after_item['id']}（晴れ {c1:.3f}）", file=sys.stderr)
    t = time.time()
    before, after = load_scene(before_item, g), load_scene(after_item, g)
    print(f"画像を読みました（{time.time() - t:.0f}秒）", file=sys.stderr)
    result = detect(before, after, g)
    meta = save_outputs(before_item, after_item, before, after, result, g, (c0, c1))
    np.savez_compressed(DATA / "detection.npz", change=result["change"], valid=result["valid"], ndvi_before=result["ndvi_before"], ndvi_after=result["ndvi_after"])
    (DATA / "scenes.json").write_text(json.dumps({"before": before_item["id"], "after": after_item["id"]}))
    print(f"森の境目 NDVI {result['forest_threshold']}（大津の方法）、年ごとのずれ {result['shift']}", file=sys.stderr)
    print(f"検知：{meta['patch_count']} か所、合計 {meta['total_change_ha']} ha（前の年の森 {meta['forest_before_ha']} ha）", file=sys.stderr)


if __name__ == "__main__":
    main()
