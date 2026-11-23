# 依存ライブラリのリスクレポート
`old-express.package-lock.json` ・ 依存 297 個（直接 8 個） ・ 脆弱性 71 件 ・ **今日対応すべき 5 件**（悪用確認済み 0 件） ・ 修正版あり 70 件
> ⚠️ は「今日対応すべき」（CISA KEV に載っている、または EPSS が全CVEの上位5%）。順位はコードで計算し、AI は説明だけをしています。

## 今日対応すべき順（上位 5 件）
| 順位 | パッケージ | 脆弱性 | 根拠 | 依存 | 対応 |
| --- | --- | --- | --- | --- | --- |
| 1 ⚠️ | lodash@4.17.15 | [CVE-2021-23337](https://osv.dev/vulnerability/GHSA-35jh-r3h4-6jhm)<br>Command Injection in lodash | 悪用確率 20.2%（上位2.5%）<br>HIGH 7.2 | 直接 | 4.17.21 に上げる |
| 2 ⚠️ | moment@2.29.1 | [CVE-2022-24785](https://osv.dev/vulnerability/GHSA-8hfj-j24r-96c4)<br>Path Traversal: 'dir/../../filename' in moment.locale | 悪用確率 13.8%（上位3.4%）<br>HIGH 7.5 | 直接 | 2.29.2 に上げる |
| 3 ⚠️ | qs@6.5.1 | [CVE-2022-24999](https://osv.dev/vulnerability/GHSA-hrpp-h998-j3pp)<br>qs vulnerable to Prototype Pollution | 悪用確率 15.7%（上位3.1%）<br>HIGH 7.5 | 間接 | 6.5.3 に上げる |
| 4 ⚠️ | axios@0.21.0 | [CVE-2026-44492](https://osv.dev/vulnerability/GHSA-pjwm-pj3p-43mv)<br>axios's shouldBypassProxy does not recognize IPv4-mapped IPv6 addresses, allowing NO_PROXY bypass (incomplete fix for CV | 悪用確率 12.3%（上位3.7%）<br>HIGH 8.6 | 直接 | 0.32.0 に上げる |
| 5 ⚠️ | axios@0.21.0 | [CVE-2021-3749](https://osv.dev/vulnerability/GHSA-cph5-m8f7-6c5x)<br>axios Inefficient Regular Expression Complexity vulnerability | 悪用確率 8.5%（上位4.8%）<br>HIGH 7.5 | 直接 | 0.21.2 に上げる |

### なぜこの順番か（AI による説明）

依存ライブラリは 297 個、見つかった脆弱性は 71 件です。そのうち今日対応すべきなのは 5 件で、いずれも深刻度 HIGH で修正版が出ています。上位 5 件を順に修正版へ上げてください。

1. **lodash**（CVE-2021-23337）：lodash@4.17.15 は EPSS 20.2%（全CVEの上位2.5%）で、5 件中もっとも悪用される確率が高く、深刻度も HIGH（CVSS 7.2）です。修正版 4.17.21 に上げてください。
2. **moment**（CVE-2022-24785）：moment@2.29.1 は EPSS 13.8%（全CVEの上位3.4%）、深刻度 HIGH（CVSS 7.5）です。修正版 2.29.2 に上げてください。
3. **qs**（CVE-2022-24999）：qs@6.5.1 は EPSS 15.7%（全CVEの上位3.1%）、深刻度 HIGH（CVSS 7.5）で、間接の依存です。修正版 6.5.3 に上げてください。
4. **axios**（CVE-2026-44492）：axios@0.21.0 は EPSS 12.3%（全CVEの上位3.7%）で、深刻度は HIGH（CVSS 8.6）と 5 件中もっとも高い値です。修正版 0.32.0 に上げてください。
5. **axios**（CVE-2021-3749）：axios@0.21.0 は EPSS 8.5%（全CVEの上位4.8%）、深刻度 HIGH（CVSS 7.5）です。修正版 0.21.2 が出ていますが、rank 4 の修正版 0.32.0 に上げれば同時に解消できます。

<details><summary>残りの脆弱性 66 件</summary>

| 順位 | パッケージ | 脆弱性 | 根拠 | 依存 | 対応 |
| --- | --- | --- | --- | --- | --- |
| 6 | moment@2.29.1 | [CVE-2022-31129](https://osv.dev/vulnerability/GHSA-wc69-rhjr-hc9g)<br>Moment.js vulnerable to Inefficient Regular Expression Complexity | 悪用確率 5.6%（上位7.0%）<br>HIGH 7.5 | 直接 | 2.29.4 に上げる |
| 7 | axios@0.21.0 | [CVE-2026-44496](https://osv.dev/vulnerability/GHSA-hfxv-24rg-xrqf)<br>Axios: Regular Expression Denial of Service (ReDoS) via Cookie Name Injection | 悪用確率 5.4%（上位7.1%）<br>HIGH 7.5 | 直接 | 0.32.0 に上げる |
| 8 | lodash@4.17.15 | [CVE-2020-8203](https://osv.dev/vulnerability/GHSA-p6mc-m468-83gw)<br>Prototype Pollution in lodash | 悪用確率 5.2%（上位7.3%）<br>HIGH 7.4 | 直接 | 4.17.19 に上げる |
| 9 | lodash@4.17.15 | [CVE-2020-28500](https://osv.dev/vulnerability/GHSA-29mw-wpgm-hmr9)<br>Regular Expression Denial of Service (ReDoS) in lodash | 悪用確率 7.4%（上位5.4%）<br>MODERATE 5.3 | 直接 | 4.17.21 に上げる |
| 10 | lodash@4.17.15 | [CVE-2026-4800](https://osv.dev/vulnerability/GHSA-r5fr-rjxr-66jc)<br>lodash vulnerable to Code Injection via `_.template` imports key names | 悪用確率 2.9%（上位12.9%）<br>HIGH 8.1 | 直接 | 4.18.0 に上げる |
| 11 | minimist@1.2.0 | [CVE-2021-44906](https://osv.dev/vulnerability/GHSA-xvch-5gv4-984h)<br>Prototype Pollution in minimist | 悪用確率 4.6%（上位8.1%）<br>CRITICAL 9.8 | 直接・開発用 | 1.2.6 に上げる |
| 12 | axios@0.21.0 | [CVE-2026-25639](https://osv.dev/vulnerability/GHSA-43fc-jf86-j433)<br>Axios is Vulnerable to Denial of Service via __proto__ Key in mergeConfig | 悪用確率 2.8%（上位13.4%）<br>HIGH 7.5 | 直接 | 0.30.3 に上げる |
| 13 | minimist@0.0.8 | [CVE-2021-44906](https://osv.dev/vulnerability/GHSA-xvch-5gv4-984h)<br>Prototype Pollution in minimist | 悪用確率 4.6%（上位8.1%）<br>CRITICAL 9.8 | 間接・開発用 | 0.2.4 に上げる |
| 14 | form-data@2.3.3 | [CVE-2025-7783](https://osv.dev/vulnerability/GHSA-fjxv-7rqg-78g4)<br>form-data uses unsafe random function in form-data for choosing boundary | 悪用確率 1.8%（上位20.8%）<br>CRITICAL | 間接 | 2.5.4 に上げる |
| 15 | node-fetch@2.6.0 | [CVE-2022-0235](https://osv.dev/vulnerability/GHSA-r683-j2x4-v87g)<br>node-fetch forwards secure headers to untrusted sites | 悪用確率 1.8%（上位21.2%）<br>HIGH 8.8 | 直接 | 2.6.7 に上げる |
| 16 | axios@0.21.0 | [CVE-2020-28168](https://osv.dev/vulnerability/GHSA-4w2v-q235-vp99)<br>Axios vulnerable to Server-Side Request Forgery | 悪用確率 2.4%（上位15.8%）<br>MODERATE 5.9 | 直接 | 0.21.1 に上げる |
| 17 | tough-cookie@2.5.0 | [CVE-2023-26136](https://osv.dev/vulnerability/GHSA-72xf-g2v4-qvf3)<br>tough-cookie Prototype Pollution vulnerability | 悪用確率 2.6%（上位14.1%）<br>MODERATE 6.5 | 間接 | 4.1.3 に上げる |
| 18 | axios@0.21.0 | [CVE-2026-40175](https://osv.dev/vulnerability/GHSA-fvcv-3m26-pcqx)<br>Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain | 悪用確率 2.0%（上位18.9%）<br>MODERATE 4.8 | 直接 | 0.31.0 に上げる |
| 19 | form-data@2.3.3 | [CVE-2026-12143](https://osv.dev/vulnerability/GHSA-hmw2-7cc7-3qxx)<br>form-data: CRLF injection in form-data via unescaped multipart field names and filenames | 悪用確率 1.5%（上位24.7%）<br>HIGH 7.5 | 間接 | 2.5.6 に上げる |
| 20 | lodash@4.17.15 | [CVE-2025-13465](https://osv.dev/vulnerability/GHSA-xxjr-mmjv-4gpg)<br>Lodash has Prototype Pollution Vulnerability in `_.unset`, `_.omit`, and `_.pullAt` functions | 悪用確率 1.8%（上位20.7%）<br>MODERATE 6.5 | 直接 | 4.17.23 に上げる |
| 21 | minimatch@3.0.4 | [CVE-2022-3517](https://osv.dev/vulnerability/GHSA-f8q6-p94x-37v3)<br>minimatch ReDoS vulnerability | 悪用確率 2.3%（上位16.4%）<br>HIGH 7.5 | 間接・開発用 | 3.0.5 に上げる |
| 22 | axios@0.21.0 | [CVE-2026-42033](https://osv.dev/vulnerability/GHSA-pf86-5x62-jrwf)<br>Axios: Prototype Pollution Gadgets - Response Tampering, Data Exfiltration, and Request Hijacking | 悪用確率 0.9%（上位39.5%）<br>HIGH 7.4 | 直接 | 0.31.1 に上げる |
| 23 | axios@0.21.0 | [CVE-2026-44495](https://osv.dev/vulnerability/GHSA-3g43-6gmg-66jw)<br>axios Vulnerable to Credential Theft and Response Hijacking via Prototype Pollution Gadget in Config Merge | 悪用確率 0.9%（上位40.8%）<br>HIGH 7 | 直接 | 0.31.1 に上げる |
| 24 | axios@0.21.0 | [CVE-2026-42039](https://osv.dev/vulnerability/GHSA-62hf-57xw-28j9)<br>Axios: unbounded recursion in toFormData causes DoS via deeply nested request data | 悪用確率 0.8%（上位42.4%）<br>HIGH 7.5 | 直接 | 0.31.1 に上げる |
| 25 | axios@0.21.0 | [CVE-2025-27152](https://osv.dev/vulnerability/GHSA-jr5f-v2jv-69x6)<br>axios Requests Vulnerable To Possible SSRF and Credential Leakage via Absolute URL | 悪用確率 0.8%（上位42.7%）<br>HIGH | 直接 | 0.30.0 に上げる |
| 26 | body-parser@1.18.2 | [CVE-2024-45590](https://osv.dev/vulnerability/GHSA-qwcr-r2fm-qrc7)<br>body-parser vulnerable to denial of service when url encoding is enabled | 悪用確率 1.0%（上位37.7%）<br>HIGH 7.5 | 間接 | 1.20.3 に上げる |
| 27 | axios@0.21.0 | [CVE-2025-62718](https://osv.dev/vulnerability/GHSA-3p68-rc4w-qgx5)<br>Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF | 悪用確率 1.2%（上位30.9%）<br>MODERATE 4.8 | 直接 | 0.31.0 に上げる |
| 28 | path-to-regexp@0.1.7 | [CVE-2024-45296](https://osv.dev/vulnerability/GHSA-37ch-88jc-xwx2)<br>path-to-regexp vulnerable to Regular Expression Denial of Service via multiple route parameters | 悪用確率 0.9%（上位38.4%）<br>HIGH 7.5 | 間接 | 0.1.10 に上げる |
| 29 | axios@0.21.0 | [CVE-2026-42043](https://osv.dev/vulnerability/GHSA-pmwg-cvhr-8vh7)<br>Axios: Incomplete Fix for CVE-2025-62718 — NO_PROXY Protection Bypassed via RFC 1122 Loopback Subnet (127.0.0.0/8) in Ax | 悪用確率 0.7%（上位45.0%）<br>HIGH 7.2 | 直接 | 0.31.1 に上げる |
| 30 | axios@0.21.0 | [CVE-2026-44487](https://osv.dev/vulnerability/GHSA-p92q-9vqr-4j8v)<br>Axios: Proxy-Authorization Credential Leak to Origin Server Across HTTP-to-HTTPS Redirect in Axios Node.js HTTP Adapter | 悪用確率 0.7%（上位46.3%）<br>HIGH | 直接 | 0.32.0 に上げる |
| 31 | node-fetch@2.6.0 | [CVE-2020-15168](https://osv.dev/vulnerability/GHSA-w7rc-rwvf-8q5r)<br>The `size` option isn't honored after following a redirect in node-fetch | 悪用確率 1.7%（上位22.3%）<br>LOW 2.6 | 直接 | 2.6.1 に上げる |
| 32 | path-to-regexp@0.1.7 | [CVE-2024-52798](https://osv.dev/vulnerability/GHSA-rhx6-c78j-4q9w)<br>path-to-regexp contains a ReDoS | 悪用確率 0.8%（上位42.9%）<br>HIGH 7.5 | 間接 | 0.1.12 に上げる |
| 33 | minimist@1.2.0 | [CVE-2020-7598](https://osv.dev/vulnerability/GHSA-vh95-rmgr-6w4m)<br>Prototype Pollution in minimist | 悪用確率 1.9%（上位19.4%）<br>MODERATE 5.6 | 直接・開発用 | 1.2.3 に上げる |
| 34 | axios@0.21.0 | [CVE-2026-44486](https://osv.dev/vulnerability/GHSA-j5f8-grm9-p9fc)<br>Axios: Proxy-Authorization header leaks to redirect target when proxy is re-evaluated to direct connection | 悪用確率 0.6%（上位53.0%）<br>HIGH 7.5 | 直接 | 0.32.0 に上げる |
| 35 | express@4.16.0 | [CVE-2024-29041](https://osv.dev/vulnerability/GHSA-rv95-896h-c2vc)<br>Express.js Open Redirect in malformed URLs | 悪用確率 0.8%（上位42.9%）<br>MODERATE 6.1 | 直接 | 4.19.2 に上げる |
| 36 | minimist@0.0.8 | [CVE-2020-7598](https://osv.dev/vulnerability/GHSA-vh95-rmgr-6w4m)<br>Prototype Pollution in minimist | 悪用確率 1.9%（上位19.4%）<br>MODERATE 5.6 | 間接・開発用 | 0.2.1 に上げる |
| 37 | axios@0.21.0 | [CVE-2023-45857](https://osv.dev/vulnerability/GHSA-wf5p-g6vw-rhxx)<br>Axios Cross-Site Request Forgery Vulnerability | 悪用確率 0.7%（上位44.8%）<br>MODERATE 6.5 | 直接 | 0.28.0 に上げる |
| 38 | request@2.88.2 | [CVE-2023-28155](https://osv.dev/vulnerability/GHSA-p8p7-x288-28g6)<br>Server-Side Request Forgery in Request | 悪用確率 0.7%（上位45.2%）<br>MODERATE 6.1 | 直接 | 修正版なし（回避策を確認） |
| 39 | axios@0.21.0 | [CVE-2026-42041](https://osv.dev/vulnerability/GHSA-w9j2-pvgh-6h63)<br>Axios: Authentication Bypass via Prototype Pollution Gadget in `validateStatus` Merge Strategy | 悪用確率 0.7%（上位46.6%）<br>MODERATE 4.8 | 直接 | 0.31.1 に上げる |
| 40 | axios@0.21.0 | [CVE-2026-42035](https://osv.dev/vulnerability/GHSA-6chq-wfr3-2hj9)<br>Axios: Header Injection via Prototype Pollution | 悪用確率 0.4%（上位63.2%）<br>HIGH 7.4 | 直接 | 0.31.1 に上げる |
| 41 | debug@3.2.6 | [CVE-2017-16137](https://osv.dev/vulnerability/GHSA-gxpj-cx7g-858c)<br>Regular Expression Denial of Service in debug | 悪用確率 2.8%（上位13.3%）<br>LOW 3.7 | 間接・開発用 | 3.2.7 に上げる |
| 42 | uuid@3.4.0 | [CVE-2026-41907](https://osv.dev/vulnerability/GHSA-w5hq-g745-h8pq)<br>uuid: Missing buffer bounds check in v3/v5/v6 when buf is provided | 悪用確率 0.4%（上位64.8%）<br>HIGH 7.5 | 間接 | 11.1.1 に上げる |
| 43 | serve-static@1.13.0 | [CVE-2024-43800](https://osv.dev/vulnerability/GHSA-cm22-4g7w-348p)<br>serve-static vulnerable to template injection that can lead to XSS | 悪用確率 0.6%（上位48.8%）<br>MODERATE 5 | 間接 | 1.16.0 に上げる |
| 44 | body-parser@1.18.2 | [CVE-2026-111181](https://osv.dev/vulnerability/GHSA-27r3-jxmh-p828)<br>body-parser vulnerable to Denial of Service via trailing bytes after a compressed request body | 悪用確率 0.4%（上位66.4%）<br>HIGH 7.5 | 間接 | 1.20.9 に上げる |
| 45 | express@4.16.0 | [CVE-2024-43796](https://osv.dev/vulnerability/GHSA-qw6h-vgh9-j6wx)<br>express vulnerable to XSS via response.redirect() | 悪用確率 0.5%（上位57.3%）<br>MODERATE 5 | 直接 | 4.20.0 に上げる |
| 46 | send@0.16.0 | [CVE-2024-43799](https://osv.dev/vulnerability/GHSA-m6fv-jmcg-4jfg)<br>send vulnerable to template injection that can lead to XSS | 悪用確率 0.5%（上位53.6%）<br>MODERATE 5 | 間接 | 0.19.0 に上げる |
| 47 | axios@0.21.0 | [CVE-2026-67316](https://osv.dev/vulnerability/GHSA-mmx7-hfxf-jppx)<br>Axios: Prototype pollution gadgets can alter axios request construction | 悪用確率 0.4%（上位62.5%）<br>MODERATE | 直接 | 0.33.0 に上げる |
| 48 | minimatch@3.0.4 | [CVE-2026-27903](https://osv.dev/vulnerability/GHSA-7r86-cg39-jmmj)<br>minimatch has ReDoS: matchOne() combinatorial backtracking via multiple non-adjacent GLOBSTAR segments | 悪用確率 0.6%（上位48.5%）<br>HIGH 7.5 | 間接・開発用 | 3.1.3 に上げる |
| 49 | js-yaml@3.13.1 | [CVE-2026-59869](https://osv.dev/vulnerability/GHSA-52cp-r559-cp3m)<br>js-yaml: YAML merge-key chains can force quadratic CPU consumption | 悪用確率 0.6%（上位51.1%）<br>HIGH 7.5 | 間接・開発用 | 3.15.0 に上げる |
| 50 | minimatch@3.0.4 | [CVE-2026-26996](https://osv.dev/vulnerability/GHSA-3ppc-4f35-3m26)<br>minimatch has a ReDoS via repeated wildcards with non-matching literal in pattern | 悪用確率 0.6%（上位52.0%）<br>HIGH | 間接・開発用 | 3.1.3 に上げる |
| 51 | cookie@0.3.1 | [CVE-2024-47764](https://osv.dev/vulnerability/GHSA-pxg6-pf52-xh8x)<br>cookie accepts cookie name, path, and domain with out of bounds characters | 悪用確率 0.7%（上位44.3%）<br>LOW | 間接 | 0.7.0 に上げる |
| 52 | js-yaml@3.13.1 | [CVE-2026-84375](https://osv.dev/vulnerability/GHSA-2883-xcg3-v3hh)<br>js-yaml: maxTotalMergeKeys does not limit CPU use for empty merge sources | 悪用確率 0.5%（上位53.6%）<br>HIGH 7.5 | 間接・開発用 | 3.15.2 に上げる |
| 53 | axios@0.21.0 | [CVE-2026-42034](https://osv.dev/vulnerability/GHSA-5c9x-8gcm-mpgx)<br>Axios' HTTP adapter-streamed uploads bypass maxBodyLength when maxRedirects: 0 | 悪用確率 0.3%（上位72.0%）<br>MODERATE 5.3 | 直接 | 0.31.1 に上げる |
| 54 | axios@0.21.0 | [CVE-2026-42036](https://osv.dev/vulnerability/GHSA-vf2m-468p-8v99)<br>Axios: HTTP adapter streamed responses bypass maxContentLength | 悪用確率 0.3%（上位72.0%）<br>MODERATE 5.3 | 直接 | 0.31.1 に上げる |
| 55 | axios@0.21.0 | [CVE-2026-42038](https://osv.dev/vulnerability/GHSA-m7pr-hjqh-92cm)<br>Axios: no_proxy bypass via IP alias allows SSRF | 悪用確率 0.3%（上位72.5%）<br>MODERATE 6.8 | 直接 | 0.31.1 に上げる |
| 56 | axios@0.21.0 | [CVE-2026-44490](https://osv.dev/vulnerability/GHSA-898c-q2cr-xwhg)<br>axios has DoS & Header Injection via Prototype Pollution Read-Side Gadgets in axios merge functions | 悪用確率 0.3%（上位73.0%）<br>MODERATE 4.8 | 直接 | 0.32.0 に上げる |
| 57 | minimatch@3.0.4 | [CVE-2026-27904](https://osv.dev/vulnerability/GHSA-23c5-xmqv-rm74)<br>minimatch ReDoS: nested *() extglobs generate catastrophically backtracking regular expressions | 悪用確率 0.5%（上位55.1%）<br>HIGH 7.5 | 間接・開発用 | 3.1.4 に上げる |
| 58 | axios@0.21.0 | [CVE-2026-67319](https://osv.dev/vulnerability/GHSA-7q8q-rj6j-mhjq)<br>Axios: Nested axios option objects can consume polluted prototype values | 悪用確率 0.3%（上位74.8%）<br>MODERATE | 直接 | 0.33.0 に上げる |
| 59 | qs@6.5.1 | [CVE-2026-82417](https://osv.dev/vulnerability/GHSA-4mjr-xmp4-gh2g)<br>qs: Denial of Service via Attacker Controlled isBuffer | 悪用確率 0.4%（上位65.4%）<br>MODERATE 5.3 | 間接 | 6.16.0 に上げる |
| 60 | qs@6.5.5 | [CVE-2026-82417](https://osv.dev/vulnerability/GHSA-4mjr-xmp4-gh2g)<br>qs: Denial of Service via Attacker Controlled isBuffer | 悪用確率 0.4%（上位65.4%）<br>MODERATE 5.3 | 間接 | 6.16.0 に上げる |
| 61 | axios@0.21.0 | [CVE-2026-42042](https://osv.dev/vulnerability/GHSA-xx6v-rp6x-q39c)<br>Axios: XSRF Token Cross-Origin Leakage via Prototype Pollution Gadget in `withXSRFToken` Boolean Coercion | 悪用確率 0.2%（上位87.7%）<br>MODERATE 5.4 | 直接 | 0.31.1 に上げる |
| 62 | qs@6.5.1 | [CVE-2025-15284](https://osv.dev/vulnerability/GHSA-6rw7-vpxm-498p)<br>qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion | 悪用確率 0.4%（上位60.1%）<br>LOW 3.7 | 間接 | 6.14.1 に上げる |
| 63 | qs@6.5.5 | [CVE-2025-15284](https://osv.dev/vulnerability/GHSA-6rw7-vpxm-498p)<br>qs's arrayLimit bypass in its bracket notation allows DoS via memory exhaustion | 悪用確率 0.4%（上位60.1%）<br>LOW 3.7 | 間接 | 6.14.1 に上げる |
| 64 | yargs-parser@13.0.0 | [CVE-2020-7608](https://osv.dev/vulnerability/GHSA-p9pc-299p-vxgp)<br>yargs-parser Vulnerable to Prototype Pollution | 悪用確率 0.5%（上位55.3%）<br>MODERATE 5.3 | 間接・開発用 | 13.1.2 に上げる |
| 65 | yargs-parser@11.1.1 | [CVE-2020-7608](https://osv.dev/vulnerability/GHSA-p9pc-299p-vxgp)<br>yargs-parser Vulnerable to Prototype Pollution | 悪用確率 0.5%（上位55.3%）<br>MODERATE 5.3 | 間接・開発用 | 13.1.2 に上げる |
| 66 | body-parser@1.18.2 | [CVE-2026-12590](https://osv.dev/vulnerability/GHSA-v422-hmwv-36x6)<br>body-parser vulnerable to denial of service when invalid limit value silently disables size enforcement | 悪用確率 0.4%（上位63.7%）<br>LOW 3.7 | 間接 | 1.20.6 に上げる |
| 67 | js-yaml@3.13.1 | [CVE-2025-64718](https://osv.dev/vulnerability/GHSA-mh29-5h37-fv8m)<br>js-yaml has prototype pollution in merge (<<) | 悪用確率 0.4%（上位62.6%）<br>MODERATE 5.3 | 間接・開発用 | 3.14.2 に上げる |
| 68 | js-yaml@3.13.1 | [CVE-2026-53550](https://osv.dev/vulnerability/GHSA-h67p-54hq-rp68)<br>JS-YAML: Quadratic-complexity DoS in merge key handling via repeated aliases | 悪用確率 0.4%（上位63.4%）<br>MODERATE 5.3 | 間接・開発用 | 3.15.0 に上げる |
| 69 | diff@3.5.0 | [CVE-2026-24001](https://osv.dev/vulnerability/GHSA-73rr-hh4g-fpgx)<br>jsdiff has a Denial of Service vulnerability in parsePatch and applyPatch | 悪用確率 0.6%（上位49.5%）<br>LOW | 間接・開発用 | 3.5.1 に上げる |
| 70 | axios@0.21.0 | [CVE-2026-42040](https://osv.dev/vulnerability/GHSA-xhjh-pmcv-23jw)<br>Axios: Null Byte Injection via Reverse-Encoding in AxiosURLSearchParams | 悪用確率 0.2%（上位86.7%）<br>LOW 3.7 | 直接 | 0.31.1 に上げる |
| 71 | js-yaml@3.13.1 | [GHSA-5p4m-2wfm-xmqj](https://osv.dev/vulnerability/GHSA-5p4m-2wfm-xmqj)<br>JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported | HIGH 7.5 | 間接・開発用 | 3.15.1 に上げる |

</details>

## パッケージごとの対応（24 個）
脆弱性の数は多くても、作業は「パッケージを上げる」だけのことが多い。急ぐものが多い順。
| パッケージ | 脆弱性 | うち今日対応すべき | すべて直すには | 修正版なし |
| --- | --- | --- | --- | --- |
| axios@0.21.0 | 25 件 | **2 件** | 0.33.0 以上 | — |
| lodash@4.17.15 | 5 件 | **1 件** | 4.18.0 以上 | — |
| qs@6.5.1 | 3 件 | **1 件** | 6.16.0 以上 | — |
| moment@2.29.1 | 2 件 | **1 件** | 2.29.4 以上 | — |
| js-yaml@3.13.1 | 5 件 | 0 件 | 3.15.2 以上 | — |
| minimatch@3.0.4 | 4 件 | 0 件 | 3.1.4 以上 | — |
| body-parser@1.18.2 | 3 件 | 0 件 | 1.20.9 以上 | — |
| minimist@1.2.0 | 2 件 | 0 件 | 1.2.6 以上 | — |
| minimist@0.0.8 | 2 件 | 0 件 | 0.2.4 以上 | — |
| form-data@2.3.3 | 2 件 | 0 件 | 2.5.6 以上 | — |
| node-fetch@2.6.0 | 2 件 | 0 件 | 2.6.7 以上 | — |
| path-to-regexp@0.1.7 | 2 件 | 0 件 | 0.1.12 以上 | — |
| express@4.16.0 | 2 件 | 0 件 | 4.20.0 以上 | — |
| qs@6.5.5 | 2 件 | 0 件 | 6.16.0 以上 | — |
| tough-cookie@2.5.0 | 1 件 | 0 件 | 4.1.3 以上 | — |
| request@2.88.2 | 1 件 | 0 件 | — | 1 |
| debug@3.2.6 | 1 件 | 0 件 | 3.2.7 以上 | — |
| uuid@3.4.0 | 1 件 | 0 件 | 11.1.1 以上 | — |
| serve-static@1.13.0 | 1 件 | 0 件 | 1.16.0 以上 | — |
| send@0.16.0 | 1 件 | 0 件 | 0.19.0 以上 | — |
| cookie@0.3.1 | 1 件 | 0 件 | 0.7.0 以上 | — |
| yargs-parser@13.0.0 | 1 件 | 0 件 | 13.1.2 以上 | — |
| yargs-parser@11.1.1 | 1 件 | 0 件 | 13.1.2 以上 | — |
| diff@3.5.0 | 1 件 | 0 件 | 3.5.1 以上 | — |

## 放置・非推奨の直接の依存（4 個）
「このバージョンは非推奨」は上げれば済む。「パッケージ自体が非推奨」と「長く更新がない」ものは、AI に乗り換え先を調べさせる。
| パッケージ | 状態 | 乗り換え先の提案（AI） |
| --- | --- | --- |
| axios@0.21.0 | このバージョンは非推奨（最新版 1.21.1 に上げればよい）：Critical security vulnerability fixed in v0.21.1. For more information, see https://github.com/axios/axios/pull/3410 | バージョンを上げる |
| minimist@1.2.0 | 最新版（1.2.8）の公開が 2023-02（3年以上前） | （提案なし） |
| node-fetch@2.6.0 | 最新版（3.3.2）の公開が 2023-08（3年以上前） | （提案なし） |
| request@2.88.2 | パッケージ自体が非推奨：request has been deprecated, see https://github.com/request/request/issues/3142<br>最新版（2.88.2）の公開が 2020-02（6年以上前） | （提案なし） |

✅ は、AI が提案したパッケージをコードで deps.dev に問い合わせ、実在・非推奨でない・2年以内に更新あり を確かめたもの。AI は道具を 5 回使って調べました。

## 自動チェック
- ✅ AI の説明の数字は、すべて根拠のデータと一致
- データ：CISA KEV 2026.11.20 版、EPSS 2026-11-22、作成 2026-11-23 00:43 UTC

## 出典

| データ | 提供元 | ライセンス | 取得日 | 備考 |
| --- | --- | --- | --- | --- |
| [OSV（オープンソースの脆弱性データベース）](https://osv.dev/) | Google / OpenSSF | [元データベースごとのライセンス（GitHub Advisory Database・PyPI Advisory Database・Go Vulnerability Database は CC BY 4.0）](https://google.github.io/osv.dev/data/) | 実行のたびに取得 | 表記: GitHub Advisory Database（CC BY 4.0）、PyPI Advisory Database（CC BY 4.0） |
| [deps.dev（パッケージのバージョン・非推奨・リポジトリ）](https://deps.dev/) | Google Open Source Insights | [データのライセンスの明記なし（Google 利用規約）](https://policies.google.com/terms) | 実行のたびに取得 |  |
| [CISA Known Exploited Vulnerabilities Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog) | CISA（米国 サイバーセキュリティ・社会基盤安全保障庁） | [CC0 1.0](https://www.cisa.gov/sites/default/files/licenses/kev/license.txt) | 実行のたびに取得 | CISA・DHS による推奨を意味しない |
| [EPSS（Exploit Prediction Scoring System）](https://www.first.org/epss/) | FIRST（EPSS SIG） | [無料・登録不要（利用時は出典の明記が求められている）](https://www.first.org/epss/faq) | 実行のたびに取得 | 表記: EPSS scores by FIRST (https://www.first.org/epss/) |