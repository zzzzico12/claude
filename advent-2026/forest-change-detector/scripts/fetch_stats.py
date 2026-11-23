"""大陸ごと・年ごとの森林減少の数字を作る。

    uv run python scripts/fetch_stats.py

- 国ごとの数字：Global Forest Watch（Global Nature Watch）の Data API の gadm__tcl__iso_change。
  ダウンロード（download/csv）はキー不要（2026-11-23 確認。query の方はキーが必要）。
  樹冠の割合30%以上を森とする（GFW の地図の既定と同じ）
- 国と大陸の対応：Natural Earth（パブリックドメイン）の CONTINENT。ロシアだけ「ロシア」として別にする
  （ふつうはヨーロッパだが、森の大半はシベリアにあり、世界で最も森が減っている国なので）

元の CSV は data/gfw/ に保存し、2回目からは使い回す。画面用の public/data/stats.json と、
AI の説明に使う data/country_year.json を書き出す。
"""

from __future__ import annotations

import csv
import io
import json
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pipeline as P  # noqa: E402

API = "https://data-api.globalforestwatch.org"
DATASET = "gadm__tcl__iso_change"
THRESHOLD = 30
FIRST, LAST = 2001, 2025
GFW_DIR = P.DATA / "gfw"
NE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson"

GROUPS = {
    "south_america": "南アメリカ",
    "north_america": "北アメリカ",
    "africa": "アフリカ",
    "asia": "アジア",
    "russia": "ロシア",
    "europe": "ヨーロッパ（ロシアを除く）",
    "oceania": "オセアニア",
}
NE_CONTINENT = {
    "South America": "south_america",
    "North America": "north_america",
    "Africa": "africa",
    "Asia": "asia",
    "Europe": "europe",
    "Oceania": "oceania",
}
# Natural Earth にない、または大陸の付け方が合わない国（GADM の国コード）
OVERRIDES = {
    "RUS": "russia",
    # Natural Earth ではフランスなどの一部として扱われ、国コードが出てこない地域
    "GUF": "south_america",  # フランス領ギアナ
    "GLP": "north_america", "MTQ": "north_america", "BES": "north_america",  # カリブ海
    "REU": "africa", "MYT": "africa", "MUS": "africa", "SYC": "africa", "ATF": "africa",  # インド洋
    "MDV": "asia", "GIB": "europe", "UMI": "oceania",
    "Z01": "asia", "Z02": "asia", "Z03": "asia", "Z04": "asia", "Z05": "asia", "Z06": "asia", "Z07": "asia", "Z08": "asia", "Z09": "asia",  # カシミールなどの係争地
    "ZNC": "asia",  # 北キプロス（キプロスは Natural Earth ではアジア）
    "XKO": "europe", "XCA": "asia", "XNC": "asia", "XAD": "asia", "XPI": "asia", "XSP": "asia", "XCL": "oceania",
}

DRIVER_JA = {
    "Permanent agriculture": "農地・牧草地への転換",
    "Hard commodities": "鉱山・エネルギー開発",
    "Shifting cultivation": "焼畑",
    "Logging": "伐採（林業）",
    "Wildfire": "山火事",
    "Settlements and infrastructure": "宅地・道路などの開発",
    "Other natural disturbances": "その他の自然のかく乱（嵐など）",
}


def get(url: str, cache: Path) -> bytes:
    if cache.exists():
        return cache.read_bytes()
    cache.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": P.UA})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                body = r.read()
            break
        except urllib.error.HTTPError as e:
            if e.code not in (429, 502, 503, 504) or attempt == 2:
                raise
            time.sleep(15 * (attempt + 1))
    cache.write_bytes(body)
    time.sleep(1)  # 提供元に負荷をかけない
    return body


def latest_version() -> str:
    with urllib.request.urlopen(urllib.request.Request(f"{API}/dataset/{DATASET}", headers={"User-Agent": P.UA})) as r:
        versions = json.load(r)["data"]["versions"]
    # "v20260424" のような日付の版。文字の順で並べると "v202204.2" などが混ざるので数字で比べる
    return max(versions, key=lambda v: [int(x) for x in v.lstrip("v").split(".")])


def query_csv(version: str, sql: str, name: str) -> list[dict]:
    url = f"{API}/dataset/{DATASET}/{version}/download/csv?" + urllib.parse.urlencode({"sql": sql})
    return list(csv.DictReader(io.StringIO(get(url, GFW_DIR / f"{version}-{name}.csv").decode("utf-8"))))


NAMES_JA: dict[str, str] = {"GUF": "フランス領ギアナ", "REU": "レユニオン", "GLP": "グアドループ", "MTQ": "マルティニーク"}


def continent_of() -> dict[str, str]:
    ne = json.loads(get(NE_URL, P.DATA / "naturalearth" / "ne_50m_admin_0_countries.geojson"))
    out: dict[str, str] = {}
    for f in ne["features"]:
        pr = f["properties"]
        group = NE_CONTINENT.get(pr["CONTINENT"])
        for code in (pr.get("ADM0_A3"), pr.get("ISO_A3_EH"), pr.get("ISO_A3")):
            if code and code != "-99":
                if group:
                    out.setdefault(code, group)
                if pr.get("NAME_JA"):
                    NAMES_JA.setdefault(code, pr["NAME_JA"])
    out.update(OVERRIDES)
    return out


def main():
    version = latest_version()
    print(f"GFW {DATASET} {version}", file=sys.stderr)
    where = f"umd_tree_cover_density_2000__threshold = {THRESHOLD} AND umd_tree_cover_loss__year >= {FIRST}"
    totals = query_csv(
        version,
        f"SELECT iso, umd_tree_cover_loss__year AS year, SUM(umd_tree_cover_loss__ha) AS loss, "
        f"SUM(umd_tree_cover_loss_from_fires__ha) AS fire FROM data WHERE {where} GROUP BY iso, year",
        "totals",
    )
    primary = query_csv(
        version,
        f"SELECT iso, umd_tree_cover_loss__year AS year, SUM(umd_tree_cover_loss__ha) AS loss FROM data "
        f"WHERE {where} AND is__umd_regional_primary_forest_2001 = true GROUP BY iso, year",
        "primary",
    )
    drivers = query_csv(
        version,
        f"SELECT iso, umd_tree_cover_loss__year AS year, wri_google_tree_cover_loss_drivers__driver AS driver, "
        f"SUM(umd_tree_cover_loss__ha) AS loss FROM data WHERE {where} GROUP BY iso, year, driver",
        "drivers",
    )

    cont = continent_of()
    years = list(range(FIRST, LAST + 1))
    yi = {y: i for i, y in enumerate(years)}
    zero = lambda: [0.0] * len(years)  # noqa: E731
    g_loss = defaultdict(zero)
    g_fire = defaultdict(zero)
    g_primary = defaultdict(zero)
    g_drivers: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(zero))
    country: dict[str, dict] = {}
    unmapped: dict[str, float] = defaultdict(float)

    for r in totals:
        y = int(r["year"])
        if y not in yi:
            continue
        g = cont.get(r["iso"])
        loss, fire = float(r["loss"] or 0), float(r["fire"] or 0)
        if not g:
            unmapped[r["iso"]] += loss
            continue
        g_loss[g][yi[y]] += loss
        g_fire[g][yi[y]] += fire
        c = country.setdefault(r["iso"], {"group": g, "name": NAMES_JA.get(r["iso"], r["iso"]), "loss": zero(), "fire": zero()})
        c["loss"][yi[y]] += loss
        c["fire"][yi[y]] += fire
    for r in primary:
        y, g = int(r["year"]), cont.get(r["iso"])
        if g and y in yi:
            g_primary[g][yi[y]] += float(r["loss"] or 0)
    for r in drivers:
        y, g = int(r["year"]), cont.get(r["iso"])
        if g and y in yi:
            name = DRIVER_JA.get(r["driver"], "不明")
            g_drivers[g][name][yi[y]] += float(r["loss"] or 0)

    rnd = lambda xs: [round(x) for x in xs]  # noqa: E731
    total_all = sum(sum(v) for v in g_loss.values()) + sum(unmapped.values())
    stats = {
        "source": {"dataset": DATASET, "version": version, "threshold": THRESHOLD},
        "years": years,
        "groups": {
            k: {
                "name": GROUPS[k],
                "loss": rnd(g_loss[k]),
                "fire": rnd(g_fire[k]),
                "primary": rnd(g_primary[k]),
                "drivers": {d: rnd(v) for d, v in sorted(g_drivers[k].items(), key=lambda kv: -sum(kv[1]))},
            }
            for k in GROUPS
        },
        "world": {"loss": rnd([sum(g_loss[k][i] for k in GROUPS) for i in range(len(years))])},
        "unmapped": {"countries": sorted(unmapped), "share": round(sum(unmapped.values()) / total_all, 5)},
    }
    P.PUBLIC.mkdir(parents=True, exist_ok=True)
    (P.PUBLIC / "stats.json").write_text(json.dumps(stats, ensure_ascii=False))
    (P.DATA / "country_year.json").write_text(json.dumps({"years": years, "countries": country}, ensure_ascii=False))
    world = sum(stats["world"]["loss"])
    print(f"大陸に振り分けられなかった国 {len(unmapped)}（減少面積の {stats['unmapped']['share']:.3%}）: {sorted(unmapped)[:12]}", file=sys.stderr)
    print(f"2001〜{LAST}年の世界の合計 {world / 1e6:.1f} 百万 ha", file=sys.stderr)
    for k, v in stats["groups"].items():
        print(f"  {v['name']}: {sum(v['loss']) / 1e6:.1f} 百万 ha（火災 {sum(v['fire']) / max(1, sum(v['loss'])):.0%}）", file=sys.stderr)


if __name__ == "__main__":
    main()
