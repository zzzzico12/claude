// JPL の接近と Sentry を取って保存する（JPL への問い合わせは6時間に1回、Sentry は1日に1回）
import { getStore } from "@advent/store";
import { OBJECTS } from "../reference/objects.js";
import { factsOf, type Approach, type Facts } from "./compare.js";
import { fetchApproaches, fetchSentry, type SentryEntry } from "./jpl.js";

const KEY = "asteroid-size-compare:cad";
const SENTRY_KEY = "asteroid-size-compare:sentry";
const CAD_TTL = 6 * 60 * 60;
const SENTRY_TTL = 24 * 60 * 60;

export interface Row extends Approach {
  facts: Facts;
  sentry: SentryEntry | null;
}

export interface Snapshot {
  fetchedAt: string;
  rows: Row[];
}

/** JPL の des（例：2026 WK1、217628）で Sentry を引く */
export function sentryOf(a: Approach, sentry: Map<string, SentryEntry>): SentryEntry | null {
  return sentry.get(a.des) ?? null;
}

async function cachedSentry(): Promise<Map<string, SentryEntry>> {
  const store = getStore();
  const raw = await store.get(SENTRY_KEY);
  if (raw) return new Map(JSON.parse(raw) as [string, SentryEntry][]);
  const m = await fetchSentry();
  // 今の接近と照らすのに要るのは名前と数字だけなので、全件（約2,300件）をそのまま保存する
  await store.set(SENTRY_KEY, JSON.stringify([...m]), SENTRY_TTL);
  return m;
}

export async function getSnapshot(): Promise<Snapshot> {
  const store = getStore();
  const raw = await store.get(KEY);
  let fetchedAt: string;
  let approaches: Approach[];
  if (raw) ({ fetchedAt, approaches } = JSON.parse(raw) as { fetchedAt: string; approaches: Approach[] });
  else {
    approaches = await fetchApproaches();
    fetchedAt = new Date().toISOString();
    await store.set(KEY, JSON.stringify({ fetchedAt, approaches }), CAD_TTL);
  }
  const sentry = await cachedSentry();
  // 保存しているあいだに過ぎた接近は除く
  const now = Date.now();
  const rows = approaches
    .filter((a) => Date.parse(a.time) >= now - 60 * 60 * 1000)
    .map((a) => ({ ...a, facts: factsOf(a, OBJECTS.objects), sentry: sentryOf(a, sentry) }));
  return { fetchedAt, rows };
}
