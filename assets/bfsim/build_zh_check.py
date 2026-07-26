#!/usr/bin/env python3
"""檢查 bfsim 繁中說明檔是否完整覆蓋 catalog。"""

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
