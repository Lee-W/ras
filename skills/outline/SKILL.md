---
name: outline
description: 與使用者來回討論簡報的 brief 與 outline，確認後才寫入 outline.md（必要時 brief.md），不渲染簡報。處理 ras:outline。
---

# RAS — outline

開場前先讀[協作語氣](../orchestrator-voice/SKILL.md)。
再讀[共用工作流程](../../references/workflow.md)、[CHU² 的角色](../../agents/chu2.md)與
[LAYER 的角色](../../agents/layer.md)；只有在需要視覺建議時，才讀 PAREO 的角色檔。
以使用者的請求或附帶的參數作為討論起點。這個操作的產物是確認過的 `outline.md`，不是簡報。

## 流程

1. CHU² 先讀既有的 `brief.md`、`outline.md` 與素材，再提問。只問會影響結構的缺漏：
   受眾、時長、核心訊息、投影片語言與口說語言。已經能從現有內容判斷的事，不要重複問。
2. LAYER 提出 outline 草稿：每個段落的目的、時間預算、視覺機會與待補來源。
3. 使用者給回饋，雙方迭代草稿，直到使用者滿意。
4. **使用者明確確認後才寫檔。**沒有明確確認，就只在對話中呈現草稿。

## 寫入規則

- 確認前，草稿只留在對話中，不寫任何檔案。
- 確認後寫入 `outline.md`（LAYER 擁有）。只有在 brief 本身有經過確認的變動時，才修改 `brief.md`（CHU² 擁有）。
- 保留使用者既有的編輯與這次沒有提到的段落。
- 不碰 `slides.md`、`sources.md`、`theme.css`。
- 不建置、不匯出、不跑 review，也不渲染簡報。若共用工作流程要求渲染或匯出，本操作不執行。
- 寫入 `outline.md`（或 `brief.md`）會改變 `contextHash`，既有的 review 會因此變成 stale。
  告知使用者之後需要重新 `review`；可以先跑 `npm run status` 確認目前的狀態。

## 與其他操作的分工

- `outline`：討論並迭代敘事結構，產物是確認過的 `outline.md`。
- `create --plan`：一次產出大綱後就停止，不做來回討論。
- `create`：從主題或 brief 一路做到簡報。
- `revise`：修改既有簡報的投影片與講者備註，不是重新討論結構。

使用者說「我想先聊聊結構」時用 `outline`；說「給我一份大綱就好」時用 `create --plan`。

## 沒有 deck 目錄時

先向使用者確認 deck 目錄的目的地，因為 `outline.md` 要存放在那裡。使用者同意後，以
`scripts/ras.mjs init <destination>` 建立，再寫入 `outline.md`。使用者不同意，就只在對話中提供草稿，不寫檔。

## 純聊天宿主

沒有檔案系統或 shell 時，只回傳 `outline.md`（必要時加上 `brief.md`）的草稿內容，
每份各放在一個獨立的 fenced block，並標上檔名。不要宣稱已經寫入檔案，也不要模擬工具呼叫。
