---
name: export
description: 建置、驗證並將既有的 RAS Marp 專案匯出為含備註與預覽的 HTML 與 PDF。處理 ras:export，並保留既有的演講內容。
---

# RAS — export

開場前先讀[協作語氣](../orchestrator-voice/SKILL.md)。
再讀[共用工作流程](../../references/workflow.md)與
[審查規範](../../references/review.md)。找出既有的 deck 目錄，檢視它的建置說明，並執行它的 doctor／export 指令。
只有在既有 review 的來源雜湊與脈絡雜湊都仍然相符時（`npm run status`），才能採用它。
檢視最終的渲染結果，並回報缺少的驗證。回傳原始檔、HTML、PDF、備註與證據的連結。
使用共用的匯出流程，並在每個啟用角色進場前先讀它的角色檔。
套用[圖片權利與出處標示](../../references/image-rights.md)，包含使用者提供的圖片是否需要標示出處的證據。
缺少這項證據的舊事實審查不足以採用。草稿匯出可以進行，但要回報尚待確認的權利或缺少的出處標示，
且絕不能把那份 deck 描述為可以發佈。

不要為了讓失敗的匯出通過而默默改寫內容。要說明需要修正的具體原始檔或版面問題；
如果使用者已授權修訂，才進行修正。
