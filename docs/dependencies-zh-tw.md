# 相依套件版本

[English](dependencies.md) · [臺灣華語 README](../README.zh-TW.md)

以下沿用英文文件的查核紀錄：2026-09-24 對照上游發布說明與維護者公告，
字型版本於 2026-09-25 查核。這些日期代表原始查核時間。

## XML 解析

`speech-rule-engine` 將 `@xmldom/xmldom` 固定為 0.9.10，本專案透過根層級 override 選用 0.9.12。
其[發布說明](https://github.com/xmldom/xmldom/releases/tag/0.9.12)列出下列安全性修正，
CVE 編號來自表中的維護者公告。這些描述的是相依套件問題，並非已證實可利用的 RAS 漏洞。

| CVE | 修正行為 |
| --- | --- |
| [CVE-2026-83608](https://github.com/xmldom/xmldom/security/advisories/GHSA-27p8-2357-5qqv) | 嚴格序列化時驗證文件類型名稱 |
| [CVE-2026-83609](https://github.com/xmldom/xmldom/security/advisories/GHSA-3px3-54cx-rmw9) | 建立名稱時拒絕行終止字元 |
| [CVE-2026-83610](https://github.com/xmldom/xmldom/security/advisories/GHSA-6gmq-8vp8-gcm6) | 驗證實體參照名稱 |
| [CVE-2026-83611](https://github.com/xmldom/xmldom/security/advisories/GHSA-6h8r-xr42-gp59) | 回報格式錯誤的結束標籤 |
| [CVE-2026-83612](https://github.com/xmldom/xmldom/security/advisories/GHSA-6mj3-qw4j-hgrw) | 防止解析 HTML 原始文字時的放大問題 |
| [CVE-2026-83613](https://github.com/xmldom/xmldom/security/advisories/GHSA-8344-3jmq-59r6) | 以線性時間移除重複屬性 |
| [CVE-2026-83614](https://github.com/xmldom/xmldom/security/advisories/GHSA-93r5-fhx6-vmg9) | 以線性時間從格式錯誤的輸入恢復 |
| [CVE-2026-83615](https://github.com/xmldom/xmldom/security/advisories/GHSA-965w-775f-mr7g) | 防止命名空間映射的記憶體用量以平方速度成長 |
| [CVE-2026-83616](https://github.com/xmldom/xmldom/security/advisories/GHSA-c7q8-3ch8-vqpv) | 驗證處理指令的目標 |
| [CVE-2026-83617](https://github.com/xmldom/xmldom/security/advisories/GHSA-jxjr-3g7g-3944) | 拒絕序列化元素／屬性名稱中的行終止字元 |
| [CVE-2026-83618](https://github.com/xmldom/xmldom/security/advisories/GHSA-vr34-hp96-76pp) | 驗證完整的文件類型識別字 |

各問題的受影響版本範圍不同，尤其 CVE-2026-83617 適用於 0.9.11。
目前固定版本避開受影響範圍，但不代表原本解析到的 0.9.10 含有表中所有問題。

## 瀏覽器執行環境

`puppeteer-core` 與 Puppeteer 25.11.0 對齊，供 Marp／Mermaid 工具鏈使用。
修改固定版本時，需實際測試 HTML、Mermaid 與 PDF 匯出。
既有測試在 macOS arm64、Node 22.18.0 與 26.9.0 執行；不能據此推論中間所有 Node 版本或其他作業系統都測過。

## 繁體字的臺灣華語字型

`@fontsource-variable/noto-sans-tc` 固定為 5.3.0，原紀錄於 2026-09-25 向 npm registry 查核。
[Fontsource 安裝指南](https://fontsource.org/fonts/noto-sans-tc/install)說明建置使用的可變字重 CSS。
字型與上游授權從已安裝套件複製到產出，不加入儲存庫來源。
Mermaid 在量測文字前預先載入標籤字型，並在 SVG 內嵌必要的子集以供離線使用。
