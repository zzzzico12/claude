# Day 02（12/2 水）依存ライブラリと脆弱性の優先度判定

- **アプリ名（フォルダ名）**：`dependency-risk-radar`
- **ジャンル**：セキュリティ
- **完成形**：CLI ＋ GitHub Action（Web のデモは作らない。2026-11-23 決定）
- **組み合わせるデータ**：OSV × deps.dev × CISA KEV × EPSS
- **AI・技術の見どころ**：エージェント・判断の説明

## 作るもの

package.json などを渡すと、危ない依存、放置されている依存、今日対応すべき脆弱性の順番、乗り換え先を出す

## 使い道

大量の脆弱性アラートの中から、本当に急ぐものだけを選ぶ

## 確かめ方（評価）

過去に実際に悪用された脆弱性（後からCISA KEVに載ったもの）を、その前の時点で上位に置けていたかを振り返る

評価のスクリプトと結果は `eval/` に置く。

## 1日で作る工夫・注意

優先度の計算はコードで行い、AIは「なぜこの順番か」の説明と乗り換え先の提案に役割を絞る

## 必要な環境変数

- データ：なし（4つともキー不要）
- AI の説明と乗り換え先の提案：`ANTHROPIC_API_KEY`（なければ AI なしでレポートを作る）、`CLAUDE_MODEL`（任意）

## 使い方

### はじめて使う（5分）

```bash
# 1. リポジトリを取ってきて、依存を入れてビルドする（Node.js 22 以降と pnpm 9 が必要）
git clone https://github.com/zzzzico12/claude.git
cd claude/advent-2026
pnpm install
pnpm build              # 共通部品（packages/）をビルドする。最初の1回だけ

# 2. （任意）AI の説明と乗り換え先の提案を使うなら、Claude の API キーを入れる
cp .env.example .env     # .env の ANTHROPIC_API_KEY= にキーを書く

# 3. 例のファイルで試す
cd dependency-risk-radar
pnpm start examples/old-django.requirements.txt --top 5
```

実行すると、進み具合が出たあとに Markdown のレポートが出る。

```
依存 7 個の脆弱性を OSV で調べています…
脆弱性 136 件の悪用確率を EPSS で調べています…
直接の依存 7 個の更新状況を deps.dev で調べています…
AI が順番の理由を説明しています…
AI が乗り換え先を調べています（1 個）…
# 依存ライブラリのリスクレポート
`old-django.requirements.txt` ・ 依存 7 個（直接 7 個） ・ 脆弱性 136 件 ・ **今日対応すべき 10 件**（悪用確認済み 1 件） ・ 修正版あり 135 件
…
```

自分のプロジェクトを調べるときは、例のファイルの代わりに自分の `package-lock.json` か `requirements.txt` のパスを渡す。

```bash
pnpm start ~/work/my-app/package-lock.json --out ~/work/my-app/risk-report.md
```

### 手元で（CLI）

```bash
cd advent-2026/dependency-risk-radar   # 最初に advent-2026 で pnpm install && pnpm build しておく
pnpm start path/to/package-lock.json            # 画面に Markdown を出す
pnpm start path/to/requirements.txt --out report.md
pnpm start path/to/package-lock.json --no-ai    # キーなしで
```

| オプション | 意味 |
| --- | --- |
| `--top <数>` | 説明する上位の件数（既定 10） |
| `--no-ai` | AI の説明と乗り換え先の提案を使わない |
| `--out <ファイル>` | レポートの書き出し先 |
| `--json` | JSON で出す |
| `--fail-on kev\|urgent\|none` | 悪用確認済み（kev）や今日対応すべきもの（urgent）があれば終了コード 1 |

対応するファイル：`package-lock.json`（lockfileVersion 2 以上。npm 7 以降）、`requirements.txt`（`名前==バージョン` と固定した行。範囲指定の行は読み飛ばしてレポートに書く）。

### GitHub Action

```yaml
# .github/workflows/dependency-risk.yml
name: dependency risk
on:
  pull_request:
  schedule:
    - cron: "0 0 * * 1"   # 毎週月曜
jobs:
  radar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: zzzzico12/claude/advent-2026/dependency-risk-radar@main
        with:
          file: package-lock.json
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}  # 省略すると AI なし
          fail-on: kev                                         # 悪用確認済みがあれば失敗にする
```

レポートはジョブの Summary に出る。このリポジトリでは `.github/workflows/advent-2026-radar-demo.yml` が、例のファイル（`examples/`）で Action を動かして確かめている。

### 例

`examples/` に、わざと古いバージョンにした依存ファイルと、それで作ったレポート（AI あり）を置いた。

| 依存ファイル | レポート | 内容 |
| --- | --- | --- |
| `old-express.package-lock.json` | [old-express.report.md](examples/old-express.report.md) | Express 4.16・axios 0.21・request など。依存297個、脆弱性71件 → 今日対応すべき5件 |
| `old-django.requirements.txt` | [old-django.report.md](examples/old-django.report.md) | Django 3.2.0・Pillow 8.0.0 など。脆弱性136件 → 今日対応すべき10件（悪用確認済み1件） |

ファイル名を `package-lock.json` / `requirements.txt` にしていないのは、このリポジトリで Dependabot の警告が出ないようにするため。

### レポートの読み方

例：[old-django.report.md](examples/old-django.report.md)（古い Django のプロジェクト）。上から順に読めば、何から手を付ければよいかが分かるようにしてある。

**① 1行目：全体の状況**

```
依存 7 個（直接 7 個） ・ 脆弱性 136 件 ・ 今日対応すべき 10 件（悪用確認済み 1 件） ・ 修正版あり 135 件
```

136件の警告のうち、急ぐのは10件。「今日対応すべき」は、CISA KEV に載っている（実際に悪用が確認された）か、EPSS（30日以内に悪用される確率）が全CVEの上位5%に入るもの。

**② 今日対応すべき順の表：1行目から順に直す**

| 順位 | パッケージ | 脆弱性 | 根拠 | 依存 | 対応 |
| --- | --- | --- | --- | --- | --- |
| 1 ⚠️ | pillow@8.0.0 | CVE-2023-4863 libwebp: OOB write | 🔴 **悪用確認済み**（KEV 2023-09-13）<br>悪用確率 99.9%以上<br>HIGH 8.8 | 直接 | 10.0.1 に上げる |
| 2 ⚠️ | django@3.2.0 | CVE-2022-34265 SQL Injection | 悪用確率 73.6%（上位0.5%）<br>CRITICAL 9.8 | 直接 | 3.2.14 に上げる |

- ⚠️ が「今日対応すべき」、🔴 が「悪用確認済み」
- 「根拠」の列が順位の理由。深刻度（CVSS）が CRITICAL でも、悪用確率が低ければ下に来る
- 「依存」の列：開発用（devDependencies）や npm の間接の依存は、本番の影響が小さいので少し下げている

**③ なぜこの順番か（AI による説明）**：表の根拠を、開発者向けの文章にしたもの。数字は根拠のデータと自動で照合している（最後の「自動チェック」に結果が出る）

**④ パッケージごとの対応：実際の作業の単位**

| パッケージ | 脆弱性 | うち今日対応すべき | すべて直すには |
| --- | --- | --- | --- |
| pillow@8.0.0 | 72 件 | **1 件**（悪用確認済み 1） | 13.0.0 以上 |
| django@3.2.0 | 38 件 | **9 件** | 5.2.17 以上 |

脆弱性は136件でも、作業は「pillow と django を上げる」の2つで今日対応すべきものがすべて片付く。

**⑤ 放置・非推奨の直接の依存：乗り換えを考えるもの**

| パッケージ | 状態 | 乗り換え先の提案（AI） |
| --- | --- | --- |
| nose@1.3.7 | 最新版の公開が 2015-06（11年以上前） | 🔧 標準機能：unittest<br>✅ **pytest**（9.2.0）<br>✅ **nose2**（0.16.0） |

- 🔧 は言語やランタイムの標準機能で置き換えられるもの、✅ は AI の提案をコードで deps.dev に問い合わせて「実在・非推奨でない・2年以内に更新あり」を確かめたもの、❓ は確かめられなかったもの
- 「このバージョンは非推奨」（npm でよくある「上げて」の印）は、乗り換えではなくバージョンを上げればよい

**⑥ 自動チェック**：AI の説明の数字が根拠と一致したか、読めなかった行がないか、使ったデータの日付

### よくある使い方

**1. 自分のプロジェクトを、今すぐ調べる**

```bash
pnpm start ~/work/my-app/package-lock.json --out report.md
```

**2. キーなしで（AI を使わずに）**

```bash
pnpm start ~/work/my-app/requirements.txt --no-ai
```

順位・根拠・パッケージごとの対応・放置の判定は出る。出ないのは「なぜこの順番か」の文章と乗り換え先の提案だけ。データの取得はすべて無料。

**3. プルリクエストのたびに調べ、悪用確認済みがあれば止める（GitHub Action）**

```yaml
on: pull_request
jobs:
  radar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: zzzzico12/claude/advent-2026/dependency-risk-radar@main
        with:
          file: package-lock.json
          fail-on: kev          # 悪用確認済みの脆弱性があればジョブを失敗にする
```

**4. 毎週月曜に定期チェックする（AI の説明つき）**

```yaml
on:
  schedule:
    - cron: "0 0 * * 1"
jobs:
  radar:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: zzzzico12/claude/advent-2026/dependency-risk-radar@main
        with:
          file: backend/requirements.txt
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

レポートは、Actions の実行結果のページの **Summary** に出る。

**5. 結果を他のツールで使う（JSON）**

```bash
pnpm start package-lock.json --no-ai --json \
  | jq -r '.findings[] | select(.priority.urgent)
           | "\(.dep.name)@\(.dep.version)  \(.vuln.cves[0] // .vuln.id)  → \(.vuln.fixedVersion // "修正版なし")"'
```

```
lodash@4.17.15  CVE-2021-23337  → 4.17.21
moment@2.29.1  CVE-2022-24785  → 2.29.2
qs@6.5.1  CVE-2022-24999  → 6.5.3
axios@0.21.0  CVE-2026-44492  → 0.32.0
axios@0.21.0  CVE-2021-3749  → 0.21.2
```

## 実装チェックリスト

- [x] データの取得方法と利用条件（ライセンス・クレジット表記・非商用の有無）を確認し、下の「データと出典」に書いた
- [x] 大きなデータは事前に取得して `data/`（Git管理外）に置いた。取得スクリプトは `scripts/` に置いた（評価用。`pnpm eval:fetch`）
- [x] 実装の計画をこのファイルの「実装メモ」に書いた
- [x] 動くものができた（`src/`）
- [x] 確かめ方のスクリプトを動かし、結果を `eval/RESULTS.md` に書いた
- [x] 画面またはREADMEに出典を表示した（レポートの最後と、このファイル）
- [x] スマホなど実機での動作確認をした（必要な場合）（CLI なので不要）
- [ ] デプロイした（GitHub Action として公開。このリポジトリの CI で動作確認する）
- [ ] 記事の下書き `ARTICLE.md` を書いた

## データと出典

| データ | 提供元 | ライセンス | 取得日 | 備考 |
| --- | --- | --- | --- | --- |
| [OSV（オープンソースの脆弱性データベース）](https://osv.dev/) | Google / OpenSSF | [元データベースごとのライセンス（GitHub Advisory Database・PyPI Advisory Database・Go Vulnerability Database は CC BY 4.0）](https://google.github.io/osv.dev/data/) | 実行のたびに取得 | 表記: GitHub Advisory Database（CC BY 4.0）、PyPI Advisory Database（CC BY 4.0） |
| [deps.dev（パッケージのバージョン・非推奨・リポジトリ）](https://deps.dev/) | Google Open Source Insights | [データのライセンスの明記なし（Google 利用規約）](https://policies.google.com/terms) | 実行のたびに取得 |  |
| [CISA Known Exploited Vulnerabilities Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) | CISA（米国 サイバーセキュリティ・社会基盤安全保障庁） | [CC0 1.0](https://www.cisa.gov/sites/default/files/licenses/kev/license.txt) | 実行のたびに取得 | CISA・DHS による推奨を意味しない |
| [EPSS（Exploit Prediction Scoring System）](https://www.first.org/epss/) | FIRST（EPSS SIG） | [無料・登録不要（利用時は出典の明記が求められている）](https://www.first.org/epss/faq) | 実行のたびに取得 | 表記: EPSS scores by FIRST (https://www.first.org/epss/) |

- 2026-11-23 に各提供元のページで確認した。OSV 全体のライセンスはなく、元データベースごとに決まっている（[OSV のデータソース一覧](https://google.github.io/osv.dev/data/)）。npm と PyPI で主に使う GitHub Advisory Database と PyPI Advisory Database は CC BY 4.0
- KEV は CC0 1.0。CISA のロゴは使わず、推奨を受けたような書き方もしない
- EPSS は「Attribution is requested when EPSS data is used in publications or products」（FIRST の FAQ）。レポートの出典に書いている
- deps.dev はデータのライセンスの明記がない。Google の利用規約に従う
- 非商用条件のデータは使っていない

## 実装メモ

### 試してわかったこと（2026-11-23）

- **4つともキー不要で使える**
  - OSV：`/v1/querybatch` でパッケージとバージョンの一覧から脆弱性IDをまとめて引ける。詳細（CVE番号、影響するバージョン、修正版、深刻度）は `/v1/vulns/{id}`
  - deps.dev：パッケージごとのバージョン一覧と公開日、**非推奨（deprecated）の印とその理由**、ライセンス、GitHubのリポジトリ。例：`request` は「request has been deprecated」と返る
  - CISA KEV：JSON 1ファイル（2026-11-20時点で1,790件）。CVEごとに「KEVに載った日（dateAdded）」がある
  - EPSS：CVEごとの「30日以内に悪用される確率」。**過去の日付のスコアも取れる**（API は2022年以降。日ごとの一括CSVは1日分1.3MB）
- **評価に使える量がある**：OSV の一括データ（npm 以外の6エコシステム）と KEV を突き合わせると、オープンソースのライブラリの CVE で KEV に載ったものは124件。うち2022年以降に載ったものは約100件
  - Maven 54、Packagist 24、PyPI 23、NuGet 16、Go 11、RubyGems 4
  - npm の一括データは222MB（大半はマルウェアの記録）なので、まだ数えていない
- KEV は2021年11月に始まった一覧で、最初の数か月は古い CVE（2006年のものなど）がまとめて追加された。**「載った日」が悪用の始まった日ではない**ので、評価では注意する

### 実装してわかったこと（2026-11-23）

- **同じ脆弱性が2件来る**：PyPI では、GitHub（GHSA）と PyPA（PYSEC）の両方に同じ CVE が登録されていて、OSV から2件返る。CVE 番号でまとめた（Django などの例で245件 → 136件）。深刻度は分かっているほう、修正版は低いほうを使う
- **「非推奨」には2種類ある**：npm では「このバージョンは使わないで、上げて」の印（例：axios 0.21.0）と、パッケージ自体の非推奨（例：request）がある。前者はバージョンを上げれば済むので、乗り換え先は調べない。deps.dev で最新版も非推奨かどうかを見て区別した
- **乗り換え先は「標準機能」のことがある**：node-fetch や request の代わりは、Node.js 18 以降の組み込みの fetch。AI に「標準機能」も答えられるようにした
- **脆弱性の数と作業の量は違う**：Django 3.2.0 だけで38件あるが、作業は「上げる」1回。パッケージごとに「どこまで上げれば何件直るか」の表を足した
- **表示の丸め**：EPSS 0.99999 を「100.0%」、上位 0.001% を「0.0%」と書くと誤解されるので、「99.9%以上」「0.1%未満」にした
- **EPSS の一括データは欠けている日がある**（2024-12-01 は 403）。翌日以降の分を使い、実際の日付を記録する
- AI の働き：乗り換え先の提案で、AI は deps.dev を調べる道具を2〜5回使い、提案した候補はすべて実在・更新ありだった（コードで再確認）。順番の説明の数字は、例の2つとも根拠のデータと一致した
- 1回の実行：データだけなら6〜12秒、AI ありで約25秒。料金は Claude Sonnet 5.5 で 0.02〜0.03ドル（3〜5円）

### 作るもの（完成形）

- **CLI**：`npx tsx dependency-risk-radar/src/cli.ts <package-lock.json か requirements.txt>` → Markdown のレポート
- **GitHub Action**：プルリクエストや定期実行でレポートを作り、ジョブの Summary に出す（`uses: zzzzico12/claude/advent-2026/dependency-risk-radar@main`）
- Web のデモは作らない。Claude のキーは使う人のもの（`ANTHROPIC_API_KEY`）を使う。キーがなければ AI の説明なしでレポートを出す

### 処理の流れ

```
package-lock.json / requirements.txt
  │ ① コード：依存の一覧（名前・バージョン・直接か間接か・開発用か）
  ▼
OSV querybatch ─→ 脆弱性（CVE、修正版、深刻度）
deps.dev ─────→ 最新版の公開日、非推奨の印、リポジトリ
KEV ──────────→ 悪用が確認済みか
EPSS ─────────→ 30日以内に悪用される確率
  │ ② コード：優先度の点数と順位（下の「優先度の決め方」）
  ▼
  │ ③ Claude（エージェント）：
  │    ・上位の脆弱性について「なぜこの順番か」を、②の根拠（KEV・EPSS・修正版の有無など）だけを使って説明
  │    ・放置・非推奨の依存について乗り換え先を提案。候補は deps.dev を調べるツールで実在と更新状況を確かめさせる
  ▼
  ④ コード：照合（説明の数字が②と一致するか、提案したパッケージが実在して更新されているか）
  ▼
Markdown レポート：今日対応すべき順の表、放置・非推奨の依存、乗り換え先、出典
```

### 優先度の決め方（すべてコードで計算）

1. **KEV に載っている** → 最優先（すでに悪用されている）
2. 次に **EPSS**（悪用される確率）が高い順
3. 同じくらいなら **深刻度**（CRITICAL > HIGH > MODERATE > LOW）
4. **修正版がある**ものを上に（すぐ対応できる）
5. **開発用の依存**（devDependencies）は下げる

「放置されている依存」：最新版が2年以上出ていない、または deps.dev で非推奨になっているもの。

### 評価の結果（2026-11-23）

詳細は [eval/RESULTS.md](eval/RESULTS.md)。基準日17回・正解のべ40件。

| 並べ方 | 正解の順位（中央値） | 上位100件で拾えた数 | 上位1%に入った割合 |
| --- | --- | --- | --- |
| ① 深刻度（CVSS）だけ | 1,931 位 | 1 / 40 | 7.5% |
| ② EPSS だけ | 254 位 | 11 / 40 | 35.0% |
| **③ このアプリ** | **140 位** | **13 / 40** | **45.0%** |

- 重み（深刻度の係数）は評価の前に決めた値のまま。評価に合わせた調整はしていない
- うまくいった例：PHPMailer（CVE-2016-10033）や Jenkins（CVE-2017-1000353）など、古くから知られていて後から KEV に載ったもの。基準日の EPSS がすでに94%あり、1位
- 苦手な例：ray（CVE-2025-62593）や litellm（CVE-2026-42271）など、**公開されてすぐ悪用された新しい脆弱性**。基準日の EPSS がほぼ0%で、約2万件中2万位。EPSS が付く前の悪用は拾えない

### 評価（確かめ方）

**時点を戻して、その時に知り得た情報だけで順位を付け、その後 KEV に載った脆弱性を上位に置けていたかを見る。**

- 基準日：2022-06-01 から2026-06-01 まで3か月ごと（17回）
- 候補：基準日までに公開された、オープンソースのライブラリの CVE（OSV の一括データ）。その日にすでに KEV に載っていたものは除く
- 正解：基準日の後90日以内に KEV に載ったもの
- 各候補の点数：基準日の EPSS（過去のスコア）と深刻度、修正版の有無（基準日時点）
- 指標：正解が上位何%に入ったか（中央値）、上位1%・上位100件に何件入ったか
- 比較：深刻度だけで並べた場合、EPSS だけで並べた場合、このアプリの順位
- 限界：KEV に載った日は悪用が始まった日ではない。EPSS 自体が KEV の情報も学習に使っているので、「EPSS だけ」が強いのは当然で、このアプリの価値は「依存の文脈（直接か、開発用か、修正版があるか）」の部分にある。そこは KEV の振り返りでは測れない

## 記事を書くときのメモ

Qiita の記事を書くための材料。下書きは [ARTICLE.md](ARTICLE.md) にもある。

### 一言でいうと

脆弱性の警告を「深刻度」ではなく「実際に悪用されそうか」の順に並べ直す CLI と GitHub Action。順位はコードが KEV（悪用確認済み）と EPSS（悪用される確率）で決め、AI は理由の説明と、放置された依存の乗り換え先探しだけを担当する。乗り換え先は、AI が deps.dev を調べる道具を使って実在と更新状況を確かめ、最後にコードでもう一度確かめる。

### 見せ場とコードの場所

| 見せ場 | 何を見せるか | コード |
| --- | --- | --- |
| 優先度の式 | KEV なら +10、それ以外は EPSS × 深刻度の係数 × 依存の文脈（開発用 0.5 倍、npm の間接 0.8 倍） | [src/score.ts](src/score.ts#L28) |
| 「今日対応すべき」の線引き | KEV に載っている、または EPSS が全CVEの上位5% | [src/score.ts](src/score.ts#L54) |
| エージェント | AI に `lookup_package`（deps.dev を調べる）と `submit_alternatives`（提出）の2つの道具を渡す。SDK の toolRunner がループを回す | [src/ai.ts](src/ai.ts#L128)、共通部品 [packages/ai/src/claude.ts](../packages/ai/src/claude.ts#L158) |
| AI の提案をコードで再確認 | 提案されたパッケージを deps.dev に問い合わせ、実在・非推奨でない・2年以内に更新あり、を確かめて ✅ / ❓ を付ける | [src/ai.ts](src/ai.ts#L164) |
| 説明の数字の照合 | CVE 番号・日付・バージョン番号を取り除いてから、説明の数字が根拠のデータにあるかを照合（Day01 の共通部品） | [src/ai.ts](src/ai.ts#L40) |
| 同じ脆弱性の重複 | GHSA と PYSEC の2件を CVE 番号で1件に | [src/sources/osv.ts](src/sources/osv.ts#L99) |
| 「非推奨」の2種類 | このバージョンだけ（上げればよい）か、パッケージ自体か | [src/health.ts](src/health.ts#L17) |
| パッケージごとの対応 | 「どこまで上げれば何件直るか」 | [src/report.ts](src/report.ts#L56) |
| 修正版の探し方 | OSV の影響範囲（introduced / fixed の組）から、今のバージョンが入る範囲の修正版 | [src/version.ts](src/version.ts#L33) |
| 時点を戻した評価 | 基準日の EPSS の一括 CSV を使い、その後90日以内に KEV に載ったものの順位を見る。同点は平均の順位 | [scripts/eval.ts](scripts/eval.ts#L45) |
| GitHub Action | composite action。レポートを Job Summary に出し、`fail-on: kev` で失敗にできる | [action.yml](action.yml) |

### 使える数字

| 項目 | 値 | 出どころ |
| --- | --- | --- |
| 評価（上位100件で拾えた、その後悪用された脆弱性） | 深刻度だけ 1/40、EPSS だけ 11/40、**このアプリ 13/40** | [eval/RESULTS.md](eval/RESULTS.md) |
| 評価（正解の順位の中央値） | 深刻度だけ 1,931位 → **このアプリ 140位**（候補は1回あたり約1.5万件） | 同上 |
| 評価の規模 | 基準日17回（2022-06〜2026-06）、正解のべ40件、オープンソースの CVE 約2.7万件 | 同上 |
| 例：古い Express のプロジェクト | 依存297個、脆弱性71件 → 今日対応すべき5件 | [examples/old-express.report.md](examples/old-express.report.md) |
| 例：古い Django のプロジェクト | 脆弱性136件（重複をまとめる前は245件）→ 今日対応すべき10件、うち悪用確認済み1件（Pillow の libwebp、CVE-2023-4863） | [examples/old-django.report.md](examples/old-django.report.md) |
| 実行時間 | データだけ6〜12秒、AI ありで約25秒 | 手元で計測 |
| 料金 | 1回 0.02〜0.03ドル（3〜5円、Claude Sonnet 5.5）。データは無料 | 使用量のログ |
| KEV の規模 | 1,790件（2026-11-20版）。オープンソースのライブラリのものは124件（npm を除く） | 実装メモ |

### AI の振る舞いで面白かった例

- **「標準機能で足りる」と答えた**：node-fetch と request の乗り換え先として、まず「Node.js 18 以降の組み込みの fetch」を挙げた（最初の作りでは npm のパッケージしか答えられなかったので、答えられるように直した）
- **minimist に util.parseArgs を提案**：長く更新がない minimist に対して、Node.js 標準の `util.parseArgs` と yargs-parser を挙げた
- **nose には後継の nose2 と pytest**：道具で両方を調べ、どちらも最近更新されていることを確かめてから提案した
- **順番の説明は根拠の数字をそのまま使った**：「EPSS 73.6%（全CVEの上位0.5%）、CRITICAL（CVSS 9.8）」のように、渡した値を書き換えずに使い、照合で不一致は0だった

### ハマったところ（記事向けの言い方）

1. 同じ脆弱性が GHSA と PYSEC の2件で返ってきて、件数が倍近くに水増しされた
2. npm の「非推奨」は、バージョン単位の「上げて」の印のことが多い。axios 0.21.0 を「乗り換えが必要」と判定してしまった
3. EPSS 0.99999 を「100.0%」と表示してしまう
4. EPSS の一括データに欠けている日があった（2024-12-01）
5. 評価：KEV は2021年11月に始まった一覧で、最初は古い CVE がまとめて追加された。「KEV に載った日」は「悪用が始まった日」ではない
6. ライセンスを記憶で「OSV も deps.dev も CC BY 4.0」と書いていたが、確認すると OSV は元データベースごと、deps.dev は明記なしだった

### 正直に書いておくこと（限界）

- EPSS は悪用の情報も学習に使っているので、「EPSS だけ」でもかなり強い。このアプリとの差（254位 → 140位、11件 → 13件）は小さい。大きな差は「深刻度だけ」との差
- 公開されてすぐ悪用される新しい脆弱性（評価では ray や litellm）は、EPSS が付く前なので拾えない
- このアプリの順位には依存の文脈（直接か、開発用か）も入るが、評価では分からないので測れていない
- 正解はのべ40件と少ない
- 深刻度は今のデータを使っている（基準日の時点の値とは違う場合がある）
- 修正版の判定は簡易的なバージョン比較なので、珍しい形のバージョンでは外れることがある
- 間接の依存の「どの直接の依存を上げれば直るか」までは出していない

### スクリーンショットの候補

- GitHub の Job Summary に出たレポート（デモのワークフロー `advent-2026-radar-demo.yml` の実行結果）
- 「今日対応すべき順」の表（⚠️ と 🔴 悪用確認済み）
- 「パッケージごとの対応」の表（Django 38件 → 上げる1回）
- 乗り換え先の提案（🔧 標準機能、✅ 確認済み）
- ターミナルで `pnpm start` を実行しているところ

### 次にやりたいこと（候補。人が選ぶ）

- 間接の依存について、どの直接の依存を上げれば直るかを出す
- プルリクエストに、前回からの差分（新しく増えた警告だけ）をコメントする
- pnpm-lock.yaml、yarn.lock、poetry.lock、uv.lock にも対応する
- コードの中で、脆弱な関数を実際に呼んでいるかまで調べる

### 記事を書くときの注意

- 例の依存ファイルは、わざと古いバージョンにしたもの。記事では「実在のプロジェクトのものではない」と書く
- レポートの「今日対応すべき」の件数は、EPSS と KEV が毎日更新されるので、実行した日によって変わる。記事の数字には日付を添える（2026-11-23 時点）
- KEV のデータは CC0 だが、CISA のロゴは使わない
- EPSS は利用時に出典の明記が求められている（記事の出典にも書く）
