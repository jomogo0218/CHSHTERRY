/* 嘉華足球無人機 · 飛控完整備份（CLI + MSP + Dataflash 黑盒子） */
(function (global) {
  "use strict";

  var MSP = {
    API_VERSION: 1,
    FC_VARIANT: 2,
    FC_VERSION: 3,
    BOARD_INFO: 4,
    BUILD_INFO: 5,
    NAME: 10,
    LED_COLORS: 46,
    SET_LED_COLORS: 47,
    LED_STRIP_CONFIG: 48,
    SET_LED_STRIP_CONFIG: 49,
    LED_STRIP_MODECOLOR: 127,
    SET_LED_STRIP_MODECOLOR: 221,
    BATTERY_CONFIG: 32,
    MODE_RANGES: 34,
    FEATURE_CONFIG: 36,
    BOARD_ALIGNMENT: 38,
    MIXER_CONFIG: 42,
    RX_CONFIG: 44,
    RSSI_CONFIG: 50,
    CF_SERIAL_CONFIG: 54,
    VOLTAGE_METER_CONFIG: 56,
    ARMING_CONFIG: 61,
    RX_MAP: 64,
    DATAFLASH_SUMMARY: 70,
    DATAFLASH_READ: 71,
    FAILSAFE_CONFIG: 75,
    SDCARD_SUMMARY: 79,
    BLACKBOX_CONFIG: 80,
    TRANSPONDER_CONFIG: 82,
    OSD_CONFIG: 84,
    VTX_CONFIG: 88,
    STATUS: 101,
    STATUS_EX: 150,
    ACC_CALIBRATION: 205,
    MAG_CALIBRATION: 206,
    RAW_IMU: 102,
    SERVO: 103,
    MOTOR: 104,
    RC: 105,
    RAW_GPS: 106,
    COMP_GPS: 107,
    ATTITUDE: 108,
    ALTITUDE: 109,
    ANALOG: 110,
    RC_TUNING: 111,
    PID: 112,
    BOXNAMES: 116,
    PIDNAMES: 117,
    BOXIDS: 119,
    MOTOR_3D_CONFIG: 124,
    RC_DEADBAND: 125,
    SENSOR_ALIGNMENT: 126,
    LED_STRIP_MODECOLOR: 127,
    VOLTAGE_METERS: 128,
    CURRENT_METERS: 129,
    BATTERY_STATE: 130,
    MOTOR_CONFIG: 131,
    GPS_CONFIG: 132,
    COMPASS_CONFIG: 133,
    ESC_SENSOR_DATA: 134,
    GPS_RESCUE: 135,
    GPS_RESCUE_PIDS: 136,
    VTXTABLE_BAND: 137,
    VTXTABLE_POWERLEVEL: 138,
    MOTOR_TELEMETRY: 139,
    SIMPLIFIED_TUNING: 140,
    FILTER_CONFIG: 92,
    PID_ADVANCED: 94,
    SENSOR_CONFIG: 96,
    BEEPER_CONFIG: 97
  };

  var CLI_CMDS = [
    "version",
    "status",
    "tasks",
    "flash_info",
    "resource show all",
    "dma show",
    "timer show",
    "serial",
    "feature",
    "aux",
    "map",
    "mixer",
    "rxrange",
    "rxfail",
    "adjrange",
    "led",
    "color",
    "mode_color",
    "servo",
    "smix",
    "mmix",
    "diff all",
    "dump all"
  ];

  var IDB_NAME = "chsh_fc_backups";
  var IDB_STORE = "backups";

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function toHex(u8) {
    var out = "";
    for (var i = 0; i < u8.length; i++) out += (u8[i] < 16 ? "0" : "") + u8[i].toString(16);
    return out;
  }

  function downloadBlob(blob, filename) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function openIdb() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  async function idbPut(record) {
    var db = await openIdb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(record);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { reject(tx.error); };
    });
  }

  async function idbList() {
    var db = await openIdb();
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(IDB_STORE, "readonly");
      var req = tx.objectStore(IDB_STORE).getAll();
      req.onsuccess = function () {
        var rows = req.result || [];
        rows.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
        resolve(rows);
      };
      req.onerror = function () { reject(req.error); };
    });
  }

  function encodeMsp(cmd, payload) {
    payload = payload || new Uint8Array(0);
    var size = payload.length;
    var out = new Uint8Array(6 + size);
    out[0] = 36; // $
    out[1] = 77; // M
    out[2] = 60; // <
    out[3] = size;
    out[4] = cmd;
    var crc = size ^ cmd;
    for (var i = 0; i < size; i++) {
      out[5 + i] = payload[i];
      crc ^= payload[i];
    }
    out[5 + size] = crc;
    return out;
  }

  function createSession(port) {
    var writer = port.writable.getWriter();
    var reader = port.readable.getReader();
    var chunks = [];
    var total = 0;
    var pumping = true;
    var pumpError = null;

    var pump = (async function () {
      try {
        while (pumping) {
          var r = await reader.read();
          if (r.done) break;
          if (r.value && r.value.length) {
            chunks.push(r.value);
            total += r.value.length;
          }
        }
      } catch (e) {
        pumpError = e;
      }
    })();

    function mergeBuffer() {
      if (!chunks.length) return new Uint8Array(0);
      if (chunks.length === 1) return chunks[0];
      var all = new Uint8Array(total);
      var off = 0;
      for (var i = 0; i < chunks.length; i++) {
        all.set(chunks[i], off);
        off += chunks[i].length;
      }
      chunks = [all];
      return all;
    }

    function consume(n) {
      var buf = mergeBuffer();
      if (n >= buf.length) {
        chunks = [];
        total = 0;
        return buf;
      }
      var head = buf.slice(0, n);
      var rest = buf.slice(n);
      chunks = rest.length ? [rest] : [];
      total = rest.length;
      return head;
    }

    function available() {
      return total;
    }

    async function waitBytes(minLen, totalMs) {
      var deadline = Date.now() + totalMs;
      while (Date.now() < deadline) {
        if (pumpError) throw pumpError;
        if (available() >= minLen) return;
        await sleep(20);
      }
    }

    async function writeBytes(u8) {
      await writer.write(u8);
    }

    async function writeText(s) {
      await writer.write(new TextEncoder().encode(s));
    }

    function asText() {
      return new TextDecoder().decode(mergeBuffer());
    }

    function clear() {
      chunks = [];
      total = 0;
    }

    async function close() {
      pumping = false;
      try { await reader.cancel(); } catch (e) {}
      try { await pump; } catch (e) {}
      try { reader.releaseLock(); } catch (e) {}
      try { writer.releaseLock(); } catch (e) {}
      try { await port.close(); } catch (e) {}
    }

    async function readMspResponse(expectCmd, totalMs) {
      var deadline = Date.now() + totalMs;
      while (Date.now() < deadline) {
        if (pumpError) throw pumpError;
        var buf = mergeBuffer();
        var i = 0;
        while (i + 5 < buf.length) {
          if (!(buf[i] === 36 && buf[i + 1] === 77 && (buf[i + 2] === 62 || buf[i + 2] === 33))) {
            i++;
            continue;
          }
          var err = buf[i + 2] === 33;
          var size = buf[i + 3];
          var cmd = buf[i + 4];
          var frameLen = 6 + size;
          if (i + frameLen > buf.length) break;
          var frame = buf.slice(i, i + frameLen);
          var crc = size ^ cmd;
          for (var p = 0; p < size; p++) crc ^= frame[5 + p];
          if (crc !== frame[5 + size]) {
            i++;
            continue;
          }
          // drop everything through this frame
          consume(i + frameLen);
          if (err) throw new Error("MSP 錯誤回應 cmd=" + cmd);
          if (expectCmd != null && cmd !== expectCmd) {
            // 丟棄非預期幀，繼續等
            break;
          }
          return frame.slice(5, 5 + size);
        }
        if (i > 0) consume(i);
        await sleep(15);
      }
      throw new Error("MSP 逾時（cmd " + expectCmd + "）");
    }

    async function msp(cmd, payload, timeoutMs) {
      clear();
      await writeBytes(encodeMsp(cmd, payload));
      return readMspResponse(cmd, timeoutMs || 2500);
    }

    async function enterCli() {
      await writeText("\r\n");
      await sleep(200);
      clear();
      for (var a = 0; a < 5; a++) {
        await writeText("#");
        await sleep(120);
        var deadline = Date.now() + 1800;
        while (Date.now() < deadline) {
          var t = asText();
          if (/Entering CLI/i.test(t) || /(^|\n)#\s*$/m.test(t)) {
            clear();
            return;
          }
          await sleep(40);
        }
        await writeText("\r\n");
      }
      throw new Error("無法進入 CLI");
    }

    async function cliCommand(cmd, totalMs) {
      clear();
      await writeText(cmd + "\r\n");
      var deadline = Date.now() + (totalMs || 8000);
      var last = 0;
      var idleAt = Date.now();
      while (Date.now() < deadline) {
        if (pumpError) throw pumpError;
        var n = available();
        if (n !== last) {
          last = n;
          idleAt = Date.now();
        }
        var text = asText();
        var donePrompt = /(^|\n)#\s*$/m.test(text);
        var dumpEnd = /#\s*end\b/i.test(text) || /batch end/i.test(text);
        if (dumpEnd || (donePrompt && Date.now() - idleAt > 350 && text.length > 10)) {
          var out = text;
          clear();
          return out;
        }
        // 長 dump：閒置較久也收
        if (Date.now() - idleAt > 900 && text.length > 80 && donePrompt) {
          var out2 = text;
          clear();
          return out2;
        }
        await sleep(40);
      }
      var finalText = asText();
      clear();
      return finalText;
    }

    return {
      writeText: writeText,
      writeBytes: writeBytes,
      msp: msp,
      enterCli: enterCli,
      cliCommand: cliCommand,
      clear: clear,
      close: close,
      asText: asText,
      available: available
    };
  }

  function parseDataflashSummary(payload) {
    if (!payload || payload.length < 13) {
      return { supported: false, ready: false, sectors: 0, totalSize: 0, usedSize: 0 };
    }
    var flags = payload[0];
    var dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    return {
      supported: !!(flags & 1),
      ready: !!(flags & 2),
      sectors: dv.getUint32(1, true),
      totalSize: dv.getUint32(5, true),
      usedSize: dv.getUint32(9, true),
      flags: flags
    };
  }

  async function downloadDataflash(session, usedSize, onProgress) {
    if (!usedSize || usedSize <= 0) return null;
    var chunkSize = 4096;
    var out = new Uint8Array(usedSize);
    var addr = 0;
    while (addr < usedSize) {
      var want = Math.min(chunkSize, usedSize - addr);
      var req = new Uint8Array(7);
      var dv = new DataView(req.buffer);
      dv.setUint32(0, addr, true);
      dv.setUint16(4, want, true);
      req[6] = 0; // new format, no legacy
      var payload = await session.msp(MSP.DATAFLASH_READ, req, 5000);
      if (payload.length < 7) throw new Error("黑盒子讀取回應過短");
      var pdv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
      var gotAddr = pdv.getUint32(0, true);
      var gotLen = pdv.getUint16(4, true);
      // compression byte at 6; expect 0
      var data = payload.slice(7, 7 + gotLen);
      if (gotAddr !== addr) {
        // 仍寫入讀到的位址
      }
      var writeAt = gotAddr;
      if (writeAt + data.length > out.length) {
        data = data.slice(0, Math.max(0, out.length - writeAt));
      }
      out.set(data, writeAt);
      addr += gotLen > 0 ? gotLen : want;
      if (onProgress) onProgress("黑盒子 " + Math.min(100, Math.round((addr / usedSize) * 100)) + "%（" + addr + "/" + usedSize + "）");
      if (gotLen === 0) break;
    }
    return out;
  }

  async function collectMsp(session, onProgress) {
    var map = {};
    var codes = Object.keys(MSP).map(function (k) { return { name: k, code: MSP[k] }; });
    // 去重 code
    var seen = {};
    var list = [];
    codes.forEach(function (c) {
      if (seen[c.code]) return;
      seen[c.code] = 1;
      list.push(c);
    });
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      if (item.code === MSP.DATAFLASH_READ) continue;
      onProgress && onProgress("MSP " + item.name + "（" + (i + 1) + "/" + list.length + "）");
      try {
        var payload = await session.msp(item.code, null, 2000);
        map[item.name] = {
          code: item.code,
          hex: toHex(payload),
          length: payload.length
        };
        if (item.code === MSP.DATAFLASH_SUMMARY) {
          map[item.name].parsed = parseDataflashSummary(payload);
        }
        if (item.code === MSP.NAME || item.code === MSP.FC_VARIANT || item.code === MSP.BOARD_INFO || item.code === MSP.BUILD_INFO) {
          try {
            map[item.name].text = new TextDecoder().decode(payload).replace(/\0/g, "").trim();
          } catch (e) {}
        }
      } catch (err) {
        map[item.name] = {
          code: item.code,
          error: err && err.message ? err.message : String(err)
        };
      }
      await sleep(20);
    }
    return map;
  }

  async function collectCli(session, onProgress) {
    var out = {};
    await session.enterCli();
    for (var i = 0; i < CLI_CMDS.length; i++) {
      var cmd = CLI_CMDS[i];
      onProgress && onProgress("CLI「" + cmd + "」（" + (i + 1) + "/" + CLI_CMDS.length + "）");
      var timeout = /dump|diff/.test(cmd) ? 30000 : 10000;
      try {
        out[cmd] = await session.cliCommand(cmd, timeout);
      } catch (err) {
        out[cmd] = "# ERROR: " + (err && err.message ? err.message : String(err));
      }
      await sleep(80);
    }
    try {
      await session.writeText("exit noreboot\r\n");
      await sleep(250);
      session.clear();
    } catch (e) {}
    return out;
  }

  async function runFullBackupOnPort(port, onProgress) {
    if (!port) throw new Error("沒有可用埠口");
    onProgress && onProgress("開啟序列埠…");
    try {
      // 若仍開著，先關
      try {
        if (port.readable || port.writable) await port.close();
      } catch (e) {}
      await sleep(200);
      await port.open({ baudRate: 115200, bufferSize: 1024 * 256 });
    } catch (err) {
      throw new Error("無法開啟埠口（請關閉 Configurator／即時監控）：" + (err.message || err));
    }

    var session = createSession(port);
    var stamp = new Date();
    var id = "fc_" + stamp.toISOString().replace(/[:.]/g, "-");
    var backup = {
      id: id,
      createdAt: stamp.getTime(),
      createdLocal: stamp.toLocaleString("zh-TW"),
      kind: "full",
      cli: {},
      msp: {},
      blackbox: null,
      meta: {}
    };

    try {
      onProgress && onProgress("CLI 完整讀取…");
      backup.cli = await collectCli(session, onProgress);

      onProgress && onProgress("MSP 完整讀取…");
      backup.msp = await collectMsp(session, onProgress);

      var summary = backup.msp.DATAFLASH_SUMMARY && backup.msp.DATAFLASH_SUMMARY.parsed;
      backup.meta.dataflash = summary || null;

      if (summary && summary.supported && summary.usedSize > 0) {
        onProgress && onProgress("下載黑盒子 Dataflash（" + summary.usedSize + " bytes）…");
        try {
          var flash = await downloadDataflash(session, summary.usedSize, onProgress);
          if (flash && flash.length) {
            backup.blackbox = {
              bytes: flash.length,
              encoding: "base64-chunked",
              chunks: []
            };
            var CHUNK = 0x6000;
            for (var o = 0; o < flash.length; o += CHUNK) {
              var slice = flash.subarray(o, Math.min(o + CHUNK, flash.length));
              var s = "";
              for (var j = 0; j < slice.length; j++) s += String.fromCharCode(slice[j]);
              backup.blackbox.chunks.push(btoa(s));
            }
            backup._flashRaw = flash; // 僅本次下載用，稍後刪除再寫 IDB
          }
        } catch (bbErr) {
          backup.blackbox = {
            error: bbErr && bbErr.message ? bbErr.message : String(bbErr)
          };
        }
      } else {
        backup.blackbox = {
          note: summary && summary.supported
            ? "Dataflash 支援但目前無黑盒子資料（usedSize=0）"
            : "此飛控無可用 Dataflash 黑盒子（可能用 SD 卡或未開黑盒子）"
        };
      }

      var dump = backup.cli["dump all"] || backup.cli["diff all"] || "";
      backup.meta.dumpSetCount = (dump.match(/\bset\s+\w+\s*=/g) || []).length;
      backup.meta.cliCommands = Object.keys(backup.cli).length;
      backup.meta.mspOk = Object.keys(backup.msp).filter(function (k) { return backup.msp[k] && !backup.msp[k].error; }).length;
    } finally {
      await session.close();
    }

    return backup;
  }

  async function runFullBackup(onProgress) {
    if (!("serial" in navigator)) throw new Error("請用 Chrome／Edge（需 Web Serial）");
    if (!window.isSecureContext) throw new Error("請用 http://127.0.0.1 或 HTTPS 開啟");

    onProgress && onProgress("選擇飛控埠口…");
    var port = await navigator.serial.requestPort();
    return runFullBackupOnPort(port, onProgress);
  }

  async function saveLocal(backup, onProgress) {
    var base = backup.id;
    onProgress && onProgress("寫入本機 IndexedDB…");

    var flashRaw = backup._flashRaw || null;
    delete backup._flashRaw;

    // IDB 存完整結構（含黑盒子 base64 chunks）
    await idbPut(JSON.parse(JSON.stringify(backup)));

    onProgress && onProgress("下載 backup JSON…");
    downloadBlob(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
      base + "_full-backup.json"
    );

    if (backup.cli["dump all"]) {
      await sleep(400);
      downloadBlob(new Blob([backup.cli["dump all"]], { type: "text/plain" }), base + "_dump-all.txt");
    }
    if (backup.cli["diff all"]) {
      await sleep(400);
      downloadBlob(new Blob([backup.cli["diff all"]], { type: "text/plain" }), base + "_diff-all.txt");
    }
    if (backup.cli.status) {
      await sleep(400);
      downloadBlob(new Blob([backup.cli.status], { type: "text/plain" }), base + "_status.txt");
    }

    if (flashRaw && flashRaw.length) {
      await sleep(400);
      onProgress && onProgress("下載黑盒子 .bbl…");
      downloadBlob(new Blob([flashRaw], { type: "application/octet-stream" }), base + "_blackbox.bbl");
    }

    return backup;
  }

  async function openLiveSessionFromPort(port, onProgress) {
    if (!port) throw new Error("沒有埠口");
    onProgress && onProgress("開啟序列埠…");
    try {
      try {
        if (port.readable || port.writable) await port.close();
      } catch (e) {}
      await sleep(200);
      await port.open({ baudRate: 115200, bufferSize: 65536 });
    } catch (err) {
      throw new Error("無法開啟埠口（請關閉 Configurator／其他分頁）：" + (err.message || err));
    }
    var session = createSession(port);
    // 即時監控走 MSP，不要送 Enter／#，以免誤進 CLI 導致陀螺儀無反應
    try { session.clear(); } catch (e) {}
    await sleep(80);
    return session;
  }

  async function openLiveSession(onProgress) {
    if (!("serial" in navigator)) throw new Error("請用 Chrome／Edge（需 Web Serial）");
    if (!window.isSecureContext) throw new Error("請用 http://127.0.0.1 或 HTTPS 開啟");
    onProgress && onProgress("選擇飛控埠口…");
    var port = await navigator.serial.requestPort();
    return openLiveSessionFromPort(port, onProgress);
  }

  function parseAttitude(payload) {
    if (!payload || payload.length < 6) return null;
    var dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    return {
      roll: dv.getInt16(0, true) / 10,   // 決定度 → 度
      pitch: dv.getInt16(2, true) / 10,
      yaw: dv.getInt16(4, true)          // 航向度
    };
  }

  function parseRawImu(payload) {
    if (!payload || payload.length < 18) return null;
    var dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    // Betaflight：加速度 / 陀螺原始值；陀螺 roughly deg/s * scale，顯示用 /16.4（±2000°/s）
    return {
      acc: [dv.getInt16(0, true), dv.getInt16(2, true), dv.getInt16(4, true)],
      gyro: [
        dv.getInt16(6, true) / 16.4,
        dv.getInt16(8, true) / 16.4,
        dv.getInt16(10, true) / 16.4
      ],
      mag: [dv.getInt16(12, true), dv.getInt16(14, true), dv.getInt16(16, true)]
    };
  }

  function parseRc(payload) {
    if (!payload || payload.length < 2) return [];
    var dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    var n = Math.floor(payload.length / 2);
    var ch = [];
    for (var i = 0; i < n; i++) ch.push(dv.getUint16(i * 2, true));
    return ch;
  }

  function parseAnalog(payload) {
    if (!payload || payload.length < 5) return null;
    var dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    // 經典格式：vbat u8(0.1V)、mAh u16、rssi u16、amperage i16(0.01A)
    // 較新可能含電壓 u16；依長度相容解析
    var out = {
      vbat: dv.getUint8(0) / 10,
      mAh: dv.getUint16(1, true),
      rssi: dv.getUint16(3, true),
      amperage: payload.length >= 7 ? dv.getInt16(5, true) / 100 : 0
    };
    if (payload.length >= 9) {
      // 部分版本在後面有更精準電壓
      var v2 = dv.getUint16(payload.length >= 11 ? 7 : 5, true);
      if (v2 > 50 && v2 < 1000) out.vbat = v2 / 100;
    }
    return out;
  }

  function parseStatusEx(payload) {
    if (!payload || payload.length < 11) return null;
    var dv = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    var out = {
      cycleTime: dv.getUint16(0, true),
      i2cError: dv.getUint16(2, true),
      sensors: dv.getUint16(4, true),
      flightModeFlags: dv.getUint32(6, true),
      profile: payload.length > 10 ? dv.getUint8(10) : 0,
      cpuLoad: 0,
      armingDisableFlags: 0,
      armed: false
    };
    var off = 11;
    if (payload.length >= off + 2) {
      out.cpuLoad = dv.getUint16(off, true);
      off += 2;
    }
    // 後續欄位隨版本變化；盡量找 armingDisableFlags（常見在尾端 u32）
    if (payload.length >= 15) {
      // BF 常見：profile 後有 load、然后 rate profile 等
      if (payload.length >= off + 1) off += 1; // rate profile index 可能
      if (payload.length >= off + 3) off += 3;
    }
    if (payload.length >= 11 + 2 + 1 + 2 + 1 + 4) {
      // 嘗試讀取較新 STATUS_EX 的 armingDisableFlags
      try {
        // 保守：若長度夠大，取倒數第 4～1 或固定偏移
        if (payload.length >= 22) {
          out.armingDisableFlags = dv.getUint32(payload.length - 4, true);
        }
      } catch (e) {}
    }
    // ARM 旗標通常在 flightModeFlags bit0
    out.armed = !!(out.flightModeFlags & 1);
    out.angleMode = !!(out.flightModeFlags & (1 << 1));
    out.horizonMode = !!(out.flightModeFlags & (1 << 2));
    return out;
  }

  function parseBoxNames(payload) {
    if (!payload || !payload.length) return [];
    var text = new TextDecoder().decode(payload);
    return text.split(";").map(function (s) { return s.trim(); }).filter(Boolean);
  }

  async function calibrateAcc(session) {
    // 多數飛控對校正指令不回 MSP 幀；送出後等待完成即可
    try { session.clear(); } catch (e) {}
    await session.writeBytes(encodeMsp(MSP.ACC_CALIBRATION, new Uint8Array(0)));
    await sleep(3500);
  }

  async function mspSend(session, cmd, payload) {
    try { session.clear(); } catch (e) {}
    await session.writeBytes(encodeMsp(cmd, payload || new Uint8Array(0)));
    // SET 類常無回應；短等即可
    await sleep(60);
  }

  function encodeAllLedColors(colors) {
    // LED_CONFIGURABLE_COLOR_COUNT 通常 16
    var out = new Uint8Array(16 * 4);
    var dv = new DataView(out.buffer);
    for (var i = 0; i < 16; i++) {
      var c = null;
      for (var j = 0; j < (colors || []).length; j++) {
        if (colors[j].i === i) { c = colors[j]; break; }
      }
      var h = c ? (c.h | 0) : 0;
      var s = c ? (c.s | 0) : 0;
      var v = c ? (c.v | 0) : 0;
      if (h < 0) h = 0;
      if (h > 359) h = 359;
      if (s < 0) s = 0;
      if (s > 255) s = 255;
      if (v < 0) v = 0;
      if (v > 255) v = 255;
      dv.setUint16(i * 4, h, true);
      out[i * 4 + 2] = s;
      out[i * 4 + 3] = v;
    }
    return out;
  }

  function packLedU32(led) {
    // 與常見 BF ledConfig 位元配置對齊；若有 raw 優先保留功能／方向位
    if (led.raw != null && led.color != null) {
      return (led.raw & 0x00ffffff) | ((led.color & 0x0f) << 24);
    }
    var x = (led.x || 0) & 0x0f;
    var y = (led.y || 0) & 0x0f;
    var color = (led.color || 0) & 0x0f;
    // 預設功能：Color (base function bit 常為 C=0 在低位)；保留簡單 C
    var func = 0x01; // color function present（依板子可能不同，有 raw 較準）
    return x | (y << 4) | (func << 8) | (color << 24);
  }

  async function writeLedColors(session, colors) {
    await mspSend(session, MSP.SET_LED_COLORS, encodeAllLedColors(colors));
  }

  async function writeLedStrip(session, leds) {
    for (var i = 0; i < (leds || []).length; i++) {
      var L = leds[i];
      var payload = new Uint8Array(5);
      payload[0] = L.i & 0xff;
      var dv = new DataView(payload.buffer);
      dv.setUint32(1, packLedU32(L) >>> 0, true);
      await mspSend(session, MSP.SET_LED_STRIP_CONFIG, payload);
      await sleep(15);
    }
  }

  async function writeLedToFc(session, ledState, doSave) {
    if (!session) throw new Error("未連線飛控");
    await writeLedColors(session, ledState.colors || []);
    if (ledState.leds && ledState.leds.length) {
      await writeLedStrip(session, ledState.leds);
    }
    if (doSave) {
      // 進入 CLI 存檔（會重開機）
      await session.enterCli();
      await session.cliCommand("save", 8000);
    }
  }

  function ledStateToCli(ledState) {
    var lines = [];
    (ledState.colors || []).forEach(function (c) {
      lines.push("color " + c.i + " " + c.h + "," + c.s + "," + c.v);
    });
    (ledState.leds || []).forEach(function (L) {
      var dir = L.dir || "";
      var func = L.func && L.func !== "MSP" ? L.func : "C";
      lines.push("led " + L.i + " " + L.x + "," + L.y + ":" + dir + ":" + func + ":" + L.color);
    });
    lines.push("save");
    return lines.join("\n");
  }

  global.FcFullBackup = {
    run: runFullBackup,
    runOnPort: runFullBackupOnPort,
    saveLocal: saveLocal,
    list: idbList,
    openLiveSession: openLiveSession,
    openLiveSessionFromPort: openLiveSessionFromPort,
    parseAttitude: parseAttitude,
    parseRawImu: parseRawImu,
    parseRc: parseRc,
    parseAnalog: parseAnalog,
    parseStatusEx: parseStatusEx,
    parseBoxNames: parseBoxNames,
    calibrateAcc: calibrateAcc,
    writeLedToFc: writeLedToFc,
    writeLedColors: writeLedColors,
    ledStateToCli: ledStateToCli,
    packLedU32: packLedU32,
    MSP: MSP,
    CLI_CMDS: CLI_CMDS
  };
})(window);