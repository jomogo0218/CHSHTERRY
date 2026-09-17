/* 配備手冊共用腳本：導覽、回到頂部、舊 hash 轉跳 */
(function () {
  "use strict";

  var HASH_MAP = {
    home: "index.html",
    motor: "pages/馬達.html",
    batt: "pages/電池.html",
    prop: "pages/螺旋槳.html",
    build: "pages/組裝.html",
    fly: "pages/續航.html",
    fc: "pages/飛控硬體.html",
    bf: "pages/飛控設定.html",
    bfsim: "bfsim.html",
    led: "pages/LED.html",
    rule: "pages/規則檢錄.html",
    brushed: "pages/有刷空心杯.html",
    coreless: "pages/有刷空心杯.html",
    video: "pages/影片欣賞.html",
    videos: "pages/影片欣賞.html",
    lesson: "index.html#lesson"
  };

  var path = location.pathname || "";
  var isIndex =
    /\/index\.html?$/i.test(path) ||
    /\/$/.test(path) ||
    /\/CHSHTERRY\/?$/i.test(path);

  if (isIndex) {
    var params = new URLSearchParams(location.search);
    var tab = params.get("tab");
    var hashKey = (location.hash || "").replace(/^#/, "").split(/[/?]/)[0];
    // 略過頁內錨點（如 #main），只處理舊 SPA 分頁名
    if (hashKey === "main") hashKey = "";
    var key = tab || hashKey;
    if (key) {
      var base = key.split("-")[0];
      var target = HASH_MAP[key] || HASH_MAP[base];
      if (target && target !== "index.html") {
        var anchor = "";
        if (hashKey && hashKey.indexOf("-") > 0) {
          anchor = "#" + hashKey;
        } else if (key !== base && !HASH_MAP[key] && !tab) {
          anchor = "#" + key;
        }
        location.replace(target + anchor);
        return;
      }
    }
  }

  var nav = document.getElementById("siteNav");
  var toggle = document.getElementById("navToggle");
  if (toggle && nav) {
    toggle.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("open")) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  }

  var back = document.getElementById("back-top");
  if (back) {
    window.addEventListener(
      "scroll",
      function () {
        back.classList.toggle("show", window.scrollY > 400);
      },
      { passive: true }
    );
    back.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
