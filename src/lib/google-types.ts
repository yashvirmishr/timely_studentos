/**
 * Type-safe interfaces for external Google and Gemini APIs.
 *
 * These mirror the real REST/SDK response shapes. When Google changes an API
 * surface, update these interfaces — the compiler will flag every call site.
 */

// ============================================================
// Google Identity Services (GIS) — loaded via <script> tag
// ============================================================

/** Token callback response from `google.accounts.oauth2.initTokenClient`. */
export interface GisTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
}

/** Handle returned by `initTokenClient`. */
export interface GisTokenClient {
  requestAccessToken: (params?: { prompt?: string }) => void;
}

/** Options passed to `initTokenClient`. */
export interface GisTokenClientOptions {
  client_id: string;
  scope: string;
  callback: (response: GisTokenResponse) => void;
}

/** Shape of the `google.accounts.oauth2` namespace. */
export interface GisOAuth2 {
  initTokenClient: (options: GisTokenClientOptions) => GisTokenClient;
}

/** Shape of the `google.accounts` namespace. */
export interface GisAccounts {
  oauth2: GisOAuth2;
}

/** Global `google` object injected by the GIS script. */
export interface GisGoogle {
  accounts: GisAccounts;
}

// ============================================================
// Google Calendar API — REST v3
// ============================================================

/** Raw event object returned by the Calendar API. */
export interface GCalRawEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  status?: string;
  htmlLink?: string;
  created?: string;
  updated?: string;
}

/** Raw response from `GET /calendars/primary/events`. */
export interface GCalListEventsResponse {
  kind?: string;
  etag?: string;
  summary?: string;
  description?: string;
  updated?: string;
  items?: GCalRawEvent[];
  nextPageToken?: string;
  nextSyncToken?: string;
}

// ============================================================
// Google Classroom API — REST v1
// ============================================================

/** Raw course object from the Classroom API. */
export interface GClassroomRawCourse {
  id: string;
  name?: string;
  section?: string;
  description?: string;
  room?: string;
  ownerId?: string;
  creationTime?: string;
  updateTime?: string;
  enrollmentCode?: string;
  courseState?: string;
  alternateLink?: string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
}

/** Raw response from `GET /courses`. */
export interface GClassroomListCoursesResponse {
  courses?: GClassroomRawCourse[];
  nextPageToken?: string;
}

/** Date object within a coursework due date. */
export interface GClassroomDueDate {
  year?: number;
  month?: number;
  day?: number;
}

/** Time object within a coursework due time. */
export interface GClassroomDueTime {
  hours?: number;
  minutes?: number;
  seconds?: number;
  nanos?: number;
}

/** Raw courseWork object from the Classroom API. */
export interface GClassroomRawCourseWork {
  courseId?: string;
  id: string;
  title?: string;
  description?: string;
  materials?: unknown[];
  state?: string;
  alternateLink?: string;
  creationTime?: string;
  dueDate?: GClassroomDueDate;
  dueTime?: GClassroomDueTime;
  scheduledTime?: string;
  maxPoints?: number;
  workType?: string;
  creatorUserId?: string;
}

/** Raw response from `GET /courses/:id/courseWork`. */
export interface GClassroomListCourseWorkResponse {
  courseWork?: GClassroomRawCourseWork[];
  nextPageToken?: string;
}

// ============================================================
// Google API error response
// ============================================================

/** Standard Google API error body. */
export interface GoogleApiError {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    errors?: Array<{
      message?: string;
      domain?: string;
      reason?: string;
    }>;
  };
}

// ============================================================
// Gemini (Google AI) API
// ============================================================

/** Raw model object from `GET /models`. */
export interface GeminiRawModel {
  name?: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
  temperature?: number;
  topP?: number;
  topK?: number;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}

/** Response from `GET /models`. */
export interface GeminiListModelsResponse {
  models?: GeminiRawModel[];
}

/** A single text part in a Gemini content block. */
export interface GeminiContentPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

/** A content block in a Gemini request/response. */
export interface GeminiContent {
  role?: "user" | "model";
  parts: GeminiContentPart[];
}

/** Candidate returned by `generateContent`. */
export interface GeminiCandidate {
  index?: number;
  content?: {
    role?: string;
    parts: GeminiContentPart[];
  };
  finishReason?: string;
  safetyRatings?: unknown[];
  citationMetadata?: unknown;
}

/** Full response from `POST /models/:model:generateContent`. */
export interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: unknown[];
  };
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

/** Request body for `generateContent`. */
export interface GeminiGenerateContentRequest {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    topK?: number;
    responseMimeType?: string;
  };
  safetySettings?: unknown[];
}

/** Standard error wrapper from Gemini. */
export interface GeminiErrorResponse {
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}
