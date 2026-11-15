// Place details (DESIGN.md screens 2 and 5): a <dialog> that opens from a card.
// Hours come from the home response. The rating is loaded only when the dialog opens.
// Every text from the data goes in with textContent only.
import { areaLabel, formatDate } from './lists.js';
import { renderBadge } from './badge.js';
import { metaText } from './card.js';
import { renderReportForm } from './report.js';

const dialog = document.getElementById('details');
const body = dialog.querySelector('.sheet__body');
let opener = null;
let openId = 0; // a late rating answer for a place that is no longer open is ignored

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  clock: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', { d: 'M12 7v5l3 2' }]],
  star: [['path', { d: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z' }]],
  flag: [['path', { d: 'M5 21V4' }], ['path', { d: 'M5 4h11l-2 4 2 4H5' }]],
  pin: [['path', { d: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z' }], ['circle', { cx: 12, cy: 9.5, r: 2.5 }]]
};
function icon(name) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('focusable', 'false');
  for (const [tag, attrs] of ICONS[name]) {
    const part = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) part.setAttribute(k, v);
    svg.append(part);
  }
  return svg;
}

const noInfo = () => el('span', 'no-info', 'אין לנו מידע');

function infoRow(iconName, label, value) {
  const li = el('li');
  const box = el('span', 'info-icon');
  box.setAttribute('aria-hidden', 'true');
  box.append(icon(iconName));
  const text = el('div');
  const valueBox = el('p', 'info-value');
  valueBox.append(value);
  text.append(el('p', 'info-label', label), valueBox);
  li.append(box, text);
  return { li, valueBox };
}

function ratingView(rating) {
  const frag = document.createDocumentFragment();
  const full = Math.round(rating);
  const stars = el('span', 'stars', '★'.repeat(full));
  stars.setAttribute('aria-hidden', 'true'); // the number already says the rating
  stars.append(el('span', 'stars-off', '★'.repeat(5 - full)));
  const source = el('span', 'g-maps', 'Google Maps');
  source.dir = 'ltr';
  frag.append(el('span', 'rating-num', rating.toFixed(1)), ' ', stars, ' ', source);
  return frag;
}

async function loadRating(place, valueBox, id) {
  let view;
  try {
    const res = await fetch(`/api/trip?action=rating&place_id=${encodeURIComponent(place.id)}`);
    const data = await res.json();
    view = res.ok && data.ok && typeof data.rating === 'number' ? ratingView(data.rating) : noInfo();
  } catch {
    view = noInfo();
  }
  if (id === openId && dialog.open) valueBox.replaceChildren(view);
}

export function openDetails(place, from) {
  openId += 1;
  opener = from ?? document.activeElement;

  const head = el('div', 'sheet__head');
  const title = el('h2', 'sheet__title', place.name);
  title.id = 'details-title';
  const check = el('div', 'card__check');
  check.append(renderBadge(place.verification_level),
    el('span', 'caption', `נבדק לאחרונה: ${formatDate(place.last_verified_at)}`));
  head.append(title, el('p', 'card__meta', metaText(place)), check);

  const rows = el('ul', 'info-rows');
  const hours = infoRow('clock', 'שעות פתיחה', place.opening_hours ? place.opening_hours : noInfo());
  hours.valueBox.classList.add('hours-text');
  const rating = infoRow('star', 'דירוג', place.has_rating ? 'טוען...' : noInfo());
  rating.valueBox.setAttribute('aria-live', 'polite');
  const area = infoRow('pin', 'אזור', areaLabel(place.area));
  rows.append(hours.li, rating.li, area.li);

  const report = el('button', 'report-link');
  report.type = 'button';
  const flag = icon('flag');
  flag.setAttribute('aria-hidden', 'true');
  report.append(flag, el('span', '', 'דווחו על טעות'));
  const details = [head, rows, report];
  const backToDetails = () => {
    body.replaceChildren(...details);
    report.focus();
  };
  report.addEventListener('click', () => renderReportForm(body, place, backToDetails));

  body.replaceChildren(...details);
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.close-btn').focus();

  if (place.has_rating) loadRating(place, rating.valueBox, openId);
}

// X, a click on the dark background, and Esc (built into <dialog>) close it
dialog.querySelector('.close-btn').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  openId += 1;
  if (opener && document.contains(opener)) opener.focus();
  opener = null;
});
