// One call to Gemini with a JSON Schema. Shared by the daily sentence, the chatbot and the report agent.
// REST with fetch, no SDK. The key stays on the server. Never logs the key, the prompt or raw provider errors.
const DEFAULT_MODEL = 'gemini-3.8-flash';
const TIMEOUT_MS = 10_000;
const API = 'https://generativelanguage.googleapis.com/v1beta/models';

// Returns { output, reason }. output is the parsed JSON object, or null when anything went wrong.
// reason is a short English code for the log and for ai_test: ok, no_key, timeout, http_<status>, bad_output.
export async function callGemini({ system, input, schema, maxOutputTokens = 1024 }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { output: null, reason: 'no_key' };
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        // The record goes in as data (JSON), never as part of the instructions
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          maxOutputTokens,
          thinkingConfig: { thinkingLevel: 'low' }
        }
      })
    });
    if (!res.ok) {
      console.error('[gemini] http', res.status);
      return { output: null, reason: `http_${res.status}` };
    }
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter(p => !p.thought && typeof p.text === 'string').map(p => p.text).join('');
    let output;
    try {
      output = JSON.parse(text);
    } catch {
      return { output: null, reason: 'bad_output' };
    }
    if (typeof output !== 'object' || output === null || Array.isArray(output)) {
      return { output: null, reason: 'bad_output' };
    }
    return { output, reason: 'ok' };
  } catch (err) {
    if (err?.name === 'AbortError') return { output: null, reason: 'timeout' };
    console.error('[gemini] fetch failed', err?.name ?? 'unknown');
    return { output: null, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
