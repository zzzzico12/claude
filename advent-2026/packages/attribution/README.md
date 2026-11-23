# packages/attribution：出典の表示

- **使う日**：全日
- **役割**：データの出典・ライセンス・取得日を、画面（HTML）とREADME（Markdown）に同じ内容で出す

## 使い方

各アプリで出典を1か所（例：`src/sources.ts`）だけに書き、画面とREADMEの両方をそこから作る。

```ts
import { mountAttribution, toMarkdown, type Source } from "@advent/attribution";

export const sources: Source[] = [
  {
    name: "OpenAlex Works",
    provider: "OurResearch",
    url: "https://openalex.org/",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    retrievedAt: "2026-11-21",
  },
];

mountAttribution(document.querySelector("#attribution")!, sources); // 画面
console.log(toMarkdown(sources)); // README の「データと出典」に貼る表
```

- `name`・`provider`・`url`・`license`・`retrievedAt` は必須。欠けているとエラーになる
- 非商用条件のデータは `nonCommercial: true` にすると、画面と表の両方に「非商用」と出る
- 提供元が決めたクレジット表記は `credit` にそのまま書く
- 英語の画面では `mountAttribution(el, sourcesEn, { lang: "en" })` とする。見出しや「取得日」などの言葉が英語になる（Source の中身は英語のものを渡す）。既定は日本語
