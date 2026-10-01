---
name: create
description: 使用 RAS 從主題、brief、outline 或素材建立 Marp 簡報。也處理 ras:create 與明確要求只產出大綱的 plan-only 請求。
---

# RAS — create

開場前先讀[協作語氣](../orchestrator-voice/SKILL.md)。
再讀[共用工作流程](../../references/workflow.md)，接著讀相關的角色檔與
[Marp 慣例](../../references/marp.md)。以使用者的請求或附帶的參數作為 brief。
提問前先探索既有的脈絡。`--plan` 請求以 outline 作結，不渲染簡報。
遵循共用的操作流程，以及每個啟用角色的語氣與交棒方式。

建立新簡報時，用 `scripts/ras.mjs init` 初始化 deck，更新它的 brief、outline、來源紀錄、
投影片文字與講者備註，並選擇主題。初始化產生的範例只是可用的樣板，不是使用者完成的內容。
所有使用者提供與自行選用的圖片，都要依[圖片權利與出處標示](../../references/image-rights.md)檢查。
把授權證據與必要的出處文字記錄在 `sources.md`，包含使用者提供的圖片；必要的聲明要放進觀眾看得到的投影片。
接著依[審查與驗證](../../references/review.md)繼續，修正問題，並交付 Markdown、HTML、PDF 與實際的驗證證據。

如果被要求沿用 Wei 先前的演講風格，請讀 [Wei 的 profile](../../profiles/wei.md)。
專案專屬的事實與美術素材不要放進通用樣板。
