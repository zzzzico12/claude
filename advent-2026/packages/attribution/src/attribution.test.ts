import { describe, expect, it } from "vitest";
import { toHtml, toMarkdown, type Source } from "./index.js";

const sources: Source[] = [
  {
    name: "OpenAlex Works",
    provider: "OurResearch",
    url: "https://openalex.org/",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    retrievedAt: "2026-11-21",
  },
  {
    name: "Open-Meteo <API>",
    provider: "Open-Meteo",
    url: "https://open-meteo.com/",
    license: "CC BY 4.0",
    retrievedAt: "リアルタイム取得",
    credit: "Weather data by Open-Meteo.com",
    nonCommercial: true,
  },
];

describe("attribution", () => {
  it("Markdown の表を作る", () => {
    const md = toMarkdown(sources);
    expect(md).toContain("| [OpenAlex Works](https://openalex.org/) | OurResearch |");
    expect(md).toContain("**非商用**");
  });
  it("HTML はエスケープする", () => {
    const html = toHtml(sources);
    expect(html).toContain("Open-Meteo &lt;API&gt;");
    expect(html).toContain("<strong>非商用</strong>");
  });
  it("必須項目が欠けていたらエラー", () => {
    expect(() => toMarkdown([{ ...sources[0], license: "" }])).toThrow(/license/);
  });
});
