// The verification badge: a pill with an icon and a word. Never color alone.
// It only maps verification_level to a label; no other logic.
import { levelLabel } from './lists.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function icon(level) {
  const root = svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
  if (level === 'verified') {
    root.append(
      svg('circle', { cx: 12, cy: 12, r: 10, fill: '#127A36' }),
      svg('path', { d: 'm7.5 12.5 3 3 6-6', fill: 'none', stroke: '#fff', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
    );
  } else {
    root.append(svg('circle', { cx: 12, cy: 12, r: 9, fill: 'none', stroke: '#0A57D0', 'stroke-width': 2, 'stroke-dasharray': '3 3' }));
  }
  return root;
}

// Returns a badge element. The explanation dialog comes in Milestone 7.
export function renderBadge(level) {
  const el = document.createElement('span');
  el.className = `badge badge--${level}`;
  const text = document.createElement('span');
  text.textContent = levelLabel(level);
  el.append(icon(level), text);
  return el;
}
