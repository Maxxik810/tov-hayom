// The shared card component: renderCard(place, { variant: 'today' | 'shelf', sentence })
// Every text from the data goes in with textContent only.
import { categoryLabel, areaLabel, formatDate } from './lists.js';
import { renderBadge } from './badge.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Category tile with its icon. Place photos come in Milestone 7, with their credits.
function media(place) {
  const box = el('div', 'card__media');
  const tile = el('div', `tile tile--${place.category}`);
  tile.setAttribute('aria-hidden', 'true');
  const img = el('img');
  img.src = `img/icons/${place.category}.svg`;
  img.alt = '';
  img.onerror = () => img.remove();
  tile.append(img);
  box.append(tile);
  return box;
}

export const metaText = place => `${categoryLabel(place.category)} · ${areaLabel(place.area)}`;

export function renderCard(place, { variant, sentence = '' }) {
  const date = formatDate(place.last_verified_at);

  if (variant === 'today') {
    const card = el('article', 'card card--today');
    card.dataset.placeId = place.id;
    const body = el('div', 'card__body');
    const check = el('div', 'card__check');
    check.append(renderBadge(place.verification_level), el('span', 'caption', `נבדק לאחרונה: ${date}`));
    body.append(
      el('span', 'tag-today', 'טיול היום'),
      el('h2', 'card__title', place.name),
      el('p', 'card__meta', metaText(place)),
      check,
      el('p', 'card__sentence', sentence)
    );
    card.append(media(place), body);
    return card;
  }

  // Shelf card: the whole card is one button (place details open from it in Milestone 5)
  const card = el('button', 'card card--shelf');
  card.type = 'button';
  card.dataset.placeId = place.id;
  const label = el('span', 'card__body');
  label.append(
    el('span', 'card__title', place.name),
    el('span', 'card__meta', metaText(place)),
    renderBadge(place.verification_level),
    el('span', 'caption', `נבדק: ${date}`)
  );
  card.append(media(place), label);
  return card;
}
