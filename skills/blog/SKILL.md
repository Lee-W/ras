---
name: blog
description: 把完成的 RAS Marp 簡報轉成通用 Markdown 文章草稿。處理 ras:blog；`npm run blog` 只做機械轉換，之後由 LAYER 依備註改寫成文章草稿，草稿不視為已審查。
---

# RAS — blog

開場前先讀[協作語氣](../../references/voice.md)。
再讀[共用工作流程](../../references/workflow.md)，依操作表 blog 列的順序讀各角色檔。
找出既有的 deck 目錄；目標 deck 不唯一時，依[共用工作流程的規則](../../references/workflow.md#inputs-and-decisions)先問。

在 deck 目錄執行 `npm run blog`，它會把 `slides.md` 機械轉成 `blog/index.md`
（不用模型、不連網）。可用的旗標只有 `--screenshots`、`--out <dir>` 與 `--force`；
轉換行為見共用工作流程的 blog 段落，不要在這裡另寫規則。
既有的 `index.md` 沒有 `--force` 就不會被取代；覆寫前先問使用者。
`--screenshots` 會在需要時先跑 `check`，重建 `dist/` 並移除先前的 PDF，使用前先說明。

LAYER 依投影片備註把草稿改寫成文章，備註是 `<!-- note: … -->` 註解，不會直接成為內文；
改寫前先確認事實與來源，不要擴寫簡報沒有的主張。
CHU² 交付草稿的路徑與轉換警告（例如被捨棄的 `hl` 框）。
草稿沒有渲染頁，MASKING 不上場；轉換不是事實審查或視覺審查，
圖片權利是為了簡報取得的，發佈文章前要依[圖片權利與出處標示](../../references/image-rights.md)重新確認。
不要發佈或傳送文章；那是另一項使用者指示。
