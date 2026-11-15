// Action "ai_test": runs one AI use on a fake input, without writing anything. Used to fill ai-tests.md.
import { cleanInput, generateSentence } from './sentence.js';
import { HttpError } from './http.js';
import { classifyReport, triageInput } from './report.js';

const READY = { sentence: true, report: true };

export async function runAiTest(body) {
  if (Object.keys(body).some(k => k !== 'kind' && k !== 'input')) {
    throw new HttpError(400, 'bad_input', 'שדה לא מוכר בבקשה');
  }
  const { kind, input } = body;
  if (kind === 'chat') {
    // Comes in Milestone 5
    throw new HttpError(400, 'not_ready', 'הבדיקה הזו עוד לא קיימת');
  }
  if (!READY[kind]) throw new HttpError(400, 'bad_kind', 'סוג בדיקה לא מוכר');
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new HttpError(400, 'bad_input', 'חסר קלט לבדיקה');
  }

  if (kind === 'report') {
    const sent = triageInput({ type: input.type, text: input.text, placeName: input.place, categoryLabel: input.category });
    const result = await classifyReport(sent);
    return { kind, sent, output: result.output, valid: result.valid, reason: result.reason };
  }

  const sent = cleanInput(input);
  const result = await generateSentence(sent);
  return { kind, sent, output: result.output, valid: result.valid, reason: result.reason };
}
