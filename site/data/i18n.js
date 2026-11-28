(() => {
  "use strict";

  const LANGUAGES = [
    { code: "en", short: "EN", name: "English", dir: "ltr" },
    { code: "zh-CN", short: "简", name: "简体中文", dir: "ltr" },
    { code: "zh-TW", short: "繁", name: "繁體中文", dir: "ltr" },
    { code: "ja", short: "JA", name: "日本語", dir: "ltr" },
    { code: "ko", short: "KO", name: "한국어", dir: "ltr" },
    { code: "fr", short: "FR", name: "Français", dir: "ltr" },
    { code: "es", short: "ES", name: "Español", dir: "ltr" },
    { code: "de", short: "DE", name: "Deutsch", dir: "ltr" },
    { code: "pt-BR", short: "PT", name: "Português", dir: "ltr" },
    { code: "ru", short: "RU", name: "Русский", dir: "ltr" },
    { code: "ar", short: "AR", name: "العربية", dir: "rtl" },
    { code: "it", short: "IT", name: "Italiano", dir: "ltr" },
    { code: "nl", short: "NL", name: "Nederlands", dir: "ltr" },
    { code: "pl", short: "PL", name: "Polski", dir: "ltr" },
    { code: "tr", short: "TR", name: "Türkçe", dir: "ltr" },
    { code: "vi", short: "VI", name: "Tiếng Việt", dir: "ltr" },
    { code: "id", short: "ID", name: "Bahasa Indonesia", dir: "ltr" },
    { code: "hi", short: "HI", name: "हिन्दी", dir: "ltr" }
  ];

  const VALID_CODES = new Set(LANGUAGES.map((l) => l.code));
  const cache = new Map();
  const inFlight = new Map();
  const memesCache = new Map();
  const memesInFlight = new Map();

  function activateAsyncFonts() {
    document.querySelectorAll("link[data-async-font]").forEach((l) => {
      if (l.media !== "print") return;
      const enable = () => {
        if (l.media === "print") l.media = "all";
      };
      if (l.sheet) {
        enable();
      } else {
        l.addEventListener("load", enable, { once: true });
        l.addEventListener("error", enable, { once: true });
        if (document.readyState === "complete") {
          enable();
        } else {
          window.addEventListener("load", enable, { once: true });
        }
      }
    });
  }
  activateAsyncFonts();

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isolateHandlesHtml(escaped) {
    return String(escaped || "").replace(/(^|[^A-Za-z0-9_.])(@[A-Za-z0-9_]+)/g, '$1<bdi dir="ltr">$2</bdi>');
  }

  function escapeBidi(str) {
    return isolateHandlesHtml(escapeHtml(str));
  }

  function pickMemeText(item, langCode, overlay) {
    if (!item) return { title: "", note: "" };
    const code = normalizeLang(langCode) || "en";
    if (code === "zh-CN") {
      return { title: item.titleZh || item.titleEn || "", note: item.noteZh || item.noteEn || "" };
    }
    const ov = overlay && overlay[item.id];
    if (code === "zh-TW") {
      return {
        title: (ov && ov.title) || item.titleZh || item.titleEn || "",
        note: (ov && ov.note) || item.noteZh || item.noteEn || ""
      };
    }
    return {
      title: (ov && ov.title) || item.titleEn || "",
      note: (ov && ov.note) || item.noteEn || ""
    };
  }

  function trapFocus(dialogEl, e) {
    if (!dialogEl || e.key !== "Tab") return;
    const focusables = Array.from(
      dialogEl.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.hidden && el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && (document.activeElement === first || !dialogEl.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function normalizeLang(raw) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (VALID_CODES.has(s)) return s;
    const low = s.toLowerCase();
    if (low === "zh" || low.startsWith("zh-cn") || low.startsWith("zh-sg") || low.startsWith("zh-hans")) return "zh-CN";
    if (low.startsWith("zh-tw") || low.startsWith("zh-hk") || low.startsWith("zh-mo") || low.startsWith("zh-hant")) return "zh-TW";
    if (low.startsWith("pt")) return "pt-BR";
    const base = low.split("-")[0];
    for (const l of LANGUAGES) {
      if (l.code.toLowerCase() === base) return l.code;
    }
    return null;
  }

  function detectInitialLang() {
    // 1. Explicit ?lang= applies only to the current view (never overwrites saved choice).
    try {
      const p = new URLSearchParams(window.location.search).get("lang");
      const fromParam = normalizeLang(p);
      if (fromParam) return fromParam;
    } catch (_) {}
    // 2. Saved user selection from the language switcher.
    try {
      const saved = normalizeLang(localStorage.getItem("temu3-lang"));
      if (saved) return saved;
    } catch (_) {}
    // 3. Browser preferred language list; falls back strictly to English ("en").
    try {
      const navList = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
      for (const n of navList) {
        const hit = normalizeLang(n);
        if (hit) return hit;
      }
    } catch (_) {}
    return "en";
  }

  function deepMergeDefaults(baseObj, overrideObj) {
    if (!baseObj || typeof baseObj !== "object") return overrideObj;
    if (!overrideObj || typeof overrideObj !== "object") return baseObj;
    const out = Array.isArray(baseObj) ? baseObj.slice() : { ...baseObj };
    for (const k of Object.keys(overrideObj)) {
      const bv = out[k];
      const ov = overrideObj[k];
      if (bv && ov && typeof bv === "object" && typeof ov === "object" && !Array.isArray(bv) && !Array.isArray(ov)) {
        out[k] = deepMergeDefaults(bv, ov);
      } else if (ov !== undefined && ov !== null && ov !== "") {
        out[k] = ov;
      }
    }
    return out;
  }

  async function loadBundle(code, dataBase) {
    const norm = normalizeLang(code) || "en";
    if (cache.has(norm)) return cache.get(norm);
    const base = dataBase.endsWith("/") ? dataBase : dataBase + "/";
    const key = `${base}::${norm}`;
    if (inFlight.has(key)) return inFlight.get(key);
    const pending = (async () => {
      try {
        const [res, enObj] = await Promise.all([
          fetch(`${base}i18n/${norm}.json?v=16`),
          norm !== "en" ? loadBundle("en", base) : Promise.resolve(null)
        ]);
        if (!res.ok) throw new Error("fetch failed");
        let obj = await res.json();
        if (norm !== "en" && enObj) {
          obj = deepMergeDefaults(enObj, obj);
        }
        cache.set(norm, obj);
        return obj;
      } catch (_) {
        if (norm !== "en") return loadBundle("en", base);
        return null;
      } finally {
        inFlight.delete(key);
      }
    })();
    inFlight.set(key, pending);
    return pending;
  }

  async function loadMemesOverlay(code, dataBase) {
    const norm = normalizeLang(code) || "en";
    if (norm === "en" || norm === "zh-CN") return null;
    const base = dataBase.endsWith("/") ? dataBase : dataBase + "/";
    const key = `${base}::${norm}`;
    if (memesCache.has(key)) return memesCache.get(key);
    if (memesInFlight.has(key)) return memesInFlight.get(key);
    const pending = (async () => {
      try {
        const res = await fetch(`${base}memes-i18n/${encodeURIComponent(norm)}.json?v=2`);
        if (!res.ok) throw new Error("fetch failed");
        const obj = await res.json();
        const items = (obj && obj.items && typeof obj.items === "object") ? obj.items : null;
        memesCache.set(key, items);
        return items;
      } catch (_) {
        memesCache.set(key, null);
        return null;
      } finally {
        memesInFlight.delete(key);
      }
    })();
    memesInFlight.set(key, pending);
    return pending;
  }

  function getKey(bundle, path) {
    if (!bundle || !path) return "";
    const parts = path.split(".");
    let cur = bundle;
    for (const part of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) {
        cur = cur[part];
      } else {
        return "";
      }
    }
    return typeof cur === "string" ? cur : "";
  }

  function fmt(template, vars) {
    if (!template) return "";
    return String(template).replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? String(vars[k]) : ""));
  }

  function ensureStyles() {
    if (document.getElementById("t3LangStyles")) return;
    const style = document.createElement("style");
    style.id = "t3LangStyles";
    style.textContent = `
      .t3-lang-wrap {
        position: relative;
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
      }
      .t3-lang-trigger {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 10px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.045);
        color: #f5f5f5;
        font: inherit;
        font-size: 12.5px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: background 140ms ease, border-color 140ms ease;
      }
      .t3-lang-trigger:hover,
      .t3-lang-wrap.is-open .t3-lang-trigger {
        background: rgba(255, 255, 255, 0.09);
        border-color: rgba(255, 255, 255, 0.26);
      }
      .t3-lang-trigger:focus-visible {
        outline: 2px solid #93c5fd;
        outline-offset: 2px;
      }
      .t3-lang-wrap.is-light .t3-lang-trigger:focus-visible {
        outline: 2px solid #0b57d0;
        outline-offset: 2px;
      }
      @media (prefers-reduced-motion: reduce) {
        .t3-lang-trigger, .t3-lang-chev, .t3-lang-opt { transition: none; }
        .t3-lang-menu { animation: none; }
      }
      .t3-lang-globe {
        width: 14px;
        height: 14px;
        opacity: 0.78;
        flex-shrink: 0;
      }
      .t3-lang-chev {
        width: 13px;
        height: 13px;
        opacity: 0.65;
        flex-shrink: 0;
        transition: transform 160ms ease;
      }
      .t3-lang-wrap.is-open .t3-lang-chev {
        transform: rotate(180deg);
      }
      .t3-lang-menu {
        position: absolute;
        top: calc(100% + 8px);
        inset-inline-end: 0;
        z-index: 120;
        width: 316px;
        max-width: calc(100vw - 20px);
        max-height: min(420px, 72dvh);
        overflow-y: auto;
        padding: 6px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(13, 13, 17, 0.985);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 2px;
        animation: t3LangPop 130ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .t3-lang-menu[hidden] {
        display: none !important;
      }
      @keyframes t3LangPop {
        from { opacity: 0; transform: translateY(-4px) scale(0.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .t3-lang-opt {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        width: 100%;
        min-height: 35px;
        padding: 6px 9px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: #d4d4d8;
        font: inherit;
        font-size: 13px;
        font-weight: 450;
        text-align: start;
        cursor: pointer;
        transition: background 110ms ease, color 110ms ease;
      }
      .t3-lang-opt:hover,
      .t3-lang-opt:focus-visible {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
        outline: none;
      }
      .t3-lang-opt.is-active {
        background: rgba(75, 124, 243, 0.18);
        color: #ffffff;
        font-weight: 600;
      }
      .t3-lang-opt-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .t3-lang-opt-meta {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 10.5px;
        color: #71717a;
      }
      .t3-lang-opt.is-active .t3-lang-opt-meta {
        color: #93c5fd;
      }
      .t3-lang-check {
        width: 13px;
        height: 13px;
        color: #60a5fa;
      }

      /* Light (Tmail / Gmail Material) Theme */
      .t3-lang-wrap.is-light .t3-lang-trigger {
        height: 34px;
        padding: 0 11px;
        border-radius: 999px;
        border: 1px solid #dadce0;
        background: #ffffff;
        color: #3c4043;
      }
      .t3-lang-wrap.is-light .t3-lang-trigger:hover,
      .t3-lang-wrap.is-light.is-open .t3-lang-trigger {
        background: #f1f3f4;
        border-color: #c6cacf;
      }
      .t3-lang-wrap.is-light .t3-lang-menu {
        border-radius: 14px;
        border: 1px solid #dadce0;
        background: #ffffff;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
      }
      .t3-lang-wrap.is-light .t3-lang-opt {
        color: #3c4043;
      }
      .t3-lang-wrap.is-light .t3-lang-opt:hover,
      .t3-lang-wrap.is-light .t3-lang-opt:focus-visible {
        background: #f1f3f4;
        color: #202124;
      }
      .t3-lang-wrap.is-light .t3-lang-opt.is-active {
        background: #e8f0fe;
        color: #0b57d0;
      }
      .t3-lang-wrap.is-light .t3-lang-opt-meta {
        color: #80868b;
      }
      .t3-lang-wrap.is-light .t3-lang-opt.is-active .t3-lang-opt-meta,
      .t3-lang-wrap.is-light .t3-lang-check {
        color: #0b57d0;
      }

      @media (max-width: 640px) {
        .t3-lang-trigger {
          height: 32px;
          padding: 0 9px;
          font-size: 12.5px;
        }
        .t3-lang-wrap.is-light .t3-lang-trigger {
          height: 32px;
          padding: 0 9px;
          font-size: 12px;
        }
        .t3-lang-menu {
          width: min(304px, calc(100vw - 20px));
        }
        .t3-lang-opt {
          min-height: 38px;
          padding: 7px 9px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function mountLangSelect(selectEl, initialCode, onChange) {
    if (!selectEl) return;
    ensureStyles();

    const isLight = selectEl.classList.contains("tmail-lang-select");
    const hostLabel = selectEl.closest("label.lang-picker, label.lang-picker-pill");
    let current = normalizeLang(initialCode) || "en";

    const wrap = document.createElement("div");
    wrap.className = `t3-lang-wrap${isLight ? " is-light" : ""}`;
    wrap.id = "langSwitcher";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "t3-lang-trigger";
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-label", "Language");

    const menu = document.createElement("div");
    menu.className = "t3-lang-menu";
    menu.setAttribute("role", "listbox");
    menu.setAttribute("aria-label", "Language");
    menu.hidden = true;

    const globeSvg = `<svg class="t3-lang-globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18"/></svg>`;
    const chevSvg = `<svg class="t3-lang-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
    const checkSvg = `<svg class="t3-lang-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;

    function render() {
      const activeMeta = LANGUAGES.find((l) => l.code === current) || LANGUAGES[0];
      trigger.innerHTML = `${globeSvg}<span class="t3-lang-current" lang="${activeMeta.code}">${activeMeta.name}</span>${chevSvg}`;
      menu.innerHTML = LANGUAGES.map((l) => {
        const active = l.code === current;
        return `<button type="button" class="t3-lang-opt${active ? " is-active" : ""}" role="option" aria-selected="${active ? "true" : "false"}" data-lang="${l.code}" lang="${l.code}">
          <span class="t3-lang-opt-name">${l.name}</span>
          <span class="t3-lang-opt-meta">${active ? checkSvg : l.short}</span>
        </button>`;
      }).join("");
    }

    function positionMenu() {
      menu.style.insetInlineEnd = "auto";
      menu.style.insetInlineStart = "auto";
      menu.style.right = "auto";
      menu.style.left = "0";
      const wrapRect = wrap.getBoundingClientRect();
      const menuW = menu.offsetWidth || 304;
      const isRtl = document.documentElement.dir === "rtl";
      const ideal = isRtl ? wrapRect.left : wrapRect.right - menuW;
      const clamped = Math.max(10, Math.min(ideal, window.innerWidth - menuW - 10));
      menu.style.left = `${Math.round(clamped - wrapRect.left)}px`;
    }

    function openMenu() {
      menu.hidden = false;
      wrap.classList.add("is-open");
      trigger.setAttribute("aria-expanded", "true");
      positionMenu();
    }

    function closeMenu(returnFocus = false) {
      if (menu.hidden) return;
      menu.hidden = true;
      wrap.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      if (returnFocus) trigger.focus();
    }

    function selectLang(nextCode) {
      const next = normalizeLang(nextCode) || "en";
      current = next;
      try { localStorage.setItem("temu3-lang", next); } catch (_) {}
      try {
        const u = new URL(window.location.href);
        if (u.searchParams.has("lang")) {
          u.searchParams.set("lang", next);
          history.replaceState(null, "", u.pathname + u.search + u.hash);
        }
      } catch (_) {}
      render();
      closeMenu(true);
      onChange(next);
    }

    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (menu.hidden) openMenu();
      else closeMenu(false);
    });

    menu.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-lang]");
      if (!btn) return;
      e.stopPropagation();
      selectLang(btn.getAttribute("data-lang"));
    });

    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) closeMenu(false);
    });

    document.addEventListener("keydown", (e) => {
      if (menu.hidden) return;
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu(true);
      }
    });

    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    render();

    if (hostLabel && hostLabel.parentNode) {
      hostLabel.parentNode.replaceChild(wrap, hostLabel);
    } else if (selectEl.parentNode) {
      selectEl.parentNode.replaceChild(wrap, selectEl);
    }
  }

  function applyDirection(code) {
    const meta = LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
  }

  window.Temu3I18n = {
    LANGUAGES,
    normalizeLang,
    detectInitialLang,
    loadBundle,
    loadMemesOverlay,
    pickMemeText,
    trapFocus,
    getKey,
    fmt,
    escapeHtml,
    isolateHandlesHtml,
    escapeBidi,
    mountLangSelect,
    applyDirection
  };
})();
