// Action "ai_test": runs one AI use on a fake input, without writing anything. Used to fill ai-tests.md.
import { cleanInput, generateSentence } from './sentence.js';
import { HttpError } from './http.js';

const READY = { sentence: true };

export async function runAiTest(body) {
  if (Object.keys(body).some(k => k !== 'kind' && k !== 'input')) {
    throw new HttpError(400, 'bad_input', 'שדה לא מוכר בבקשה');
  }
  const { kind, input } = body;
  if (kind === 'chat' || kind === 'report') {
    // Comes in Milestone 5
    throw new HttpError(400, 'not_ready', 'הבדיקה הזו עוד לא קיימת');
  }
  if (!READY[kind]) throw new HttpError(400, 'bad_kind', 'סוג בדיקה לא מוכר');
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new HttpError(400, 'bad_input', 'חסר קלט לבדיקה');
  }

  const sent = cleanInput(input);
  const result = await generateSentence(sent);
  return { kind, sent, output: result.output, valid: result.valid, reason: result.reason };
}
