// The main screen: one call to action=home, then today's card, the shelf and the states.
import { loadLists } from './lists.js';
import { renderCard } from './card.js';

const todayBox = document.getElementById('today');
const shelfSection = document.getElementById('shelf-section');
const shelf = document.getElementById('shelf');
const dots = document.getElementById('shelf-dots');
const main = document.getElementById('main');

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function showLoading() {
  main.setAttribute('aria-busy', 'true');
  shelfSection.hidden = true;
  todayBox.replaceChildren(el('p', 'loading-text', 'טוען...'));
}

function showNoCard() {
  const box = el('div', 'state-box state-box--empty');
  const ring = el('span', 'state-icon state-icon--empty');
  ring.setAttribute('aria-hidden', 'true');
  box.append(
    ring,
    el('h2', 'empty-title', 'אין לנו המלצה מאומתת להיום'),
    el('p', 'empty-sub', 'מחר יהיה כרטיס חדש.')
  );
  todayBox.replaceChildren(box);
}

function showError() {
  shelfSection.hidden = true;
  const box = el('div', 'state-box state-box--error');
  box.setAttribute('role', 'alert');
  const mark = el('span', 'state-icon state-icon--error', '!');
  mark.setAttribute('aria-hidden', 'true');
  const retry = el('button', 'btn btn--primary', 'נסו שוב');
  retry.type = 'button';
  retry.addEventListener('click', load);
  box.append(mark, el('p', 'error-text', 'משהו השתבש. נסו לרענן את הדף'), retry);
  todayBox.replaceChildren(box);
}

// One dot per card. The dot of the card nearest the start (right side) of the view is "on".
let observer = null;
function renderShelf(places) {
  observer?.disconnect();
  if (places.length === 0) {
    shelfSection.hidden = true;
    return;
  }
  const cards = places.map(p => renderCard(p, { variant: 'shelf' }));
  shelf.replaceChildren(...cards);
  dots.replaceChildren(...cards.map(() => el('span')));
  shelfSection.hidden = false;

  const visible = new Set();
  const update = () => {
    const first = cards.findIndex(c => visible.has(c));
    dots.querySelectorAll('span').forEach((d, i) => d.classList.toggle('on', i === Math.max(first, 0)));
  };
  observer = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.intersectionRatio >= 0.6) visible.add(e.target);
      else visible.delete(e.target);
    }
    update();
  }, { root: shelf, threshold: [0, 0.6, 1] });
  cards.forEach(c => observer.observe(c));
  update();
}

async function load() {
  showLoading();
  try {
    const [res] = await Promise.all([fetch('/api/trip?action=home'), loadLists()]);
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);

    if (data.today) {
      todayBox.replaceChildren(renderCard(data.today.place, { variant: 'today', sentence: data.today.sentence }));
    } else {
      showNoCard();
    }
    renderShelf(data.shelf ?? []);
  } catch (err) {
    console.error(err);
    showError();
  } finally {
    main.removeAttribute('aria-busy');
  }
}

load();
