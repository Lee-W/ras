---
name: review
description: 審查 Marp 簡報的敘事清晰度、證據、節奏與渲染後的視覺問題。處理 ras:review；只回報發現，不改寫原始內容。
---

# RAS — review

開場前先讀[協作語氣](../orchestrator-voice/SKILL.md)。
再讀[共用工作流程](../../references/workflow.md)與
[審查規範](../../references/review.md)。採用 MASKING 的審查職責，以及相關的寫作與設計準則。
讀使用者的 brief、完整的 deck 與備註、來源紀錄與最新的輸出。在 deck 目錄中執行檢查，並檢視渲染後的頁面。
讀 [MASKING 的角色檔](../../agents/masking.md)，了解審查的語氣與裁定。
依[圖片權利與出處標示](../../references/image-rights.md)稽核所有納入的圖片。
驗證使用證據與必要的出處文字，再檢查實際 HTML/PDF 中的出處位置。
缺少證據或必要聲明時，不能給出通過的事實審查。

回報必修項目、建議與未驗證的部分，並附上目前的頁碼、標題、原因與具體的修正方式。
review 模式下不要更動原始檔；產生本機驗證用的產物屬於審查的一部分。
不得宣稱建置成功或自動化探測就證明了視覺品質或事實正確。
檢視前先用 `npm run status` 取得雜湊，並只記錄實際執行過的審查類型，且使用審查規範定義的 JSON 格式與 helper（輔助工具）。
審查只做了一部分或無法執行時，回報為待處理，不要捏造涵蓋範圍。
