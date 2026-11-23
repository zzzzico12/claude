# 依存ライブラリのリスクレポート
`old-django.requirements.txt` ・ 依存 7 個（直接 7 個） ・ 脆弱性 136 件 ・ **今日対応すべき 10 件**（悪用確認済み 1 件） ・ 修正版あり 135 件
> ⚠️ は「今日対応すべき」（CISA KEV に載っている、または EPSS が全CVEの上位5%）。順位はコードで計算し、AI は説明だけをしています。

## 今日対応すべき順（上位 5 件）
| 順位 | パッケージ | 脆弱性 | 根拠 | 依存 | 対応 |
| --- | --- | --- | --- | --- | --- |
| 1 ⚠️ | pillow@8.0.0 | [CVE-2023-4863](https://osv.dev/vulnerability/GHSA-j7hp-h8jx-5ppr)<br>libwebp: OOB write in BuildHuffmanTable | 🔴 **悪用確認済み**（KEV 2023-09-13）<br>悪用確率 99.9%以上（上位0.1%未満）<br>HIGH 8.8 | 直接 | 10.0.1 に上げる |
| 2 ⚠️ | django@3.2.0 | [CVE-2022-34265](https://osv.dev/vulnerability/GHSA-p64x-8rxx-wf6q)<br>Django `Trunc()` and `Extract()` database functions vulnerable to SQL Injection | 悪用確率 73.6%（上位0.5%）<br>CRITICAL 9.8 | 直接 | 3.2.14 に上げる |
| 3 ⚠️ | django@3.2.0 | [CVE-2023-24580](https://osv.dev/vulnerability/GHSA-2hrw-hx67-34x6)<br>Resource exhaustion in Django | 悪用確率 62.6%（上位0.8%）<br>HIGH 7.5 | 直接 | 3.2.18 に上げる |
| 4 ⚠️ | django@3.2.0 | [CVE-2021-35042](https://osv.dev/vulnerability/GHSA-xpfp-f569-q3p2)<br>SQL Injection in Django | 悪用確率 44.4%（上位1.2%）<br>CRITICAL 9.8 | 直接 | 3.2.5 に上げる |
| 5 ⚠️ | django@3.2.0 | [CVE-2023-46695](https://osv.dev/vulnerability/GHSA-qmf9-6jqf-j8fq)<br>Django potential denial of service vulnerability in UsernameField on Windows | 悪用確率 53.4%（上位1.0%）<br>HIGH 7.5 | 直接 | 3.2.23 に上げる |

### なぜこの順番か（AI による説明）

依存7個に脆弱性が合計136件ありました。そのうち今日対応すべきなのは10件です。ここでは上位5件について、順位の理由を説明します。

1. **pillow**（CVE-2023-4863）：CISA KEV に掲載（2023-09-13）されており、EPSS も99.9%以上（全CVEの上位0.1%未満）、深刻度は HIGH（CVSS 8.8）です。pillow を修正版 10.0.1 に上げてください。
2. **django**（CVE-2022-34265）：EPSS 73.6%（全CVEの上位0.5%）で、深刻度は CRITICAL（CVSS 9.8）です。django を修正版 3.2.14 以上に上げてください。
3. **django**（CVE-2023-24580）：EPSS 62.6%（全CVEの上位0.8%）で、深刻度は HIGH（CVSS 7.5）です。django を修正版 3.2.18 以上に上げてください。
4. **django**（CVE-2021-35042）：EPSS 44.4%（全CVEの上位1.2%）で、深刻度は CRITICAL（CVSS 9.8）です。django を修正版 3.2.5 以上に上げてください。
5. **django**（CVE-2023-46695）：EPSS 53.4%（全CVEの上位1.0%）で、深刻度は HIGH（CVSS 7.5）です。django を修正版 3.2.23 以上に上げてください。

<details><summary>残りの脆弱性 131 件</summary>

| 順位 | パッケージ | 脆弱性 | 根拠 | 依存 | 対応 |
| --- | --- | --- | --- | --- | --- |
| 6 ⚠️ | django@3.2.0 | [CVE-2022-23833](https://osv.dev/vulnerability/GHSA-6cw3-g6wv-c2xv)<br>Infinite Loop in Django | 悪用確率 49.5%（上位1.1%）<br>HIGH 7.5 | 直接 | 3.2.12 に上げる |
| 7 ⚠️ | django@3.2.0 | [CVE-2023-23969](https://osv.dev/vulnerability/GHSA-q2jf-h9jm-m7p4)<br>Django contains Uncontrolled Resource Consumption via cached header | 悪用確率 47.4%（上位1.1%）<br>HIGH 7.5 | 直接 | 3.2.17 に上げる |
| 8 ⚠️ | django@3.2.0 | [CVE-2025-57833](https://osv.dev/vulnerability/GHSA-6w2r-r2m5-xq5w)<br>Django is subject to SQL injection through its column aliases | 悪用確率 26.5%（上位1.9%）<br>HIGH 7.1 | 直接 | 4.2.24 に上げる |
| 9 ⚠️ | django@3.2.0 | [CVE-2025-64459](https://osv.dev/vulnerability/GHSA-frmv-pr5f-9mcr)<br>Django vulnerable to SQL injection via _connector keyword argument in QuerySet and Q objects. | 悪用確率 19.3%（上位2.6%）<br>CRITICAL 9.1 | 直接 | 4.2.26 に上げる |
| 10 ⚠️ | django@3.2.0 | [CVE-2022-28346](https://osv.dev/vulnerability/GHSA-2gwj-7jmv-h26r)<br>SQL Injection in Django | 悪用確率 18.7%（上位2.7%）<br>CRITICAL 9.8 | 直接 | 3.2.13 に上げる |
| 11 | pyyaml@5.3 | [CVE-2020-14343](https://osv.dev/vulnerability/GHSA-8q59-q68h-6hv4)<br>Improper Input Validation in PyYAML | 悪用確率 6.2%（上位6.3%）<br>CRITICAL 9.8 | 直接 | 5.4 に上げる |
| 12 | requests@2.19.1 | [CVE-2018-18074](https://osv.dev/vulnerability/GHSA-x84v-xcm2-53pg)<br>Insufficiently Protected Credentials in Requests | 悪用確率 6.9%（上位5.7%）<br>HIGH 7.5 | 直接 | 2.20.0 に上げる |
| 13 | pyyaml@5.3 | [CVE-2020-1747](https://osv.dev/vulnerability/GHSA-6757-jp84-gxfx)<br>Improper Input Validation in PyYAML | 悪用確率 5.4%（上位7.1%）<br>CRITICAL 9.8 | 直接 | 5.3.1 に上げる |
| 14 | django@3.2.0 | [CVE-2021-31542](https://osv.dev/vulnerability/GHSA-rxjp-mfm9-w4wr)<br>Path Traversal in Django | 悪用確率 5.3%（上位7.2%）<br>HIGH 7.5 | 直接 | 3.2.1 に上げる |
| 15 | django@3.2.0 | [CVE-2021-33571](https://osv.dev/vulnerability/GHSA-p99v-5w3c-jqq9)<br>Django Access Control Bypass possibly leading to SSRF, RFI, and LFI attacks  | 悪用確率 5.3%（上位7.3%）<br>HIGH 7.5 | 直接 | 3.2.4 に上げる |
| 16 | pillow@8.0.0 | [CVE-2021-27922](https://osv.dev/vulnerability/GHSA-3wvg-mj6g-m9cv)<br>Pillow Uncontrolled Resource Consumption | 悪用確率 4.9%（上位7.8%）<br>HIGH 7.5 | 直接 | 8.1.1 に上げる |
| 17 | pillow@8.0.0 | [CVE-2022-22817](https://osv.dev/vulnerability/GHSA-8vj2-vxx3-667w)<br>Arbitrary expression injection in Pillow | 悪用確率 3.6%（上位10.3%）<br>CRITICAL 9.8 | 直接 | 9.0.0 に上げる |
| 18 | pillow@8.0.0 | [CVE-2021-34552](https://osv.dev/vulnerability/GHSA-7534-mm45-c74v)<br>Buffer Overflow in Pillow | 悪用確率 3.2%（上位11.6%）<br>CRITICAL 9.8 | 直接 | 8.3.0 に上げる |
| 19 | django@3.2.0 | [CVE-2022-41323](https://osv.dev/vulnerability/GHSA-qrw5-5h28-6cmg)<br>Django denial-of-service vulnerability in internationalized URLs | 悪用確率 3.8%（上位9.8%）<br>HIGH 7.5 | 直接 | 3.2.16 に上げる |
| 20 | django@3.2.0 | [CVE-2022-28347](https://osv.dev/vulnerability/GHSA-w24h-v9qh-8gxj)<br>SQL Injection in Django | 悪用確率 2.9%（上位12.5%）<br>CRITICAL 9.8 | 直接 | 3.2.13 に上げる |
| 21 | pillow@8.0.0 | [CVE-2021-25287](https://osv.dev/vulnerability/GHSA-77gc-v2xv-rvvh)<br>Out-of-bounds Read in Pillow | 悪用確率 2.9%（上位12.6%）<br>CRITICAL 9.1 | 直接 | 8.2.0 に上げる |
| 22 | jinja2@2.10 | [CVE-2019-10906](https://osv.dev/vulnerability/GHSA-462w-v97r-4m45)<br>Jinja2 sandbox escape via string formatting | 悪用確率 3.6%（上位10.3%）<br>HIGH 8.6 | 直接 | 2.10.1 に上げる |
| 23 | pillow@8.0.0 | [CVE-2022-24303](https://osv.dev/vulnerability/GHSA-9j59-75qj-795w)<br>Path traversal in Pillow | 悪用確率 2.7%（上位13.7%）<br>CRITICAL 9.1 | 直接 | 9.0.1 に上げる |
| 24 | pillow@8.0.0 | [CVE-2021-23437](https://osv.dev/vulnerability/GHSA-98vv-pw6r-q6q4)<br>Uncontrolled Resource Consumption in pillow | 悪用確率 3.2%（上位11.4%）<br>HIGH 7.5 | 直接 | 8.3.2 に上げる |
| 25 | pillow@8.0.0 | [CVE-2021-27921](https://osv.dev/vulnerability/GHSA-f4w8-cv6p-x6r5)<br>Pillow Denial of Service by Uncontrolled Resource Consumption | 悪用確率 3.2%（上位11.7%）<br>HIGH 7.5 | 直接 | 8.1.1 に上げる |
| 26 | pillow@8.0.0 | [CVE-2021-27923](https://osv.dev/vulnerability/GHSA-95q3-8gr9-gm8w)<br>Pillow Denial of Service by Uncontrolled Resource Consumption | 悪用確率 3.0%（上位12.1%）<br>HIGH 7.5 | 直接 | 8.1.1 に上げる |
| 27 | pillow@8.0.0 | [CVE-2021-25288](https://osv.dev/vulnerability/GHSA-rwv7-3v45-hg29)<br>Pillow Out-of-bounds Read vulnerability | 悪用確率 2.4%（上位15.6%）<br>CRITICAL 9.1 | 直接 | 8.2.0 に上げる |
| 28 | django@3.2.0 | [CVE-2023-36053](https://osv.dev/vulnerability/GHSA-jh3w-4vvf-mjgr)<br>Django has regular expression denial of service vulnerability in EmailValidator/URLValidator | 悪用確率 3.0%（上位12.4%）<br>HIGH 7.5 | 直接 | 3.2.20 に上げる |
| 29 | pillow@8.0.0 | [CVE-2021-25289](https://osv.dev/vulnerability/GHSA-57h3-9rgr-c24m)<br>Out of bounds write in Pillow | 悪用確率 2.3%（上位15.9%）<br>CRITICAL 9.8 | 直接 | 8.1.1 に上げる |
| 30 | urllib3@1.24.1 | [CVE-2026-21441](https://osv.dev/vulnerability/GHSA-38jv-5279-wg99)<br>Decompression-bomb safeguards bypassed when following HTTP redirects (streaming API) | 悪用確率 2.9%（上位12.6%）<br>HIGH 7.5 | 直接 | 2.6.3 に上げる |
| 31 | urllib3@1.24.1 | [CVE-2019-11324](https://osv.dev/vulnerability/GHSA-mh33-7rrq-662w)<br>Improper Certificate Validation in urllib3 | 悪用確率 2.9%（上位12.6%）<br>HIGH 7.5 | 直接 | 1.24.2 に上げる |
| 32 | django@3.2.0 | [CVE-2021-45115](https://osv.dev/vulnerability/GHSA-53qw-q765-4fww)<br>Denial-of-service in Django | 悪用確率 2.6%（上位14.3%）<br>HIGH 7.5 | 直接 | 3.2.11 に上げる |
| 33 | pillow@8.0.0 | [CVE-2021-28676](https://osv.dev/vulnerability/GHSA-7r7m-5h27-29hp)<br>Potential infinite loop in Pillow | 悪用確率 2.5%（上位14.9%）<br>HIGH 7.5 | 直接 | 8.2.0 に上げる |
| 34 | pillow@8.0.0 | [CVE-2021-28677](https://osv.dev/vulnerability/GHSA-q5hq-fp76-qmrc)<br>Uncontrolled Resource Consumption in Pillow | 悪用確率 2.5%（上位15.1%）<br>HIGH 7.5 | 直接 | 8.2.0 に上げる |
| 35 | django@3.2.0 | [CVE-2021-44420](https://osv.dev/vulnerability/GHSA-v6rh-hp5x-86rv)<br>Potential bypass of an upstream access control based on URL paths in Django | 悪用確率 2.4%（上位15.4%）<br>HIGH 7.3 | 直接 | 3.2.10 に上げる |
| 36 | pillow@8.0.0 | [CVE-2021-25290](https://osv.dev/vulnerability/GHSA-8xjq-8fcg-g5hw)<br>Out-of-bounds Write in Pillow | 悪用確率 2.4%（上位15.7%）<br>HIGH 7.5 | 直接 | 8.1.1 に上げる |
| 37 | jinja2@2.10 | [CVE-2020-28493](https://osv.dev/vulnerability/GHSA-g3rq-g295-4j3m)<br>Regular Expression Denial of Service (ReDoS) in Jinja2 | 悪用確率 3.6%（上位10.3%）<br>MODERATE 5.3 | 直接 | 2.11.3 に上げる |
| 38 | pillow@8.0.0 | [CVE-2026-112403](https://osv.dev/vulnerability/GHSA-8g5g-8vmr-9782)<br>Pillow: Heap buffer overflow in ImagingJpegDecode | 悪用確率 1.7%（上位22.0%）<br>CRITICAL 9.8 | 直接 | 13.0.0 に上げる |
| 39 | django@3.2.0 | [CVE-2022-22818](https://osv.dev/vulnerability/GHSA-95rw-fx8r-36v6)<br>Cross-site Scripting in Django | 悪用確率 3.4%（上位11.0%）<br>MODERATE 6.1 | 直接 | 3.2.12 に上げる |
| 40 | django@3.2.0 | [CVE-2021-32052](https://osv.dev/vulnerability/GHSA-qm57-vhq3-3fwf)<br>Header injection possible in Django | 悪用確率 3.2%（上位11.6%）<br>MODERATE 6.1 | 直接 | 3.2.2 に上げる |
| 41 | django@3.2.0 | [CVE-2021-45116](https://osv.dev/vulnerability/GHSA-8c5j-9r9f-c6w8)<br>Information disclosure in Django | 悪用確率 2.0%（上位19.0%）<br>HIGH 7.5 | 直接 | 3.2.11 に上げる |
| 42 | django@3.2.0 | [CVE-2025-64458](https://osv.dev/vulnerability/GHSA-qw25-v68c-qjf3)<br>Django has a denial-of-service vulnerability in HttpResponseRedirect and HttpResponsePermanentRedirect on Windows | 悪用確率 1.9%（上位19.7%）<br>HIGH 7.5 | 直接 | 4.2.26 に上げる |
| 43 | pillow@8.0.0 | [CVE-2020-35654](https://osv.dev/vulnerability/GHSA-vqcj-wrf2-7v73)<br>Pillow Out-of-bounds Write | 悪用確率 1.9%（上位20.2%）<br>HIGH 8.8 | 直接 | 8.1.0 に上げる |
| 44 | requests@2.19.1 | [CVE-2023-32681](https://osv.dev/vulnerability/GHSA-j8r2-6x86-q33q)<br>Unintended leak of Proxy-Authorization header in requests | 悪用確率 3.0%（上位12.4%）<br>MODERATE 6.1 | 直接 | 2.31.0 に上げる |
| 45 | django@3.2.0 | [CVE-2023-31047](https://osv.dev/vulnerability/GHSA-r3xc-prgr-mg9p)<br>Django bypasses validation when using one form field to upload multiple files | 悪用確率 1.4%（上位27.0%）<br>CRITICAL 9.8 | 直接 | 3.2.19 に上げる |
| 46 | pillow@8.0.0 | [CVE-2022-22815](https://osv.dev/vulnerability/GHSA-pw3c-h7wp-cvhx)<br>Improper Initialization in Pillow | 悪用確率 2.8%（上位13.3%）<br>MODERATE 6.5 | 直接 | 9.0.0 に上げる |
| 47 | django@3.2.0 | [CVE-2021-33203](https://osv.dev/vulnerability/GHSA-68w8-qjq3-2gfm)<br>Path Traversal in Django | 悪用確率 2.7%（上位13.5%）<br>MODERATE 4.9 | 直接 | 3.2.4 に上げる |
| 48 | pillow@8.0.0 | [CVE-2023-50447](https://osv.dev/vulnerability/GHSA-3f63-hfp8-52jq)<br>Arbitrary Code Execution in Pillow | 悪用確率 1.7%（上位22.2%）<br>HIGH 8.1 | 直接 | 10.2.0 に上げる |
| 49 | pillow@8.0.0 | [CVE-2020-35653](https://osv.dev/vulnerability/GHSA-f5g8-5qq7-938w)<br>Pillow Out-of-bounds Read | 悪用確率 1.6%（上位23.0%）<br>HIGH 7.1 | 直接 | 8.1.0 に上げる |
| 50 | pillow@8.0.0 | [CVE-2026-112900](https://osv.dev/vulnerability/GHSA-w889-685w-c8fh)<br>Pillow: Argument Injection in Ghostscript call, potentially leading into RCE | 悪用確率 1.3%（上位28.8%）<br>CRITICAL | 直接 | 13.0.0 に上げる |
| 51 | pillow@8.0.0 | [CVE-2022-45198](https://osv.dev/vulnerability/GHSA-m2vv-5vj5-2hm7)<br>Pillow vulnerable to Data Amplification attack. | 悪用確率 1.6%（上位23.2%）<br>HIGH 7.5 | 直接 | 9.2.0 に上げる |
| 52 | django@3.2.0 | [CVE-2021-45452](https://osv.dev/vulnerability/GHSA-jrh2-hc4r-7jwx)<br>Directory-traversal in Django | 悪用確率 2.6%（上位14.3%）<br>MODERATE 5.3 | 直接 | 3.2.11 に上げる |
| 53 | pillow@8.0.0 | [CVE-2021-25293](https://osv.dev/vulnerability/GHSA-p43w-g3c5-g5mq)<br>Out of bounds read in Pillow | 悪用確率 1.6%（上位23.6%）<br>HIGH 7.5 | 直接 | 8.1.1 に上げる |
| 54 | urllib3@1.24.1 | [CVE-2020-26137](https://osv.dev/vulnerability/GHSA-wqvq-5m8c-6g24)<br>CRLF injection in urllib3 | 悪用確率 2.3%（上位16.5%）<br>MODERATE 6.5 | 直接 | 1.25.9 に上げる |
| 55 | pillow@8.0.0 | [CVE-2021-25291](https://osv.dev/vulnerability/GHSA-mvg9-xffr-p774)<br>Out of bounds read in Pillow | 悪用確率 1.4%（上位26.8%）<br>HIGH 7.5 | 直接 | 8.1.1 に上げる |
| 56 | urllib3@1.24.1 | [CVE-2023-43804](https://osv.dev/vulnerability/GHSA-v845-jxx5-vc9f)<br>`Cookie` HTTP header isn't stripped on cross-origin redirects | 悪用確率 1.4%（上位27.6%）<br>HIGH 8.1 | 直接 | 1.26.17 に上げる |
| 57 | pillow@8.0.0 | [CVE-2023-44271](https://osv.dev/vulnerability/GHSA-8ghj-p4vj-mr35)<br>Pillow Denial of Service vulnerability | 悪用確率 1.4%（上位27.6%）<br>HIGH 7.5 | 直接 | 10.0.0 に上げる |
| 58 | pillow@8.0.0 | [CVE-2022-22816](https://osv.dev/vulnerability/GHSA-xrcv-f9gm-v42c)<br>Out-of-bounds Read in Pillow | 悪用確率 2.1%（上位18.1%）<br>MODERATE 6.5 | 直接 | 9.0.0 に上げる |
| 59 | urllib3@1.24.1 | [CVE-2019-11236](https://osv.dev/vulnerability/GHSA-r64q-w8jr-g9qp)<br>Improper Neutralization of CRLF Sequences in urllib3 library for Python | 悪用確率 2.1%（上位18.2%）<br>MODERATE 6.1 | 直接 | 1.24.3 に上げる |
| 60 | pillow@8.0.0 | [CVE-2026-112393](https://osv.dev/vulnerability/GHSA-332p-7hrc-92wf)<br>Pillow: Heap buffer overflow in _tiffWriteProc when saving TIFF to BytesIO | 悪用確率 1.0%（上位35.8%）<br>CRITICAL | 直接 | 13.0.0 に上げる |
| 61 | django@3.2.0 | [CVE-2024-27351](https://osv.dev/vulnerability/GHSA-vm8q-m57g-pff3)<br>Regular expression denial-of-service in Django | 悪用確率 1.9%（上位20.3%）<br>MODERATE 5.3 | 直接 | 3.2.25 に上げる |
| 62 | django@3.2.0 | [CVE-2026-15307](https://osv.dev/vulnerability/GHSA-wvqv-fj8w-qmhm)<br>Django GeoDjango spatial lookups allow file writes and outbound requests through GDAL raster parsing | 悪用確率 1.1%（上位32.7%）<br>HIGH 8.8 | 直接 | 5.2.17 に上げる |
| 63 | pillow@8.0.0 | [CVE-2022-45199](https://osv.dev/vulnerability/PYSEC-2022-42980)<br>Pillow before 9.3.0 allows denial of service via SAMPLESPERPIXEL. | 悪用確率 1.5%（上位25.0%）<br>UNKNOWN | 直接 | 修正版なし（回避策を確認） |
| 64 | pillow@8.0.0 | [CVE-2021-25292](https://osv.dev/vulnerability/GHSA-9hx2-hgq2-2g4f)<br>Regular Expression Denial of Service (ReDoS) in Pillow | 悪用確率 1.7%（上位21.8%）<br>MODERATE 6.5 | 直接 | 8.1.1 に上げる |
| 65 | pillow@8.0.0 | [CVE-2020-35655](https://osv.dev/vulnerability/GHSA-hf64-x4gq-p99h)<br>Pillow Out-of-bounds Read | 悪用確率 1.7%（上位22.7%）<br>MODERATE 5.4 | 直接 | 8.1.0 に上げる |
| 66 | django@3.2.0 | [CVE-2024-24680](https://osv.dev/vulnerability/GHSA-xxj9-f6rv-m3x4)<br>Django denial-of-service attack in the intcomma template filter | 悪用確率 1.6%（上位23.5%）<br>MODERATE 5.9 | 直接 | 3.2.24 に上げる |
| 67 | django@3.2.0 | [CVE-2023-41164](https://osv.dev/vulnerability/GHSA-7h4p-27mh-hmrw)<br>Django Denial of service vulnerability in django.utils.encoding.uri_to_iri | 悪用確率 1.5%（上位24.8%）<br>MODERATE 5.3 | 直接 | 3.2.21 に上げる |
| 68 | django@3.2.0 | [CVE-2022-36359](https://osv.dev/vulnerability/GHSA-8x94-hmjh-97hq)<br>Django vulnerable to Reflected File Download attack | 悪用確率 0.9%（上位38.3%）<br>HIGH 8.8 | 直接 | 3.2.15 に上げる |
| 69 | django@3.2.0 | [CVE-2023-43665](https://osv.dev/vulnerability/GHSA-h8gc-pgj2-vjm3)<br>Django Denial-of-service in django.utils.text.Truncator | 悪用確率 1.5%（上位25.7%）<br>MODERATE 5.9 | 直接 | 3.2.22 に上げる |
| 70 | pillow@8.0.0 | [CVE-2026-112398](https://osv.dev/vulnerability/GHSA-5x8w-8jj5-q52h)<br>Pillow: Heap buffer overflow in FlashPix (FPX) JPEG decoding leads to code execution | 悪用確率 0.7%（上位46.1%）<br>CRITICAL 9.8 | 直接 | 13.0.0 に上げる |
| 71 | pillow@8.0.0 | [CVE-2026-112902](https://osv.dev/vulnerability/GHSA-xvh5-g6gv-559v)<br> Pillow: Memory disclosure and segfault in libtiff encoder via crafted TIFF tags | 悪用確率 0.6%（上位48.5%）<br>CRITICAL 9.1 | 直接 | 13.0.0 に上げる |
| 72 | urllib3@1.24.1 | [CVE-2025-66471](https://osv.dev/vulnerability/GHSA-2xpw-w6gg-jr37)<br>urllib3 streaming API improperly handles highly compressed data | 悪用確率 0.7%（上位44.8%）<br>HIGH | 直接 | 2.6.0 に上げる |
| 73 | urllib3@1.24.1 | [CVE-2025-66418](https://osv.dev/vulnerability/GHSA-gm62-xv2j-4w53)<br>urllib3 allows an unbounded number of links in the decompression chain | 悪用確率 0.7%（上位44.8%）<br>HIGH | 直接 | 2.6.0 に上げる |
| 74 | urllib3@1.24.1 | [CVE-2024-37891](https://osv.dev/vulnerability/GHSA-34jh-p97f-mpxf)<br>urllib3's Proxy-Authorization request header isn't stripped during cross-origin redirects | 悪用確率 1.1%（上位32.5%）<br>MODERATE 4.4 | 直接 | 1.26.19 に上げる |
| 75 | django@3.2.0 | [CVE-2026-15830](https://osv.dev/vulnerability/GHSA-q238-5cxm-5c9h)<br>Django GeoDjango vulnerable to denial of service through deeply nested geometry collections | 悪用確率 1.1%（上位33.2%）<br>MODERATE 5.3 | 直接 | 5.2.17 に上げる |
| 76 | requests@2.19.1 | [CVE-2024-47081](https://osv.dev/vulnerability/GHSA-9hjg-9r4m-mvj7)<br>Requests vulnerable to .netrc credentials leak via malicious URLs | 悪用確率 1.0%（上位35.7%）<br>MODERATE 5.3 | 直接 | 2.32.4 に上げる |
| 77 | pillow@8.0.0 | [CVE-2024-28219](https://osv.dev/vulnerability/GHSA-44wm-f244-xhp3)<br>Pillow buffer overflow vulnerability | 悪用確率 1.0%（上位36.4%）<br>MODERATE 6.7 | 直接 | 10.3.0 に上げる |
| 78 | jinja2@2.10 | [CVE-2024-34064](https://osv.dev/vulnerability/GHSA-h75v-3vvj-5mfj)<br>Jinja vulnerable to HTML attribute injection when passing user input as keys to xmlattr filter | 悪用確率 1.0%（上位36.9%）<br>MODERATE 5.4 | 直接 | 3.1.4 に上げる |
| 79 | pillow@8.0.0 | [CVE-2026-96640](https://osv.dev/vulnerability/GHSA-mrfp-p49p-3hf2)<br>Pillow PDF append accepts malformed shared page-tree DAG causing resource exhaustion | 悪用確率 0.6%（上位50.1%）<br>HIGH | 直接 | 13.0.0 に上げる |
| 80 | pillow@8.0.0 | [CVE-2026-112394](https://osv.dev/vulnerability/GHSA-4558-3h8r-v8xp)<br>Pillow: P;2L and P;4L decoders may read 1 to 3 bytes past the passed buffer size | 悪用確率 0.6%（上位50.3%）<br>HIGH 8.2 | 直接 | 13.0.0 に上げる |
| 81 | pillow@8.0.0 | [CVE-2021-28675](https://osv.dev/vulnerability/GHSA-g6rj-rv7j-xwp4)<br>Pillow denial of service | 悪用確率 1.0%（上位37.7%）<br>MODERATE 5.5 | 直接 | 8.2.0 に上げる |
| 82 | pillow@8.0.0 | [CVE-2026-112402](https://osv.dev/vulnerability/GHSA-7mwm-ghpf-9vrm)<br>Pillow: Double free in ImagingScaleAffine on calloc failure via Image.transform | 悪用確率 0.6%（上位50.6%）<br>HIGH 7.5 | 直接 | 13.0.0 に上げる |
| 83 | pillow@8.0.0 | [CVE-2026-112894](https://osv.dev/vulnerability/GHSA-jg86-v3jv-hrpm)<br>Pillow: Quadratic-time DoS in PDF save_all (PdfParser.next_object_id) | 悪用確率 0.6%（上位50.6%）<br>HIGH | 直接 | 13.0.0 に上げる |
| 84 | pillow@8.0.0 | [CVE-2026-112895](https://osv.dev/vulnerability/GHSA-p4wg-p73j-c528)<br>Pillow: Unbounded recursion parsing a PDF page tree or trailer chain (incomplete fix for CVE-2026-42310) | 悪用確率 0.6%（上位50.6%）<br>HIGH | 直接 | 13.0.0 に上げる |
| 85 | pillow@8.0.0 | [CVE-2026-112390](https://osv.dev/vulnerability/GHSA-22hg-r758-rrw9)<br>Pillow: Infinite loop in MIC n_frames when the embedded TIFF | 悪用確率 0.6%（上位50.7%）<br>HIGH | 直接 | 13.0.0 に上げる |
| 86 | pillow@8.0.0 | [CVE-2026-112406](https://osv.dev/vulnerability/GHSA-f2g6-542v-9j58)<br>Pillow: Infinite loop in PdfParser.rewrite_pages on page tree Parent cycle | 悪用確率 0.6%（上位51.8%）<br>HIGH | 直接 | 13.0.0 に上げる |
| 87 | jinja2@2.10 | [CVE-2024-22195](https://osv.dev/vulnerability/GHSA-h5c8-rqwp-cp95)<br>Jinja vulnerable to HTML attribute injection when passing user input as keys to xmlattr filter | 悪用確率 0.9%（上位39.7%）<br>MODERATE 5.4 | 直接 | 3.1.3 に上げる |
| 88 | pillow@8.0.0 | [CVE-2026-112397](https://osv.dev/vulnerability/GHSA-58r4-6rv3-gfh8)<br>Pillow: Out-of-bounds access in _imagingmorph on a zero-width image | 悪用確率 0.5%（上位54.2%）<br>HIGH 7.5 | 直接 | 13.0.0 に上げる |
| 89 | pillow@8.0.0 | [CVE-2026-112901](https://osv.dev/vulnerability/GHSA-xgh8-jp6q-p5x8)<br>Pillow: ReDoS in XbmImagePlugin: 512-byte file stalls Image.open() for minutes | 悪用確率 0.5%（上位54.2%）<br>HIGH 7.5 | 直接 | 13.0.0 に上げる |
| 90 | pillow@8.0.0 | [CVE-2026-112392](https://osv.dev/vulnerability/GHSA-27h8-gf7j-v5hc)<br>Pillow: NULL dereference in ImagingExpand via rank filters on zero-size images | 悪用確率 0.5%（上位54.3%）<br>HIGH 7.5 | 直接 | 13.0.0 に上げる |
| 91 | jinja2@2.10 | [CVE-2024-56326](https://osv.dev/vulnerability/GHSA-q2x7-8rv6-6q7h)<br>Jinja has a sandbox breakout through indirect reference to format method | 悪用確率 0.5%（上位54.8%）<br>HIGH 7.8 | 直接 | 3.1.5 に上げる |
| 92 | pillow@8.0.0 | [CVE-2026-55379](https://osv.dev/vulnerability/GHSA-45hq-cxwh-f6vc)<br>Pillow `BdfFontFile`: `Image.new()` called without `_decompression_bomb_check()` — bomb protection bypass via font loadi | 悪用確率 0.5%（上位54.8%）<br>HIGH 7.5 | 直接 | 12.3.0 に上げる |
| 93 | pillow@8.0.0 | [CVE-2026-54058](https://osv.dev/vulnerability/GHSA-62p4-gmf7-7g93)<br>Pillow: Out-of-bounds read via attacker-controlled row stride on Pillow's mmap path (McIdas AREA files) | 悪用確率 0.5%（上位54.9%）<br>HIGH | 直接 | 12.3.0 に上げる |
| 94 | pillow@8.0.0 | [CVE-2026-55380](https://osv.dev/vulnerability/GHSA-phj9-mv4w-65pm)<br>Pillow `GdImageFile._open()`: image dimensions accepted without `_decompression_bomb_check()` | 悪用確率 0.5%（上位55.1%）<br>HIGH 7.5 | 直接 | 12.3.0 に上げる |
| 95 | django@3.2.0 | [CVE-2025-48432](https://osv.dev/vulnerability/GHSA-7xr5-9hcq-chf9)<br>Django Improper Output Neutralization for Logs vulnerability | 悪用確率 0.8%（上位42.2%）<br>MODERATE 4 | 直接 | 4.2.22 に上げる |
| 96 | pillow@8.0.0 | [CVE-2026-112892](https://osv.dev/vulnerability/GHSA-gg2r-wvfm-q9rx)<br>Pillow: MSP RLE decoder expands a tiny file into unbounded memory | 悪用確率 0.5%（上位56.1%）<br>HIGH | 直接 | 13.0.0 に上げる |
| 97 | pillow@8.0.0 | [CVE-2026-112897](https://osv.dev/vulnerability/GHSA-q45j-58j2-45rg)<br>Pillow: TiffDecode returns uninitialized memory as pixels for short JPEG strips | 悪用確率 0.5%（上位57.8%）<br>HIGH | 直接 | 13.0.0 に上げる |
| 98 | pillow@8.0.0 | [CVE-2026-128067](https://osv.dev/vulnerability/GHSA-xcvg-w56q-r89m)<br>Pillow: Heap buffer overflow saving TIFF with libtiff when tags override image size | 悪用確率 0.5%（上位58.0%）<br>HIGH | 直接 | 13.0.0 に上げる |
| 99 | pillow@8.0.0 | [CVE-2026-112896](https://osv.dev/vulnerability/GHSA-pchr-8j38-3x4p)<br>Pillow: TIFF encoder ColorMap plane-size mismatch causes a heap out-of-bounds read | 悪用確率 0.5%（上位58.1%）<br>HIGH 7.1 | 直接 | 13.0.0 に上げる |
| 100 | pillow@8.0.0 | [CVE-2021-28678](https://osv.dev/vulnerability/GHSA-hjfx-8p6c-g7gx)<br>Insufficient Verification of Data Authenticity in Pillow | 悪用確率 0.7%（上位44.8%）<br>MODERATE 5.5 | 直接 | 8.2.0 に上げる |
| 101 | pillow@8.0.0 | [CVE-2026-59197](https://osv.dev/vulnerability/GHSA-xj96-63gp-2gmr)<br>Pillow: Heap out-of-bounds write in `ImageFilter.RankFilter` via integer overflow in `ImagingExpand` | 悪用確率 0.4%（上位60.5%）<br>HIGH 8.2 | 直接 | 12.3.0 に上げる |
| 102 | urllib3@1.24.1 | [CVE-2026-97689](https://osv.dev/vulnerability/GHSA-vxq7-64xx-v4gw)<br>urllib3: HTTPResponse.stream()/read_chunked() buffers an unbounded chunk-size line into memory | 悪用確率 0.4%（上位61.0%）<br>HIGH | 直接 | 2.8.0 に上げる |
| 103 | pillow@8.0.0 | [CVE-2026-96644](https://osv.dev/vulnerability/GHSA-9v9v-9qvf-h2hj)<br>Pillow: Heap over-read in WMF/EMF rendering via 16-bit dimension truncation (Windows builds) | 悪用確率 0.4%（上位61.6%）<br>HIGH 8.1 | 直接 | 13.0.0 に上げる |
| 104 | pillow@8.0.0 | [CVE-2026-54060](https://osv.dev/vulnerability/GHSA-5x94-69rx-g8h2)<br>Pillow: `FontFile.compile()`: `Image.new()` called without `_decompression_bomb_check()` | 悪用確率 0.4%（上位63.1%）<br>HIGH 7.5 | 直接 | 12.3.0 に上げる |
| 105 | pillow@8.0.0 | [CVE-2026-54059](https://osv.dev/vulnerability/GHSA-8v84-f9pq-wr9x)<br>Pillow `PcfFontFile._load_bitmaps()`: `Image.frombytes()` called without `_decompression_bomb_check()` — bomb protection | 悪用確率 0.4%（上位64.0%）<br>HIGH 7.5 | 直接 | 12.3.0 に上げる |
| 106 | pillow@8.0.0 | [CVE-2026-112401](https://osv.dev/vulnerability/GHSA-74r2-7ff9-mjj2)<br>Pillow: Quadratic GIF comment concatenation allows DoS in Image.open() | 悪用確率 0.6%（上位47.9%）<br>MODERATE | 直接 | 13.0.0 に上げる |
| 107 | pillow@8.0.0 | [CVE-2026-96642](https://osv.dev/vulnerability/GHSA-3j72-p6qg-6xp7)<br>Pillow: TarIO negative size field causes infinite CPU-spin loop | 悪用確率 0.4%（上位65.5%）<br>HIGH | 直接 | 13.0.0 に上げる |
| 108 | pillow@8.0.0 | [CVE-2026-59199](https://osv.dev/vulnerability/GHSA-6r8x-57c9-28j4)<br>Pillow: Heap out-of-bounds write `Image.paste()` / `Image.crop()` via signed coordinate overflow | 悪用確率 0.4%（上位66.6%）<br>HIGH 7.5 | 直接 | 12.3.0 に上げる |
| 109 | pillow@8.0.0 | [CVE-2026-59205](https://osv.dev/vulnerability/GHSA-9hw9-ch79-4vh6)<br>Pillow: Controlled heap out-of-bounds write in Pillow `ImageCmsTransform.apply()` via output mode mismatch | 悪用確率 0.4%（上位66.6%）<br>HIGH 7.5 | 直接 | 12.3.0 に上げる |
| 110 | pillow@8.0.0 | [CVE-2026-59200](https://osv.dev/vulnerability/GHSA-jjj6-mw9f-p565)<br>Pillow: Decompression Bomb DoS via PdfParser.PdfStream.decode() | 悪用確率 0.4%（上位66.6%）<br>HIGH 7.5 | 直接 | 12.3.0 に上げる |
| 111 | pillow@8.0.0 | [CVE-2026-96637](https://osv.dev/vulnerability/GHSA-g842-9rc4-69pw)<br>Pillow: Decompression bomb check bypass in SpiderImagePlugin.seek() leads to unbounded allocation DoS | 悪用確率 0.4%（上位68.1%）<br>HIGH | 直接 | 13.0.0 に上げる |
| 112 | urllib3@1.24.1 | [CVE-2023-45803](https://osv.dev/vulnerability/GHSA-g4mx-q9vg-27p4)<br>urllib3's request body not stripped after redirect from 303 status changes request method to GET | 悪用確率 0.6%（上位50.7%）<br>MODERATE 4.2 | 直接 | 1.26.18 に上げる |
| 113 | urllib3@1.24.1 | [CVE-2018-25091](https://osv.dev/vulnerability/GHSA-gwvm-45gx-3cf8)<br>Authorization Header forwarded on redirect | 悪用確率 0.6%（上位50.9%）<br>MODERATE 6.1 | 直接 | 1.24.2 に上げる |
| 114 | pillow@8.0.0 | [CVE-2026-112391](https://osv.dev/vulnerability/GHSA-254f-3936-288h)<br>Pillow: PdfParser can recurse without limit in get_value() and linearize_page_tree() | 悪用確率 0.6%（上位51.3%）<br>MODERATE | 直接 | 13.0.0 に上げる |
| 115 | django@3.2.0 | [CVE-2026-53877](https://osv.dev/vulnerability/GHSA-crhf-3pfg-w68w)<br> Django: GDALRaster may over-read heap memory when constructed from bytes | 悪用確率 0.5%（上位54.5%）<br>MODERATE 4.8 | 直接 | 5.2.16 に上げる |
| 116 | jinja2@2.10 | [CVE-2025-27516](https://osv.dev/vulnerability/GHSA-cpwx-vrp4-4pq7)<br>Jinja2 vulnerable to sandbox breakout through attr filter selecting format method | 悪用確率 0.5%（上位55.9%）<br>MODERATE | 直接 | 3.1.6 に上げる |
| 117 | pillow@8.0.0 | [CVE-2026-112899](https://osv.dev/vulnerability/GHSA-vx6w-vv9f-6gvg)<br>Pillow: EPS load(scale) lets Ghostscript render past the decompression bomb limit | 悪用確率 0.5%（上位56.2%）<br>MODERATE | 直接 | 13.0.0 に上げる |
| 118 | urllib3@1.24.1 | [CVE-2025-50181](https://osv.dev/vulnerability/GHSA-pq67-6m6q-mj2v)<br>urllib3 redirects are not disabled when retries are disabled on PoolManager instantiation | 悪用確率 0.5%（上位56.7%）<br>MODERATE 5.3 | 直接 | 2.5.0 に上げる |
| 119 | pillow@8.0.0 | [CVE-2026-128066](https://osv.dev/vulnerability/GHSA-wqgw-9xfh-qf2g)<br>Pillow: Memory DoS in TIFF and EXIF IFD parsing via overlapping tag data | 悪用確率 0.5%（上位57.1%）<br>MODERATE | 直接 | 13.0.0 に上げる |
| 120 | django@3.2.0 | [CVE-2024-45231](https://osv.dev/vulnerability/GHSA-rrqc-c2jx-6jgv)<br>Django allows enumeration of user e-mail addresses | 悪用確率 0.8%（上位42.9%）<br>LOW 3.7 | 直接 | 4.2.16 に上げる |
| 121 | pillow@8.0.0 | [CVE-2026-96641](https://osv.dev/vulnerability/GHSA-4rm8-3hmm-39fg)<br>Pillow: Reachable undefined behavior in native integer operations, potentially leading to denial of service or logic int | 悪用確率 0.4%（上位69.1%）<br>MODERATE 6.5 | 直接 | 13.0.0 に上げる |
| 122 | pillow@8.0.0 | [CVE-2026-96636](https://osv.dev/vulnerability/GHSA-p8hx-v2p6-rp84)<br>Pillow: Decompression-bomb protection bypass via multi-frame seek() in MPO and DCX (MpoImageFile.seek / DcxImageFile.see | 悪用確率 0.4%（上位69.1%）<br>MODERATE 6.5 | 直接 | 13.0.0 に上げる |
| 123 | requests@2.19.1 | [CVE-2024-35195](https://osv.dev/vulnerability/GHSA-9wx4-h78v-vm56)<br>Requests `Session` object does not verify requests after making first request with verify=False | 悪用確率 0.3%（上位72.0%）<br>MODERATE 5.6 | 直接 | 2.32.0 に上げる |
| 124 | urllib3@1.24.1 | [CVE-2026-44431](https://osv.dev/vulnerability/GHSA-qccp-gfcp-xxvc)<br>urllib3: Sensitive headers forwarded across origins in proxied low-level redirects | 悪用確率 0.3%（上位73.2%）<br>MODERATE 5.3 | 直接 | 2.7.0 に上げる |
| 125 | django@3.2.0 | [CVE-2026-53878](https://osv.dev/vulnerability/GHSA-8qcx-xf44-272x)<br>Django: DomainNameValidator permits newline characters that may enable HTTP header injection | 悪用確率 0.3%（上位73.7%）<br>MODERATE 6.1 | 直接 | 5.2.16 に上げる |
| 126 | pillow@8.0.0 | [CVE-2026-59198](https://osv.dev/vulnerability/GHSA-fj7v-r99m-22gq)<br>Pillow TGA RLE encoder can serialize up to ~57 KB of adjacent heap data into generated images | 悪用確率 0.3%（上位75.4%）<br>MODERATE 6.5 | 直接 | 12.3.0 に上げる |
| 127 | requests@2.19.1 | [CVE-2026-25645](https://osv.dev/vulnerability/GHSA-gc5v-m9x4-r6x2)<br>Requests has Insecure Temp File Reuse in its extract_zipped_paths() utility function | 悪用確率 0.3%（上位76.2%）<br>MODERATE 5.5 | 直接 | 2.33.0 に上げる |
| 128 | django@3.2.0 | [CVE-2026-48588](https://osv.dev/vulnerability/GHSA-3h9f-r86x-qvjx)<br>Django: cache middleware may expose private responses when unrelated request cookies are present | 悪用確率 0.4%（上位62.1%）<br>LOW 3.1 | 直接 | 5.2.16 に上げる |
| 129 | django@3.2.0 | [CVE-2026-48587](https://osv.dev/vulnerability/GHSA-923m-gv2p-w5qp)<br>Django: has_vary_header may expose cached responses when Vary values contain whitespace | 悪用確率 0.4%（上位68.8%）<br>LOW 3.1 | 直接 | 5.2.15 に上げる |
| 130 | pillow@8.0.0 | [CVE-2026-55798](https://osv.dev/vulnerability/GHSA-4x4j-2g7c-83w6)<br>Pillow: WindowsViewer.get_command() OS command injection via unescaped shell path | 悪用確率 0.2%（上位92.5%）<br>MODERATE 4.5 | 直接 | 12.3.0 に上げる |
| 131 | pillow@8.0.0 | [CVE-2026-42310](https://osv.dev/vulnerability/GHSA-r73j-pqj5-w3x7)<br>Pillow has a PDF Parsing Trailer Infinite Loop (DoS) | 悪用確率 0.2%（上位93.4%）<br>MODERATE 5.5 | 直接 | 12.2.0 に上げる |
| 132 | django@3.2.0 | [CVE-2026-8404](https://osv.dev/vulnerability/GHSA-8cjm-8mp7-r2xf)<br>Django: UpdateCacheMiddleware may disclose cached responses due to case-sensitive Cache-Control handling | 悪用確率 0.3%（上位80.0%）<br>LOW 3.1 | 直接 | 5.2.15 に上げる |
| 133 | django@3.2.0 | [CVE-2026-6873](https://osv.dev/vulnerability/GHSA-h7pc-vwp9-298g)<br>Django: signed cookies are vulnerable to salt namespace collisions | 悪用確率 0.2%（上位84.1%）<br>LOW 3.1 | 直接 | 5.2.15 に上げる |
| 134 | pillow@8.0.0 | [CVE-2026-42308](https://osv.dev/vulnerability/GHSA-wjx4-4jcj-g98j)<br>Pillow has an integer overflow when processing fonts | 悪用確率 0.1%（上位98.5%）<br>MODERATE 5.5 | 直接 | 12.2.0 に上げる |
| 135 | pillow@8.0.0 | [PYSEC-2023-175](https://osv.dev/vulnerability/PYSEC-2023-175)<br>Pillow versions before v10.0.1 bundled libwebp binaries in wheels that are vulnerable to CVE-2023-5129 (previously CVE-2 | UNKNOWN | 直接 | 10.0.1 に上げる |
| 136 | pillow@8.0.0 | [GHSA-4fx9-vc88-q2xc](https://osv.dev/vulnerability/GHSA-4fx9-vc88-q2xc)<br>Infinite loop in Pillow | LOW | 直接 | 9.0.0 に上げる |

</details>

## パッケージごとの対応（6 個）
脆弱性の数は多くても、作業は「パッケージを上げる」だけのことが多い。急ぐものが多い順。
| パッケージ | 脆弱性 | うち今日対応すべき | すべて直すには | 修正版なし |
| --- | --- | --- | --- | --- |
| pillow@8.0.0 | 72 件 | **1 件**（悪用確認済み 1） | 13.0.0 以上 | 1 |
| django@3.2.0 | 38 件 | **9 件** | 5.2.17 以上 | — |
| urllib3@1.24.1 | 13 件 | 0 件 | 2.8.0 以上 | — |
| jinja2@2.10 | 6 件 | 0 件 | 3.1.6 以上 | — |
| requests@2.19.1 | 5 件 | 0 件 | 2.33.0 以上 | — |
| pyyaml@5.3 | 2 件 | 0 件 | 5.4 以上 | — |

## 放置・非推奨の直接の依存（1 個）
「このバージョンは非推奨」は上げれば済む。「パッケージ自体が非推奨」と「長く更新がない」ものは、AI に乗り換え先を調べさせる。
| パッケージ | 状態 | 乗り換え先の提案（AI） |
| --- | --- | --- |
| nose@1.3.7 | 最新版（1.3.7）の公開が 2015-06（11年以上前） | 🔧 標準機能：標準ライブラリの unittest（python -m unittest discover）でも、基本的なテストの収集と実行は可能です。<br>✅ **pytest**（9.2.0、2026-10-27 公開）：現在最も標準的なテストフレームワークで活発に保守されており、nose形式のテスト関数もおおむねそのまま実行できます。<br>✅ **nose2**（0.16.0、2026-03-02 公開）：noseの後継としてnose-devsが開発しており、noseに近い使い方のまま移行できます。 |

✅ は、AI が提案したパッケージをコードで deps.dev に問い合わせ、実在・非推奨でない・2年以内に更新あり を確かめたもの。AI は道具を 2 回使って調べました。

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