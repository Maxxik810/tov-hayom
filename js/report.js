// "דווחו על טעות" (DESIGN.md screens 13 and 14), inside the place details dialog.
// Three radio rows, an optional text (required for "אחר"), and one POST to action=report.
// Every text goes in with textContent only.
const TYPES = [
  { id: 'hours', label: 'שעות לא נכונות' },
  { id: 'closed', label: 'המקום סגור' },
  { id: 'other', label: 'אחר' }
];
const MAX = 300;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function backButton(onBack) {
  const back = el('button', 'back-btn', '‹ חזרה');
  back.type = 'button';
  back.addEventListener('click', onBack);
  return back;
}

// Screen 14: thanks, or "we already have reports" (blue i, not a red error)
function renderDone(body, place, limited, onBack) {
  const box = el('div', 'report-done');
  const mark = el('span', limited ? 'done-icon done-icon--info' : 'done-icon done-icon--ok', limited ? 'i' : '✓');
  mark.setAttribute('aria-hidden', 'true');
  const title = el('h2', 'done-title', limited ? 'כבר קיבלנו דיווחים על המקום הזה, תודה' : 'תודה, נבדוק');
  title.id = 'details-title';
  const live = el('div');
  live.setAttribute('aria-live', 'polite');
  live.append(title);
  const back = el('button', 'btn btn--secondary', 'חזרה למקום');
  back.type = 'button';
  back.addEventListener('click', onBack);
  box.append(mark, live);
  if (!limited) box.append(el('p', 'done-sub', 'אנחנו בודקים כל דיווח מול המקור הרשמי.'));
  box.append(back);
  body.replaceChildren(box);
  back.focus();
}

export function renderReportForm(body, place, onBack) {
  const form = el('form', 'report-form');
  form.noValidate = true;

  const head = el('div', 'report-head');
  const name = el('p', 'report-place', place.name);
  head.append(backButton(onBack), name);

  const title = el('h2', 'sheet__title', 'מה לא נכון?');
  title.id = 'details-title';

  const set = el('fieldset', 'choice-set');
  const legend = el('legend', 'sr-only', 'מה לא נכון?');
  set.append(legend);
  for (const t of TYPES) {
    const label = el('label', 'choice');
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'type';
    input.value = t.id;
    label.append(input, el('span', 'choice__dot'), el('span', 'choice__text', t.label));
    set.append(label);
  }

  const field = el('div', 'field');
  const textLabel = el('label', '', 'ספרו לנו בקצרה (לא חובה)');
  textLabel.htmlFor = 'report-text';
  const area = document.createElement('textarea');
  area.id = 'report-text';
  area.maxLength = MAX;
  area.rows = 4;
  area.setAttribute('aria-describedby', 'report-hint report-count');
  const helper = el('div', 'field-help');
  const hint = el('span', 'caption', 'בלי שם, טלפון או מייל');
  hint.id = 'report-hint';
  const count = el('span', 'caption', `0/${MAX}`);
  count.id = 'report-count';
  const countLive = el('span', 'sr-only');
  countLive.setAttribute('aria-live', 'polite');
  helper.append(hint, count);
  field.append(textLabel, area, helper, countLive);

  const error = el('p', 'form-error');
  error.setAttribute('role', 'alert');
  const send = el('button', 'btn btn--primary btn--full', 'שליחה');
  send.type = 'submit';
  send.disabled = true;

  const selected = () => form.querySelector('input[name="type"]:checked')?.value ?? null;
  const update = () => {
    const type = selected();
    const isOther = type === 'other';
    textLabel.textContent = isOther ? 'ספרו לנו בקצרה' : 'ספרו לנו בקצרה (לא חובה)';
    area.required = isOther;
    const len = area.value.length;
    count.textContent = `${len}/${MAX}`;
    // Read out only when 20 characters are left
    countLive.textContent = MAX - len <= 20 ? `נשארו ${MAX - len} תווים` : '';
    send.disabled = !type || (isOther && area.value.trim() === '');
  };
  form.addEventListener('change', update);
  area.addEventListener('input', update);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (send.disabled) return;
    send.disabled = true;
    send.textContent = 'שולח...';
    error.textContent = '';
    let status = 'error';
    try {
      const res = await fetch('/api/trip?action=report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ place_id: place.id, type: selected(), text: area.value.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) status = 'ok';
      else if (data.error === 'too_many_reports') status = 'limited';
    } catch {
      status = 'error';
    }
    if (!form.isConnected) return;
    if (status === 'error') {
      error.textContent = 'משהו השתבש. נסו שוב';
      send.textContent = 'שליחה';
      update();
      return;
    }
    renderDone(body, place, status === 'limited', onBack);
  });

  form.append(head, title, set, field, error, send);
  body.replaceChildren(form);
  set.querySelector('input').focus();
}
