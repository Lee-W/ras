# 驗證紀錄

[English](validation.md) · [臺灣華語 README](../README.zh-TW.md)

本頁整理英文紀錄中的驗證範圍與限制，保留原始日期、測試數量及來源雜湊。
完整 TAP 摘錄與原始輸出見[英文驗證紀錄](validation.md)。
歷史結果不等於目前工作目錄已通過，請以當次執行結果為準。

## 公開前準備 — 2026-09-28

以 `2da18661eaf6cdb3a817eeb9522912a3862c5116` 為基底的工作區修改，
在 macOS arm64、Node 26.10.0、npm 11.19.1 上完成以下驗證：

- `npm run validate` 與 46 個測試通過，涵蓋授權保留、獨立指南連結、可攜式提示詞中的圖片查核，
  以及符號連結目錄的 CLI 啟動。新環境驗證找出並修正 macOS `/tmp` 別名下指令無聲結束的問題。
- `npm run test:release` 的首次發布、重跑、僅文件修改與後續 patch 情境通過。
- 儲存庫外的全新來源副本以 CLI 建立獨立簡報，安裝自己的相依套件，通過 `doctor` 並匯出 10 頁 PDF。
  安裝時的 audit 回報 0 個已知漏洞。使用本機既有 Puppeteer Chrome 快取，並非全新機器或空白瀏覽器快取。
- 產出逐位元組保留 `RAS-LICENSE` 與 `RAS-NOTICE.md`。
  簡報專案的套件 metadata 為 `UNLICENSED`，不替講者內容指定 MIT；複製的 RAS 工具仍依 MIT 使用。
- Codex CLI 0.157.1 的全新 app-server 程序辨識到專案內的根 skill 及 7 個路由／操作 skills，
  全部啟用且無探索錯誤，名稱呈現為 `ras:ras`、`ras:create` 等。
  Claude Code 2.1.283 通過 manifest 驗證，並在新程序透過 `--plugin-dir` 載入 7 個 skills 與 5 個角色。
  這證明載入與探索，不代表模型產出品質或兩個宿主的完整創作對話；這些宿主檢查沒有全域安裝或呼叫模型。
- 已檢視雙語 README、工作流程、撰寫、審閱、圖片權利，以及 MIT 與權利聲明的 Chromium 截圖，
  並檢查圖片指南在 390px 寬度下的畫面。本機連結可開啟，沒有頁面溢出或 Mermaid 錯誤。
  內建瀏覽器不可用，改用既有 Puppeteer 工具產生截圖；截圖及各頁來源雜湊清單保留在儲存庫外。

獨立匯出的來源雜湊為 `d5f994f8eed2466083fb88f69edf0753cba935ebdd9ae6ec019134637d9d2332`。
其視覺／事實審閱維持 pending，匯出成功不等於已記錄投影片審閱。
已檢視的圖片指南來源雜湊：英文為
`4bd8801a8529f2747ca3c1a771de20a2543e9c78980f2cb2d7b6110d284130c9`，臺灣華語為
`02f06b0caa44c296b76d373a158bd40a1f3b4f499bf0f05ede1d203613513859`。

歷史盤點涵蓋基底的全部 12 個本機可達 commit 與 136 份不同檔案內容，並檢視歷史角色與範本文字。
未找到需要移除的內附二進位素材、舊簡報摘錄、官方台詞／歌詞或複製的字型檔。
Data URI 命中項目是執行期字型編碼與刻意損壞的測試圖片，不是內嵌素材副本。
本次查核未發現需要重寫歷史或刪除版本的項目。名稱與作品引用依[權利聲明](../NOTICE.md)說明；
這份盤點不能證明每段文字的權利歸屬，也不授予第三方權利。

## 初版驗證：2026-09-24

環境為 macOS arm64、Node 22.18.0 與 26.9.0，以及 Puppeteer 25.11.0 固定的 Chromium。
Node 22.18.0 由 nodejs.org 下載，並對照官方 SHA-256 清單。

- 外掛 manifest 與六個 skill 入口通過驗證。
- 兩個 Node 版本各通過 31 個測試，涵蓋提示詞、解析／備註、初始化、來源雜湊、版面／素材錯誤、播放、PDF、路徑穿越防護、來源檔案政策、突變測試的錯誤處理、字型授權與設定／瀏覽器／子程序錯誤。
- 儲存庫外的獨立專案以自己的 `npm ci` 安裝相依套件；兩個 Node 版本都成功匯出起始簡報，包括 Mermaid、HTML、備註、十張 PNG 與十頁 PDF。
- 最終主題修改後，實際檢視十頁預覽；HTML、PNG 與 PDF 頁數一致。
- 參考測試素材與媒體留在儲存庫外；範本只含原創通用範例，相依套件、字型與產出由 Git 忽略。

共用流程提供 Codex／Claude Code manifest 與不限定模型的提示詞入口。
當時已依 [Claude Code 官方文件](https://code.claude.com/docs/en/plugins-reference#skills)核對 `skills/` 自動探索，
也依本機 CLI help 核對 Codex 本機 provider 與 Ollama 語法。
新宿主工作階段中的外掛安裝，以及特定開放模型的實際生成，尚未測試。
提示詞展開與實際生成是不同檢查；直接使用 Ollama 的 `--chat` 模式只產生待儲存的草稿內容。

## 回歸與突變測試

匯出測試產生真正的兩頁 PDF，確認 `pdfPages` 與投影片數、解析後的 PDF 頁數一致。
另一項測試在解析邊界注入有效但頁數不足的 PDF，要求在寫入 `verification.json` 前拒絕。
原實作已符合此順序，當時不需更動正式匯出程式。

預覽測試在臨時連接埠啟動服務，傳送原始 HTTP 路徑。
`/index.html` 回傳 200，`/%2e%2e%2fslides.md` 與 `/..%2fslides.md` 回傳 404。
一般的 `/../../../etc/passwd` 可能先被 URL 正規化消去穿越片段，不適合作為這個邊界檢查的測試。

`npm run test:mutation` 在 `mkdtemp` 建立的暫存副本執行通過的基準與下列兩種突變；
每個突變都從原始 `deck.mjs` 開始：

| 突變 | 預期失敗的斷言 |
| --- | --- |
| 移除 PDF 頁數比較 | 頁數不足的 PDF 未被拒絕 |
| 從預覽防護移除 `startsWith(base + path.sep)` | 兩種編碼路徑回傳 200，原本應為 404 |

兩種突變在 Node 26.9.0 都被測試攔下。
前後快照檢查 `git ls-files --cached --others --exclude-standard -z` 選出的檔案，
包含 SHA-256 內容、路徑、模式與符號連結目標；被忽略的快取與素材不在範圍內。
測試失敗後仍嘗試清理與最後快照，單一錯誤原樣拋出，多個錯誤則保留於 `AggregateError`。
原儲存庫來源沒有被突變修改。

另外三項 CLI 回歸測試刻意讓基準失敗：被 Git 忽略的變更不影響快照；
已追蹤或未被忽略的新檔案變更，則同時回報基準與快照錯誤。
2026-09-24 曾另行手動移除忽略篩選，或將 `AggregateError` 改成只保留最後一個錯誤，兩種都使對應斷言失敗。
這兩項手動突變不包含在 `npm test` 或 `test:mutation` 中；後者固定重跑表列的匯出／預覽突變。

來源政策檢查路徑允許清單、一般檔案與 UTF-8，涵蓋暫存區、已追蹤工作副本與未忽略新檔案。
未暫存的二進位內容或符號連結會被拒絕；即使工作副本已修正或刪除，仍檢查暫存區內容。
刪除有效索引內容的工作副本則可通過。
整合測試用獨立的 skill／reference 測試資料，真正的 skill 連結由 `npm run validate` 檢查。
沒有 Git 資訊時，會明確回報略過來源檢查，metadata 與 skill 驗證仍會執行。
此政策不能證明文字著作權，素材來源仍需審閱。

## 儲存庫自動化驗證：2026-09-25

在 macOS arm64、Node 26.9.0 本機執行：

- `npm test`：31 個測試通過，包含完整角色指示的可攜式與純聊天提示詞。
- `test:mutation`：攔下匯出／預覽突變，48 個已追蹤或未忽略來源檔案不變。
- `test:release`：首次發布同步五個版本檔案、保留固定相依版本、產生 tag／changelog／發布說明；立即重跑與只有文件變更的提交維持 HEAD 不變。Node 22.18.0 也通過。
- 獨立起始專案自行安裝相依套件，成功匯出十頁 PDF。
- `validate`、當時四個操作 skill 的 frontmatter、兩份 workflow 的 `actionlint` 與 `git diff --check` 通過。

在該次本機驗證時，GitHub Actions 矩陣、Ubuntu AppArmor profile、機器人推送權限與 Release 發布尚未在 GitHub 執行，
也沒有從本機發布 tag 或 Release。之後基準 CI 與 v0.2.0 發布已在
[GitHub Actions run 36106005993](https://github.com/Lee-W/ras/actions/runs/36106005993)通過。

當時內建瀏覽器連線不可用；改用專案工具產生的截圖檢視畫面，以 Puppeteer 測試播放與講者模式。
跨平台 CJK 字型外觀與現場時間尚未驗證。

## 臺灣華語排版、審閱狀態與記憶：2026-09-25

環境為 macOS arm64：

- Node 22.18.0 與 26.9.0 各通過 42 個測試，包含最後加入的無效狀態防護；格式錯誤的 JSON 或非物件值會被拒絕，既有記憶／審閱檔案保持不變。
- 離線 Chromium 確認內附 Noto Sans TC 實際用於臺灣華語標題、內文、程式碼註解與 Mermaid 標籤。標籤位於節點內，採 SVG 文字並內嵌字型；四份字型授權與上游檔案逐位元組一致。
- 審閱測試涵蓋分開的機器／視覺／事實狀態、局部頁面、過期雜湊，以及需求／大綱／來源檔案的新增刪除。真實匯出測試確認紀錄能跨重建保留，狀態隨證據由 pending 變為 passed，再變為 stale。測試中的審閱聲明是合成資料。
- 記憶測試涵蓋專案隔離、明確替換、保留其他條目、無效狀態、拒絕符號連結、Git 排除、可攜式 CLI，以及有工具／純聊天的 remember／retro 提示詞。
- `test:mutation` 攔下兩個突變，59 個來源檔案不變；`test:release` 通過首次發布、重跑、文件提交與後續修訂版，保留較早 changelog 及相依版本。
- `validate` 與六個新建／修改 skill 的 frontmatter 檢查通過。

儲存庫外的獨立專案以自己的 `npm ci` 安裝相依套件，匯出原創十頁起始簡報與原創三頁臺灣華語測試簡報。
HTML、PNG 與解析後的 PDF 頁數一致，十三頁 PDF 均轉成圖片並實際檢視，未觀察到缺字、長標題／註解裁切或圖表標籤溢出。
當時保留的來源雜湊如下：

| 匯出 | 已檢視頁面 | 來源 SHA-256 |
| --- | --- | --- |
| 原創起始簡報 | 1–10 | `4fe6e78944f79b7aedea40101a24de287283af2f25c141c87d2c046c29dc87e1` |
| 臺灣華語測試簡報 | 1–3 | `56fa58ad355dcdf14d0fcefa4c8c18b769a3c7af44a4e266ac524ca97d023f49` |

這些匯出早於最後的非繪製狀態防護與用詞調整。
完整測試涵蓋狀態防護；統一 Taiwanese Mandarin／臺灣華語名稱並改名為 `mandarin.test.mjs` 後，
Node 26.9.0 再次通過全部 42 個測試。
獨立專案的 status 與 memory-list 也成功執行，未記錄的審閱維持 pending，新記憶庫為空。
測試素材、字型與產出仍留在儲存庫來源之外。

在這筆紀錄的時間點，新功能尚未執行 GitHub Actions。
各 AI 宿主中的真實 remember／retro 對話、其他作業系統與現場時間仍未驗證；已測的是共用提示詞與儲存工具。

## 重現檢查

在儲存庫內執行：

```sh
npm ci
npm run validate
npm test
npm run test:mutation
node scripts/ras.mjs init /path/to/new-talk
```

再進入新專案執行 `npm ci` 與 `npm run export`。
每次建置都會替換產出；發布變更前檢查目前畫面與 Git 檔案清單，參考素材保留在儲存庫外。
相依版本與 CVE 對照見[相依套件版本](dependencies-zh-tw.md)。
