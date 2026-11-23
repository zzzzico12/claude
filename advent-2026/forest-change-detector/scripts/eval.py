"""評価：Hansen の森林減少（GFC-2025-v1.13、2025年の減少）を正解として、検知した場所の重なりを測る。

    uv run python scripts/eval.py     （先に scripts/pipeline.py を実行しておく）

- Hansen は30m、こちらはその1/3（約9m）の格子。こちらの 3×3 画素を Hansen の1画素にまとめ、
  9画素のうち5画素以上が変化なら「検知した」とする
- 正解：Hansen で2025年に減少した画素
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pipeline as P  # noqa: E402


def blocks(mask: np.ndarray, k: int = P.SCALE, need: int = 5) -> np.ndarray:
    h, w = (mask.shape[0] // k) * k, (mask.shape[1] // k) * k
    m = mask[:h, :w].reshape(h // k, k, w // k, k).sum(axis=(1, 3))
    return m >= need


def score(detected: np.ndarray, truth: np.ndarray) -> dict:
    tp = int((detected & truth).sum())
    fp = int((detected & ~truth).sum())
    fn = int((~detected & truth).sum())
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {"precision": precision, "recall": recall, "f1": f1, "detected_cells": tp + fp}


def main():
    g = P.grid()
    ids = json.loads((P.DATA / "scenes.json").read_text())
    load = lambda i: dict(np.load(P.DATA / "scenes" / f"{i}.npz"))  # noqa: E731
    before, after = load(ids["before"]), load(ids["after"])
    loss = P.read_hansen("lossyear", g)
    truth = blocks(loss == 25)  # Hansen の画素は 3×3 で同じ値なので、どちらでも同じ
    cell_ha = P.pixel_area_m2(g) * 9 / 10_000
    lost_2024 = blocks(loss == 24)

    def run(**kw):
        r = P.detect(before, after, g, **kw)
        det = blocks(r["change"])
        s = score(det, truth)
        # 検知したのに正解でない所のうち、Hansen では2024年に減少していた割合（前の年の画像の後、2024年中に切られた可能性）
        fp = det & ~truth
        s["fp_lost_2024"] = float((fp & lost_2024).sum() / max(1, fp.sum()))
        s["threshold"] = r["forest_threshold"]
        s["shift"] = r["shift"]
        s["patches"] = len(r["patches"])
        s["area_ha"] = round(sum(p.area_ha for p in r["patches"]), 1)
        return s

    variants = [
        ("最初の決まり（森 NDVI≥0.7 固定、ずれを除かない）", dict(forest=0.7, normalize=False)),
        ("森の境目を大津の方法に", dict(forest="otsu", normalize=False)),
        ("年ごとのずれを除く（森は 0.7 固定）", dict(forest=0.7, normalize=True)),
        ("**このアプリ（大津の方法＋ずれを除く）**", dict(forest="otsu", normalize=True)),
        ("このアプリから雲の除去（SCL）を外す", dict(forest="otsu", normalize=True, use_scl=False)),
    ]
    rows = []
    for label, kw in variants:
        s = run(**kw)
        rows.append(
            f"| {label} | {s['threshold']} | {s['shift']} | {s['patches']} | {s['area_ha']} | {s['precision']:.1%} | {s['recall']:.1%} | {s['f1']:.2f} |"
        )
        print(label, f"P={s['precision']:.3f} R={s['recall']:.3f} F1={s['f1']:.3f}", file=sys.stderr)

    sweep = []
    for d in (0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40):
        s = run(drop=d)
        sweep.append(f"| {d:.2f}{'（このアプリ）' if abs(d - P.DROP_NDVI) < 1e-9 else ''} | {s['patches']} | {s['area_ha']} | {s['precision']:.1%} | {s['recall']:.1%} | {s['f1']:.2f} |")
    main_s = run()

    meta = json.loads((P.RONDONIA / "result.json").read_text())
    md = f"""# 評価結果：衛星画像で森の変化を検知

- 実行日：{date.today()}
- 地域：{P.AREA.name}（約20km四方、中心 南緯{-P.AREA.center_lat}度・西経{-P.AREA.center_lon}度）
- 画像：前 {meta['before']['date']}（{meta['before']['id']}）、後 {meta['after']['date']}（{meta['after']['id']}）。範囲の中の晴れの割合 {meta['before']['clear']:.1%}・{meta['after']['clear']:.1%}
- 正解：Hansen ら Global Forest Change {P.HANSEN_VERSION} の「2025年に減少」。範囲の中で {truth.sum() * cell_ha:.0f} ha
- 比べ方：Hansen の30mの画素ごと（こちらの 3×3 画素のうち5画素以上が変化なら「検知した」）
- 再現：`uv run python scripts/pipeline.py && uv run python scripts/eval.py`

## 決まりの違いによる結果

| 決まり | 森の境目（NDVI） | 年ごとのずれ | まとまりの数 | 検知した面積（ha） | 適合率 | 再現率 | F1 |
| --- | --- | --- | --- | --- | --- | --- | --- |
{chr(10).join(rows)}

- 適合率：検知した場所のうち、Hansen でも2025年に減少していた割合
- 再現率：Hansen で2025年に減少した場所のうち、検知できた割合
- 検知したのに正解でなかった場所のうち {main_s['fp_lost_2024']:.0%} は、Hansen では「2024年に減少」だった（前の年の画像の日付 {meta['before']['date']} の後、2024年中に切られた可能性がある）

## NDVI の下がり方のしきい値を変えると

| しきい値 | まとまりの数 | 検知した面積（ha） | 適合率 | 再現率 | F1 |
| --- | --- | --- | --- | --- | --- |
{chr(10).join(sweep)}

しきい値は評価の前に 0.25 に決めた。表は、変えるとどうなるかを示すためのもので、評価に合わせて選び直してはいない。

## 読み方と限界

- **時期のずれ**：Hansen の「2025年の減少」は1〜12月。後の年の画像は {meta['after']['date']}（雨季に入ると雲の少ない画像がない）なので、それ以降に切られた森は画像に写っておらず、再現率が下がる。前の年の画像（{meta['before']['date']}）の後、2024年中に切られた森は、こちらでは検知されるが Hansen では2024年の減少なので、適合率が下がる
- **2024年は記録的な干ばつと火災の年**だった。前の年の画像では、森の NDVI が例年より低く（Hansen の森の中央値 0.66）、決まった値で森を判定すると大半を見落とした。画像ごとに大津の方法で境目を決め、年ごとのずれ（前の年に森だった所の NDVI の変化の中央値）を除いて対応した
- Hansen も衛星（Landsat）から作ったデータで、見落としや誤りがある。ここでの「正解」は参考の基準
- NDVI は植物の量の指標なので、木の一部だけを切る「劣化」や、伐採後すぐに草が生えた場所はとらえにくい
"""
    # 画面に出す要約
    (P.RONDONIA / "eval.json").write_text(
        json.dumps(
            {
                "truth_ha": round(float(truth.sum() * cell_ha)),
                "precision": round(main_s["precision"], 3),
                "recall": round(main_s["recall"], 3),
                "f1": round(main_s["f1"], 3),
                "baseline": {k: round(v, 3) for k, v in run(forest=0.7, normalize=False).items() if k in ("precision", "recall", "f1")},
                "fp_lost_2024": round(main_s["fp_lost_2024"], 3),
            },
            ensure_ascii=False,
        )
    )
    (P.APP / "eval").mkdir(exist_ok=True)
    (P.APP / "eval" / "RESULTS.md").write_text(md)
    print(md.split("## 読み方")[0], file=sys.stderr)


if __name__ == "__main__":
    main()
