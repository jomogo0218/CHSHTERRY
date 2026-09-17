#!/usr/bin/env python3
"""檢查 bfsim 繁中說明檔是否完整覆蓋 catalog，並同步產出給網頁用的 .js。"""

import json
from pathlib import Path

ROOT = Path(__file__).parent
catalog = json.loads((ROOT / "catalog.json").read_text(encoding="utf-8"))
explain = json.loads((ROOT / "zh_explain.json").read_text(encoding="utf-8"))

expected_vars = {item["key"] for group in catalog["groups"] for item in group["vars"]}
expected_sections = {group["section"] for group in catalog["groups"]}
expected_modes = {mode["en"] for mode in catalog["modes"]}
expected_features = set(catalog["features"])

for name, expected in (
    ("vars", expected_vars),
    ("modes", expected_modes),
    ("features", expected_features),
    ("sections", expected_sections),
):
    missing = sorted(expected - set(explain.get(name, {})))
    print(f"{name}: {len(expected)} 項，missing={len(missing)}")
    if missing:
        print(f"  缺少：{', '.join(missing)}")

# bfsim.html 以 <script> 載入（file:// 無法 fetch JSON）
for src, global_name in (
    ("catalog.json", "BFSIM_CATALOG"),
    ("zh_explain.json", "BFSIM_ZH_EXPLAIN"),
):
    raw = (ROOT / src).read_text(encoding="utf-8")
    out = ROOT / Path(src).with_suffix(".js").name
    out.write_text(
        f"/* auto-generated from {src} — do not edit by hand */\n"
        f"window.{global_name} = {raw};\n",
        encoding="utf-8",
    )
    print(f"wrote {out.name}")
