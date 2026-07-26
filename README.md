# 嘉華中學足球無人機俱樂部 · 配備手冊

FAI F9A-B（20／22cm）備賽配備總覽。

**倉庫：** https://github.com/jomogo0218/CHSHTERRY  

**線上版：** https://jomogo0218.github.io/CHSHTERRY/

## 資料夾結構

```
├── index.html              ← 網站入口（請開這個）
├── 足球無人機總覽.html      ← 舊網址轉跳到 index.html
├── assets/                 ← 網站圖片
│   ├── brand/              俱樂部 logo
│   ├── motors/             馬達規格圖
│   ├── batteries/          電池產品圖
│   ├── fc/                 飛控／接線圖
│   └── props/              螺旋槳規格圖
├── docs/                   ← 詳細規格筆記（給編輯用）
│   ├── motors/
│   ├── batteries/
│   ├── props/
│   └── rules/
└── pages/                  ← 次要靜態頁
    └── 電池產品圖鑑.html
```

## 本機預覽

直接用瀏覽器開啟 `index.html`，或：

```bash
python3 -m http.server 4173
# 再開 http://127.0.0.1:4173/
```

## 更新並上線

```bash
git add -A
git commit -m "更新說明"
git push origin main
```

約 1 分鐘後 GitHub Pages 會自動更新。
