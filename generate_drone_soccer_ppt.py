#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
足球無人機（Drone Soccer）技術全解與競技調校 — 自動生成 16:9 深色風格簡報。

依賴：python-pptx
產出：Drone_Soccer_Masterclass_Complete.pptx
"""

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
from lxml import etree


# ---------------------------------------------------------------------------
# Design System
# ---------------------------------------------------------------------------
SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

COLOR_BG = RGBColor(15, 23, 42)          # #0F172A
COLOR_CARD = RGBColor(30, 41, 59)        # #1E293B
COLOR_BORDER = RGBColor(51, 65, 85)      # #334155
COLOR_TEXT_MAIN = RGBColor(248, 250, 252)  # #F8FAFC
COLOR_TEXT_MUTED = RGBColor(148, 163, 184)  # #94A3B8
COLOR_CYAN = RGBColor(56, 189, 248)      # #38BDF8
COLOR_AMBER = RGBColor(251, 191, 36)     # #FBBF24
COLOR_RED = RGBColor(239, 68, 68)        # #EF4444


def _set_run_font(run, size_pt, bold=False, color=COLOR_TEXT_MAIN):
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = "Microsoft JhengHei"
    rPr = run._r.get_or_add_rPr()
    # 亞洲字型回退，避免中文亂碼或跑版
    ea = rPr.find(qn("a:ea"))
    if ea is None:
        ea = etree.SubElement(rPr, qn("a:ea"))
    ea.set("typeface", "Microsoft JhengHei")


def set_slide_background(slide, prs):
    """以滿版矩形繪製深色背景（不依賴版面母片）。"""
    bg = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height
    )
    bg.fill.solid()
    bg.fill.fore_color.rgb = COLOR_BG
    bg.line.fill.background()
    # 置於最底層
    spTree = slide.shapes._spTree
    sp = bg._element
    spTree.remove(sp)
    spTree.insert(2, sp)
    return bg


def add_header(slide, title_text, category="DRONE SOCCER MASTERCLASS"):
    """頂部：全大寫分類標籤 + 26pt 粗體主標題。"""
    tb = slide.shapes.add_textbox(
        Inches(0.8), Inches(0.42), Inches(11.7), Inches(1.15)
    )
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)

    p_cat = tf.paragraphs[0]
    p_cat.text = category.upper()
    p_cat.space_after = Pt(6)
    _set_run_font(p_cat.runs[0], 11, bold=True, color=COLOR_CYAN)

    p_title = tf.add_paragraph()
    p_title.text = title_text
    p_title.space_after = Pt(0)
    _set_run_font(p_title.runs[0], 26, bold=True, color=COLOR_TEXT_MAIN)
    return tb


def add_card(
    slide,
    left,
    top,
    width,
    height,
    title,
    items,
    border_color=None,
    title_color=None,
    body_size=13,
    title_size=16,
):
    """圓角卡片：標題 + 項目符號清單。嚴格控制邊距避免溢位。"""
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height
    )
    shape.fill.solid()
    shape.fill.fore_color.rgb = COLOR_CARD
    shape.adjustments[0] = 0.08

    edge = border_color if border_color is not None else COLOR_BORDER
    shape.line.color.rgb = edge
    shape.line.width = Pt(1.5 if border_color is not None else 1.0)

    pad_x = Inches(0.22)
    pad_y = Inches(0.20)
    tb = slide.shapes.add_textbox(
        left + pad_x,
        top + pad_y,
        width - pad_x * 2,
        height - pad_y * 2,
    )
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)

    accent = title_color if title_color is not None else (
        border_color if border_color is not None else COLOR_CYAN
    )

    p_t = tf.paragraphs[0]
    p_t.text = title
    p_t.space_after = Pt(10)
    _set_run_font(p_t.runs[0], title_size, bold=True, color=accent)

    for item in items:
        p_i = tf.add_paragraph()
        p_i.text = f"•  {item}"
        p_i.space_after = Pt(6)
        p_i.line_spacing = 1.15
        _set_run_font(p_i.runs[0], body_size, bold=False, color=COLOR_TEXT_MAIN)

    return shape


def create_deck(output_filename="Drone_Soccer_Masterclass_Complete.pptx"):
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    blank = prs.slide_layouts[6]

    # ----------------- SLIDE 1: 封面 -----------------
    s1 = prs.slides.add_slide(blank)
    set_slide_background(s1, prs)

    accent_bar = s1.shapes.add_shape(
        MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(2.05), Inches(1.1), Inches(0.08)
    )
    accent_bar.fill.solid()
    accent_bar.fill.fore_color.rgb = COLOR_CYAN
    accent_bar.line.fill.background()

    tb1 = s1.shapes.add_textbox(Inches(1.2), Inches(2.3), Inches(10.9), Inches(3.6))
    tf1 = tb1.text_frame
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_right = Emu(0)
    tf1.margin_top = tf1.margin_bottom = Emu(0)

    p = tf1.paragraphs[0]
    p.text = "AIR ARENA TECH MASTERCLASS"
    p.space_after = Pt(16)
    _set_run_font(p.runs[0], 14, bold=True, color=COLOR_CYAN)

    p = tf1.add_paragraph()
    p.text = "足球無人機 (Drone Soccer)\n技術全解與競技調校手冊"
    p.space_after = Pt(18)
    _set_run_font(p.runs[0], 40, bold=True, color=COLOR_TEXT_MAIN)

    p = tf1.add_paragraph()
    p.text = "從零基礎硬體拆解、電控極限調校到 FAI/FIDA 賽事實戰體系"
    p.space_after = Pt(0)
    _set_run_font(p.runs[0], 18, bold=False, color=COLOR_TEXT_MUTED)

    # ----------------- SLIDE 2: 運動起源與雙軌賽制 -----------------
    s2 = prs.slides.add_slide(blank)
    set_slide_background(s2, prs)
    add_header(s2, "運動起源與國際雙軌賽制體系", "MODULE 1: ORIGIN & GOVERNANCE")

    add_card(
        s2, Inches(0.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "2016 誕生背景",
        [
            "發源於韓國全州市科技推廣專案。",
            "克服傳統穿越機／空拍機易炸機、槳葉外露受傷的痛點。",
            "全包覆球形外框，允許空中劇烈對撞與團隊攻防。",
            "迅速發展為融合 STEAM 教育與電競運動的跨界項目。",
        ],
        body_size=13,
    )
    add_card(
        s2, Inches(4.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "國際雙軌賽制",
        [
            "FAI（國際航空運動總會）：2019 年列為正式航空運動，代號 F9A，納入奧會運動體系。",
            "FIDA（國際無人機足球總會）：主導職業聯賽、洲際盃與專項世界盃賽事實務。",
        ],
        border_color=COLOR_CYAN,
        body_size=13,
    )
    add_card(
        s2, Inches(8.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "台灣推動核心",
        [
            "CTAF（中華民國飛行運動總會）：對接 FAI，掌管國家運動員證照（SL）、教練與裁判考核。",
            "CDSA（中華無人機競技運動協會）：對接 FIDA，建立標準場地並組訓代表隊出征。",
        ],
        body_size=13,
    )

    # ----------------- SLIDE 3: FIDA Class ≠ FAI F9A -----------------
    s3 = prs.slides.add_slide(blank)
    set_slide_background(s3, prs)
    add_header(s3, "雙軌規格：FIDA Class ≠ FAI F9A（勿混用）", "MODULE 1: ARENA SPECIFICATIONS")

    add_card(
        s3, Inches(0.45), Inches(1.7), Inches(4.4), Inches(5.15),
        "20cm 級對照",
        [
            "FIDA Class 20：≤110g；場 8×4×高3m；門內徑30cm；最多2射手；禁改裝；實務常見有刷RTF。",
            "FAI F9A-B（本隊）：≤300g；場6×3×高3m；門內徑40cm；僅1射手；無刷自組；≤4S、槳≤76mm。",
            "勿把兩套數字寫成「Class 20＝F9A-B」。",
        ],
        border_color=COLOR_CYAN,
        body_size=13,
        title_size=17,
    )
    add_card(
        s3, Inches(5.05), Inches(1.7), Inches(4.4), Inches(5.15),
        "40cm 級對照",
        [
            "FIDA Class 40：≤1100g；場約16×7m；門內徑60cm；原則5對5。",
            "FAI F9A-A：籠建議14×7×高5m；門內徑60cm（外徑建議100cm）；僅1射手；電池可至6S。",
            "細節以當屆 FIDA／FAI 規則書為準。",
        ],
        border_color=COLOR_AMBER,
        body_size=13,
        title_size=17,
    )
    add_card(
        s3, Inches(9.65), Inches(1.7), Inches(3.0), Inches(5.15),
        "教學口訣",
        [
            "先問：這場是 FIDA 還是 FAI？",
            "再對：重量、場地、球門、射手人數。",
            "本隊無刷備賽＝F9A-B。",
            "有刷入門常見＝Class 20。",
        ],
        body_size=13,
        title_size=17,
    )

    # ----------------- SLIDE 4: 硬體與空氣動力 -----------------
    s4 = prs.slides.add_slide(blank)
    set_slide_background(s4, prs)
    add_header(s4, "機體核心構造與外骨骼空氣動力學", "MODULE 2: HARDWARE & AERODYNAMICS")

    add_card(
        s4, Inches(0.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "機體防護構造",
        [
            "球體防護罩：高韌性 PP／PC，高彈性碰撞吸能。",
            "碳纖維底板：高剛性中樞基座，抗扭曲變形。",
            "四軸佈局：正槳（CW）與反槳（CCW）對角抵銷反扭矩。",
        ],
    )
    add_card(
        s4, Inches(4.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "外框帶來的流體影響",
        [
            "下洗氣流（Downwash）穿網紊流：推力約衰減 10%～15%，底盤油門需加大。",
            "轉動慣量顯著放大：外圍質量重，俯仰／翻滾慣性大，起步與急煞易延遲。",
        ],
    )
    add_card(
        s4, Inches(8.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "碰撞彈性機制",
        [
            "撞擊彈射（Impact Bouncing）：對撞不炸機，動能轉為彈性反彈。",
            "戰術衍生：「借壁彈牆反切」與「門前擠壓卡位」。",
        ],
        border_color=COLOR_CYAN,
    )

    # ----------------- SLIDE 5: 飛控與通訊 -----------------
    s5 = prs.slides.add_slide(blank)
    set_slide_background(s5, prs)
    add_header(s5, "32 位元飛控架構、雙陀螺儀與通訊鏈路", "MODULE 3: CONTROL & TELEMETRY")

    add_card(
        s5, Inches(0.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "32 位元飛控大腦",
        [
            "晶片選型：STM32 F405／F722 主控。",
            "硬體浮點運算單元（FPU），每秒完成數千次姿態誤差解算。",
            "CPU 負載必須穩定低於 65%，杜絕排程丟包空中翻車。",
        ],
    )
    add_card(
        s5, Inches(4.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "雙陀螺儀容錯機制",
        [
            "主板整合雙陀螺儀（如 MPU6000 + ICM42688）。",
            "數據融合過濾高頻共振雜訊。",
            "單顆陀螺儀撞擊飽和溢出時，系統毫秒級切換備援。",
        ],
        border_color=COLOR_CYAN,
    )
    add_card(
        s5, Inches(8.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "射頻通訊規範",
        [
            "ELRS 2.4G 封包率鎖定 250Hz～500Hz（指令延遲低至約 2ms）。",
            "切勿開 1000Hz：防護網阻隔易導致靈敏度衰退掉包。",
            "圖傳強制鎖死 25mW：多機對戰依 Raceband 隔頻，防止側頻干擾反白。",
        ],
        border_color=COLOR_AMBER,
    )

    # ----------------- SLIDE 6: 電調與 PWM -----------------
    s6 = prs.slides.add_slide(blank)
    set_slide_background(s6, prs)
    add_header(s6, "30A+ 四合一電調、DShot600 與 PWM 頻率抉擇", "MODULE 3: ESC & MOTOR DRIVE")

    add_card(
        s6, Inches(0.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "30A+ 電調規格底線",
        [
            "球門推擠螺旋槳驟停時，瞬間堵轉電流極大。",
            "Class 20：標配 20A～35A。",
            "Class 40：標配 40A～55A 四合一電調。",
            "全面採用 DShot600 數位協定，免校準油門且具 CRC 防錯。",
        ],
    )
    add_card(
        s6, Inches(4.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "電調 PWM 斬波頻率",
        [
            "24kHz（卡位爆發型）：低速扭力大、對撞硬挺，適合破門／後衛。",
            "48kHz（前鋒主流型）：線性順滑、約省電 15%、溫升較慢，適合精細穿門。",
            "嚴禁 96kHz：瞬間扭力大幅衰退，碰撞起步發軟。",
        ],
        border_color=COLOR_AMBER,
    )
    add_card(
        s6, Inches(8.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "馬達進角（Motor Timing）",
        [
            "設定標準：鎖定 16° 或 Auto。",
            "嚴禁超過 22°！",
            "高進角在低速卡死時電流迅速轉熱，數秒內可燒毀線圈與 MOS。",
        ],
        border_color=COLOR_RED,
        title_color=COLOR_RED,
    )

    # ----------------- SLIDE 7: RPM 濾波與磁極數 -----------------
    s7 = prs.slides.add_slide(blank)
    set_slide_background(s7, prs)
    add_header(s7, "動態 RPM 濾波架構與馬達磁極數判斷", "MODULE 3: FILTERING & SENSING")

    add_card(
        s7, Inches(0.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "雙向 DShot + RPM 濾波",
        [
            "電調即時回傳真實馬達轉速（RPM）。",
            "精準架設極窄陷波，濾除運轉基頻與諧波。",
            "大幅壓低軟體低通延遲，保留跟手感。",
        ],
        border_color=COLOR_CYAN,
    )
    add_card(
        s7, Inches(4.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "磁極數（Motor Poles）判斷",
        [
            "Class 40（22／23 系列）：多為 12N14P，磁極數填 14。",
            "Class 20（11／12 系列）：多為 9N12P，必須手動改填 12！",
            "填錯後果：濾波切歪，雜訊直灌 PID，馬達約 30 秒內過熱燒毀。",
        ],
        border_color=COLOR_AMBER,
    )
    add_card(
        s7, Inches(8.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "濾波滑塊設定守則",
        [
            "初始裝機濾波滑塊固定在 1.0（中央預設）。",
            "D-term 濾波保守化：維持 1.0，防止球框震動被 D 值放大。",
            "Gyro 與 D-term Lowpass 全面指定為 PT1。",
        ],
    )

    # ----------------- SLIDE 8: 六大連帶矩陣 -----------------
    s8 = prs.slides.add_slide(blank)
    set_slide_background(s8, prs)
    add_header(s8, "系統調校六大連帶與牽制矩陣", "MODULE 3: TUNING TRADE-OFFS")

    add_card(
        s8, Inches(0.8), Inches(1.75), Inches(3.7), Inches(2.4),
        "1. D 值 vs 濾波 vs 發熱",
        ["D 值壓制彈跳但放大雜訊；必先開雙向 DShot RPM 濾波再推 D 值。"],
        body_size=12, title_size=14,
    )
    add_card(
        s8, Inches(4.8), Inches(1.75), Inches(3.7), Inches(2.4),
        "2. 電調 PWM vs 爆發扭力",
        ["48k 平順省電，24k 對撞硬朗；盲目上 96k 門前角力推不動。"],
        body_size=12, title_size=14,
    )
    add_card(
        s8, Inches(8.8), Inches(1.75), Inches(3.7), Inches(2.4),
        "3. PID 迴率 vs CPU 負載",
        ["F4 鎖 4k／4k，F7／H7 跑 8k／8k；負載壓在 65% 以下保平安。"],
        body_size=12, title_size=14,
    )
    add_card(
        s8, Inches(0.8), Inches(4.4), Inches(3.7), Inches(2.4),
        "4. 遙控刷新 vs 穿網距離",
        ["ELRS 鎖定 250～500Hz，兼顧 2ms 級手感與金屬網籠穿透力。"],
        body_size=12, title_size=14,
    )
    add_card(
        s8, Inches(4.8), Inches(4.4), Inches(3.7), Inches(2.4),
        "5. P 值 vs FF 前饋",
        ["適度降 P 防高頻自激；拉高 FF 至 140～180 抵銷外框慣量。"],
        body_size=12, title_size=14,
    )
    add_card(
        s8, Inches(8.8), Inches(4.4), Inches(3.7), Inches(2.4),
        "6. 圖傳功率 vs 多機串頻",
        ["全場統一鎖死 25mW，依 Raceband 間隔頻段分流，避免全場反白。"],
        border_color=COLOR_AMBER,
        body_size=12, title_size=14,
    )

    # ----------------- SLIDE 9: PID / FF / Air Mode -----------------
    s9 = prs.slides.add_slide(blank)
    set_slide_background(s9, prs)
    add_header(s9, "PID 基準值、前饋（FF）與手感塑形", "MODULE 3: PID TUNING")

    add_card(
        s9, Inches(0.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "PID 基準值配置",
        [
            "P（剛性）：Class20 48～58／Class40 60～75。",
            "I（鎖角）：Class20 65～80／Class40 80～100。",
            "D（煞停）：Class20 28～36／Class40 35～45。",
            "Anti-Gravity：5.0～8.0，抑制猛推／急收油門點頭。",
            "Angle 最大傾角：55°～60°，保障衝刺水平速度。",
        ],
    )
    add_card(
        s9, Inches(4.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "極致跟手靈魂：FF",
        [
            "定義：推桿瞬間姿態零延遲同步響應。",
            "前饋（FF）建議值：拉高至 140～180。",
            "原理：繞過陀螺儀誤差迴路，推桿瞬間直接注入動能，硬扯動外框慣性。",
        ],
        border_color=COLOR_CYAN,
    )
    add_card(
        s9, Inches(8.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "Air Mode 雙面刃",
        [
            "零油門滑行穿門：收油門姿態不瓦解。",
            "地表暴跳（Ground Bounce）：觸地易引發飛控反抗暴彈。",
            "課堂建議：設獨立開關，觸地即秒切 Disarm。",
        ],
        border_color=COLOR_AMBER,
    )

    # ----------------- SLIDE 10: 起飛 SOP -----------------
    s10 = prs.slides.add_slide(blank)
    set_slide_background(s10, prs)
    add_header(s10, "起飛前標準作業流程（SOP）與安全鐵律", "MODULE 4: PRE-FLIGHT SAFETY")

    add_card(
        s10, Inches(0.8), Inches(1.75), Inches(5.7), Inches(5.1),
        "標準起飛 SOP",
        [
            "Step 1：先開遙控器，確認油門最低、Disarm 狀態。",
            "Step 2：機身平放起飛點接電，5 秒內禁止移動，靜置自檢。",
            "Step 3：防護網拉鍊完全閉合，全員退至網外 1 公尺。",
            "Step 4：解鎖後離地約 30cm 低空懸停測試無誤再起飛。",
        ],
        border_color=COLOR_CYAN,
        body_size=14,
        title_size=18,
    )
    add_card(
        s10, Inches(6.8), Inches(1.75), Inches(5.7), Inches(5.1),
        "課堂四大安全鐵律",
        [
            "先開控後接電；先拔電後關控：防止訊號中斷馬達誤動作暴衝。",
            "機身通電後手指嚴禁伸入球框：防範槳葉劃傷。",
            "落地、卡網、炸機瞬間 0.1 秒秒切 Disarm：杜絕堵轉燒毀。",
            "鋰電池嚴守 1C 平衡充電（例：850mAh 設 0.8A），防火袋常備專人看守。",
        ],
        border_color=COLOR_AMBER,
        body_size=14,
        title_size=18,
    )

    # ----------------- SLIDE 11: 60 秒 Pit Stop -----------------
    s11 = prs.slides.add_slide(blank)
    set_slide_background(s11, prs)
    add_header(s11, "局間 60 秒極限進站地勤（Pit Stop SOP）", "MODULE 4: PIT STOP WORKFLOW")

    add_card(
        s11, Inches(0.7), Inches(1.75), Inches(2.85), Inches(5.1),
        "00～15 秒",
        [
            "哨響立即進場拔電。",
            "手背輕觸 4 顆馬達外殼盲測溫度。",
            "確認機架與天線無結構斷裂。",
        ],
        body_size=12, title_size=15,
    )
    add_card(
        s11, Inches(3.75), Inches(1.75), Inches(2.85), Inches(5.1),
        "15～35 秒",
        [
            "抽換滿電電池（局數預先標記）。",
            "對齊機身重心（CG）束緊魔鬼氈。",
            "手指快速刷過 4 支槳葉檢查缺角裂紋。",
        ],
        border_color=COLOR_CYAN,
        body_size=12, title_size=15,
    )
    add_card(
        s11, Inches(6.8), Inches(1.75), Inches(2.85), Inches(5.1),
        "35～50 秒",
        [
            "擺回起飛定位格插上電源。",
            "雙手立刻放開，靜置 3 秒。",
            "等待飛控開機音與陀螺儀歸零。",
        ],
        body_size=12, title_size=15,
    )
    add_card(
        s11, Inches(9.85), Inches(1.75), Inches(2.75), Inches(5.1),
        "50～60 秒",
        [
            "飛手在場外撥解鎖微動測試即切斷。",
            "地勤全員攜帶工具退回防護網外。",
            "拉上拉鍊，裁判鳴笛次局開戰。",
        ],
        border_color=COLOR_AMBER,
        body_size=12, title_size=15,
    )

    # ----------------- SLIDE 12: 馬達溫度三級 -----------------
    s12 = prs.slides.add_slide(blank)
    set_slide_background(s12, prs)
    add_header(s12, "馬達溫度三級判斷與現場熱急救", "MODULE 4: MOTOR THERMAL MANAGEMENT")

    add_card(
        s12, Inches(0.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "🟢 正常：微溫（≤45°C）",
        [
            "體感：手指緊貼無不適感。",
            "評估：散熱良好，PID 調校平衡。",
            "對策：正常換電，60 秒內起飛。",
        ],
        border_color=COLOR_CYAN,
        title_color=COLOR_CYAN,
    )
    add_card(
        s12, Inches(4.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "🟡 警戒：燙手（50°C～65°C）",
        [
            "體感：手指緊貼約 3 秒因刺痛縮回。",
            "評估：過度對撞推擠，或 D 值偏高、濾波不足。",
            "對策：便攜風扇垂直吹定子約 15 秒強制風冷；提醒飛手減少門前死磕。",
        ],
        border_color=COLOR_AMBER,
        title_color=COLOR_AMBER,
    )
    add_card(
        s12, Inches(8.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "🔴 致命：極燙（≥75°C／焦味）",
        [
            "體感：碰觸瞬間燙縮手，或聞到焦味。",
            "評估：磁鐵退磁、漆包線絕緣熔化風險。",
            "對策：立刻放棄維修，果斷更換備用機（Backup Drone）！",
        ],
        border_color=COLOR_RED,
        title_color=COLOR_RED,
    )

    # ----------------- SLIDE 13: 攻防戰術 -----------------
    s13 = prs.slides.add_slide(blank)
    set_slide_background(s13, prs)
    add_header(s13, "團隊角色矩陣與實戰三大攻防戰術", "MODULE 5: COMPETITION TACTICS")

    add_card(
        s13, Inches(0.8), Inches(1.75), Inches(5.7), Inches(5.1),
        "團隊角色分工矩陣",
        [
            "攻擊前鋒（Striker）：唯一配戴識別光帶，專職穿越球門得分（高 FF 跟手調校）。",
            "破門清道夫（Sweeper）：主動衝撞開道，頂開敵方門將（24kHz 低速爆發調校）。",
            "正印門將（Keeper）：Angle 模式定點懸停，死守球門下緣約 1／3 空域。",
            "外圍截擊（Defender）：中場側撞推擠，破壞敵方前鋒衝刺航線。",
        ],
        border_color=COLOR_CYAN,
        body_size=13,
        title_size=18,
    )
    add_card(
        s13, Inches(6.8), Inches(1.75), Inches(5.7), Inches(5.1),
        "三大實戰戰術與規則",
        [
            "拆檔掩護（Pick & Roll）：清道夫先於前鋒半秒衝撞門將頂飛，前鋒切入空門。",
            "底線彈牆（Wall Bounce）：撞擊側壁邊網斜向反彈，避開密集防守盲區切入。",
            "禁區 3 秒規則（Camping）：前鋒在對方球門禁區停留不得超過 3 秒；進球後需完全退出禁區重置。",
        ],
        border_color=COLOR_AMBER,
        body_size=13,
        title_size=18,
    )

    # ----------------- SLIDE 14: 總結口訣 -----------------
    s14 = prs.slides.add_slide(blank)
    set_slide_background(s14, prs)
    add_header(s14, "全課核心心法與調校安全總結", "SUMMARY: MASTERCLASS TAKEAWAYS")

    add_card(
        s14, Inches(0.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "調校心法口訣",
        [
            "雙向 DShot 是地基，磁極數量不能錯。",
            "RPM 濾波精準切，動態陷波抓共振。",
            "進角十六 PWM 四八順，肉搏改二四。",
            "前饋加足跟手飛，球框再重不黏手。",
        ],
        border_color=COLOR_CYAN,
    )
    add_card(
        s14, Inches(4.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "安全操作口訣",
        [
            "先開控後接電，先拔電後關控。",
            "落地觸網秒 Disarm，杜絕馬達堵轉燒。",
            "充電遵循 1C 率，專人看管防爆袋。",
            "全班統一 Mode 2 美國手，建立直覺反射。",
        ],
        border_color=COLOR_AMBER,
    )
    add_card(
        s14, Inches(8.8), Inches(1.75), Inches(3.7), Inches(5.1),
        "賽事實戰口訣",
        [
            "局間進站六十秒，拔電換電摸溫度。",
            "燙手風扇吹定子，焦味果斷換備機。",
            "前鋒穿門算重置，禁區三秒不逗留。",
            "科技體育重團隊，勝負全看地勤功。",
        ],
    )

    prs.save(output_filename)
    return output_filename


if __name__ == "__main__":
    out = create_deck()
    print(f"成功生成標準 PowerPoint 檔案：{out}")
