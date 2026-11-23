// 評価の基準日：2022-06-01 から2026-06-01 まで3か月ごと（17回）
export const SNAPSHOT_DATES: string[] = [];
for (let y = 2022; y <= 2026; y++) {
  for (const m of ["03", "06", "09", "12"]) {
    const d = `${y}-${m}-01`;
    if (d >= "2022-06-01" && d <= "2026-06-01") SNAPSHOT_DATES.push(d);
  }
}

/** 基準日の後、この日数以内に KEV に載ったものを正解にする */
export const HORIZON_DAYS = 90;
