// The template sentence: "{name}, {category} {area.in_label}". Backup for the AI sentence.
import { category, area } from './lists.js';

export function templateSentence(place) {
  const cat = category(place.category)?.label ?? '';
  const inArea = area(place.area)?.in_label ?? '';
  return `${place.name}, ${cat} ${inArea}`.trim();
}
