// Admin screen: sign-in (Supabase Auth only), places table, edit form, "blocked" switch.
// All data goes through /api/trip with the admin token. The browser never reads a table.
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { loadLists, categoryLabel, areaLabel, formatDate } from './lists.js';
import { renderBadge } from './badge.js';

const auth = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY).auth;

const $ = id => document.getElementById(id);
const loginView = $('login-view');
const placesView = $('places-view');
const logoutBtn = $('logout');
const tbody = $('places-body');
const savedMsg = $('saved');
const editDialog = $('edit-dialog');
const editForm = $('edit-form');
const confirmDialog = $('confirm-dialog');

// What admin_list returned
const state = { date: null, todayId: null, places: [] };
let lists = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// ---------- calls to the function ----------
class AuthError extends Error {}

async function api(action, body) {
  const { data } = await auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AuthError();

  const res = await fetch(`/api/trip?action=${action}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 401) throw new AuthError();
  let json = null;
  try { json = await res.json(); } catch { /* not JSON */ }
  if (!res.ok || !json?.ok) throw new Error(json?.message || 'משהו השתבש. נסו שוב');
  return json;
}

// A 401 or a missing session: sign out and show the sign-in form
async function handleError(err, showMessage) {
  if (err instanceof AuthError) {
    await auth.signOut().catch(() => {});
    showLogin('צריך להיכנס שוב');
    return;
  }
  console.error(err);
  showMessage(err.message || 'משהו השתבש. נסו שוב');
}

// ---------- 8. sign-in ----------
function showLogin(message = '') {
  placesView.hidden = true;
  logoutBtn.hidden = true;
  loginView.hidden = false;
  $('login-error').textContent = message;
  $('login-email').focus();
}

$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = $('login-email').value.trim();
  const password = $('login-password').value;
  const errorBox = $('login-error');
  errorBox.textContent = '';
  if (!email || !password) {
    errorBox.textContent = 'צריך למלא מייל וסיסמה';
    return;
  }
  const submit = $('login-submit');
  submit.disabled = true;
  try {
    const { error } = await auth.signInWithPassword({ email, password });
    if (error) {
      errorBox.textContent = 'המייל או הסיסמה לא נכונים';
      return;
    }
    $('login-password').value = '';
    await showPlaces();
  } finally {
    submit.disabled = false;
  }
});

logoutBtn.addEventListener('click', async () => {
  await auth.signOut().catch(() => {});
  showLogin();
});

// ---------- 9. places table ----------
const byName = (a, b) => a.name.localeCompare(b.name, 'he');
const openReports = place => (Array.isArray(place.reports) ? place.reports : [])
  .filter(r => (r?.status ?? 'open') === 'open').length;

async function showPlaces() {
  loginView.hidden = true;
  logoutBtn.hidden = false;
  placesView.hidden = false;
  $('list-error').textContent = '';
  tbody.replaceChildren(rowMessage('טוען...'));
  try {
    const [data] = await Promise.all([api('admin_list'), loadLists().then(l => { lists = l; })]);
    state.date = data.date;
    state.todayId = data.today_place_id;
    state.places = data.places.sort(byName);
    renderTable();
  } catch (err) {
    tbody.replaceChildren();
    await handleError(err, msg => { $('list-error').textContent = msg; });
  }
}

function rowMessage(text) {
  const tr = el('tr');
  const td = el('td', 'caption', text);
  td.colSpan = 7;
  tr.append(td);
  return tr;
}

function renderTable() {
  tbody.replaceChildren(...state.places.map(renderRow));
  $('count').textContent = `${state.places.length} מקומות`;
}

function renderRow(place) {
  const tr = el('tr');
  tr.dataset.id = place.id;
  if (place.is_blocked || place.verification_level === 'unsafe') tr.classList.add('is-muted');

  // Name: a real button, so the row opens with the keyboard too
  const nameCell = el('td');
  const nameWrap = el('div', 'cell-name__inner');
  nameCell.append(nameWrap);
  const nameBtn = el('button', 'name-btn', place.name);
  nameBtn.type = 'button';
  nameBtn.addEventListener('click', () => openEdit(place.id));
  nameWrap.append(nameBtn);
  if (place.id === state.todayId) nameWrap.append(el('span', 'tag-today', 'היום'));

  const levelCell = el('td');
  levelCell.append(renderBadge(place.verification_level));

  const reports = openReports(place);
  const reportsCell = el('td');
  if (reports > 0) {
    const pill = el('span', 'reports-pill', `⚑ ${reports}`);
    pill.setAttribute('aria-label', `${reports} דיווחים פתוחים`);
    reportsCell.append(pill);
  } else {
    reportsCell.textContent = '—';
  }

  const blockCell = el('td');
  blockCell.append(renderSwitch(place));

  tr.append(
    nameCell,
    el('td', '', categoryLabel(place.category)),
    el('td', '', areaLabel(place.area)),
    levelCell,
    el('td', 'cell-date', place.last_verified_at ? formatDate(place.last_verified_at) : '—'),
    reportsCell,
    blockCell
  );
  // A click anywhere on the row (except the switch) opens the edit form
  tr.addEventListener('click', e => {
    if (!e.target.closest('button')) openEdit(place.id);
  });
  return tr;
}

// ---------- 11. "blocked" switch ----------
function renderSwitch(place) {
  const btn = el('button', 'switch');
  btn.type = 'button';
  btn.setAttribute('role', 'switch');
  btn.setAttribute('aria-checked', String(place.is_blocked));
  btn.setAttribute('aria-label', `חסום: ${place.name}`);
  const track = el('span', 'switch__track');
  track.setAttribute('aria-hidden', 'true');
  track.append(el('span', 'switch__thumb'));
  const word = el('span', 'switch__word', place.is_blocked ? 'כן' : 'לא');
  word.setAttribute('aria-hidden', 'true');
  btn.append(track, word);
  btn.addEventListener('click', () => toggleBlocked(place.id, btn));
  return btn;
}

async function toggleBlocked(id, btn) {
  const place = state.places.find(p => p.id === id);
  if (!place) return;
  const next = !place.is_blocked;
  // 10. Blocking today's place asks first. "Cancel" leaves the switch as it was.
  if (next && id === state.todayId && !(await confirmBlockToday())) {
    btn.focus();
    return;
  }
  btn.disabled = true;
  const saved = await savePlace(id, { is_blocked: next }, msg => showSaved(msg, true));
  if (saved) {
    showSaved('נשמר');
    tbody.querySelector(`button[role="switch"][aria-label="${CSS.escape(`חסום: ${saved.name}`)}"]`)?.focus();
  } else {
    btn.disabled = false;
  }
}

function confirmBlockToday() {
  return new Promise(resolve => {
    const yes = $('confirm-yes');
    const no = $('confirm-no');
    const done = value => {
      yes.removeEventListener('click', onYes);
      no.removeEventListener('click', onNo);
      confirmDialog.removeEventListener('close', onClose);
      if (confirmDialog.open) confirmDialog.close();
      resolve(value);
    };
    const onYes = () => done(true);
    const onNo = () => done(false);
    const onClose = () => done(false); // Esc
    yes.addEventListener('click', onYes);
    no.addEventListener('click', onNo);
    confirmDialog.addEventListener('close', onClose);
    confirmDialog.showModal();
    no.focus(); // Enter must not block by mistake
  });
}

// Sends admin_update, puts the returned row in the table. Returns the row, or null on error.
async function savePlace(id, fields, onError) {
  try {
    const { place } = await api('admin_update', { id, fields });
    const i = state.places.findIndex(p => p.id === id);
    if (i >= 0) state.places[i] = place;
    state.places.sort(byName);
    renderTable();
    return place;
  } catch (err) {
    await handleError(err, onError);
    return null;
  }
}

let savedTimer = null;
function showSaved(text, isError = false) {
  clearTimeout(savedTimer);
  savedMsg.textContent = text;
  savedMsg.classList.toggle('saved--error', isError);
  if (!isError) savedTimer = setTimeout(() => { savedMsg.textContent = ''; }, 4000);
}

// ---------- 11. edit form ----------
let editingId = null;

function fillSelect(select, map) {
  select.replaceChildren(...[...map.values()].map(item => {
    const opt = el('option', '', item.label);
    opt.value = item.id;
    return opt;
  }));
}

function setFieldError(input, errorId, message) {
  const box = $(errorId);
  box.textContent = message ? `! ${message}` : '';
  input.classList.toggle('is-invalid', Boolean(message));
  input.setAttribute('aria-invalid', String(Boolean(message)));
}

function clearErrors() {
  setFieldError($('f-date'), 'f-date-error', '');
  setFieldError($('f-coords'), 'f-coords-error', '');
  setFieldError($('f-image'), 'f-image-error', '');
  setFieldError($('f-url'), 'f-url-error', '');
  $('edit-error').textContent = '';
}

function openEdit(id) {
  const place = state.places.find(p => p.id === id);
  if (!place || !lists) return;
  editingId = id;
  clearErrors();
  fillSelect($('f-category'), lists.categories);
  fillSelect($('f-area'), lists.areas);
  fillSelect($('f-level'), lists.levels);

  $('f-name').value = place.name ?? '';
  $('f-category').value = place.category;
  $('f-area').value = place.area;
  $('f-level').value = place.verification_level;
  $('f-date').value = place.last_verified_at ?? '';
  $('f-date').max = state.date ?? '';
  $('f-source').value = place.verification_source ?? '';
  $('f-hours').value = place.opening_hours ?? '';
  $('f-coords').value = place.lat != null && place.lng != null ? `${place.lat}, ${place.lng}` : '';
  $('f-gplace').value = place.google_place_id ?? '';
  $('f-image').value = place.image_file ?? '';
  $('f-url').value = place.source_url ?? '';
  // "נבדק היום" needs the date from admin_list. Without it: disabled, type the date by hand.
  $('f-today').disabled = !state.date;
  editDialog.showModal();
  $('f-name').focus();
}

// Only fills the field. Nothing is saved until "שמירה".
$('f-today').addEventListener('click', () => {
  if (state.date) $('f-date').value = state.date;
});

const closeEdit = () => { editingId = null; editDialog.close(); };
$('edit-close').addEventListener('click', closeEdit);
$('edit-cancel').addEventListener('click', closeEdit);

const textOrNull = v => (v.trim() === '' ? null : v.trim());

// Reads the form. Returns { fields } or null when a field is wrong (the error is shown).
function readForm() {
  clearErrors();
  let ok = true;
  const fields = {
    name: $('f-name').value.trim(),
    category: $('f-category').value,
    area: $('f-area').value,
    verification_level: $('f-level').value,
    last_verified_at: $('f-date').value || null,
    verification_source: textOrNull($('f-source').value),
    opening_hours: textOrNull($('f-hours').value),
    google_place_id: textOrNull($('f-gplace').value),
    image_file: textOrNull($('f-image').value),
    source_url: textOrNull($('f-url').value)
  };

  if (!fields.name) {
    $('edit-error').textContent = 'צריך שם למקום';
    ok = false;
  }
  if (['verified', 'checked'].includes(fields.verification_level) && !fields.last_verified_at) {
    const label = fields.verification_level === 'verified' ? 'מאומת' : 'נבדק';
    setFieldError($('f-date'), 'f-date-error', `לרמה "${label}" צריך תאריך בדיקה`);
    ok = false;
  } else if (fields.last_verified_at && state.date && fields.last_verified_at > state.date) {
    setFieldError($('f-date'), 'f-date-error', 'תאריך הבדיקה לא יכול להיות בעתיד');
    ok = false;
  }

  // Coordinates: one field "lat, lng", split into two columns
  const coords = $('f-coords').value.trim();
  if (coords === '') {
    fields.lat = null;
    fields.lng = null;
  } else {
    const parts = coords.split(',').map(s => Number(s.trim()));
    if (parts.length !== 2 || parts.some(n => !Number.isFinite(n)) ||
        Math.abs(parts[0]) > 90 || Math.abs(parts[1]) > 180) {
      setFieldError($('f-coords'), 'f-coords-error', 'כותבים שני מספרים עם פסיק ביניהם, למשל 31.8044, 34.6553');
      ok = false;
    } else {
      [fields.lat, fields.lng] = parts;
    }
  }

  if (fields.image_file && !/^[a-z0-9-]+\.(jpg|webp)$/.test(fields.image_file)) {
    setFieldError($('f-image'), 'f-image-error', 'אותיות קטנות באנגלית, ספרות ומקף, וסיומת jpg או webp');
    ok = false;
  }
  if (fields.source_url && !fields.source_url.startsWith('https://')) {
    setFieldError($('f-url'), 'f-url-error', 'הקישור חייב להתחיל ב-https://');
    ok = false;
  }
  if (!ok) {
    editForm.querySelector('[aria-invalid="true"]')?.focus();
    return null;
  }
  return fields;
}

// Only the fields that changed are sent
function changedFields(place, fields) {
  const same = (a, b) => (a ?? null) === (b ?? null) ||
    (typeof a === 'number' || typeof b === 'number' ? Number(a) === Number(b) && a != null && b != null : false);
  return Object.fromEntries(Object.entries(fields).filter(([k, v]) => !same(place[k], v)));
}

editForm.addEventListener('submit', async e => {
  e.preventDefault();
  const place = state.places.find(p => p.id === editingId);
  if (!place) return;
  const fields = readForm();
  if (!fields) return;
  const changes = changedFields(place, fields);
  if (Object.keys(changes).length === 0) {
    closeEdit();
    return;
  }
  const saveBtn = $('edit-save');
  saveBtn.disabled = true;
  const saved = await savePlace(place.id, changes, msg => { $('edit-error').textContent = msg; });
  saveBtn.disabled = false;
  if (saved) {
    closeEdit();
    showSaved('נשמר');
  }
});

// ---------- start ----------
const { data } = await auth.getSession();
if (data.session) {
  await showPlaces();
} else {
  showLogin();
}
