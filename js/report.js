// "Report a mistake" (DESIGN.md screens 13 and 14): a form inside the place details dialog.
// No personal details are collected. Every text goes in with textContent only.
const MAX_TEXT = 300;
const SHOW_COUNTER_FROM = 280; // the counter is read aloud only when 20 characters are left

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let types = null;
async function loadTypes() {
  if (types) return types;
  const res = await fetch('data/report-types.json');
  if (!res.ok) throw new Error(`report-types: ${res.status}`);
  types = await res.json();
  return types;
}

// Thank-you screen (screen 14). limit = true when the place already has 5 open reports.
function thanks(container, { limit, onBack }) {
  const box = el('div', 'report-done');
  const mark = el('span', `state-icon ${limit ? 'report-icon--info' : 'report-icon--ok'}`, limit ? 'i' : '✓');
  mark.setAttribute('aria-hidden', 'true');
  const title = el('h2', 'report-title', limit ? 'כבר קיבלנו דיווחים על המקום הזה, תודה' : 'תודה, נבדוק');
  title.setAttribute('aria-live', 'polite');
  title.tabIndex = -1;
  const back = el('button', 'btn btn--secondary btn--full', 'חזרה למקום');
  back.type = 'button';
  back.addEventListener('click', onBack);
  box.append(mark, title, el('p', 'caption', 'אנחנו בודקים כל דיווח מול המקור הרשמי.'), back);
  container.replaceChildren(box);
  title.focus();
}

// Draws the form into container. onBack returns to the place details.
export async function showReportForm(container, place, { onBack }) {
  let list;
  try {
    list = await loadTypes();
  } catch {
    list = [
      { id: 'hours', label: 'שעות לא נכונות' },
      { id: 'closed', label: 'המקום סגור' },
      { id: 'other', label: 'אחר' }
    ];
  }

  const back = el('button', 'link-btn report-back', '‹ חזרה');
  back.type = 'button';
  back.addEventListener('click', onBack);

  const form = el('form', 'report-form');
  form.noValidate = true;

  const title = el('h2', 'report-title', 'מה לא נכון?');
  const placeName = el('p', 'card__meta', place.name);

  const group = el('fieldset', 'report-types');
  group.append(el('legend', 'visually-hidden', 'מה לא נכון?'));
  for (const t of list) {
    const row = el('label', 'report-option');
    const input = el('input');
    input.type = 'radio';
    input.name = 'type';
    input.value = t.id;
    row.append(input, el('span', '', t.label));
    group.append(row);
  }

  const field = el('div', 'field');
  const label = el('label', '', 'ספרו לנו בקצרה (לא חובה)');
  label.htmlFor = 'report-text';
  const area = el('textarea');
  area.id = 'report-text';
  area.maxLength = MAX_TEXT;
  area.rows = 3;
  area.setAttribute('aria-describedby', 'report-hint report-count');
  const hint = el('p', 'caption', 'בלי שם, טלפון או מייל');
  hint.id = 'report-hint';
  const count = el('p', 'caption report-count', `0/${MAX_TEXT}`);
  count.id = 'report-count';
  field.append(label, area, hint, count);

  const error = el('p', 'error-text report-error');
  error.setAttribute('role', 'alert');
  error.hidden = true;

  const submit = el('button', 'btn btn--primary btn--full', 'שליחה');
  submit.type = 'submit';
  submit.disabled = true;

  form.append(title, placeName, group, field, error, submit);
  container.replaceChildren(back, form);

  const chosen = () => form.querySelector('input[name="type"]:checked')?.value ?? null;
  const refresh = () => {
    const type = chosen();
    label.textContent = type === 'other' ? 'ספרו לנו בקצרה' : 'ספרו לנו בקצרה (לא חובה)';
    const len = Array.from(area.value).length;
    count.textContent = `${len}/${MAX_TEXT}`;
    // Read aloud only near the limit
    if (len >= SHOW_COUNTER_FROM) count.setAttribute('aria-live', 'polite');
    else count.removeAttribute('aria-live');
    submit.disabled = !type || (type === 'other' && area.value.trim() === '');
  };
  form.addEventListener('change', refresh);
  area.addEventListener('input', refresh);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const type = chosen();
    if (!type || submit.disabled) return;
    error.hidden = true;
    submit.disabled = true;
    submit.textContent = 'שולח...';
    try {
      const res = await fetch('/api/trip?action=report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: place.id, type, text: area.value.trim() })
      });
      let data = {};
      try { data = await res.json(); } catch { /* not JSON */ }
      if (res.ok && data.ok) return thanks(container, { limit: false, onBack });
      if (res.status === 429 && data.error === 'too_many_reports') return thanks(container, { limit: true, onBack });
      throw new Error(data.error || `HTTP ${res.status}`);
    } catch (err) {
      console.error(err);
      // The text stays in the field
      error.textContent = 'משהו השתבש. נסו שוב';
      error.hidden = false;
      submit.textContent = 'שליחה';
      refresh();
    }
  });

  // First radio gets the focus so a keyboard user can start at once
  group.querySelector('input')?.focus();
}
