// המסך הראשי: טעינה, כרטיס היום, מדף, פרטי מקום, הסבר לתג, ריק ושגיאה
(function () {
  const { category, area, formatDate, esc, levels } = TovLists;
  const $ = sel => document.querySelector(sel);

  const main = $("#main");
  const todaySlot = $("#today");
  const shelfSection = $("#shelf-section");
  const shelf = $("#shelf");
  const dots = $("#shelf-dots");
  const detailsDlg = $("#details");
  const badgeDlg = $("#badge-help");

  // מצב להדגמה: index.html?state=empty | error | loading
  const state = new URLSearchParams(location.search).get("state") || "normal";
  let placesById = {};
  let lastFocus = null;

  // ---------- טעינה ----------
  function showLoading() {
    main.setAttribute("aria-busy", "true");
    todaySlot.innerHTML = `
      <div class="card card--today skeleton" aria-hidden="true">
        <div class="sk sk-media"></div>
        <div class="card__body">
          <div class="sk sk-line" style="width:30%"></div>
          <div class="sk sk-line sk-lg" style="width:70%"></div>
          <div class="sk sk-line" style="width:45%"></div>
          <div class="sk sk-line" style="width:90%"></div>
          <div class="sk sk-line" style="width:80%"></div>
        </div>
      </div>
      <p class="loading-text">טוען...</p>`;
    shelfSection.hidden = false;
    shelf.innerHTML = [1, 2, 3].map(() =>
      `<div class="card card--shelf skeleton" aria-hidden="true"><div class="sk sk-media"></div>
        <div class="card__body"><div class="sk sk-line" style="width:80%"></div>
        <div class="sk sk-line" style="width:60%"></div></div></div>`).join("");
    dots.innerHTML = "";
  }

  // ---------- שגיאה ----------
  function showError() {
    main.setAttribute("aria-busy", "false");
    shelfSection.hidden = true;
    todaySlot.innerHTML = `
      <div class="state-box state-box--error" role="alert">
        <span class="state-icon state-icon--error" aria-hidden="true">!</span>
        <p class="error-text">משהו השתבש. נסו לרענן את הדף</p>
        <button type="button" class="btn btn--primary" id="retry">נסו שוב</button>
      </div>`;
    $("#retry").addEventListener("click", () => load(state === "error" ? "normal" : state));
  }

  // ---------- תוצאה ----------
  function render(data) {
    main.setAttribute("aria-busy", "false");
    placesById = {};
    data.shelf.forEach(p => (placesById[p.id] = p));

    if (data.today) {
      placesById[data.today.place.id] = data.today.place;
      todaySlot.innerHTML = "";
      todaySlot.appendChild(TovCard.renderCard(data.today.place,
        { variant: "today", sentence: data.today.sentence }));
    } else {
      todaySlot.innerHTML = `
        <div class="state-box state-box--empty">
          <span class="state-icon state-icon--empty" aria-hidden="true"></span>
          <p class="empty-title">אין לנו המלצה מאומתת להיום</p>
          <p class="empty-sub">מחר יהיה כרטיס חדש.</p>
        </div>`;
    }

    if (data.shelf.length === 0) {
      shelfSection.hidden = true;
      return;
    }
    shelfSection.hidden = false;
    shelf.innerHTML = "";
    data.shelf.forEach(p => shelf.appendChild(TovCard.renderCard(p, { variant: "shelf" })));
    shelf.scrollLeft = 0; // ב-RTL זה הקצה הימני
    buildDots();
  }

  async function load(s) {
    showLoading();
    try {
      const res = await TovApi.home(s);
      if (!res || !res.ok) return showError();
      render(res);
    } catch (e) {
      showError();
    }
  }

  // ---------- נקודות מתחת למדף ----------
  function pageCount() {
    return Math.max(1, Math.ceil(shelf.scrollWidth / shelf.clientWidth - 0.05));
  }
  function buildDots() {
    const n = pageCount();
    dots.innerHTML = n > 1 ? Array.from({ length: n }, () => "<span></span>").join("") : "";
    updateDots();
  }
  function updateDots() {
    const spans = dots.querySelectorAll("span");
    if (!spans.length) return;
    const max = shelf.scrollWidth - shelf.clientWidth;
    const pos = max > 0 ? Math.abs(shelf.scrollLeft) / max : 0;
    const active = Math.round(pos * (spans.length - 1));
    spans.forEach((s, i) => s.classList.toggle("on", i === active));
  }
  shelf.addEventListener("scroll", updateDots, { passive: true });
  window.addEventListener("resize", () => { if (!shelfSection.hidden) buildDots(); });

  // ---------- חלונות ----------
  function openDialog(dlg, opener) {
    lastFocus = opener || document.activeElement;
    dlg.showModal();
    dlg.querySelector(".close-btn").focus();
  }
  [detailsDlg, badgeDlg].forEach(dlg => {
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); }); // לחיצה על הרקע
    dlg.querySelector(".close-btn").addEventListener("click", () => dlg.close());
    dlg.addEventListener("close", () => {
      if (dlg === badgeDlg && detailsDlg.open) return detailsDlg.querySelector(".close-btn").focus();
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
    });
  });

  function noInfo() { return `<span class="no-info">אין לנו מידע</span>`; }

  function stars(r) {
    const full = Math.round(r);
    return `<span class="stars" aria-hidden="true">${"★".repeat(full)}<span class="stars-off">${"★".repeat(5 - full)}</span></span>`;
  }

  async function openDetails(placeId, opener) {
    const p = placesById[placeId];
    if (!p) return;
    const body = detailsDlg.querySelector(".sheet__body");
    body.innerHTML = `
      <div class="sheet__head">
        <h2 id="details-title" class="sheet__title">${esc(p.name)}</h2>
        <p class="card__meta">${TovCard.meta(p)}</p>
        <div class="card__check">${TovBadge.badgeButton(p.verification_level)}
          <span class="caption">נבדק לאחרונה: ${formatDate(p.last_verified_at)}</span></div>
      </div>
      <ul class="info-rows">
        <li><span class="info-icon" aria-hidden="true">${ICON.clock}</span>
          <div><p class="info-label">שעות פתיחה</p>
          <p class="info-value">${p.opening_hours ? esc(p.opening_hours) : noInfo()}</p></div></li>
        <li><span class="info-icon" aria-hidden="true">${ICON.star}</span>
          <div><p class="info-label">דירוג</p>
          <p class="info-value" id="rating-value" aria-live="polite">${p.has_rating ? "טוען..." : noInfo()}</p></div></li>
        <li><span class="info-icon" aria-hidden="true">${ICON.pin}</span>
          <div><p class="info-label">אזור</p>
          <p class="info-value">${esc(area(p.area).label)}</p></div></li>
      </ul>`;
    openDialog(detailsDlg, opener);

    if (p.has_rating) {
      const out = $("#rating-value");
      try {
        const res = await TovApi.rating(p.id);
        if (!detailsDlg.open || !document.contains(out)) return;
        out.innerHTML = res.ok && res.rating != null
          ? `<span class="rating-num">${res.rating.toFixed(1)}</span> ${stars(res.rating)} <span class="g-maps" dir="ltr">Google Maps</span>`
          : noInfo();
      } catch (e) {
        out.innerHTML = noInfo();
      }
    }
  }

  function openBadgeHelp(opener) {
    badgeDlg.querySelector(".sheet__body").innerHTML = `
      <h2 id="badge-title" class="sheet__title">מה אומר התג?</h2>
      <ul class="level-rows">${levels().map(l => `
        <li><span class="level-icon">${TovBadge.icon(l.id)}</span>
          <div><p class="level-name">${l.label}</p><p class="level-text">${l.explanation}</p></div></li>`).join("")}
      </ul>`;
    if (badgeDlg.open) return;
    // תג מתוך פרטי מקום: החלון נפתח מעל, והפוקוס יחזור לפרטים
    if (detailsDlg.open) { badgeDlg.showModal(); badgeDlg.querySelector(".close-btn").focus(); }
    else openDialog(badgeDlg, opener);
  }

  // לחיצות: תג, לפרטים, כרטיס מדף
  document.addEventListener("click", e => {
    const badge = e.target.closest("[data-badge]");
    if (badge) { e.stopPropagation(); return openBadgeHelp(badge); }
    const det = e.target.closest("[data-details]");
    if (det) {
      const card = det.closest("[data-place-id]");
      if (card) openDetails(card.dataset.placeId, det);
    }
  });

  const ICON = {
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>'
  };

  // סימון המצב הפעיל בפס ההדגמה
  document.querySelectorAll(".demo-bar a").forEach(a => {
    if ((new URL(a.href).searchParams.get("state") || "normal") === state) a.setAttribute("aria-current", "page");
  });

  load(state);
})();
