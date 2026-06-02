# Hospital Shift Scheduler

Static browser-based tool for drafting monthly hospital duty rosters with pre-leave planning, shift-avoid rules, printable output, and CSV export.

醫療排班工作流程工具，適合住院醫師、總醫師或科內行政快速產生月班表草稿，先完成初步平均分配，再進行人工微調。

## Screenshots

### Setup View

實際設定畫面：輸入科別、月份、醫師人數，並加入避排規則。

![Hospital Shift Scheduler setup](docs/assets/demo-setup.png)

### Generated Schedule

實際輸出畫面：產生月班表後，可直接檢視、列印或後續匯出 CSV。

![Hospital Shift Scheduler output](docs/assets/demo-output.png)

## Why This Exists

臨床排班常常需要在有限時間內同時處理：

- 多位醫師的白班、小夜、大夜分配
- 個別醫師的預假需求
- 指定醫師不可排某些班次的限制
- 列印與匯出，方便後續人工確認與調整

這個專案的目標不是取代最後的人工作業，而是先快速產出可用的候選班表，減少手排與反覆修表的時間成本。

## Quick Summary

- Browser-based monthly doctor schedule draft generator
- Supports 3-80 doctors
- Includes pre-leave matrix and doctor-specific shift-avoid rules
- Exports printable tables and UTF-8 CSV
- Designed for real clinical scheduling workflows before manual fine-tuning

## Current Features

- 支援 **3-80 位醫師** 的月班表草稿產生
- 依月份自動帶入當月天數
- **預假設定**：逐格點選或拖曳標記不可排班日期
- **避排規則**：可指定某位醫師不排白班、小夜或大夜
- **公平分配**：盡量讓總工作班數差距控制在 1 班內
- **輸出**：直接列印或匯出 CSV
- **純前端靜態頁面**：不需後端、不需安裝套件

## Project Positioning

這是一個從臨床排班情境衍生的開源工具，用於：

- 科內排班草稿產生
- 多名醫師輪值的初版安排
- 月排班前的候選班表建立與人工微調前處理

目前公開敘事採保守描述：強調真實工作流程價值，不宣稱未經驗證的下載量、採用數字或外部部署規模。

## Demo

- 主要 demo 檔案：[`docs/index.html`](docs/index.html)
- 建議以 GitHub Pages 將 `docs/` 對外發布
- 發布後可將 repo homepage 指向：`https://mrchiutw.github.io/<repo-name>/`

## Project Structure

```text
docs/                公開展示用靜態 demo
docs_legacy/         舊版展示頁保留
Reference/           早期原型與歷史輸出
```

## Local Usage

1. 直接在瀏覽器開啟 `docs/index.html`
2. 輸入科別、月份與醫師人數
3. 視需要設定預假與避排規則
4. 產生班表後列印或匯出 CSV

## Maintenance Direction

目前規劃中的維護工作包含：

- README / 文件持續補強
- demo 與編碼顯示品質改善
- 排班限制規則細化
- 輸出格式與手動調整流程優化

如果你正在評估這個專案是否適合醫療排班情境，歡迎先從 issue 區的 roadmap 開始看起。
