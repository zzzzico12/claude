// 比べる物（Wikidata から取る）。値は優先（best rank）のものが1つだけのときだけ使う
export const UA = "advent-2026-asteroid-size-compare (https://github.com/zzzzico12/claude)";

export type Kind = "size" | "distance" | "speed";

export interface ObjectDef {
  qid: string;
  /** 使う性質：P2048 高さ・P2043 長さ・P2044 標高・P2386 直径・P2233 軌道長半径・P2052 速さ */
  prop: "P2048" | "P2043" | "P2044" | "P2386" | "P2233" | "P2052";
  kind: Kind;
  /** 数え方（日本語）：本・頭・機・隻・個・倍 */
  counter: string;
  /** 何の値か（画面用） */
  what: { ja: string; en: string };
  /** Wikidata の名前を使わないときの名前（英語の名前が学名になっているものなど） */
  label?: { ja?: string; en?: string };
}

/** 2026-11-28 に、どれも優先の値が1つだけと確かめたもの（README の表） */
export const OBJECT_DEFS: ObjectDef[] = [
  { qid: "Q2378708", prop: "P2048", kind: "size", counter: "個", what: { ja: "高さ", en: "height" } }, // 雷門
  { qid: "Q12366269", prop: "P2048", kind: "size", counter: "体", what: { ja: "高さ", en: "height" } }, // 鎌倉大仏
  { qid: "Q42196", prop: "P2043", kind: "size", counter: "頭", what: { ja: "体長", en: "length" }, label: { en: "blue whale" } }, // シロナガスクジラ
  { qid: "Q386246", prop: "P2048", kind: "size", counter: "個", what: { ja: "高さ", en: "height" } }, // 日本武道館
  { qid: "Q39054", prop: "P2048", kind: "size", counter: "本", what: { ja: "高さ", en: "height" } }, // ピサの斜塔
  { qid: "Q6505", prop: "P2043", kind: "size", counter: "機", what: { ja: "全長", en: "length" } }, // コンコルド
  { qid: "Q41225", prop: "P2048", kind: "size", counter: "本", what: { ja: "高さ", en: "height" } }, // ビッグ・ベン
  { qid: "Q1148463", prop: "P2048", kind: "size", counter: "本", what: { ja: "高さ", en: "height" } }, // 通天閣
  { qid: "Q37200", prop: "P2048", kind: "size", counter: "個", what: { ja: "高さ", en: "height" } }, // ギザの大ピラミッド
  { qid: "Q25173", prop: "P2043", kind: "size", counter: "隻", what: { ja: "全長", en: "length" } }, // タイタニック
  { qid: "Q16318627", prop: "P2048", kind: "size", counter: "棟", what: { ja: "高さ", en: "height" } }, // あべのハルカス
  { qid: "Q243", prop: "P2048", kind: "size", counter: "本", what: { ja: "高さ", en: "height" } }, // エッフェル塔
  { qid: "Q183536", prop: "P2048", kind: "size", counter: "本", what: { ja: "高さ", en: "height" } }, // 東京タワー
  { qid: "Q57965", prop: "P2048", kind: "size", counter: "本", what: { ja: "高さ", en: "height" } }, // 東京スカイツリー
  { qid: "Q12495", prop: "P2048", kind: "size", counter: "棟", what: { ja: "高さ", en: "height" } }, // ブルジュ・ハリファ
  { qid: "Q44440", prop: "P2043", kind: "size", counter: "本", what: { ja: "全長", en: "length" } }, // ゴールデンゲートブリッジ
  { qid: "Q39231", prop: "P2044", kind: "size", counter: "個", what: { ja: "標高", en: "elevation" } }, // 富士山
  { qid: "Q184213", prop: "P2043", kind: "size", counter: "本", what: { ja: "全長", en: "length" } }, // 明石海峡大橋
  { qid: "Q513", prop: "P2044", kind: "size", counter: "個", what: { ja: "標高", en: "elevation" } }, // エベレスト
  { qid: "Q137728", prop: "P2043", kind: "size", counter: "本", what: { ja: "全長", en: "length" } }, // 東京湾アクアライン
  { qid: "Q405", prop: "P2233", kind: "distance", counter: "倍", what: { ja: "地球からの平均距離", en: "mean distance from Earth" } }, // 月
  { qid: "Q2", prop: "P2386", kind: "distance", counter: "個", what: { ja: "直径", en: "diameter" } }, // 地球
  { qid: "Q957322", prop: "P2052", kind: "speed", counter: "倍", what: { ja: "最高速度", en: "top speed" } }, // 新幹線 E5系
  { qid: "Q2", prop: "P2052", kind: "speed", counter: "倍", what: { ja: "公転の速さ", en: "orbital speed" } }, // 地球
];

export interface RefObject extends ObjectDef {
  name: { ja: string; en: string };
  /** SI 単位（大きさ・距離は m、速さは m/s） */
  value: number;
}

export interface ObjectsFile {
  retrievedAt: string;
  source: string;
  objects: RefObject[];
  /** 値が1つに決まらず除いたもの */
  skipped: { qid: string; prop: string; values: number[] }[];
}

/** Wikidata から、各物の優先の値（SI 単位に直したもの）と、日本語・英語の名前を取る */
export async function fetchObjects(defs = OBJECT_DEFS): Promise<ObjectsFile> {
  const items = [...new Set(defs.map((d) => `wd:${d.qid}`))].join(" ");
  const props = [...new Set(defs.map((d) => `"${d.prop}"`))].join(" ");
  const query = `SELECT ?item ?prop ?v ?ja ?en WHERE {
    VALUES ?item { ${items} } VALUES ?prop { ${props} }
    BIND(IRI(CONCAT("http://www.wikidata.org/prop/", ?prop)) AS ?p)
    BIND(IRI(CONCAT("http://www.wikidata.org/prop/statement/value-normalized/", ?prop)) AS ?psn)
    ?item ?p ?st . ?st a wikibase:BestRank ; ?psn ?node . ?node wikibase:quantityAmount ?v .
    OPTIONAL { ?item rdfs:label ?ja FILTER(LANG(?ja) = "ja") } OPTIONAL { ?item rdfs:label ?en FILTER(LANG(?en) = "en") }
  }`;
  const res = await fetch(`https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": UA, Accept: "application/sparql-results+json" },
  });
  if (!res.ok) throw new Error(`Wikidata が HTTP ${res.status} を返しました`);
  const j = (await res.json()) as { results: { bindings: Record<string, { value: string }>[] } };
  const values = new Map<string, Set<number>>();
  const names = new Map<string, { ja: string; en: string }>();
  for (const b of j.results.bindings) {
    const qid = b.item.value.split("/").at(-1)!;
    const key = `${qid}:${b.prop.value}`;
    if (!values.has(key)) values.set(key, new Set());
    values.get(key)!.add(Number(b.v.value));
    names.set(qid, { ja: b.ja?.value ?? b.en?.value ?? qid, en: b.en?.value ?? qid });
  }
  const objects: RefObject[] = [];
  const skipped: ObjectsFile["skipped"] = [];
  for (const d of defs) {
    const vs = [...(values.get(`${d.qid}:${d.prop}`) ?? [])];
    const n = names.get(d.qid)!;
    if (vs.length === 1) objects.push({ ...d, name: { ja: d.label?.ja ?? n.ja, en: d.label?.en ?? n.en }, value: vs[0] });
    else skipped.push({ qid: d.qid, prop: d.prop, values: vs });
  }
  return { retrievedAt: new Date().toISOString(), source: "Wikidata (https://www.wikidata.org/), CC0", objects, skipped };
}
