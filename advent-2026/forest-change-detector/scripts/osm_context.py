"""検知したまとまりの周りの OpenStreetMap（道路・川）を調べ、result.json に書き足す。

    uv run python scripts/osm_context.py

Overpass API に1回だけ問い合わせる（範囲の中の道路と川）。結果は data/osm.json に保存し、2回目からは使い回す。
"""

from __future__ import annotations

import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pipeline as P  # noqa: E402

ROAD_JA = {
    "trunk": "国道（幹線道路）",
    "primary": "幹線道路",
    "secondary": "主要な道路",
    "tertiary": "地方の道路",
    "unclassified": "小さな道路",
    "residential": "住宅地の道路",
    "track": "未舗装の農道・林道",
    "service": "私道",
    "path": "小道",
}


def fetch_osm(bounds) -> dict:
    cache = P.DATA / "osm.json"
    if cache.exists():
        return json.loads(cache.read_text())
    west, south, east, north = bounds
    q = f"""[out:json][timeout:60];
(
  way["highway"]({south},{west},{north},{east});
  way["waterway"~"river|stream|canal"]({south},{west},{north},{east});
);
out geom;"""
    req = urllib.request.Request(
        "https://overpass-api.de/api/interpreter",
        data=urllib.parse.urlencode({"data": q}).encode(),
        headers={"User-Agent": P.UA},
    )
    # 公開の Overpass は混んでいると 502/504 を返すので、間をあけて3回まで試す
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code not in (429, 502, 503, 504) or attempt == 2:
                raise
            print(f"Overpass が {e.code}。{20 * (attempt + 1)}秒待ってやり直します", file=sys.stderr)
            time.sleep(20 * (attempt + 1))
    cache.write_text(json.dumps(data))
    return data


def to_xy(lat: float, lon: float, lat0: float) -> tuple[float, float]:
    """近い範囲なので、緯度経度をメートルの平面に直す（誤差は無視できる）"""
    return lon * 111_320 * math.cos(math.radians(lat0)), lat * 111_320


def seg_dist(p, a, b) -> float:
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    t = 0.0 if dx == dy == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def nearest(p, ways, lat0):
    best = (math.inf, None)
    for w in ways:
        pts = [to_xy(n["lat"], n["lon"], lat0) for n in w.get("geometry", [])]
        for a, b in zip(pts, pts[1:]):
            d = seg_dist(p, a, b)
            if d < best[0]:
                best = (d, w)
    return best


def main():
    path = P.PUBLIC / "result.json"
    meta = json.loads(path.read_text())
    b = meta["bounds"]
    osm = fetch_osm((b["west"], b["south"], b["east"], b["north"]))
    ways = [e for e in osm["elements"] if e["type"] == "way"]
    roads = [w for w in ways if "highway" in w.get("tags", {})]
    rivers = [w for w in ways if "waterway" in w.get("tags", {})]
    lat0 = (b["south"] + b["north"]) / 2
    for p in meta["patches"]:
        xy = to_xy(p["lat"], p["lon"], lat0)
        d_road, road = nearest(xy, roads, lat0)
        d_river, river = nearest(xy, rivers, lat0)
        kind = road["tags"].get("highway") if road else None
        p["context"] = {
            "road_m": None if road is None else round(d_road),
            "road_type": ROAD_JA.get(kind, kind) if kind else None,
            "road_name": road["tags"].get("name") if road else None,
            "river_m": None if river is None else round(d_river),
            "river_name": river["tags"].get("name") if river else None,
        }
    meta["osm"] = {"roads": len(roads), "rivers": len(rivers)}
    path.write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    print(f"道路 {len(roads)} 本・川 {len(rivers)} 本。まとまり {len(meta['patches'])} か所に書き足しました", file=sys.stderr)


if __name__ == "__main__":
    main()
