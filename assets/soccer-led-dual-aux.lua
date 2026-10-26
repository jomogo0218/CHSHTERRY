-- 嘉華足球機 · 雙 AUX 獨立改環燈／尾燈（EdgeTX + ELRS／CRSF）
--
-- 原理：原廠 Betaflight 單一路 LED 無法用兩個 Modes 各控一組燈珠。
--       本隊把環燈固定 color 1、尾燈固定 color 3；本腳本在 AUX 變動時
--       用 MSP_SET_LED_COLORS 只改這兩格 HSV → 飛行中即可獨立熱切。
--
-- 安裝：複製到遙控 /SCRIPTS/TELEMETRY/ 或 /SCRIPTS/TOOLS/
--       模型 → 遙測畫面／工具 執行本腳本；飛行中保持在前景或設為常駐。
-- 前置：飛控已用「配置分析 → 足球雙撥桿」寫入 22 燈（環 CW:1、尾 C:3）
--       ELRS／CRSF 正常、MSP 可用（一般預設即可）
--
-- 通道：與分析器預設相同——環＝CH6（AUX2）、尾＝CH7（AUX3）；可改下方常數。

local RING_CH = 6
local TAIL_CH = 7
local THRESH = 0          -- EdgeTX ch 值：>0 高位、<0 低位（約 ±100%）
local POLL_MS = 80

-- HSV：S=0 最鮮豔（Betaflight 慣例）。可依隊色修改。
local RING_LO = { h = 0,   s = 0, v = 255 }  -- 紅
local RING_HI = { h = 240, s = 0, v = 255 }  -- 藍
local TAIL_LO = { h = 60,  s = 0, v = 255 }  -- 黃（識別）
local TAIL_HI = { h = 240, s = 0, v = 255 }  -- 射手＝對方隊色（紅隊射手機改成藍等）

local MSP_SET_LED_COLORS = 47
local CRSF_FRAMETYPE_MSP_CLIENT = 0x7A
local ADDR_FC = 0xC8
local ADDR_RADIO = 0xEA

local lastRing = -1
local lastTail = -1
local status = "待命"
local lastPush = 0

local function chHigh(ch)
  local v = getValue("ch" .. ch)
  if v == nil then return 0 end
  return (v >= THRESH) and 1 or 0
end

local function hsvBytes(c)
  local h = c.h or 0
  if h < 0 then h = 0 end
  if h > 359 then h = 359 end
  local s = c.s or 0
  local v = c.v or 255
  if s < 0 then s = 0 elseif s > 255 then s = 255 end
  if v < 0 then v = 0 elseif v > 255 then v = 255 end
  return h % 256, math.floor(h / 256) % 256, s, v
end

-- 組 16 色盤：只填 1＝環、3＝尾，其餘關閉
local function buildColorPayload(ringPos, tailPos)
  local ring = (ringPos == 1) and RING_HI or RING_LO
  local tail = (tailPos == 1) and TAIL_HI or TAIL_LO
  local payload = {}
  for i = 0, 15 do
    local h, hh, s, v = 0, 0, 255, 0
    if i == 1 then
      h, hh, s, v = hsvBytes(ring)
    elseif i == 3 then
      h, hh, s, v = hsvBytes(tail)
    end
    payload[#payload + 1] = h
    payload[#payload + 1] = hh
    payload[#payload + 1] = s
    payload[#payload + 1] = v
  end
  return payload
end

local function mspChecksum(size, cmd, payload)
  local c = bit32.bxor(size, cmd)
  for i = 1, #payload do
    c = bit32.bxor(c, payload[i])
  end
  return c % 256
end

local function pushLedColors(ringPos, tailPos)
  if not crossfireTelemetryPush then
    status = "無 CRSF API"
    return false
  end
  local payload = buildColorPayload(ringPos, tailPos)
  local size = #payload
  local cmd = MSP_SET_LED_COLORS
  local frame = {
    ADDR_FC,
    ADDR_RADIO,
    size,
    cmd
  }
  for i = 1, size do
    frame[#frame + 1] = payload[i]
  end
  frame[#frame + 1] = mspChecksum(size, cmd, payload)
  local ok = crossfireTelemetryPush(CRSF_FRAMETYPE_MSP_CLIENT, frame)
  if ok then
    status = "已送 MSP · 環" .. (ringPos == 1 and "高" or "低") .. "／尾" .. (tailPos == 1 and "高" or "低")
    lastPush = getTime()
    return true
  end
  status = "MSP 送出失敗"
  return false
end

local function run(event)
  local rp = chHigh(RING_CH)
  local tp = chHigh(TAIL_CH)
  if rp ~= lastRing or tp ~= lastTail then
    lastRing = rp
    lastTail = tp
    pushLedColors(rp, tp)
  end

  lcd.clear()
  lcd.drawText(2, 2, "足球機 LED 雙 AUX", 0)
  lcd.drawText(2, 14, "環 CH" .. RING_CH .. " = " .. (lastRing == 1 and "高" or "低"), 0)
  lcd.drawText(2, 26, "尾 CH" .. TAIL_CH .. " = " .. (lastTail == 1 and "高" or "低"), 0)
  lcd.drawText(2, 40, status, 0)
  lcd.drawText(2, 52, "EXIT 離開", 0)

  if event == EVT_EXIT_BREAK then
    return 2
  end
  return 0
end

return { run = run }
