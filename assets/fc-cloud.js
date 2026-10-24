/* 嘉華 · 飛控備份上傳到 Google Apps Script（足球俱樂部資料庫） */
(function (global) {
  "use strict";

  var LS_URL = "fc_cloud_gas_url";
  var LS_TOKEN = "fc_cloud_gas_token";
  var LS_DRONE_ID = "fc_cloud_drone_id";
  var LS_DRONE_NAME = "fc_cloud_drone_name";
  var LS_UPLOADER = "fc_cloud_uploader";
  var LS_AUTO = "fc_cloud_auto_upload";

  function loadSettings() {
    return {
      url: localStorage.getItem(LS_URL) || "",
      token: localStorage.getItem(LS_TOKEN) || "chsh-fc-2026",
      droneId: localStorage.getItem(LS_DRONE_ID) || "",
      droneName: localStorage.getItem(LS_DRONE_NAME) || "",
      uploader: localStorage.getItem(LS_UPLOADER) || "",
      autoUpload: localStorage.getItem(LS_AUTO) === "1"
    };
  }

  function saveSettings(s) {
    try {
      localStorage.setItem(LS_URL, s.url || "");
      localStorage.setItem(LS_TOKEN, s.token || "");
      localStorage.setItem(LS_DRONE_ID, s.droneId || "");
      localStorage.setItem(LS_DRONE_NAME, s.droneName || "");
      localStorage.setItem(LS_UPLOADER, s.uploader || "");
      localStorage.setItem(LS_AUTO, s.autoUpload ? "1" : "0");
    } catch (e) {}
  }

  function parseBoardFromDump(dump) {
    dump = dump || "";
    var board = (dump.match(/board_name\s*=\s*([^\r\n#]+)/i) || [])[1] || "";
    var ver = (dump.match(/#\s*Betaflight\s*\/\s*\S+\s+(\d[\w.\-]+)/i) ||
      dump.match(/version\s+(\d[\w.\-]+)/i) || [])[1] || "";
    var variant = (dump.match(/#\s*(BTFL|INAV|EMUF)\b/i) || [])[1] || "BTFL";
    var target = (dump.match(/Betaflight\s*\/\s*(\S+)/i) || [])[1] || "";
    return {
      board_name: String(board).trim(),
      fc_version: String(ver).trim(),
      fc_variant: String(variant).trim().toUpperCase(),
      mcu_target: String(target).trim()
    };
  }

  function extractMeta(backup, settings) {
    var dump = (backup.cli && (backup.cli["dump all"] || backup.cli["diff all"])) || "";
    var parsed = parseBoardFromDump(dump);
    var mspBoard = "";
    var mspName = "";
    var mspVar = "";
    var mspVer = "";
    try {
      if (backup.msp && backup.msp.BOARD_INFO && backup.msp.BOARD_INFO.text) mspBoard = backup.msp.BOARD_INFO.text;
      if (backup.msp && backup.msp.NAME && backup.msp.NAME.text) mspName = backup.msp.NAME.text;
      if (backup.msp && backup.msp.FC_VARIANT && backup.msp.FC_VARIANT.text) mspVar = backup.msp.FC_VARIANT.text;
      if (backup.msp && backup.msp.FC_VERSION && backup.msp.FC_VERSION.text) mspVer = backup.msp.FC_VERSION.text;
    } catch (e) {}

    var df = (backup.meta && backup.meta.dataflash) || {};
    var bbBytes = (backup.blackbox && backup.blackbox.bytes) || 0;

    return {
      backup_id: backup.id,
      created_at: new Date(backup.createdAt || Date.now()).toISOString(),
      created_local: backup.createdLocal || "",
      drone_id: settings.droneId || "",
      drone_name: settings.droneName || mspName || "",
      board_name: parsed.board_name || mspBoard || "",
      fc_variant: parsed.fc_variant || mspVar || "",
      fc_version: parsed.fc_version || mspVer || "",
      mcu_target: parsed.mcu_target || "",
      dump_set_count: (backup.meta && backup.meta.dumpSetCount) || 0,
      cli_cmd_count: (backup.meta && backup.meta.cliCommands) || 0,
      msp_ok_count: (backup.meta && backup.meta.mspOk) || 0,
      sensor_gyro: "Y",
      sensor_acc: "Y",
      sensor_baro: "",
      sensor_mag: "",
      sensor_gps: "",
      dataflash_used: df.usedSize || 0,
      blackbox_bytes: bbBytes,
      source: "analyzer",
      uploader: settings.uploader || "",
      notes: ""
    };
  }

  function blackboxToBase64(backup) {
    if (!backup.blackbox || !backup.blackbox.chunks || !backup.blackbox.chunks.length) return "";
    // 過大不傳（Apps Script／請求限制）；約 4.5MB base64 上限保守切
    var joined = backup.blackbox.chunks.join("");
    if (joined.length > 6000000) return "";
    return joined;
  }

  async function postAction(url, token, payload) {
    if (!url) throw new Error("尚未填寫 Apps Script 網頁應用程式網址");
    var body = Object.assign({ token: token }, payload);
    var res = await fetch(url, {
      method: "POST",
      // text/plain 避免 CORS preflight；GAS 仍可 JSON.parse
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
      redirect: "follow"
    });
    var text = await res.text();
    var data;
    try { data = JSON.parse(text); } catch (e) {
      throw new Error("雲端回應不是 JSON（請確認已部署為「任何人」可存取）");
    }
    if (!data.ok) throw new Error(data.error || "雲端回傳失敗");
    return data;
  }

  async function ping(settings) {
    return postAction(settings.url, settings.token, { action: "ping" });
  }

  async function uploadBackup(backup, settings, onProgress) {
    settings = settings || loadSettings();
    onProgress && onProgress("準備上傳雲端資料庫…");
    var meta = extractMeta(backup, settings);
    var files = {
      dump_all: (backup.cli && backup.cli["dump all"]) || "",
      diff_all: (backup.cli && backup.cli["diff all"]) || "",
      status: (backup.cli && backup.cli.status) || "",
      json: JSON.stringify({
        id: backup.id,
        createdAt: backup.createdAt,
        createdLocal: backup.createdLocal,
        meta: backup.meta,
        cliKeys: backup.cli ? Object.keys(backup.cli) : [],
        mspKeys: backup.msp ? Object.keys(backup.msp) : []
      }, null, 2),
      blackbox_base64: blackboxToBase64(backup)
    };
    onProgress && onProgress("上傳至 Google 試算表／雲端硬碟…");
    var result = await postAction(settings.url, settings.token, {
      action: "upload_backup",
      meta: meta,
      files: files
    });
    onProgress && onProgress("雲端上傳完成");
    return result;
  }

  global.FcCloud = {
    loadSettings: loadSettings,
    saveSettings: saveSettings,
    ping: ping,
    uploadBackup: uploadBackup,
    extractMeta: extractMeta
  };
})(window);
