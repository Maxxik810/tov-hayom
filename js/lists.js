// תוויות בעברית לפי המזהים באנגלית (data/*.json)
(function () {
  const d = window.TOV_MOCK;
  const find = (list, id) => list.find(x => x.id === id) || { id, label: id };

  function formatDate(iso) {
    if (!iso) return "—";
    const [y, m, day] = iso.split("-");
    return `${day}.${m}.${y}`; // dd.mm.yyyy
  }

  // escape לטקסט שנכנס ל-HTML
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  window.TovLists = {
    category: id => find(d.categories, id),
    area: id => find(d.areas, id),
    level: id => find(d.levels, id),
    levels: () => d.levels,
    formatDate,
    esc
  };
})();
