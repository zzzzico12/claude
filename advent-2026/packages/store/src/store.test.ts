import { describe, expect, it } from "vitest";
import { dailyLimit, getStore, hashKey } from "./index.js";

describe("store（環境変数がないのでメモリ）", () => {
  it("set / get / incr", async () => {
    const s = getStore();
    await s.set("k", "v", 60);
    expect(await s.get("k")).toBe("v");
    expect(await s.incr("n", 60)).toBe(1);
    expect(await s.incr("n", 60)).toBe(2);
  });
  it("hashKey は SHA-256 の先頭32文字（Day01 の保存済みキーと同じ）", async () => {
    expect(await hashKey("検索拡張生成（RAG）|2016")).toBe("28b7fe5079be3d3b4814778faf932328");
  });
});

describe("dailyLimit", () => {
  it("IP ごとの上限と、全体の上限を超えたら理由を返す", async () => {
    const s = getStore();
    const opts = { app: `t${Math.random()}`, total: 3, perIp: 2 };
    expect(await dailyLimit(s, { ...opts, ip: "a" })).toBeNull();
    expect(await dailyLimit(s, { ...opts, ip: "a" })).toBeNull();
    expect(await dailyLimit(s, { ...opts, ip: "a" })).toMatch(/1人あたり1日2回/);
    expect(await dailyLimit(s, { ...opts, ip: "b" })).toBeNull();
    expect(await dailyLimit(s, { ...opts, ip: "c" })).toMatch(/全体で3回/);
  });
});
