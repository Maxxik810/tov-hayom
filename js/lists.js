// Hebrew labels for the English ids, loaded once from data/*.json
const files = ['categories', 'areas', 'verification-levels'];
let lists = null;

export async function loadLists() {
  if (lists) return lists;
  const [categories, areas, levels] = await Promise.all(
    files.map(async name => {
      const res = await fetch(`data/${name}.json`);
      if (!res.ok) throw new Error(`lists ${name}: ${res.status}`);
      return res.json();
    })
  );
  const byId = list => new Map(list.map(item => [item.id, item]));
  lists = { categories: byId(categories), areas: byId(areas), levels: byId(levels) };
  return lists;
}

const label = (map, id) => map?.get(id)?.label ?? id;

export const categoryLabel = id => label(lists?.categories, id);
export const areaLabel = id => label(lists?.areas, id);
export const levelLabel = id => label(lists?.levels, id);

// YYYY-MM-DD -> dd.mm.yyyy
export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
