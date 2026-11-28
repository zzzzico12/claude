import { describe, expect, it } from "vitest";
import { numberWords } from "./number-words.js";
import { toReport } from "./ntrs.js";
import { toPatent } from "./patents.js";
import { verify } from "./search.js";
import { cosine, fromB64, toB64 } from "./voyage.js";

describe("特許の読み取り", () => {
  it("T2 の配列から、HTML の強調を外して読む。分野名の大文字・小文字をそろえる", () => {
    const p = toPatent(["LEW-TOPS-168", "LEW-TOPS-168", 'Next <span class="highlight">Engine</span>', "A &amp; B design", "LEW-TOPS-168", "aerospace", "", "", "", "GRC", "x.jpg", "", 16.4]);
    expect(p).toEqual({ id: "LEW-TOPS-168", title: "Next Engine", description: "A & B design", category: "Aerospace", center: "GRC", url: "https://technology.nasa.gov/patent/LEW-TOPS-168" });
    expect(toPatent(["", "", "", ""])).toBeNull();
  });
});

describe("報告書の読み取り", () => {
  const base = { id: 20180008759, title: "Water", abstract: "x".repeat(100), distribution: "PUBLIC", stiType: "CONFERENCE_PAPER", publications: [{ publicationDate: "2018-11-16T00:00:00" }], copyright: { determinationType: "PUBLIC_USE_PERMITTED" } };
  it("公開で要約があるものだけ。要約を画面に出せるかは著作権の判定で決める", () => {
    expect(toReport(base)).toMatchObject({ id: "20180008759", year: 2018, abstractPublic: true, url: "https://ntrs.nasa.gov/citations/20180008759" });
    expect(toReport({ ...base, distribution: "LIMITED" })).toBeNull();
    expect(toReport({ ...base, abstract: "short" })).toBeNull();
    expect(toReport({ ...base, copyright: { determinationType: "PUBLIC_USE_NOT_PERMITTED" } })?.abstractPublic).toBe(false);
  });
});

describe("ベクトル", () => {
  it("コサイン類似度と、保存用の base64 の行き来", () => {
    const a = Int8Array.from([10, 0, -5]);
    expect(cosine(a, a)).toBeCloseTo(1);
    expect(cosine(a, Int8Array.from([-10, 0, 5]))).toBeCloseTo(-1);
    expect([...fromB64(toB64(a))]).toEqual([...a]);
  });
});

describe("AI の説明の照合", () => {
  const candidates = [{ id: "LEW-TOPS-168", title: "Engine", text: "Delivers 300 kW at 95% efficiency", year: null }];
  const e = { overview: "効率95%の発電機です。", caution: "", picks: [{ id: "LEW-TOPS-168", why: "300 kW を出せる", how: "2つの方式を組み合わせる" }, { id: "FAKE-1", why: "", how: "" }] };
  it("候補にない ID は除き、数字は候補の説明文にあるものだけ通す", () => {
    const r = verify("電力がほしい", e, candidates);
    expect(r.unknownIds).toEqual(["FAKE-1"]);
    expect(r.explanation.picks.map((p) => p.id)).toEqual(["LEW-TOPS-168"]);
    expect(r.unmatchedNumbers).toEqual([]);
    const bad = verify("電力がほしい", { ...e, overview: "効率99%です。" }, candidates);
    expect(bad.unmatchedNumbers).toEqual(["99%"]);
  });
});

describe("英語の数", () => {
  it("seventy-two・One hundred eighteen・minus ninety を数にする", () => {
    expect(numberWords("operates for at least seventy-two hours")).toEqual([72]);
    expect(numberWords("One hundred eighteen specimens containing")).toEqual([118]);
    expect(numberWords("two thousand and five")).toEqual([2005]);
  });
  it("評価で見つかった4件（英語の数・minus・範囲の 10-20）は照合を通る", () => {
    const candidates = [{ id: "1", title: "t", text: "at least seventy-two hours from plus 20 degrees C to minus 90 degrees C. One hundred eighteen specimens. range 10-20 km", year: null }];
    const e = { overview: "-90℃まで72時間動いた。118個の試験片。解像度は10〜20km。", caution: "", picks: [] };
    expect(verify("課題", e, candidates).unmatchedNumbers).toEqual([]);
  });
});
