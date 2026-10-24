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

  // ---------- 全站統一導覽（唯一規格） ----------
  // 有 #siteNav 的頁面一律注入同一組連結；路徑依所在目錄自動加 ../
  var NAV_SPEC = [
    { type: "link", href: "index.html", label: "首頁", match: /(^|\/)index\.html?$/i },
    { type: "label", text: "認識" },
    { type: "link", href: "pages/影片欣賞.html", label: "影片欣賞" },
    { type: "link", href: "pages/新手入門.html", label: "新手入門" },
    { type: "link", href: "pages/足球無人機技術全解簡報.html", label: "技術全解" },
    { type: "label", text: "規則" },
    { type: "link", href: "pages/規則檢錄.html", label: "規則檢錄" },
    { type: "link", href: "pages/FAI_F9A_2026_繁中譯本.html", label: "FAI 譯本" },
    { type: "link", href: "pages/有刷空心杯.html", label: "有刷／空心杯" },
    { type: "label", text: "配備" },
    { type: "link", href: "pages/馬達.html", label: "馬達" },
    { type: "link", href: "pages/電池.html", label: "電池" },
    { type: "link", href: "pages/螺旋槳.html", label: "螺旋槳" },
    { type: "label", text: "整機" },
    { type: "link", href: "pages/組裝.html", label: "組裝" },
    { type: "link", href: "pages/續航.html", label: "續航" },
    { type: "label", text: "系統" },
    { type: "link", href: "pages/飛控硬體.html", label: "飛控硬體" },
    { type: "link", href: "pages/飛控設定.html", label: "飛控設定" },
    { type: "link", href: "pages/LED.html", label: "LED" },
    { type: "link", href: "pages/遙控器採購分析.html", label: "遙控器" },
    { type: "link", href: "bfsim.html", label: "設定模擬" },
    { type: "link", href: "betaflight-analyzer.html", label: "配置分析" },
    { type: "label", text: "上場" },
    { type: "link", href: "pages/上場清單.html", label: "上場清單" },
    { type: "label", text: "圖鑑" },
    { type: "link", href: "pages/飛控AIO產品圖鑑.html", label: "AIO 圖鑑" },
    { type: "link", href: "pages/電池產品圖鑑.html", label: "電池圖鑑" }
  ];

  function navDepthPrefix() {
    // pages/ 底下 → ../ ；根目錄 → 空
    if (/\/pages\//i.test(path) || /\\pages\\/i.test(path)) return "../";
    return "";
  }

  function resolveNavHref(href, prefix) {
    if (href.indexOf("pages/") === 0 && prefix === "../") {
      return href.slice("pages/".length); // pages/馬達.html → 馬達.html
    }
    return prefix + href;
  }

  function currentFileName() {
    var parts = path.replace(/\\/g, "/").split("/");
    var last = parts[parts.length - 1] || "";
    if (!last || last.indexOf(".") < 0) return "index.html";
    try { return decodeURIComponent(last); } catch (e) { return last; }
  }

  function fillSiteNav(navEl) {
    if (!navEl) return;
    var prefix = navDepthPrefix();
    var file = currentFileName();
    var html = "";
    for (var i = 0; i < NAV_SPEC.length; i++) {
      var item = NAV_SPEC[i];
      if (item.type === "label") {
        html += '<span class="nav-label">' + item.text + "</span>";
        continue;
      }
      var href = resolveNavHref(item.href, prefix);
      var on = false;
      if (item.match) {
        on = item.match.test(path) || (isIndex && item.href === "index.html");
      } else {
        var targetName = item.href.replace(/^pages\//, "");
        on = file === targetName || file === item.href;
      }
      html +=
        '<a href="' + href + '"' + (on ? ' class="on"' : "") + ">" + item.label + "</a>";
    }
    navEl.innerHTML = html;
  }

  var nav = document.getElementById("siteNav");
  var toggle = document.getElementById("navToggle");
  fillSiteNav(nav);
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
