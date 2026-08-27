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

const DEFAULT_MODEL = "gemini-1.5-flash";

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
  // Gemini model aliases can disappear from the API; use a currently supported
  // stable model when an old/blank value is still in local storage.
  if (!value || value === "gemini-2.0-flash" || value === "gemini-2.0-flash-001") return DEFAULT_MODEL;
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

export async function chatWithLocalAi(params: ChatParams): Promise<string> {
  const config = getConfig();
  if (!config.enabled) throw new Error("Gemini is disabled. Enable it in Settings → Profile.");
  if (!config.apiKey) throw new Error("Missing Gemini API key. Paste it in Settings → Profile.");

  // Build Gemini request — system instruction + contents
  const systemText = params.messages.find(m => m.role === "system")?.content || buildContextPrompt();
  const history = params.messages.filter(m => m.role !== "system");

  // Gemini expects alternating user/model roles. Map our assistant -> model.
  const contents = history.map(m => ({
    role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
    parts: [{ text: m.content }],
  }));

  const body: GeminiGenerateContentRequest = {
    contents,
    systemInstruction: { parts: [{ text: systemText }] },
    generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
  };

  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "Unknown error");
    // Surface quota / key errors clearly
    if (resp.status === 429) throw new Error("Gemini quota exceeded (429). Try again in a minute or check your billing.");
    if (resp.status === 400 || resp.status === 403) {
      let detail = "Check your Gemini API key, enabled API access, and selected model.";
      try {
        const parsed: GeminiErrorResponse = JSON.parse(errText);
        detail = parsed?.error?.message || detail;
      } catch {}
      throw new Error(`Gemini rejected the request: ${detail}`);
    }
    throw new Error(`Gemini error (${resp.status}): ${errText.slice(0, 300)}`);
  }

  const data: GeminiGenerateContentResponse = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: GeminiContentPart) => p.text).join("")?.trim()
    || data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
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
