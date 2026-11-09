// Milestone 1: קריאה אחת לפונקציה, והצגת התשובה כמו שהיא, כשורה טכנית.
const out = document.getElementById('status');

try {
  const res = await fetch('/api/trip?action=home');
  const body = await res.text();
  out.textContent = `HTTP ${res.status}\n${body}`;
} catch (err) {
  out.textContent = 'הקריאה לשרת נכשלה';
}
