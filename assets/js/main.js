/* ============================================================
   钢铁与代码 · 站点脚本（原生 JS，零依赖，可 file:// 直接运行）
   功能：深浅色切换 / 文章搜索 / 标签筛选 / 阅读进度 / 字数统计
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 1. 深浅色主题 ---------- */
  var STORE_KEY = "steelcode-theme";
  var root = document.documentElement;

  function safeGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* 忽略：file:// 下隐私模式 */ } }

  var saved = safeGet(STORE_KEY);
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));

  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      safeSet(STORE_KEY, next);
      btn.setAttribute("aria-label", next === "dark" ? "切换到浅色模式" : "切换到深色模式");
    });
  });

  /* ---------- 2. 首页搜索 + 标签筛选 ---------- */
  var list = document.querySelector("[data-post-list]");
  if (list) {
    var cards = Array.prototype.slice.call(list.querySelectorAll("[data-post]"));
    var searchInput = document.querySelector("[data-search]");
    var chips = Array.prototype.slice.call(document.querySelectorAll("[data-tag-filter]"));
    var emptyHint = document.querySelector("[data-empty]");
    var activeTag = "全部";

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        activeTag = chip.getAttribute("data-tag-filter");
        chips.forEach(function (c) {
          c.setAttribute("aria-pressed", String(c === chip));
        });
        apply();
      });
    });

    function apply() {
      var q = (searchInput && searchInput.value || "").trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var haystack = card.getAttribute("data-keywords") || "";
        var tags = (card.getAttribute("data-tags") || "").split(",");
        var okTag = activeTag === "全部" || tags.indexOf(activeTag) !== -1;
        var okText = !q || haystack.toLowerCase().indexOf(q) !== -1;
        var ok = okTag && okText;
        card.classList.toggle("is-hidden", !ok);
        if (ok) { shown++; }
      });
      if (emptyHint) { emptyHint.classList.toggle("is-on", shown === 0); }
    }

    if (searchInput) {
      searchInput.addEventListener("input", apply);
      // 支持 index.html?q=关键词 直接带入搜索
      var m = /[?&]q=([^&]+)/.exec(window.location.search);
      if (m) { searchInput.value = decodeURIComponent(m[1].replace(/\+/g, " ")); }
    }
    // 支持 index.html?tag=标签 直接带入筛选（卡片上的标签可点）
    var tm = /[?&]tag=([^&]+)/.exec(window.location.search);
    if (tm) {
      var want = decodeURIComponent(tm[1].replace(/\+/g, " "));
      chips.forEach(function (c) {
        if (c.getAttribute("data-tag-filter") === want) { c.click(); }
      });
    }
    apply();
  }

  /* ---------- 3. 文章页阅读进度 ---------- */
  var bar = document.querySelector("[data-progress]");
  if (bar) {
    var update = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var ratio = max > 0 ? (h.scrollTop || document.body.scrollTop) / max : 0;
      bar.style.width = Math.min(100, Math.max(0, ratio * 100)).toFixed(2) + "%";
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- 4. 正文字数（中文按字符数计） ---------- */
  document.querySelectorAll("[data-count-words]").forEach(function (el) {
    var text = el.textContent.replace(/\s+/g, "");
    var n = text.length;
    var target = document.querySelector(el.getAttribute("data-count-words"));
    if (target && n > 0) {
      target.textContent = n >= 1000 ? (n / 1000).toFixed(1) + " 千字" : n + " 字";
    }
  });

  /* ---------- 5. 页脚年份 ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- 6. 文章目录（自动生成） ---------- */
  var prose = document.querySelector("#article-body");
  if (prose) {
    var heads = prose.querySelectorAll("h2");
    if (heads.length >= 4) {
      var toc = document.createElement("nav");
      toc.className = "toc";
      toc.setAttribute("aria-label", "本文目录");
      var label = document.createElement("b");
      label.textContent = "本文目录";
      toc.appendChild(label);
      var ol = document.createElement("ol");
      Array.prototype.forEach.call(heads, function (head, i) {
        if (!head.id) { head.id = "sec-" + (i + 1); }
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = "#" + head.id;
        a.textContent = head.textContent;
        li.appendChild(a);
        ol.appendChild(li);
      });
      toc.appendChild(ol);
      prose.parentNode.insertBefore(toc, prose);
    }
  }

  /* ---------- 7. 回到顶部 ---------- */
  var toTop = document.createElement("button");
  toTop.type = "button";
  toTop.className = "to-top";
  toTop.setAttribute("aria-label", "回到顶部");
  toTop.textContent = "\u2191";
  toTop.addEventListener("click", function () {
    try { window.scrollTo({ top: 0, behavior: "smooth" }); }
    catch (e) { window.scrollTo(0, 0); }
  });
  document.body.appendChild(toTop);
  var toggleTop = function () {
    toTop.classList.toggle("is-on", (window.pageYOffset || document.documentElement.scrollTop) > 600);
  };
  window.addEventListener("scroll", toggleTop, { passive: true });
  toggleTop();

  /* ---------- 8. 图集灯箱 ---------- */
  var shots = Array.prototype.slice.call(document.querySelectorAll("button[data-full]"));
  if (shots.length) {
    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "照片查看");
    box.innerHTML = '<img alt="" decoding="async">' +
      '<div class="lb-bar">' +
      '<button type="button" data-lb-prev>上一张</button>' +
      '<span data-lb-info aria-live="polite"></span>' +
      '<button type="button" data-lb-next>下一张</button>' +
      '<button type="button" data-lb-close>关闭</button>' +
      '</div>';
    document.body.appendChild(box);
    var lbImg = box.querySelector("img");
    var lbInfo = box.querySelector("[data-lb-info]");
    var lbClose = box.querySelector("[data-lb-close]");
    var cur = 0, lastFocus = null, token = 0;

    var show = function (i) {
      cur = (i + shots.length) % shots.length;
      var s = shots[cur];
      var cap = s.getAttribute("data-caption") || "";
      var jpg = s.getAttribute("data-full");
      var webp = s.getAttribute("data-full-webp") || jpg;
      lbInfo.textContent = cap;
      lbImg.alt = cap;
      token += 1;
      var mine = token;
      // 先试 WebP，失败回退 JPEG；用 token 避免快速翻页时的竞态
      var probe = new Image();
      probe.onload = function () { if (mine === token) { lbImg.src = webp; } };
      probe.onerror = function () { if (mine === token) { lbImg.src = jpg; } };
      probe.src = webp;
    };
    var open = function (i, from) {
      lastFocus = from || document.activeElement;
      show(i);
      box.classList.add("is-open");
      document.body.style.overflow = "hidden";
      lbClose.focus();
    };
    var close = function () {
      box.classList.remove("is-open");
      lbImg.removeAttribute("src");
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    };

    shots.forEach(function (s, i) { s.addEventListener("click", function () { open(i, s); }); });
    box.querySelector("[data-lb-prev]").addEventListener("click", function (e) { e.stopPropagation(); show(cur - 1); });
    box.querySelector("[data-lb-next]").addEventListener("click", function (e) { e.stopPropagation(); show(cur + 1); });
    lbClose.addEventListener("click", function (e) { e.stopPropagation(); close(); });
    box.addEventListener("click", function (e) { if (e.target === box) { close(); } });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) { return; }
      if (e.key === "Escape") { close(); }
      else if (e.key === "ArrowLeft") { show(cur - 1); }
      else if (e.key === "ArrowRight") { show(cur + 1); }
    });
  }

  /* ---------- 9. 图集按展区筛选 ---------- */
  var gbtns = Array.prototype.slice.call(document.querySelectorAll("[data-gallery-filter]"));
  if (gbtns.length) {
    var blocks = Array.prototype.slice.call(document.querySelectorAll("[data-section-block]"));
    gbtns.forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-gallery-filter");
        gbtns.forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        blocks.forEach(function (blk) {
          var hit = (key === "全部" || blk.getAttribute("data-section-block") === key);
          blk.style.display = hit ? "" : "none";
        });
      });
    });
  }
})();
