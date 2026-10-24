/**
 * 嘉華 · 足球俱樂部資料庫（Google Apps Script）
 * ------------------------------------------------
 * 用法：
 * 1. 整個檔案貼到 Apps Script「程式碼.gs」
 * 2. 執行一次 setupDatabase（授權試算表＋雲端硬碟）
 * 3. 部署 → 新增部署 → 類型「網頁應用程式」
 *    - 執行身分：我
 *    - 具有存取權的使用者：任何人
 * 4. 複製網頁應用程式網址，貼到「配置分析」頁的雲端設定
 *
 * 分頁（格子）與欄位名稱見下方 SCHEMA；執行 setup 會自動建好表頭。
 */

var DB_NAME = "足球俱樂部資料庫";
var DRIVE_FOLDER_NAME = "足球無人機_飛控備份";
var SCRIPT_PROP = PropertiesService.getScriptProperties();

/** 上傳密碼：請改成隊內自訂（分析器要填同一個） */
var UPLOAD_TOKEN = "chsh-fc-2026";

// ========== 欄位設計（A 列＝表頭，一行一筆） ==========
var SHEETS = {
  // 機隊主檔：一台球機一列
  fleet: {
    name: "機隊",
    headers: [
      "drone_id",        // A 機號ID（主鍵，如 ATK-01）
      "drone_name",      // B 機名
      "role",            // C 定位：攻擊／防守／練習／備用
      "board_name",      // D 飛控板型
      "fc_variant",      // E 韌體系列（BTFL…）
      "fc_version",      // F 韌體版本
      "status",          // G 狀態：服役／維修／退役
      "owner",           // H 負責人
      "notes",           // I 備註
      "last_backup_id",  // J 最近備份ID
      "last_backup_at",  // K 最近備份時間
      "created_at",      // L 建檔時間
      "updated_at"       // M 更新時間
    ]
  },
  // 每次完整備份一列；大檔放 Drive，這裡只存連結
  backups: {
    name: "備份紀錄",
    headers: [
      "backup_id",           // A 備份ID
      "created_at",          // B 備份時間 ISO
      "created_local",       // C 本機時間字串
      "drone_id",            // D 機號ID
      "drone_name",          // E 機名
      "board_name",          // F 飛控板型
      "fc_variant",          // G 韌體系列
      "fc_version",          // H 韌體版本
      "mcu_target",          // I MCU／Target
      "dump_set_count",      // J dump 內 set 筆數
      "cli_cmd_count",       // K CLI 指令數
      "msp_ok_count",        // L MSP 成功數
      "sensor_gyro",         // M 陀螺儀 Y/N
      "sensor_acc",          // N 加速度計 Y/N
      "sensor_baro",         // O 氣壓計 Y/N
      "sensor_mag",          // P 磁力計 Y/N
      "sensor_gps",          // Q GPS Y/N
      "dataflash_used",      // R Dataflash 已用 bytes
      "blackbox_bytes",      // S 黑盒子檔大小
      "file_dump_url",       // T dump-all 雲端連結
      "file_diff_url",       // U diff-all 雲端連結
      "file_status_url",     // V status 雲端連結
      "file_json_url",       // W 完整 JSON 連結
      "file_blackbox_url",   // X 黑盒子 .bbl 連結
      "source",              // Y 來源 analyzer／auto／manual
      "uploader",            // Z 上傳者
      "notes",               // AA 備註
      "ok"                   // AB 是否成功 TRUE/FALSE
    ]
  },
  // 即時監控抽樣（選用）：插上偵測傳感器時可寫入
  sensors: {
    name: "傳感器日誌",
    headers: [
      "log_id",          // A
      "logged_at",       // B
      "drone_id",        // C
      "drone_name",      // D
      "gyro",            // E 正常／未偵測／讀取中
      "acc",             // F
      "baro",            // G
      "mag",             // H
      "gps",             // I
      "sensor_bits",     // J 原始 bitmask
      "cycle_us",        // K 迴圈 µs
      "cpu_load",        // L CPU %
      "vbat",            // M 電壓
      "armed",           // N
      "note"             // O
    ]
  },
  // 系統設定（單列）
  sys: {
    name: "_系統",
    headers: [
      "key",
      "value",
      "note"
    ]
  }
};

function doGet(e) {
  return jsonOut({
    ok: true,
    service: DB_NAME,
    version: 1,
    actions: ["setup", "ping", "upload_backup", "upsert_drone", "list_backups", "log_sensors"],
    sheets: Object.keys(SHEETS).map(function (k) {
      return { id: k, name: SHEETS[k].name, columns: SHEETS[k].headers };
    })
  });
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    if (!checkToken(body.token)) {
      return jsonOut({ ok: false, error: "token 錯誤" });
    }
    var action = String(body.action || "");
    if (action === "ping") return jsonOut({ ok: true, pong: true, at: new Date().toISOString() });
    if (action === "setup") return jsonOut(setupDatabase());
    if (action === "upsert_drone") return jsonOut(upsertDrone(body.drone || {}));
    if (action === "upload_backup") return jsonOut(uploadBackup(body));
    if (action === "list_backups") return jsonOut(listBackups(body.limit || 30));
    if (action === "log_sensors") return jsonOut(logSensors(body.log || {}));
    return jsonOut({ ok: false, error: "未知 action：" + action });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function checkToken(token) {
  var expected = SCRIPT_PROP.getProperty("UPLOAD_TOKEN") || UPLOAD_TOKEN;
  return String(token || "") === String(expected);
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 手動執行一次：建立試算表、分頁表頭、Drive 資料夾 */
function setupDatabase() {
  var ss = getOrCreateSpreadsheet_();
  Object.keys(SHEETS).forEach(function (key) {
    ensureSheet_(ss, SHEETS[key].name, SHEETS[key].headers);
  });
  var folder = getOrCreateFolder_();
  setSys_(ss, "spreadsheet_id", ss.getId(), "試算表 ID");
  setSys_(ss, "spreadsheet_url", ss.getUrl(), "試算表網址");
  setSys_(ss, "drive_folder_id", folder.getId(), "備份檔資料夾");
  setSys_(ss, "drive_folder_url", folder.getUrl(), "資料夾網址");
  setSys_(ss, "upload_token_hint", "請在指令碼屬性或 UPLOAD_TOKEN 常數設定", "安全");
  SCRIPT_PROP.setProperty("SPREADSHEET_ID", ss.getId());
  SCRIPT_PROP.setProperty("DRIVE_FOLDER_ID", folder.getId());
  if (!SCRIPT_PROP.getProperty("UPLOAD_TOKEN")) {
    SCRIPT_PROP.setProperty("UPLOAD_TOKEN", UPLOAD_TOKEN);
  }
  return {
    ok: true,
    spreadsheetUrl: ss.getUrl(),
    folderUrl: folder.getUrl(),
    sheets: Object.keys(SHEETS).map(function (k) { return SHEETS[k].name; })
  };
}

function getOrCreateSpreadsheet_() {
  var id = SCRIPT_PROP.getProperty("SPREADSHEET_ID");
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch (e) {}
  }
  var ss = SpreadsheetApp.create(DB_NAME);
  SCRIPT_PROP.setProperty("SPREADSHEET_ID", ss.getId());
  return ss;
}

function getOrCreateFolder_() {
  var id = SCRIPT_PROP.getProperty("DRIVE_FOLDER_ID");
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) {}
  }
  var it = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
  SCRIPT_PROP.setProperty("DRIVE_FOLDER_ID", folder.getId());
  return folder;
}

function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var need = headers.length;
  sh.getRange(1, 1, 1, need).setValues([headers]);
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, need).setFontWeight("bold");
  return sh;
}

function setSys_(ss, key, value, note) {
  var sh = ensureSheet_(ss, SHEETS.sys.name, SHEETS.sys.headers);
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sh.getRange(i + 1, 2, 1, 2).setValues([[value, note || ""]]);
      return;
    }
  }
  sh.appendRow([key, value, note || ""]);
}

function sheet_(name) {
  var ss = getOrCreateSpreadsheet_();
  var def = null;
  Object.keys(SHEETS).forEach(function (k) {
    if (SHEETS[k].name === name) def = SHEETS[k];
  });
  if (!def) throw new Error("未知分頁：" + name);
  return ensureSheet_(ss, def.name, def.headers);
}

function upsertDrone(d) {
  var sh = sheet_(SHEETS.fleet.name);
  var id = String(d.drone_id || "").trim();
  if (!id) throw new Error("缺少 drone_id");
  var now = new Date().toISOString();
  var row = [
    id,
    d.drone_name || "",
    d.role || "",
    d.board_name || "",
    d.fc_variant || "",
    d.fc_version || "",
    d.status || "服役",
    d.owner || "",
    d.notes || "",
    d.last_backup_id || "",
    d.last_backup_at || "",
    d.created_at || now,
    now
  ];
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      row[11] = data[i][11] || now; // 保留 created_at
      sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { ok: true, updated: true, drone_id: id };
    }
  }
  sh.appendRow(row);
  return { ok: true, created: true, drone_id: id };
}

function uploadBackup(body) {
  var meta = body.meta || {};
  var files = body.files || {};
  var backupId = String(meta.backup_id || ("fc_" + new Date().toISOString().replace(/[:.]/g, "-")));
  var folder = getOrCreateFolder_();
  var sub = folder.createFolder(backupId);

  function putText(name, text) {
    if (!text) return "";
    var f = sub.createFile(name, String(text), MimeType.PLAIN_TEXT);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return f.getUrl();
  }

  function putBase64(name, b64, mime) {
    if (!b64) return "";
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime || "application/octet-stream", name);
    var f = sub.createFile(blob);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return f.getUrl();
  }

  var urls = {
    dump: putText(backupId + "_dump-all.txt", files.dump_all),
    diff: putText(backupId + "_diff-all.txt", files.diff_all),
    status: putText(backupId + "_status.txt", files.status),
    json: putText(backupId + "_full-backup.json", files.json || JSON.stringify(meta)),
    blackbox: files.blackbox_base64
      ? putBase64(backupId + "_blackbox.bbl", files.blackbox_base64, "application/octet-stream")
      : ""
  };

  var sh = sheet_(SHEETS.backups.name);
  var row = [
    backupId,
    meta.created_at || new Date().toISOString(),
    meta.created_local || "",
    meta.drone_id || "",
    meta.drone_name || "",
    meta.board_name || "",
    meta.fc_variant || "",
    meta.fc_version || "",
    meta.mcu_target || "",
    meta.dump_set_count || 0,
    meta.cli_cmd_count || 0,
    meta.msp_ok_count || 0,
    yn_(meta.sensor_gyro),
    yn_(meta.sensor_acc),
    yn_(meta.sensor_baro),
    yn_(meta.sensor_mag),
    yn_(meta.sensor_gps),
    meta.dataflash_used || 0,
    meta.blackbox_bytes || 0,
    urls.dump,
    urls.diff,
    urls.status,
    urls.json,
    urls.blackbox,
    meta.source || "analyzer",
    meta.uploader || "",
    meta.notes || "",
    true
  ];
  sh.appendRow(row);

  if (meta.drone_id) {
    upsertDrone({
      drone_id: meta.drone_id,
      drone_name: meta.drone_name,
      board_name: meta.board_name,
      fc_variant: meta.fc_variant,
      fc_version: meta.fc_version,
      last_backup_id: backupId,
      last_backup_at: meta.created_at || new Date().toISOString(),
      status: "服役"
    });
  }

  return {
    ok: true,
    backup_id: backupId,
    folder_url: sub.getUrl(),
    files: urls
  };
}

function yn_(v) {
  if (v === true || v === "Y" || v === "y" || v === 1 || v === "1") return "Y";
  if (v === false || v === "N" || v === "n" || v === 0 || v === "0") return "N";
  return v == null || v === "" ? "" : String(v);
}

function listBackups(limit) {
  var sh = sheet_(SHEETS.backups.name);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return { ok: true, rows: [] };
  var headers = data[0];
  var rows = [];
  for (var i = data.length - 1; i >= 1 && rows.length < limit; i--) {
    var obj = {};
    for (var c = 0; c < headers.length; c++) obj[headers[c]] = data[i][c];
    rows.push(obj);
  }
  return { ok: true, rows: rows };
}

function logSensors(log) {
  var sh = sheet_(SHEETS.sensors.name);
  var id = log.log_id || ("sns_" + Date.now());
  sh.appendRow([
    id,
    log.logged_at || new Date().toISOString(),
    log.drone_id || "",
    log.drone_name || "",
    log.gyro || "",
    log.acc || "",
    log.baro || "",
    log.mag || "",
    log.gps || "",
    log.sensor_bits || "",
    log.cycle_us || "",
    log.cpu_load || "",
    log.vbat || "",
    log.armed || "",
    log.note || ""
  ]);
  return { ok: true, log_id: id };
}
