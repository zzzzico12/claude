import type { Source } from "@advent/attribution";

// 出典は画面・README・API の応答にここから出す（利用条件は 2026-11-26 に各提供元のページで確認）
export const sources: Source[] = [
  {
    name: "NASA 技術移転プログラムの特許（T2 ポータル）",
    provider: "NASA Technology Transfer Program",
    url: "https://technology.nasa.gov/",
    license: "米国政府の著作物（NASA の文章は原則として著作権なし）。特許そのものを使うにはライセンス契約が要る",
    licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
    retrievedAt: "デプロイのたびに取得",
  },
  {
    name: "NASA 技術報告書サーバー（NTRS）",
    provider: "NASA Scientific and Technical Information (STI) Program",
    url: "https://ntrs.nasa.gov/",
    license: "報告書ごとに異なる。要約を画面に出すのは「公共利用可」と判定されたものだけ",
    licenseUrl: "https://sti.nasa.gov/disclaimers/",
    retrievedAt: "課題ごとにリアルタイム検索",
  },
];

/** API の応答に入れる短い出典 */
export const ATTRIBUTION = {
  patents: "NASA Technology Transfer Program (https://technology.nasa.gov/)",
  reports: "NASA Technical Reports Server (https://ntrs.nasa.gov/)",
  note: "Patented NASA technologies require a license agreement to use commercially.",
};
