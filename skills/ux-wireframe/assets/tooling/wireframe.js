/* ==========================================================================
   Wireframe interactions — generic, attribute-driven, no dependencies.
   Every widget degrades to static markup when JS is unavailable.

   Localise by defining window.WF_I18N before this script (build.py injects
   wireframe/i18n.json when present). Number formatting follows <html lang>.
   ========================================================================== */
(function () {
  "use strict";

  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  const LOCALE = document.documentElement.lang || "en";
  const DEFAULTS = {
    currency: "€",
    resultCount: "Showing {shown} of {total} products",
    empty: "No products match these filters.",
    removeFilter: "Remove {label}",
    searchChip: "Search: “{q}”",
    shipFree: "Your delivery is <strong>free</strong>.",
    shipRemaining: "<strong>{amount}</strong> to go for free delivery.",
    shipNone: "—",
    shipFreeLabel: "Free",
    calcMissing: "<strong>Enter the wall width and height.</strong>",
    calcArea: "Wall area: {area} m²",
    calcReserve: "With +10 % waste: {reserve} m²",
    calcPieces: "Pieces needed: <strong>{pieces}</strong>",
    calcPrice: "Estimated price: <strong>{price}</strong>",
    calcCta: "Add {pieces} pcs to cart",
    cartHref: "cart.html",
    wizardCounter: "Step {n} of {total}",
    quizCounter: "Question {n} of {total}",
    formSuffix: "This is a wireframe — nothing is submitted.",
    formThanks: "Thank you.",
    slideLabel: "Slide {n} of {total}",
    copied: "Copied",
    copyFailed: "Copy this: {url}",
    couponEmpty: "Enter a coupon code.",
    dpAdd: "Add date",
    dpTitle: "Choose dates",
    dpPrev: "Previous month",
    dpNext: "Next month",
    dpClear: "Clear dates",
    dpDone: "Done",
    dpNight: "1 night",
    dpNights: "{n} nights",
    dpPickStart: "Select your check-in date",
    dpPickEnd: "Select your check-out date",
    nightsTitle: "{n} nights in {name}",
    nightsTitleOne: "1 night in {name}",
    nightsEmpty: "Add your travel dates"
  };
  const T = Object.assign({}, DEFAULTS, window.WF_I18N || {});
  const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (_, k) => vars[k]);

  const money = n => (Math.round(n * 100) / 100)
    .toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + T.currency;
  const money0 = n => Math.round(n).toLocaleString(LOCALE) + " " + T.currency;
  const eur = money;    // legacy aliases used below
  const eur0 = money0;

  // inline icon for engine-made controls (same markup build.py writes for <i data-icon="x">)
  const ICON_X = '<svg class="w-icon w-icon--small pi-x" viewBox="0 0 256 256" aria-hidden="true" focusable="false">' +
    '<path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,' +
    '50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/></svg>';
  /* ---------------------------------------------------------------- slider */
  // [data-slider] root; slides are [data-slide] (styled by .w-slide), dots are generated
  // into [data-slider-dots]. Behaviour never depends on a styling class.
  function initSlider(root) {
    const slides = $$("[data-slide]", root);
    if (slides.length < 2) return;

    const dots = $("[data-slider-dots]", root);
    const delay = parseInt(root.getAttribute("data-autoplay") || "0", 10);
    let i = slides.findIndex(s => s.classList.contains("is-active"));
    if (i < 0) i = 0;
    let timer = null;

    if (dots) {
      dots.innerHTML = "";
      slides.forEach((s, n) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "w-slider__dot";
        b.setAttribute("aria-label", fill(T.slideLabel, { n: n + 1, total: slides.length }));
        b.addEventListener("click", () => { go(n); restart(); });
        dots.appendChild(b);
      });
    }

    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => {
        const on = k === i;
        s.classList.toggle("is-active", on);
        s.setAttribute("aria-hidden", on ? "false" : "true");
        $$("a,button,input", s).forEach(el => el.tabIndex = on ? 0 : -1);
      });
      if (dots) $$(".w-slider__dot", dots).forEach((d, k) => d.classList.toggle("is-active", k === i));
      const c = $("[data-slider-counter]", root);
      if (c) c.textContent = (i + 1) + " / " + slides.length;
    }
    function next() { go(i + 1); }
    function prev() { go(i - 1); }
    function start() { if (delay) timer = setInterval(next, delay); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function restart() { stop(); start(); }

    const bn = $("[data-slider-next]", root); if (bn) bn.addEventListener("click", e => { e.preventDefault(); next(); restart(); });
    const bp = $("[data-slider-prev]", root); if (bp) bp.addEventListener("click", e => { e.preventDefault(); prev(); restart(); });

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("keydown", e => {
      if (e.key === "ArrowRight") { next(); restart(); }
      if (e.key === "ArrowLeft") { prev(); restart(); }
    });

    let x0 = null;
    root.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
    root.addEventListener("touchend", e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) (dx < 0 ? next : prev)();
      x0 = null; start();
    });

    // other widgets show a given slide by dispatching "slidergo" (detail = 0-based index) on the root
    root.addEventListener("slidergo", e => { go(e.detail); restart(); });
    go(i);
    start();
  }

  /* ------------------------------------------------------------------ tabs */
  function initTabs(nav) {
    const links = $$("a", nav);
    const panels = links.map(a => document.getElementById((a.getAttribute("href") || "").split("#")[1] || ""));
    if (!panels.filter(Boolean).length) return;

    function show(idx, push) {
      links.forEach((a, k) => {
        a.classList.toggle("is-active", k === idx);
        a.setAttribute("aria-selected", k === idx ? "true" : "false");
      });
      panels.forEach((p, k) => { if (p) p.hidden = k !== idx; });
      if (push && links[idx]) history.replaceState(null, "", "#" + panels[idx].id);
    }

    links.forEach((a, k) => a.addEventListener("click", e => { e.preventDefault(); show(k, true); }));
    const fromHash = panels.findIndex(p => p && ("#" + p.id) === location.hash);
    show(fromHash > -1 ? fromHash : 0, false);

    // deep links from elsewhere on the page must open the right tab
    $$('a[href*="#"]').forEach(a => {
      const id = (a.getAttribute("href") || "").split("#")[1];
      const k = panels.findIndex(p => p && p.id === id);
      if (k > -1 && !links.includes(a)) {
        a.addEventListener("click", () => { show(k, false); });
      }
    });
  }

  /* --------------------------------------------------------------- gallery */
  function initGallery(root) {
    const thumbs = $$("[data-thumb]", root);
    const main = $("[data-gallery-main]", root);
    if (!thumbs.length || !main) return;
    thumbs.forEach(t => t.addEventListener("click", e => {
      e.preventDefault();
      thumbs.forEach(o => o.classList.remove("is-active"));
      t.classList.add("is-active");
      main.textContent = t.getAttribute("data-caption") || t.textContent.trim();
    }));
    if (!$(".is-active", root)) thumbs[0].classList.add("is-active");
  }

  /* ------------------------------------------------------------------- qty */
  function initQty(root) {
    const input = $("input", root);
    if (!input) return;
    $$("[data-step]", root).forEach(b => b.addEventListener("click", e => {
      e.preventDefault();
      const min = parseInt(input.min || "1", 10);
      const max = input.max ? parseInt(input.max, 10) : Infinity;
      const v = Math.min(max, Math.max(min, (parseInt(input.value, 10) || min) + parseInt(b.getAttribute("data-step"), 10)));
      input.value = v;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }));
  }

  /* ---------------------------------------------------------------- coupon */
  // [data-coupon]: entry ([data-coupon-entry] input + [data-coupon-apply]) ↔ applied state ([data-coupon-applied]
  // + [data-coupon-remove]). Wireframe rule: any non-empty code applies; the discount itself is authored in
  // [data-coupon-row] (shown when applied). Elements with data-coupon-full / data-coupon-price anywhere on the
  // page switch between the two prices; [data-coupon-code] shows the applied code.
  function initCoupon(root) {
    const input = $("input", root);
    const apply = $("[data-coupon-apply]", root);
    const remove = $("[data-coupon-remove]", root);
    const entry = $("[data-coupon-entry]", root);
    const applied = $("[data-coupon-applied]", root);
    const msg = $("[data-coupon-msg]", root);
    if (!input || !apply || !entry || !applied) return;
    function set(on) {
      entry.hidden = on;
      applied.hidden = !on;
      $$("[data-coupon-row]").forEach(r => { r.hidden = !on; });
      $$("[data-coupon-price]").forEach(t => { t.textContent = t.getAttribute(on ? "data-coupon-price" : "data-coupon-full"); });
      if (on) $$("[data-coupon-code]").forEach(c => { c.textContent = input.value.trim().toUpperCase(); });
    }
    apply.addEventListener("click", e => {
      e.preventDefault();
      if (!input.value.trim()) { if (msg) msg.textContent = T.couponEmpty; input.focus(); return; }
      if (msg) msg.textContent = "";
      set(true);
    });
    if (remove) remove.addEventListener("click", e => { e.preventDefault(); set(false); input.focus(); });
    input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); apply.click(); } });
    set(false);
  }

  /* ------------------------------------------------------------ date range */
  // input[type=date][data-date-end="<id of the end input>"]: the pair becomes one range picker — a popover with
  // check-in / check-out segments, one month (< 720 px) or two, today marked, past days disabled, the range
  // shaded, a nights summary, Clear dates and Done. The inputs turn into read-only text showing the formatted
  // date; a hidden input keeps the ISO value and the original name for form submission. Keyboard: Enter/Space/↓
  // opens, arrows move by day/week, PageUp/PageDown by month, Home/End to week start/end, Esc closes.
  // [data-date-inline="<start id>"]: an always-open calendar for the same pair (stay page "Nights in");
  // [data-nights-title="<start id>"][data-name] and [data-nights-range="<start id>"] follow the selection.
  const SVG = d => '<svg class="w-icon w-icon--small" viewBox="0 0 256 256" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>';
  const ICON_PREV = SVG("M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z");
  const ICON_NEXT = SVG("M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z");
  const ICON_CAL = SVG("M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z");
  function initDateRange(startEl) {
    const endEl = document.getElementById(startEl.getAttribute("data-date-end"));
    if (!endEl) return;
    const pad = n => String(n).padStart(2, "0");
    const DL = LOCALE === "en" ? "en-GB" : LOCALE;  // day-month order, as dates read elsewhere on the site
    const iso = d => d ? d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) : "";
    const parse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
    const same = (a, b) => !!a && !!b && a.getTime() === b.getTime();
    const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
    const monthStart = d => new Date(d.getFullYear(), d.getMonth(), 1);
    const fmt = d => d ? d.toLocaleDateString(DL, { day: "numeric", month: "short", year: "numeric" }) : "";
    const fmtSeg = d => d.toLocaleDateString(DL, { weekday: "short", day: "numeric", month: "short" });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const minView = monthStart(today);
    const labels = [startEl, endEl].map(el => {
      const l = el.id && document.querySelector('label[for="' + el.id + '"]');
      return l ? l.textContent.trim() : "";
    });
    const pair = [startEl, endEl].map(el => {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.value = el.value;
      if (el.name) { hidden.name = el.name; el.removeAttribute("name"); }
      el.type = "text";
      el.readOnly = true;
      el.autocomplete = "off";
      el.placeholder = T.dpAdd;
      el.classList.add("w-datepicker-input");
      el.setAttribute("aria-haspopup", "dialog");
      el.setAttribute("aria-expanded", "false");
      if (el.closest(".w-field")) {
        const wrap = document.createElement("span");
        wrap.className = "w-datepicker-field";
        el.classList.add("w-datepicker-field__input");
        el.before(wrap);
        wrap.append(el, hidden);
        wrap.insertAdjacentHTML("beforeend", ICON_CAL.replace('class="w-icon w-icon--small"', 'class="w-icon w-icon--small w-datepicker-field__icon"'));
      } else el.after(hidden);
      return { el, hidden };
    });
    let start = parse(pair[0].hidden.value), end = parse(pair[1].hidden.value);
    if (start && end && end <= start) end = null;
    let active = 0, hover = null, opener = startEl;
    const titles = $$('[data-nights-title="' + startEl.id + '"]'), ranges = $$('[data-nights-range="' + startEl.id + '"]');
    const nights = () => start && end ? Math.round((end - start) / 864e5) : 0;
    const rangeEnd = () => active === 1 && start && hover && hover > start ? hover : end;

    // one calendar = month nav + grids (+ check-in/check-out segments in the popover) + footer; all share the selection
    function makeCal(root, inline) {
      const cal = { root, inline, view: minView, focus: today, shown: 0 };
      root.classList.add("w-datepicker");
      if (inline) root.classList.add("w-datepicker--inline");
      root.innerHTML =
        (inline ? "" : '<div class="w-datepicker__head">' + [0, 1].map(k => '<button type="button" class="w-datepicker__segment" data-dp-seg="' + k +
          '"><span class="w-datepicker__segment-label"></span><span class="w-datepicker__segment-value"></span></button>').join("") + "</div>") +
        '<div class="w-datepicker__body"><div class="w-datepicker__nav"><button type="button" class="w-datepicker__nav-button w-datepicker__prev" aria-label="' + T.dpPrev + '">' +
          ICON_PREV + '</button><button type="button" class="w-datepicker__nav-button w-datepicker__next" aria-label="' + T.dpNext + '">' + ICON_NEXT +
          '</button></div><div class="w-datepicker__months"></div></div>' +
        '<div class="w-datepicker__foot">' + (inline ? "" : '<p class="w-datepicker__summary" aria-live="polite"></p>') +
          '<button type="button" class="w-datepicker__clear">' + T.dpClear + "</button>" +
          (inline ? "" : '<button type="button" class="w-button-primary w-button-primary--small" data-dp-done>' + T.dpDone + "</button>") + "</div>";
      cal.months = () => inline ? (root.clientWidth >= 680 ? 2 : 1) : (window.matchMedia("(min-width: 768px)").matches ? 2 : 1);
      bindCal(cal);
      return cal;
    }
    function render(cal) {
      const wd = [];
      for (let i = 0; i < 7; i++) wd.push(new Date(2024, 0, 1 + i).toLocaleDateString(DL, { weekday: "short" }).slice(0, 2));
      cal.shown = cal.months();
      let html = "";
      for (let m = 0; m < cal.shown; m++) {
        const first = new Date(cal.view.getFullYear(), cal.view.getMonth() + m, 1);
        const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
        html += '<div class="w-datepicker__month"><p class="w-datepicker__title">' + first.toLocaleDateString(DL, { month: "long", year: "numeric" }) +
          '</p><div class="w-datepicker__grid">' + wd.map(w => '<span class="w-datepicker__weekday" aria-hidden="true">' + w + "</span>").join("") +
          '<span class="w-datepicker__blank"></span>'.repeat((first.getDay() + 6) % 7);
        for (let n = 1; n <= days; n++) {
          const d = new Date(first.getFullYear(), first.getMonth(), n);
          html += '<button type="button" class="w-datepicker__day" data-dp-date="' + iso(d) + '" tabindex="-1" aria-label="' +
            d.toLocaleDateString(DL, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + '">' + n + "</button>";
        }
        html += "</div></div>";
      }
      $(".w-datepicker__months", cal.root).innerHTML = html;
      $(".w-datepicker__prev", cal.root).disabled = cal.view <= minView;
      paint(cal);
    }
    function paint(cal) {
      const last = rangeEnd(), preview = !same(last, end);
      $$(".w-datepicker__day", cal.root).forEach(b => {
        const d = parse(b.getAttribute("data-dp-date"));
        const isStart = same(d, start), isEnd = same(d, last);
        b.disabled = d < today;
        b.tabIndex = same(d, cal.focus) ? 0 : -1;
        b.classList.toggle("is-today", same(d, today));
        b.classList.toggle("is-start", isStart);
        b.classList.toggle("is-end", isEnd);
        b.classList.toggle("is-range", !!(start && last && d > start && d < last));
        b.classList.toggle("has-range", !!(start && last) && (isStart || isEnd));
        b.classList.toggle("is-preview", preview && !!last);
        b.setAttribute("aria-pressed", same(d, start) || same(d, end) ? "true" : "false");
      });
      $$(".w-datepicker__segment", cal.root).forEach((s, k) => {
        const v = k ? end : start, val = $(".w-datepicker__segment-value", s);
        s.classList.toggle("is-active", k === active);
        s.setAttribute("aria-pressed", k === active ? "true" : "false");
        $(".w-datepicker__segment-label", s).textContent = labels[k];
        val.textContent = v ? fmtSeg(v) : T.dpAdd;
        val.classList.toggle("is-empty", !v);
      });
      const sum = $(".w-datepicker__summary", cal.root);
      if (sum) sum.textContent = nights() ? fill(nights() === 1 ? T.dpNight : T.dpNights, { n: nights() }) : (active ? T.dpPickEnd : T.dpPickStart);
      $(".w-datepicker__clear", cal.root).disabled = !start && !end;
    }
    function focusDay(cal) {
      const b = $('.w-datepicker__day[data-dp-date="' + iso(cal.focus) + '"]', cal.root);
      if (b) b.focus({ preventScroll: true });
    }
    function showDate(cal, d) {
      // move the keyboard focus to d, turning the months so it is visible
      const lastShown = new Date(cal.view.getFullYear(), cal.view.getMonth() + cal.months(), 0);
      cal.focus = d < today ? today : d;
      if (cal.focus < cal.view || cal.focus > lastShown) {
        cal.view = cal.focus < cal.view ? monthStart(cal.focus) : new Date(cal.focus.getFullYear(), cal.focus.getMonth() - cal.months() + 1, 1);
        if (cal.view < minView) cal.view = minView;
        render(cal);
      } else paint(cal);
      focusDay(cal);
    }
    function update() {
      pair[0].hidden.value = iso(start);
      pair[1].hidden.value = iso(end);
      pair[0].el.value = fmt(start);
      pair[1].el.value = fmt(end);
      pair.forEach(p => p.el.dispatchEvent(new Event("change", { bubbles: true })));
      cals.forEach(c => { if (c.shown) paint(c); });
      const n = nights();
      titles.forEach(t => {
        t.textContent = n ? fill(n === 1 ? T.nightsTitleOne : T.nightsTitle, { n, name: t.getAttribute("data-name") || "" })
          : (start ? T.dpPickEnd : T.dpPickStart);
      });
      ranges.forEach(r => { r.textContent = start ? fmt(start) + " – " + (end ? fmt(end) : "…") : T.nightsEmpty; });
    }
    function pick(cal, d) {
      if (cal.inline && start && end) end = null;  // a full range on the open calendar: the next click starts over
      if (active === 0 || !start || d <= start) {
        start = d;
        if (end && end <= start) end = null;
        active = 1;
        hover = null;
        update();
        showDate(cal, end || addDays(d, 1));
      } else {
        end = d;
        active = 0;
        hover = null;
        update();
        if (cal.inline) focusDay(cal);
        else { opener = pair[1].el; close(true); }
      }
    }
    function bindCal(cal) {
      cal.root.addEventListener("click", e => {
        const day = e.target.closest(".w-datepicker__day");
        if (day) { if (!day.disabled) pick(cal, parse(day.getAttribute("data-dp-date"))); return; }
        const seg = e.target.closest(".w-datepicker__segment");
        if (seg) {
          active = +seg.getAttribute("data-dp-seg") === 1 && start ? 1 : 0;
          hover = null;
          update();
          showDate(cal, (active ? end || addDays(start, 1) : start) || today);
          return;
        }
        const nav = e.target.closest(".w-datepicker__prev, .w-datepicker__next");
        if (nav) {
          cal.view = new Date(cal.view.getFullYear(), cal.view.getMonth() + (nav.classList.contains("w-datepicker__prev") ? -1 : 1), 1);
          if (cal.view < minView) cal.view = minView;
          const lastShown = new Date(cal.view.getFullYear(), cal.view.getMonth() + cal.months(), 0);
          if (cal.focus < cal.view || cal.focus > lastShown) cal.focus = cal.view < today ? today : cal.view;
          render(cal);
          return;
        }
        if (e.target.closest(".w-datepicker__clear")) { start = end = null; active = 0; hover = null; update(); showDate(cal, today); return; }
        if (e.target.closest("[data-dp-done]")) close(true);
      });
      cal.root.addEventListener("mouseover", e => {
        const day = e.target.closest(".w-datepicker__day");
        const d = day && !day.disabled ? parse(day.getAttribute("data-dp-date")) : null;
        if (same(d, hover) || (!d && !hover)) return;
        hover = d;
        if (active === 1 && start) paint(cal);
      });
      cal.root.addEventListener("mouseleave", () => { if (hover) { hover = null; paint(cal); } });
      cal.root.addEventListener("keydown", e => {
        if (e.key === "Escape" && !cal.inline) { e.preventDefault(); close(true); return; }
        const day = e.target.closest(".w-datepicker__day");
        if (!day) return;
        let d = parse(day.getAttribute("data-dp-date"));
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
        if (step) d = addDays(d, step);
        else if (e.key === "PageUp" || e.key === "PageDown") d = new Date(d.getFullYear(), d.getMonth() + (e.key === "PageUp" ? -1 : 1), Math.min(d.getDate(), 28));
        else if (e.key === "Home") d = addDays(d, -((d.getDay() + 6) % 7));
        else if (e.key === "End") d = addDays(d, 6 - (d.getDay() + 6) % 7);
        else return;
        e.preventDefault();
        hover = d;
        showDate(cal, d);
      });
    }

    // popover (opened from the inputs) + any inline calendars for the same pair
    const pop = makeCal(document.createElement("div"), false);
    const dp = pop.root;
    dp.hidden = true;
    dp.setAttribute("role", "dialog");
    dp.setAttribute("aria-label", T.dpTitle);
    (startEl.closest("dialog") || document.body).appendChild(dp);
    const cals = [pop];
    $$('[data-date-inline="' + startEl.id + '"]').forEach(host => {
      const cal = makeCal(host, true);
      host.setAttribute("role", "group");
      host.setAttribute("aria-label", T.dpTitle);
      cal.focus = start && start >= today ? start : today;
      cal.view = monthStart(cal.focus);
      cals.push(cal);
      render(cal);
      window.addEventListener("resize", () => { if (cal.shown !== cal.months()) render(cal); });
    });

    function place() {
      if (dp.hidden) return;
      // anchor below both fields when they share a row, below the field that opened it when they stack
      let r = pair.map(p => (p.el.closest(".w-field") || p.el).getBoundingClientRect());
      if (Math.abs(r[0].top - r[1].top) > 4) r = [r[pair.findIndex(p => p.el === opener)]];
      const top = Math.min(...r.map(x => x.top)), bottom = Math.max(...r.map(x => x.bottom)), left = Math.min(...r.map(x => x.left));
      const vw = document.documentElement.clientWidth, vh = window.innerHeight, w = dp.offsetWidth, h = dp.offsetHeight;
      let y = bottom + 8;
      if (y + h > vh - 8) y = top - h - 8 >= 8 ? top - h - 8 : Math.max(8, vh - h - 8);
      dp.style.left = Math.max(8, Math.min(left, vw - w - 8)) + "px";
      dp.style.top = y + "px";
    }
    function open(k) {
      active = k === 1 && !start ? 0 : k;
      opener = pair[k].el;
      hover = null;
      const target = (active ? end || (start && addDays(start, 1)) : start) || today;
      pop.focus = target < today ? today : target;
      // two months: when check-out falls in the month after check-in, show check-in's month first
      const fm = monthStart(pop.focus);
      pop.view = active && start && pop.months() === 2 && fm.getTime() === new Date(start.getFullYear(), start.getMonth() + 1, 1).getTime() ? monthStart(start) : fm;
      if (pop.view < minView) pop.view = minView;
      render(pop);
      if (dp.hidden) {
        dp.hidden = false;
        document.addEventListener("pointerdown", outside, true);
        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", place, true);
      }
      pair.forEach(p => p.el.setAttribute("aria-expanded", "true"));
      // phones: bring the field up so the calendar fits below it instead of covering it
      const f = (opener.closest(".w-field") || opener).getBoundingClientRect();
      if (!startEl.closest("dialog") && f.bottom + 8 + dp.offsetHeight > window.innerHeight - 8) window.scrollBy(0, f.top - 88);
      place();
      focusDay(pop);
    }
    function close(refocus) {
      if (dp.hidden) return;
      dp.hidden = true;
      pop.shown = 0;
      pair.forEach(p => p.el.setAttribute("aria-expanded", "false"));
      document.removeEventListener("pointerdown", outside, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", place, true);
      if (refocus) opener.focus();
    }
    function outside(e) {
      if (dp.contains(e.target) || pair.some(p => (p.el.closest(".w-datepicker-field") || p.el).contains(e.target))) return;
      close(false);
    }
    function onResize() { if (pop.shown !== pop.months()) render(pop); place(); }
    // keyboard users tabbing out close it; a click on blank popover space (focus → body) does not
    dp.addEventListener("focusout", () => setTimeout(() => {
      const a = document.activeElement;
      if (dp.hidden || !a || a === document.body || dp.contains(a) || pair.some(p => p.el === a)) return;
      close(false);
    }, 0));
    pair.forEach((p, k) => {
      p.el.addEventListener("click", () => open(k));
      p.el.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") { e.preventDefault(); open(k); }
        else if (e.key === "Escape") close(false);
        else if (e.key === "Backspace" || e.key === "Delete") {
          e.preventDefault();
          if (k === 0) start = null;
          end = null;
          update();
        }
      });
      const label = p.el.id && document.querySelector('label[for="' + p.el.id + '"]');
      if (label) label.addEventListener("click", e => { e.preventDefault(); open(k); });
    });
    update();
  }

  /* -------------------------------------------------------------- variants */
  function initVariants(root) {
    const opts = $$("[data-variant]", root);
    if (!opts.length) return;
    const priceOut = $("[data-variant-price]", root);
    const labelOut = $("[data-variant-label]", root);
    const stockOut = $("[data-variant-stock]", root);

    function pick(o) {
      opts.forEach(x => x.classList.toggle("is-active", x === o));
      const p = parseFloat(o.getAttribute("data-price") || "");
      if (priceOut && !isNaN(p)) priceOut.textContent = eur0(p);
      if (labelOut) labelOut.textContent = o.getAttribute("data-variant") || "";
      if (stockOut) stockOut.textContent = o.getAttribute("data-stock") || stockOut.textContent;
      root.dispatchEvent(new CustomEvent("variantchange", { detail: { price: p }, bubbles: true }));
    }
    opts.forEach(o => o.addEventListener("click", e => { e.preventDefault(); pick(o); }));
    pick($(".is-active", root) || opts[0]);
  }

  /* ------------------------------------------------------------ PLP filter */
  function initCatalog(root) {
    const cards   = $$("[data-product]", root);
    const boxes   = $$("[data-facet]", root);
    const chips   = $$("[data-chip-facet]", root);
    const sortSel = $("[data-sort]", root);
    const perSel  = $("[data-per-page]", root);
    const countEl = $("[data-result-count]", root);
    const activeEl= $("[data-active-filters]", root);
    const clearEls= $$("[data-clear-filters]", root);
    const moreBtn = $("[data-load-more]", root);
    const emptyEl = $("[data-empty]", root);
    const searchEl= $("[data-catalog-search]", root);
    const grid    = cards.length ? cards[0].parentNode : null;
    if (!cards.length) return;

    let shown = perSel ? parseInt(perSel.value, 10) : cards.length;

    function selected() {
      const map = {};
      boxes.forEach(b => {
        if (!b.checked) return;
        const f = b.getAttribute("data-facet");
        (map[f] = map[f] || []).push(b.value);
      });
      return map;
    }

    // keyword search ([data-catalog-search]): every term must occur in the card text or its
    // data-keywords; case- and accent-insensitive ("zrce" finds "Zrće")
    const fold = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    const hay = new Map(cards.map(c => [c, fold(c.textContent + " " + (c.getAttribute("data-keywords") || ""))]));
    const query = () => (searchEl ? searchEl.value.trim() : "");

    function matches(card, map) {
      const terms = fold(query()).split(/\s+/).filter(Boolean);
      if (terms.some(t => hay.get(card).indexOf(t) < 0)) return false;
      return Object.keys(map).every(facet => {
        const have = (card.getAttribute("data-" + facet) || "").split("|").filter(Boolean);
        if (facet === "price" || facet === "cijena") {
          const p = parseFloat(card.getAttribute("data-price") || "0");
          return map[facet].some(range => {
            const [lo, hi] = range.split("-");
            return p >= parseFloat(lo) && (hi === "" || hi === undefined ? true : p <= parseFloat(hi));
          });
        }
        return map[facet].some(v => have.indexOf(v) > -1);
      });
    }

    function sortCards(list) {
      const mode = sortSel ? sortSel.value : "";
      const num = c => parseFloat(c.getAttribute("data-price") || "0");
      // name sort: the card's data-name, else its title (the element carrying data-prop="title"), else its text
      const txt = c => c.getAttribute("data-name") || ($('[data-prop="title"]', c) || c).textContent || "";
      const ord = c => parseInt(c.getAttribute("data-order") || "0", 10);
      const rat = c => parseFloat(c.getAttribute("data-rating") || "0");
      const sold= c => parseFloat(c.getAttribute("data-sold") || "0");
      const ALIAS = {
        "cijena-asc": "price-asc", "cijena-desc": "price-desc",
        "naziv": "name", "najnovije": "newest", "ocjena": "rating", "prodavano": "sold"
      };
      const cmp = {
        "price-asc":  (a, b) => num(a) - num(b),
        "price-desc": (a, b) => num(b) - num(a),
        "name":       (a, b) => txt(a).localeCompare(txt(b), LOCALE),
        "newest":     (a, b) => ord(a) - ord(b),
        "rating":     (a, b) => rat(b) - rat(a),
        "sold":       (a, b) => sold(b) - sold(a)
      }[ALIAS[mode] || mode];
      return cmp ? list.slice().sort(cmp) : list;
    }

    // a radio facet goes back to its group's neutral option ("Any"), which carries no data-facet
    function reset(b) {
      b.checked = false;
      if (b.type !== "radio" || !b.name) return;
      const neutral = $$('input[type="radio"]', root).find(r => r.name === b.name && !r.hasAttribute("data-facet"));
      if (neutral) neutral.checked = true;
    }

    function renderActive(map) {
      const on = boxes.filter(b => b.checked);
      const q = query();
      const n = on.length + (q ? 1 : 0);
      if (activeEl) {
        activeEl.innerHTML = "";
        const add = (label, drop) => {
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "w-chip is-active";
          chip.innerHTML = label + " " + ICON_X;
          chip.setAttribute("aria-label", fill(T.removeFilter, { label: label }));
          chip.addEventListener("click", () => { drop(); apply(); });
          activeEl.appendChild(chip);
        };
        if (q) add(fill(T.searchChip, { q: q.replace(/[<>&"]/g, "") }), () => { searchEl.value = ""; });
        on.forEach(b => add(b.getAttribute("data-label") || b.value, () => reset(b)));
      }
      clearEls.forEach(c => { c.hidden = n === 0; });
      // [data-active-count]: number of active filters incl. a search term, e.g. the badge on a "Filters" button
      $$("[data-active-count]", root).forEach(el => { el.textContent = n; el.hidden = n === 0; });
      const none = $("[data-active-empty]", root);
      if (none) none.hidden = n > 0;
    }

    function apply() {
      const map = selected();
      const hits = sortCards(cards.filter(c => matches(c, map)));
      cards.forEach(c => { c.hidden = true; });
      hits.forEach((c, k) => {
        c.hidden = k >= shown;
        if (grid) grid.appendChild(c);
      });
      if (countEl) countEl.textContent = fill(T.resultCount, { shown: Math.min(shown, hits.length), total: hits.length });
      // [data-result-label="{total} stays"] (+ optional -one / -zero variants): result counts and
      // apply buttons worded per catalogue, e.g. "Show 12 stays" in a filter drawer
      $$("[data-result-label]", root).forEach(el => {
        const n = hits.length;
        const t = (n === 0 && el.getAttribute("data-result-label-zero")) || (n === 1 && el.getAttribute("data-result-label-one")) || el.getAttribute("data-result-label");
        el.textContent = fill(t, { total: n });
      });
      if (moreBtn) moreBtn.hidden = hits.length <= shown;
      if (emptyEl) { emptyEl.hidden = hits.length > 0; if (!emptyEl.textContent.trim()) emptyEl.textContent = T.empty; }
      renderActive(map);
      // quick chips mirror their checkbox, whichever control changed it
      chips.forEach(ch => {
        const box = boxes.find(b => b.getAttribute("data-facet") === ch.getAttribute("data-chip-facet") && b.value === ch.getAttribute("data-chip-value"));
        ch.classList.toggle("is-active", !!(box && box.checked));
      });
      // keep the inline promo banner after the 6th visible card
      const promo = $("[data-grid-promo]", root);
      if (promo && grid) {
        const vis = hits.slice(0, Math.min(shown, hits.length));
        if (vis.length > 6) grid.insertBefore(promo, vis[6]); else grid.appendChild(promo);
        promo.hidden = vis.length === 0;
      }
    }

    boxes.forEach(b => b.addEventListener("change", apply));
    if (searchEl) {
      searchEl.addEventListener("input", apply);
      if (searchEl.form) searchEl.form.addEventListener("submit", e => { e.preventDefault(); apply(); });
    }
    if (sortSel) sortSel.addEventListener("change", apply);
    if (perSel) perSel.addEventListener("change", () => { shown = parseInt(perSel.value, 10); apply(); });
    clearEls.forEach(c => c.addEventListener("click", e => { e.preventDefault(); boxes.forEach(reset); if (searchEl) searchEl.value = ""; apply(); }));
    if (moreBtn) moreBtn.addEventListener("click", e => { e.preventDefault(); shown += 6; apply(); });

    chips.forEach(ch => ch.addEventListener("click", e => {
      e.preventDefault();
      const f = ch.getAttribute("data-chip-facet"), v = ch.getAttribute("data-chip-value");
      const box = boxes.find(b => b.getAttribute("data-facet") === f && b.value === v);
      if (box) { box.checked = !box.checked; apply(); }
    }));

    $$("[data-view]", root).forEach(v => v.addEventListener("click", e => {
      e.preventDefault();
      $$("[data-view]", root).forEach(o => o.classList.remove("is-active"));
      v.classList.add("is-active");
      const view = v.getAttribute("data-view");
      if (grid) grid.classList.toggle("is-list", view === "list" || view === "popis");
    }));

    // deep links: ?<facet>=<value> pre-selects a filter (aliases via data-param-map="where:dest
    // who:guests"); a numeric value without an exact option picks the smallest threshold >= it
    // (who=5 -> "6+"); ?q= (or the search field's name) fills [data-catalog-search]; other params
    // fill a [data-param="<name>"] field (dates)
    const alias = {};
    (root.getAttribute("data-param-map") || "").split(/\s+/).filter(Boolean).forEach(p => { const [a, f] = p.split(":"); alias[a] = f; });
    new URLSearchParams(location.search).forEach((v, k) => {
      if (!v) return;
      if (searchEl && k === (searchEl.name || "q")) { searchEl.value = v; return; }
      const opts = boxes.filter(b => b.getAttribute("data-facet") === (alias[k] || k));
      if (!opts.length) { const field = $('[data-param="' + k + '"]', root); if (field) field.value = v; return; }
      let hit = opts.find(b => b.value === v);
      const n = parseFloat(v);
      if (!hit && !isNaN(n) && opts.every(b => !isNaN(parseFloat(b.value)))) {
        const asc = opts.slice().sort((a, b) => parseFloat(a.value) - parseFloat(b.value));
        hit = asc.find(b => parseFloat(b.value) >= n) || asc[asc.length - 1];
      }
      if (hit) hit.checked = true;
    });
    apply();
  }

  /* ------------------------------------------------------ filter off-canvas */
  // One panel serves both layouts: a static sidebar where its [data-filter-open] trigger is
  // hidden (desktop, by CSS), an off-canvas dialog where the trigger is visible (mobile).
  function initFilterDrawer(panel) {
    const triggers = $$('[data-filter-open][aria-controls="' + panel.id + '"]');
    if (!panel.id || !triggers.length) return;
    const scrim = $("[data-filter-scrim]", panel.parentNode);
    const role = panel.getAttribute("role");
    let opener = null;
    const focusables = () => $$('a[href], button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])', panel)
      .filter(el => !el.disabled && !el.hidden && el.getClientRects().length);
    function open(on, from) {
      const was = panel.classList.contains("is-open");
      if (on === was) return;
      panel.classList.toggle("is-open", on);
      if (scrim) scrim.hidden = !on;
      triggers.forEach(t => t.setAttribute("aria-expanded", on ? "true" : "false"));
      document.body.style.overflow = on ? "hidden" : "";
      if (on) {
        opener = from || triggers[0];
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-modal", "true");
        const first = focusables()[0];
        if (first) first.focus();
      } else {
        if (role) panel.setAttribute("role", role); else panel.removeAttribute("role");
        panel.removeAttribute("aria-modal");
        if (opener && opener.getClientRects().length) opener.focus();
      }
    }
    triggers.forEach(t => t.addEventListener("click", e => { e.preventDefault(); open(true, t); }));
    $$("[data-filter-close]", panel).concat(scrim ? [scrim] : []).forEach(c => c.addEventListener("click", e => { e.preventDefault(); open(false); }));
    document.addEventListener("keydown", e => {
      if (!panel.classList.contains("is-open")) return;
      if (e.key === "Escape") { e.preventDefault(); open(false); return; }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    // sidebar mode: no scrollbar inside the panel. --filter-top is the sticky offset: the
    // header offset (--layout-sticky-top) when the panel fits the viewport; otherwise negative, so a
    // tall panel scrolls with the page and then pins by its bottom edge — never cut off
    function fit() {
      const top = parseFloat(getComputedStyle(panel).getPropertyValue("--layout-sticky-top")) || 96;
      panel.style.setProperty("--filter-top", Math.min(top, window.innerHeight - panel.offsetHeight - 16) + "px");
    }
    fit();
    if (document.fonts) document.fonts.ready.then(fit);
    // growing past the drawer breakpoint turns the dialog back into a sidebar
    window.addEventListener("resize", () => {
      if (panel.classList.contains("is-open") && !triggers.some(t => t.getClientRects().length)) open(false);
      fit();
    });
  }

  /* ---------------------------------------------------------------- dialog */
  // <button data-dialog-open="id"> opens <dialog id data-dialog> as a modal (native focus trap,
  // Escape, top layer). [data-dialog-close] or a click on the backdrop closes it; focus returns to
  // the opener and the page does not scroll behind it. data-dialog-show="el-id" on an opener shows
  // that element: a [data-slide] of a [data-slider] becomes the active slide (photo lightbox), anything
  // else is scrolled into view.
  function initDialogs() {
    $$("dialog[data-dialog]").forEach(d => {
      if (typeof d.showModal !== "function") return;
      let opener = null;
      const openers = $$('[data-dialog-open="' + d.id + '"]');
      openers.forEach(b => {
        b.setAttribute("aria-haspopup", "dialog");
        b.setAttribute("aria-controls", d.id);
        b.setAttribute("aria-expanded", "false");
        b.addEventListener("click", e => {
          e.preventDefault();
          opener = b;
          d.showModal();
          const to = b.getAttribute("data-dialog-show");
          const target = to && document.getElementById(to);
          const slider = target && d.contains(target) && target.hasAttribute("data-slide") && target.closest("[data-slider]");
          if (slider) slider.dispatchEvent(new CustomEvent("slidergo", { detail: $$("[data-slide]", slider).indexOf(target) }));
          else if (target && d.contains(target)) target.scrollIntoView({ block: "start" });
          b.setAttribute("aria-expanded", "true");
          document.body.style.overflow = "hidden";
        });
      });
      $$("[data-dialog-close]", d).forEach(c => c.addEventListener("click", e => { e.preventDefault(); d.close(); }));
      d.addEventListener("click", e => { if (e.target === d) d.close(); });   // backdrop
      d.addEventListener("close", () => {
        document.body.style.overflow = "";
        openers.forEach(b => b.setAttribute("aria-expanded", "false"));
        if (opener) opener.focus();
      });
    });
  }

  /* -------------------------------------------------------------- lamele m² */
  function initCalc(form) {
    const out = $("[data-calc-out]", form);
    if (!out) return;
    form.addEventListener("submit", e => {
      e.preventDefault();
      const pick = k => $("[data-calc='" + k + "']", form);
      const w = parseFloat((pick("width") || pick("sirina") || {}).value) || 0;
      const h = parseFloat((pick("height") || pick("visina") || {}).value) || 0;
      const sel = pick("collection") || pick("kolekcija");
      const opt = sel && sel.options[sel.selectedIndex];
      const perM2 = parseFloat((opt && (opt.getAttribute("data-per-m2") || opt.getAttribute("data-kom-po-m2"))) || form.getAttribute("data-per-m2") || form.getAttribute("data-kom-po-m2") || "3.7");
      const unit = parseFloat((opt && (opt.getAttribute("data-unit-price") || opt.getAttribute("data-cijena"))) || form.getAttribute("data-unit-price") || form.getAttribute("data-cijena") || "0");
      if (!w || !h) { out.hidden = false; out.innerHTML = T.calcMissing; return; }
      const m2 = w * h;
      const m2r = m2 * 1.1;
      const kom = Math.ceil(m2r * perM2);
      out.hidden = false;
      const fmt = n => n.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const vars = { area: fmt(m2), reserve: fmt(m2r), pieces: kom, price: money0(kom * unit) };
      out.innerHTML =
        "<strong>" + fill(T.calcArea, vars) + "</strong>" +
        "<br>" + fill(T.calcReserve, vars) +
        "<br>" + fill(T.calcPieces, vars) +
        (unit ? "<br>" + fill(T.calcPrice, vars) : "") +
        '<br><a class="w-button-primary w-button-primary--small" style="margin-top:12px" href="' + T.cartHref + '">' + fill(T.calcCta, vars) + "</a>";
    });
    form.addEventListener("reset", () => { out.hidden = true; });
  }

  /* ------------------------------------------------------------------ cart */
  function initCart(root) {
    const rows = $$("[data-cart-row]", root);
    if (!rows.length) return;
    const FREE = parseFloat(root.getAttribute("data-free-shipping") || "50");

    function line(r) {
      const q = parseInt(($("input", r) || {}).value, 10) || 0;
      const p = parseFloat(r.getAttribute("data-unit-price") || "0");
      const out = $("[data-line-total]", r);
      if (out) out.textContent = eur(q * p);
      return q * p;
    }

    function recalc() {
      let sub = 0, items = 0;
      rows.forEach(r => {
        if (r.hidden) return;
        sub += line(r);
        items += parseInt(($("input", r) || {}).value, 10) || 0;
      });
      const ship = sub === 0 ? 0 : (sub >= FREE ? 0 : 4.9);
      const set = (sel, val) => $$(sel, document).forEach(e => e.textContent = val);
      set("[data-cart-subtotal]", eur(sub));
      set("[data-cart-shipping]", sub === 0 ? T.shipNone : (ship === 0 ? T.shipFreeLabel : money(ship)));
      set("[data-cart-total]", eur(sub + ship));
      set("[data-cart-items]", String(items));

      const bar = $("[data-ship-progress]");
      const msg = $("[data-ship-remaining]");
      const pct = Math.min(100, (sub / FREE) * 100);
      if (bar) bar.style.width = pct + "%";
      if (msg) msg.innerHTML = sub >= FREE
        ? T.shipFree
        : fill(T.shipRemaining, { amount: money(FREE - sub) });

      const empty = $("[data-cart-empty]");
      const filled = $("[data-cart-filled]");
      const isEmpty = rows.every(r => r.hidden);
      if (empty) empty.hidden = !isEmpty;
      if (filled) filled.hidden = isEmpty;
    }

    rows.forEach(r => {
      const inp = $("input", r);
      if (inp) inp.addEventListener("change", recalc);
      const rm = $("[data-cart-remove]", r);
      if (rm) rm.addEventListener("click", e => { e.preventDefault(); r.hidden = true; recalc(); });
    });
    recalc();
  }

  /* --------------------------------------------------------------- favorite */
  function initFavs() {
    const badge = $("[data-fav-count]");
    let n = badge ? parseInt(badge.textContent, 10) || 0 : 0;
    $$("[data-fav]").forEach(b => b.addEventListener("click", e => {
      e.preventDefault();
      const on = b.classList.toggle("is-active");   // the button holds heart + heart-fill icons; CSS shows one
      b.setAttribute("aria-pressed", on ? "true" : "false");
      n = Math.max(0, n + (on ? 1 : -1));
      if (badge) badge.textContent = String(n);
    }));
  }

  /* ------------------------------------------------------------- mobile nav */
  function initMobileNav() {
    const btn = $("[data-nav-toggle]");
    const panel = $("[data-nav-panel]");
    if (!btn || !panel) return;
    function open(on) {
      panel.classList.toggle("is-open", on);
      btn.setAttribute("aria-expanded", on ? "true" : "false");
      document.body.style.overflow = on ? "hidden" : "";
    }
    btn.addEventListener("click", e => { e.preventDefault(); open(!panel.classList.contains("is-open")); });
    $$("[data-nav-close]", panel).forEach(c => c.addEventListener("click", e => { e.preventDefault(); open(false); }));
    document.addEventListener("keydown", e => { if (e.key === "Escape") open(false); });
    $$("[data-nav-drill]", panel).forEach(d => d.addEventListener("click", e => {
      e.preventDefault();
      d.parentNode.classList.toggle("is-open");
    }));
  }

  /* ------------------------------------------------------- header dropdown */
  // <button type="button" data-menu-toggle aria-controls="menu-x" aria-expanded="false">…</button>
  // + <div id="menu-x" data-menu hidden>…</div>: click toggles, one open at a time,
  // Escape closes (focus back to the toggle), a click outside closes.
  function initMenus() {
    const toggles = $$("[data-menu-toggle][aria-controls]")
      .filter(t => document.getElementById(t.getAttribute("aria-controls")));
    if (!toggles.length) return;
    const panelOf = t => document.getElementById(t.getAttribute("aria-controls"));
    function set(t, on) {
      panelOf(t).hidden = !on;
      t.setAttribute("aria-expanded", on ? "true" : "false");
    }
    const closeAll = except => toggles.forEach(t => { if (t !== except) set(t, false); });
    toggles.forEach(t => {
      set(t, false);
      t.addEventListener("click", e => {
        e.preventDefault();
        const on = t.getAttribute("aria-expanded") !== "true";
        closeAll(t);
        set(t, on);
      });
    });
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      const open = toggles.find(t => t.getAttribute("aria-expanded") === "true");
      if (open) { set(open, false); open.focus(); }
    });
    document.addEventListener("click", e => {
      if (!toggles.some(t => t.contains(e.target) || panelOf(t).contains(e.target))) closeAll(null);
    });
  }

  /* -------------------------------------------------------------- forms/UX */
  function initForms() {
    $$("form[data-demo-form]").forEach(f => f.addEventListener("submit", e => {
      e.preventDefault();
      let note = $("[data-form-sent]", f);
      if (!note) {
        note = document.createElement("p");
        note.className = "w-note";
        note.setAttribute("data-form-sent", "");
        f.appendChild(note);
      }
      // data-demo-note: the line after the thanks (booking form: "Please check your email inbox."), else the wireframe note
      note.innerHTML = '<strong class="w-note__title">' + (f.getAttribute("data-demo-form") || T.formThanks) +
        "</strong> " + (f.getAttribute("data-demo-note") || T.formSuffix);
      note.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }));

    // search suggestions
    const sb = $("[data-search]");
    const sug = $("[data-search-suggest]");
    if (sb && sug) {
      const input = $("input", sb);
      input.addEventListener("focus", () => sug.hidden = false);
      input.addEventListener("input", () => {
        const q = input.value.toLowerCase();
        let any = false;
        $$("li", sug).forEach(li => {
          const hit = !q || li.textContent.toLowerCase().indexOf(q) > -1;
          li.hidden = !hit;
          any = any || hit;
        });
        sug.hidden = !any;
      });
      document.addEventListener("click", e => { if (!sb.contains(e.target) && !sug.contains(e.target)) sug.hidden = true; });
      sb.addEventListener("submit", e => e.preventDefault());
    }

    // back to top
    const top = $("[data-to-top]");
    if (top) {
      top.addEventListener("click", e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); });
      window.addEventListener("scroll", () => { top.hidden = window.scrollY < 600; });
      top.hidden = true;
    }
  }

  /* ---------------------------------------------------------------- bundle */
  function initBundle(root) {
    const boxes = $$("[data-bundle-item]", root);
    const out = $("[data-bundle-total]", root);
    if (!boxes.length || !out) return;
    function calc() {
      const sum = boxes.filter(b => b.checked)
        .reduce((a, b) => a + parseFloat(b.getAttribute("data-price") || "0"), 0);
      out.textContent = eur0(sum);
    }
    boxes.forEach(b => b.addEventListener("change", calc));
    calc();
  }

  /* --------------------------------------------------------------- chooser */
  // Guided selection: radio/checkbox answers -> show [data-when="key=a|b key2=c"] results.
  function initChooser(root) {
    const inputs = $$("input[type=radio], input[type=checkbox]", root).filter(i => i.name);
    const results = $$("[data-when]", root);
    const empty = $("[data-chooser-empty]", root);
    if (!inputs.length || !results.length) return;
    function answers() {
      const a = {};
      inputs.forEach(i => { if (i.checked) (a[i.name] = a[i.name] || []).push(i.value); });
      return a;
    }
    function matches(r, a) {
      return r.getAttribute("data-when").trim().split(/\s+/).every(tok => {
        const [k, v] = tok.split("=");
        const want = (v || "").split("|");
        return (a[k] || []).some(x => want.indexOf(x) > -1);
      });
    }
    function apply() {
      const a = answers();
      let n = 0;
      results.forEach(r => { const on = matches(r, a); r.hidden = !on; if (on) n++; });
      if (empty) empty.hidden = n > 0;
    }
    inputs.forEach(i => i.addEventListener("change", apply));
    $$("[data-chooser-reset]", root).forEach(b => b.addEventListener("click", e => {
      e.preventDefault(); inputs.forEach(i => { i.checked = false; }); apply();
    }));
    apply();
  }

  /* -------------------------------------------------------------------- toc */
  // nav[data-toc]: in-page links (#id). The link of the section being read gets aria-current="true":
  // the last section whose top has passed the upper third of the viewport (the first one until then).
  function initToc(nav) {
    const pairs = $$('a[href^="#"]', nav)
      .map(a => [a, document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)))])
      .filter(p => p[1]);
    if (!pairs.length) return;
    let current = null, ticking = false;
    const update = () => {
      ticking = false;
      const line = window.innerHeight / 3;
      let pick = pairs[0];
      pairs.forEach(p => { if (p[1].getBoundingClientRect().top <= line) pick = p; });
      if (pick === current) return;
      if (current) current[0].removeAttribute("aria-current");
      pick[0].setAttribute("aria-current", "true");
      current = pick;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ------------------------------------------------------------------ copy */
  // button[data-copy="TEXT"]: copies TEXT (an empty data-copy copies the page URL: "Copy link"); the nearest
  // [data-copy-status] (inside the same [role=group] or section) says "Copied" (data-copy-done) or, without
  // clipboard access, "Copy this: TEXT" (data-copy-fail).
  function initCopy(btn) {
    const box = btn.closest("[role=group], section") || document;
    const status = $("[data-copy-status]", box);
    let timer = null;
    const say = msg => {
      if (status) status.textContent = msg;
      btn.classList.add("is-copied");
      clearTimeout(timer);
      timer = setTimeout(() => { btn.classList.remove("is-copied"); if (status) status.textContent = ""; }, 2500);
    };
    btn.addEventListener("click", () => {
      const text = btn.getAttribute("data-copy") || location.href;
      const fail = () => say(fill(btn.getAttribute("data-copy-fail") || T.copyFailed, { url: text }));
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => say(btn.getAttribute("data-copy-done") || T.copied), fail);
      } else {
        fail();
      }
    });
  }

  /* ---------------------------------------------------------------- wizard */
  // Multi-step form: [data-wizard-panel] steps, validated one at a time. Optional:
  // [data-wizard-goto="n"] buttons jump back to panel n (recap "Edit"); done step marks are clickable;
  // a [data-wizard-done] panel replaces the steps after submit (every mark done, the last one current).
  function initWizard(form) {
    const panels = $$("[data-wizard-panel]", form);
    if (panels.length < 2) return;
    const marks = $$("[data-wizard-step]", form);
    const prev = $("[data-wizard-prev]", form);
    const next = $("[data-wizard-next]", form);
    const submit = $("[data-wizard-submit]", form);
    const counter = $("[data-wizard-counter]", form);
    const done = $("[data-wizard-done]", form);
    let i = 0, finished = false;
    // bring the top of the form back into view when a step starts above the viewport
    function toTop() {
      const y = form.getBoundingClientRect().top;
      if (y < 0) window.scrollTo({ top: window.scrollY + y - 96, behavior: "smooth" });
    }
    function show(n, scroll) {
      if (finished) return;
      i = n;
      panels.forEach((p, k) => { p.hidden = k !== i; });
      marks.forEach((m, k) => {
        m.classList.toggle("is-active", k === i);
        m.classList.toggle("is-done", k < i);
        if (k === i) m.setAttribute("aria-current", "step"); else m.removeAttribute("aria-current");
      });
      if (prev) prev.hidden = i === 0;
      if (next) next.hidden = i === panels.length - 1;
      if (submit) submit.hidden = i !== panels.length - 1;
      if (counter) counter.textContent = fill(T.wizardCounter, { n: i + 1, total: panels.length });
      if (scroll) toTop();
    }
    const valid = () => $$("input, select, textarea", panels[i]).every(el => el.reportValidity());
    if (next) next.addEventListener("click", e => { e.preventDefault(); if (i < panels.length - 1 && valid()) show(i + 1, true); });
    if (prev) prev.addEventListener("click", e => { e.preventDefault(); if (i > 0) show(i - 1, true); });
    $$("[data-wizard-goto]", form).forEach(b => b.addEventListener("click", e => {
      e.preventDefault(); show(parseInt(b.getAttribute("data-wizard-goto"), 10) || 0, true);
    }));
    marks.forEach((m, k) => m.addEventListener("click", () => { if (k < i) show(k, true); }));
    form.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target.tagName !== "TEXTAREA" && e.target.tagName !== "BUTTON" && i < panels.length - 1) {
        e.preventDefault(); if (valid()) show(i + 1, true);
      }
    });
    if (done) form.addEventListener("submit", e => {
      e.preventDefault();
      finished = true;
      form.classList.add("is-finished");
      panels.forEach(p => { p.hidden = true; });
      done.hidden = false;
      marks.forEach((m, k) => {
        m.classList.remove("is-active");
        m.classList.add("is-done");
        if (k === marks.length - 1) m.setAttribute("aria-current", "step"); else m.removeAttribute("aria-current");
      });
      [prev, next, submit].forEach(b => { if (b) b.hidden = true; });
      if (counter) counter.hidden = true;
      toTop();
      done.focus({ preventScroll: true });
    });
    show(0);
  }

  /* ---------------------------------------------------------------- mirror */
  // [data-mirror="id id2"]: shows the current values of those fields (space-joined) anywhere on the
  // page, e.g. a recap of earlier wizard steps or a card preview. Empty fields show "—".
  function initMirrors() {
    const outs = $$("[data-mirror]");
    if (!outs.length) return;
    const val = id => { const el = document.getElementById(id); return el ? String(el.value).trim() : ""; };
    const sync = () => outs.forEach(o => {
      o.textContent = o.getAttribute("data-mirror").trim().split(/\s+/).map(val).filter(Boolean).join(" ") || "—";
    });
    document.addEventListener("input", sync);
    document.addEventListener("change", sync);
    sync();
  }

  /* ------------------------------------------------------------------ quiz */
  // form[data-quiz]: one [data-quiz-step] fieldset at a time, then the items ([data-quiz-item]) ranked by
  // the answers their data-quiz-tags hold ("name=v1|v2 …"), weighted by the step's data-quiz-weight;
  // data-quiz-require steps drop items without the answer. Top data-quiz-show items are shown.
  const quizTokens = s => (s || "").trim().split(/\s+/).filter(Boolean).map(t => {
    const [k, v] = t.split("="); return [k, (v || "").split("|")];
  });
  function initQuiz(form) {
    const steps = $$("[data-quiz-step]", form);
    const result = $("[data-quiz-result]", form);
    const list = $("[data-quiz-list]", form);
    if (!steps.length || !result || !list) return;
    const items = $$("[data-quiz-item]", list);
    const prev = $("[data-quiz-prev]", form), next = $("[data-quiz-next]", form), fin = $("[data-quiz-finish]", form);
    const counter = $("[data-quiz-counter]", form), bar = $("[data-quiz-progress]", form);
    const empty = $("[data-quiz-empty]", form);
    const show = parseInt(form.getAttribute("data-quiz-show"), 10) || 3;
    const reveals = form.id ? $$('[data-quiz-reveal="' + form.id + '"]') : [];
    let i = 0;
    function toTop() {
      const y = form.getBoundingClientRect().top;
      if (y < 0) window.scrollTo({ top: window.scrollY + y - 96, behavior: "smooth" });
    }
    function go(n, scroll) {
      i = n;
      result.hidden = true;
      steps.forEach((s, k) => { s.hidden = k !== i; });
      if (prev) prev.hidden = i === 0;
      if (next) next.hidden = i === steps.length - 1;
      if (fin) fin.hidden = i !== steps.length - 1;
      if (counter) { counter.hidden = false; counter.textContent = fill(T.quizCounter, { n: i + 1, total: steps.length }); }
      if (bar) { bar.hidden = false; bar.max = steps.length; bar.value = i + 1; }
      if (scroll) toTop();
    }
    const valid = () => $$("input, select", steps[i]).every(el => el.reportValidity());
    function answers() {
      return steps.map(s => {
        const picked = $$("input:checked", s);
        return { name: picked.length ? picked[0].name : "", values: picked.map(p => p.value),
          weight: parseFloat(s.getAttribute("data-quiz-weight") || "1"), require: s.hasAttribute("data-quiz-require") };
      }).filter(a => a.name);
    }
    const hits = (toks, a) => toks.some(([k, vs]) => k === a.name && vs.some(v => a.values.indexOf(v) > -1));
    function finish() {
      const ans = answers();
      const scored = items.map((el, order) => {
        const toks = quizTokens(el.getAttribute("data-quiz-tags"));
        const out = ans.some(a => a.require && !hits(toks, a));
        const score = ans.reduce((s, a) => s + (hits(toks, a) ? a.weight : 0), 0);
        return { el, order, out, score };
      });
      scored.sort((a, b) => (a.out - b.out) || (b.score - a.score) || (a.order - b.order));
      let rank = 0;
      scored.forEach(s => {
        list.appendChild(s.el);
        const on = !s.out && rank < show;
        if (on) rank++;
        s.el.hidden = !on;
        s.el.setAttribute("data-quiz-score", String(s.score));
        if (on) s.el.setAttribute("data-quiz-rank", String(rank)); else s.el.removeAttribute("data-quiz-rank");
        $$("[data-quiz-best]", s.el).forEach(b => { b.hidden = !(on && rank === 1); });
        $$("[data-quiz-why]", s.el).forEach(w => { w.hidden = !ans.some(a => hits(quizTokens(w.getAttribute("data-quiz-why")), a)); });
      });
      if (empty) empty.hidden = rank > 0;
      // hidden input[data-quiz-picks]: the shown items (data-quiz-id, else the first link's file name), in rank
      // order, so a "send me my matches" submit carries them with the answers
      const pickId = el => {
        if (el.hasAttribute("data-quiz-id")) return el.getAttribute("data-quiz-id");
        const a = $("a[href]", el);
        return a ? a.getAttribute("href").replace(/\.html.*$/, "") : "";
      };
      const picks = scored.filter(s => !s.el.hidden).map(s => pickId(s.el));
      $$("[data-quiz-picks]", form).forEach(p => { p.value = picks.join(","); });
      steps.forEach(s => { s.hidden = true; });
      [prev, next, fin, counter, bar].forEach(b => { if (b) b.hidden = true; });
      result.hidden = false;
      form.classList.add("is-finished");
      reveals.forEach(r => { r.hidden = false; });
      document.dispatchEvent(new CustomEvent("wf:reveal"));
      toTop();
      result.focus({ preventScroll: true });
    }
    if (next) next.addEventListener("click", e => { e.preventDefault(); if (valid()) go(i + 1, true); });
    if (prev) prev.addEventListener("click", e => { e.preventDefault(); if (i > 0) go(i - 1, true); });
    if (fin) fin.addEventListener("click", e => { e.preventDefault(); if (valid()) finish(); });
    const advance = () => { if (!valid()) return; if (i < steps.length - 1) go(i + 1, true); else finish(); };
    // once finished, a submit button in the result (formaction = a thank-you page) submits for real
    form.addEventListener("submit", e => { if (form.classList.contains("is-finished")) return; e.preventDefault(); advance(); });
    form.addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target.tagName === "INPUT" && !form.classList.contains("is-finished")) { e.preventDefault(); advance(); }
    });
    $$("[data-quiz-reset]", form).forEach(b => b.addEventListener("click", e => {
      e.preventDefault();
      $$("input", form).forEach(x => { if (x.type === "radio" || x.type === "checkbox") x.checked = false; });
      form.classList.remove("is-finished");
      go(0, true);
      const first = $("input", steps[0]);
      if (first) first.focus({ preventScroll: true });
    }));
    go(0);
  }

  /* ------------------------------------------------------------- countdown */
  // [data-countdown="seconds"]: starts when first visible, deadline kept in sessionStorage
  // (data-countdown-key) so a reload never restarts it; at zero the section swaps
  // [data-countdown-live] for [data-countdown-done].
  function initCountdown(el) {
    const secs = parseInt(el.getAttribute("data-countdown"), 10) || 0;
    const key = "wf-countdown:" + (el.getAttribute("data-countdown-key") || location.pathname);
    const scope = el.closest("[data-countdown-scope], section") || document;
    const two = n => (n < 10 ? "0" : "") + n;
    let timer = null;
    const visible = () => !el.closest("[hidden]") && el.getClientRects().length > 0;
    function paint(left) {
      const h = Math.floor(left / 3600), m = Math.floor(left % 3600 / 60), s = left % 60;
      const parts = { "[data-countdown-h]": two(h), "[data-countdown-m]": two(m), "[data-countdown-s]": two(s) };
      Object.keys(parts).forEach(sel => $$(sel, el).forEach(n => { n.textContent = parts[sel]; }));
      $$("[data-countdown-out]", el).forEach(n => { n.textContent = h + ":" + two(m) + ":" + two(s); });
      if (left <= 0) {
        clearInterval(timer);
        el.classList.add("is-expired");
        $$("[data-countdown-live]", scope).forEach(n => { n.hidden = true; });
        $$("[data-countdown-done]", scope).forEach(n => { n.hidden = false; });
      }
    }
    function start() {
      if (timer || !visible()) return;
      let end = 0;
      try { end = parseInt(sessionStorage.getItem(key), 10) || 0; } catch (e) { /* storage blocked */ }
      if (!end) {
        end = Date.now() + secs * 1000;
        try { sessionStorage.setItem(key, String(end)); } catch (e) { /* storage blocked */ }
      }
      const tick = () => paint(Math.max(0, Math.round((end - Date.now()) / 1000)));
      timer = setInterval(tick, 1000);
      tick();
    }
    document.addEventListener("wf:reveal", start);
    start();
  }

  /* -------------------------------------------------------------------- go */
  document.addEventListener("DOMContentLoaded", function () {
    $$("[data-slider]").forEach(initSlider);
    $$("[data-tabs]").forEach(initTabs);
    $$("[data-gallery]").forEach(initGallery);
    $$("[data-qty]").forEach(initQty);
    $$("[data-coupon]").forEach(initCoupon);
    $$("input[data-date-end]").forEach(initDateRange);
    $$("[data-variants]").forEach(initVariants);
    $$("[data-catalog]").forEach(initCatalog);
    $$("[data-calc-lamele]").forEach(initCalc);
    $$("[data-cart]").forEach(initCart);
    $$("[data-bundle]").forEach(initBundle);
    $$("[data-chooser]").forEach(initChooser);
    $$("[data-filter-panel]").forEach(initFilterDrawer);
    $$("form[data-wizard]").forEach(initWizard);
    $$("form[data-quiz]").forEach(initQuiz);
    $$("[data-countdown]").forEach(initCountdown);
    initMirrors();
    $$("[data-copy]").forEach(initCopy);
    $$("nav[data-toc]").forEach(initToc);
    initFavs();
    initDialogs();
    initMenus();
    initMobileNav();
    initForms();
  });
})();
