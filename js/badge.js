// תג האימות: גלולה עם אייקון ומילה. אף פעם לא צבע בלבד.
(function () {
  const ICONS = {
    verified: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#127A36"/><path d="m7.5 12.5 3 3 6-6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    checked: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#0A57D0" stroke-width="2" stroke-dasharray="3 3"/></svg>',
    unverified: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="#5B6170" stroke-width="2"/></svg>',
    unsafe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#B42318"/><path d="M12 7v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1.3" fill="#fff"/></svg>'
  };

  function icon(levelId) { return ICONS[levelId] || ""; }

  // כפתור תג. לחיצה פותחת את "הסבר לתג".
  function badgeButton(levelId) {
    const label = TovLists.level(levelId).label;
    return `<button type="button" class="badge badge--${levelId}" data-badge
      aria-label="${label}. מה אומר התג?">${icon(levelId)}<span>${label}</span></button>`;
  }

  window.TovBadge = { icon, badgeButton };
})();
