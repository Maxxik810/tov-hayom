// The fixed lists from data/*.json, with Hebrew labels.
import categories from '../data/categories.json' with { type: 'json' };
import areas from '../data/areas.json' with { type: 'json' };

const byId = list => new Map(list.map(item => [item.id, item]));
const CATEGORIES = byId(categories);
const AREAS = byId(areas);

export function category(id) {
  return CATEGORIES.get(id) ?? null;
}

export function area(id) {
  return AREAS.get(id) ?? null;
}
