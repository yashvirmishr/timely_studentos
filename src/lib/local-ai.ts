// Gemini AI service — uses Google Generative Language API directly from the client.
// No backend required. Key is stored locally in Zustand (persisted to localStorage).

import type {
  GeminiRawModel,
  GeminiListModelsResponse,
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
  GeminiContentPart,
  GeminiErrorResponse,
} from "./google-types";

const DEFAULT_MODEL = "gemini-2.5-flash-preview-05-20";

export interface AiConfig {
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface ChatParams {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  onToken?: (token: string) => void;
}

function getStoreConfig(): AiConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("timely-store-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const state = parsed.state || parsed;
    if (state.aiConfig) return state.aiConfig as AiConfig;
  } catch {}
  return null;
}

export function getConfig(): AiConfig {
  const stored = getStoreConfig();
  if (stored) return { apiKey: stored.apiKey || "", model: normalizeModel(stored.model), enabled: !!stored.enabled };
  // fallback to legacy key
  try {
    const legacy = localStorage.getItem("timely_ai_config");
    if (legacy) {
      const p = JSON.parse(legacy);
      return { apiKey: p.apiKey || "", model: normalizeModel(p.model), enabled: !!p.enabled };
    }
  } catch {}
  return { apiKey: "", model: DEFAULT_MODEL, enabled: false };
}

function normalizeModel(model?: string): string {
  const value = (model || "").trim().replace(/^models\//, "");
  // Gemini model aliases are deprecated or removed over time;
  // use a currently supported model when an old/blank value is still in local storage.
  const DEPRECATED = [
    "gemini-1.0-pro", "gemini-1.0-pro-001", "gemini-1.0-pro-vision",
    "gemini-1.5-pro", "gemini-1.5-pro-001", "gemini-1.5-pro-vision",
    "gemini-1.5-flash", "gemini-1.5-flash-001", "gemini-1.5-flash-002",
    "gemini-2.0-flash", "gemini-2.0-flash-001", "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
  ];
  if (!value || DEPRECATED.includes(value)) return DEFAULT_MODEL;
  return value;
}

export function saveAiConfig(config: Partial<AiConfig>) {
  // Zustand is source of truth — this helper keeps legacy support
  const current = getConfig();
  const merged = { ...current, ...config };
  // also write legacy for checkAiConnection callers that read it directly
  try { localStorage.setItem("timely_ai_config", JSON.stringify(merged)); } catch {}
  return merged;
}

/** Fetch all available generateContent models for a given API key. */
export async function listAvailableModels(apiKey: string): Promise<string[]> {
  if (!apiKey) return [];
  try {
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return [];
    const data: GeminiListModelsResponse = await resp.json();
    return (data.models || [])
      .filter((m: GeminiRawModel) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: GeminiRawModel) => (m.name || "").replace("models/", ""))
      .filter(Boolean);
  } catch { return []; }
}

export async function checkAiConnection(): Promise<{ ok: boolean; models?: string[]; error?: string }> {
  const config = getConfig();
  if (!config.enabled) return { ok: false, error: "Gemini is disabled in settings" };
  if (!config.apiKey) return { ok: false, error: "Paste your Gemini API key in Settings → Profile" };
  try {
    // Cheap validation: list models
    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(config.apiKey)}`, { signal: AbortSignal.timeout(6000) });
    if (!resp.ok) {
      const err = await resp.text().catch(() => "");
      if (resp.status === 403 || resp.status === 400) return { ok: false, error: `Key rejected (${resp.status}). Check the key, API access, and model permissions.` };
      return { ok: false, error: `Gemini error ${resp.status}: ${err.slice(0, 180)}` };
    }
    const data: GeminiListModelsResponse = await resp.json();
    const models = (data.models || [])
      .filter((m: GeminiRawModel) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: GeminiRawModel) => (m.name || "").replace("models/", ""))
      .filter(Boolean);
    if (!models.includes(config.model)) {
      const fallbackModel = models.find((model: string) => /flash/i.test(model)) || models[0];
      if (fallbackModel) return { ok: true, models, error: `Selected model unavailable; use ${fallbackModel}.` };
      return { ok: false, error: `No generateContent model is available for this key.` };
    }
    return { ok: true, models };
  } catch (e: any) {
    // Network failure — try a generateContent ping instead
    try {
      const ping = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "ping" }] }] }),
        signal: AbortSignal.timeout(8000),
      });
      if (ping.ok) return { ok: true, models: [config.model] };
      const err = await ping.text().catch(() => "");
      return { ok: false, error: `Gemini unreachable: ${err.slice(0, 160)}` };
    } catch (e2: any) {
      return { ok: false, error: e2?.message || e?.message || "Could not reach Gemini" };
    }
  }
}

/** Try to generate content with a specific model. Returns text on success, null on failure. */
async function tryGenerate(
  model: string,
  body: GeminiGenerateContentRequest,
  apiKey: string,
): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
      },
    );
    if (!resp.ok) return null;
    const data: GeminiGenerateContentResponse = await resp.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: GeminiContentPart) => p.text).join("")?.trim() ||
      data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}

/** Fetch available text-only generateContent models for the given key. */
async function discoverModels(apiKey: string): Promise<string[]> {
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!resp.ok) return [];
    const data: GeminiListModelsResponse = await resp.json();
    const EXCLUDE = /image|tts|robotics|lyria|nano-banana|omni|computer-use|deep-research|antigravity|music/;
    return (data.models || [])
      .filter((m: GeminiRawModel) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m: GeminiRawModel) => (m.name || "").replace("models/", ""))
      .filter((m: string) => !EXCLUDE.test(m) && m.length > 0);
  } catch {
    return [];
  }
}

/** Preferred fallback order: flash models first (cheapest, fastest), then pro. */
const FALLBACK_PRIORITY = [
  /gemini-2\.5-flash/, /gemini-3\.5-flash/, /gemini-3\.7-flash/,
  /gemini-3-flash-lite/, /gemini-2\.5-flash-lite/, /gemini-3\.5-flash-lite/,
  /gemini-3\.1-flash-lite/, /flash-latest/,
  /gemini-2\.5-pro/, /gemini-3\.1-pro/, /pro-preview/,
];

function sortFallbackModels(models: string[], current: string): string[] {
  const others = models.filter(m => m !== current);
  return others.sort((a, b) => {
    const ai = FALLBACK_PRIORITY.findIndex(p => p.test(a));
    const bi = FALLBACK_PRIORITY.findIndex(p => p.test(b));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export async function chatWithLocalAi(params: ChatParams): Promise<string> {
  const config = getConfig();
  if (!config.enabled) throw new Error("Gemini is disabled. Enable it in Settings → Profile.");
  if (!config.apiKey) throw new Error("Missing Gemini API key. Paste it in Settings → Profile.");

  // Build Gemini request — system instruction + contents
  const systemText = params.messages.find(m => m.role === "system")?.content || buildContextPrompt();
  const history = params.messages.filter(m => m.role !== "system");

  const contents = history.map(m => ({
    role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
    parts: [{ text: m.content }],
  }));

  const body: GeminiGenerateContentRequest = {
    contents,
    systemInstruction: { parts: [{ text: systemText }] },
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
  };

  // 1. Try the selected model
  let result = await tryGenerate(config.model, body, config.apiKey);
  if (result) return result;

  // 2. Auto-fallback: discover available models and try them in priority order
  const available = await discoverModels(config.apiKey);
  const fallbacks = sortFallbackModels(available, config.model);

  for (const model of fallbacks) {
    result = await tryGenerate(model, body, config.apiKey);
    if (result) {
      // Persist the working model so future calls don't fail
      saveAiConfig({ model });
      return result;
    }
  }

  // 3. All models exhausted — surface a clear error
  throw new Error(
    available.length > 0
      ? `All ${available.length} available models are unreachable. This is usually a temporary Gemini outage — try again in a minute.`
      : "Could not reach Gemini. Check your API key and internet connection.",
  );
}

export interface ExtractedTimetable {
  classes: {
    subject: string;
    teacher: string;
    room: string;
    day: string;
    start: string;
    end: string;
    color?: string;
  }[];
  confidence?: number;
}

function decodeJsonResponse(text: string): ExtractedTimetable {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || text;
  const parsed = JSON.parse(fenced.trim());
  if (!Array.isArray(parsed.classes)) throw new Error("Gemini did not return timetable classes.");
  return parsed;
}

export async function extractTimetable(file: File): Promise<ExtractedTimetable> {
  const config = getConfig();
  if (!config.enabled || !config.apiKey) throw new Error("Enable Gemini and add an API key in Profile before scanning a timetable.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }
  const prompt = [
    "Extract every class from this timetable image or PDF.",
    `Return JSON only with this shape: {"classes":[{"subject":"...","teacher":"...","room":"...","day":"MON|TUE|WED|THU|FRI","start":"HH:MM","end":"HH:MM","color":"blue|lilac|green|yellow|red"}],"confidence":0}.`,
    "Use 24-hour time, omit breaks and empty periods, and use an empty string when a teacher or room is not visible.",
  ].join(" ");
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { mimeType: file.type || "application/octet-stream", data: btoa(binary) } }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", maxOutputTokens: 2048 },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`Gemini scan failed (${resp.status}).`);
  const data2: GeminiGenerateContentResponse = await resp.json();
  const text = data2?.candidates?.[0]?.content?.parts?.map((p: GeminiContentPart) => p.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned no timetable data.");
  return decodeJsonResponse(text);
}

export interface TimelyContext {
  profileName?: string;
  tasks?: { title: string; subject: string; due: string; priority: string; completed: boolean }[];
  classes?: { subject: string; day: string; start: string; end: string; room: string; teacher: string }[];
  subjects?: { name: string; teacher: string; progress?: number }[];
  notes?: { title: string; subject: string; preview?: string }[];
}

function buildContextPrompt(context?: TimelyContext): string {
  if (!context || (!context.tasks && !context.classes)) {
    return [
      "You are Timely AI, a warm, concise academic planning companion for a student named Alex.",
      "Keep responses under 3 sentences when possible, encouraging, and concrete.",
      "You know Alex's schedule: English Literature 08:30-09:45 (Room B14, Jamie Morgan), Advanced Calculus 10:00-11:15 (Room C02, Dr. Chen), Art & Design 11:30-13:00 (Studio 3, Sofia Kim) on Tuesdays. History essay is due tomorrow. Calculus midterm in 6 days.",
      "Always be helpful and never give harmful advice. Use the conversation context and be brief.",
    ].join("\n");
  }
  const lines: string[] = [
    `You are Timely AI, a warm, concise academic companion for ${context.profileName || "Alex"}. Keep replies under 3 sentences, encouraging, concrete. Never hallucinate outside provided context.`,
    "",
    "Live context (JSON):",
    JSON.stringify({
      date: new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      tasks: (context.tasks || []).slice(0, 12),
      timetable: (context.classes || []).slice(0, 20),
      subjects: (context.subjects || []).slice(0, 8),
      notes: (context.notes || []).slice(0, 6).map(n => ({ title: n.title, subject: n.subject })),
    }, null, 2),
    "",
    "Rules: Use only the live context + user message. Be brief, suggest next small step, offer to shape a focus block. Never invent exams or deadlines.",
  ];
  return lines.join("\n");
}

export function buildMessages(userText: string, context?: TimelyContext): { role: "system" | "user" | "assistant"; content: string }[] {
  return [
    { role: "system", content: buildContextPrompt(context) },
    { role: "user", content: userText },
  ];
}

export function buildMessagesWithHistory(history: { role: "system" | "user" | "assistant"; content: string }[], userText: string, context?: TimelyContext): { role: "system" | "user" | "assistant"; content: string }[] {
  const system = buildContextPrompt(context);
  // keep last 8 turns + system + new user
  const recent = history.filter(m => m.role !== "system").slice(-8);
  return [{ role: "system", content: system }, ...recent, { role: "user", content: userText }];
}
