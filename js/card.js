// רכיב הכרטיס המשותף: renderCard(place, { variant: "today" | "shelf", sentence })
(function () {
  const { category, area, formatDate, esc } = TovLists;

  // תמונה, ואם אין תמונה (או שהיא לא נטענה) אריח בצבע הקטגוריה
  function media(place) {
    const cat = category(place.category);
    const tile = `<div class="tile tile--${place.category}" aria-hidden="true">
      <img src="img/icons/${place.category}.svg" alt=""></div>`;
    if (!place.image_file) return tile;
    return `<img class="card__img" src="img/places/${esc(place.image_file)}"
      alt="${esc(place.name)}, ${esc(cat.label)}" loading="lazy" width="640" height="360"
      onerror="this.outerHTML=this.dataset.tile" data-tile='${tile.replace(/'/g, "&#39;")}'>`;
  }

  function meta(place) {
    return `${esc(category(place.category).label)} · ${esc(area(place.area).label)}`;
  }

  function renderCard(place, options) {
    const v = options.variant;
    const el = document.createElement(v === "shelf" ? "article" : "article");
    el.className = `card card--${v}`;
    el.dataset.placeId = place.id;

    if (v === "today") {
      el.innerHTML = `
        <div class="card__media">${media(place)}</div>
        <div class="card__body">
          <span class="tag-today">טיול היום</span>
          <h2 class="card__title">${esc(place.name)}</h2>
          <p class="card__meta">${meta(place)}</p>
          <div class="card__check">${TovBadge.badgeButton(place.verification_level)}
            <span class="caption">נבדק לאחרונה: ${formatDate(place.last_verified_at)}</span></div>
          <p class="card__sentence">${esc(options.sentence || "")}</p>
          <button type="button" class="link-btn" data-details>לפרטים <span aria-hidden="true">‹</span></button>
        </div>`;
    } else {
      // כרטיס מדף: כל הכרטיס נלחץ, והתג הוא כפתור נפרד
      el.innerHTML = `
        <button type="button" class="card__hit" data-details
          aria-label="${esc(place.name)}, ${meta(place)}. לפרטים"></button>
        <div class="card__media">${media(place)}</div>
        <div class="card__body">
          <h3 class="card__title">${esc(place.name)}</h3>
          <p class="card__meta">${meta(place)}</p>
          <div class="card__check">${TovBadge.badgeButton(place.verification_level)}</div>
          <span class="caption">נבדק: ${formatDate(place.last_verified_at)}</span>
        </div>`;
    }
    return el;
  }

  window.TovCard = { renderCard, meta };
})();
