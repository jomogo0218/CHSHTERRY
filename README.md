# 嘉華中學足球無人機俱樂部 · 配備手冊

FAI F9A-B（20／22cm）備賽配備總覽。

**倉庫：** https://github.com/jomogo0218/CHSHTERRY  

**線上版：** https://jomogo0218.github.io/CHSHTERRY/

## 怎麼讀（明天介紹／講課順序）

1. [`pages/影片欣賞.html`](pages/影片欣賞.html) — 建立畫面感  
2. [`pages/足球無人機技術全解簡報.html`](pages/足球無人機技術全解簡報.html) — FIDA ≠ FAI  
3. [`pages/規則檢錄.html`](pages/規則檢錄.html) — F9A-B 過關（有刷另見 Class 20 專頁）  
4. [`index.html`](index.html)#picks — 本隊定稿  
5. 馬達 → 電池 → 螺旋槳 → 組裝 → 續航 → 飛控／LED → [`pages/上場清單.html`](pages/上場清單.html)

完整講課卡與時間建議見首頁「明天介紹 · 講課順序」。

## 資料夾結構

```
├── index.html                 ← 首頁（講課順序＋定稿）
├── bfsim.html                 ← Betaflight 設定模擬
├── 足球無人機總覽.html         ← 舊網址轉跳
├── archive/index.legacy.html  ← 舊版單頁備份
├── assets/
│   ├── site.css / site.js     ← 全站樣式與導覽
│   ├── brand/ motors/ batteries/ fc/ props/ bfsim/ brushed/
├── docs/                      ← 編輯用規格筆記
└── pages/
    ├── 影片欣賞.html           ← 開場影片
    ├── 足球無人機技術全解簡報.html
    ├── 規則檢錄.html · FAI_F9A_2026_繁中譯本.html
    ├── 有刷空心杯.html
    ├── 馬達.html 電池.html 螺旋槳.html
    ├── 組裝.html 續航.html
    ├── 飛控硬體.html 飛控設定.html LED.html
    ├── 上場清單.html
    └── 遙控器／AIO／電池圖鑑 …
```

## 本機預覽

```bash
python3 -m http.server 4173
# 再開 http://127.0.0.1:4173/
```

舊書籤 `index.html?tab=motor` 或 `#motor` 會自動轉到對應分頁。
