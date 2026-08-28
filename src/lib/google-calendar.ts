import type {
  GisGoogle,
  GisTokenResponse,
  GCalRawEvent,
  GCalListEventsResponse,
  GoogleApiError,
} from "./google-types";

const GOOGLE_CALENDAR_TOKEN_KEY = "timely_google_calendar_token";
const GOOGLE_CALENDAR_CLIENT_ID_KEY = "timely_google_calendar_client_id";

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay?: boolean;
}

export function getGoogleCalendarConfig() {
  if (typeof window === "undefined") return { clientId: "", connected: false };
  return {
    clientId: localStorage.getItem(GOOGLE_CALENDAR_CLIENT_ID_KEY) || "",
    connected: !!localStorage.getItem(GOOGLE_CALENDAR_TOKEN_KEY),
  };
}

function loadGoogleIdentity(): Promise<void> {
  if ((window as unknown as GisGoogle).accounts?.oauth2)
    return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google sign-in."));
    document.head.appendChild(script);
  });
}

export async function connectGoogleCalendar(clientId: string) {
  if (!clientId.trim()) throw new Error("Google OAuth Client ID is required.");
  localStorage.setItem(GOOGLE_CALENDAR_CLIENT_ID_KEY, clientId.trim());
  await loadGoogleIdentity();
  return new Promise<string>((resolve, reject) => {
    const client = (
      window as unknown as GisGoogle
    ).accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: "https://www.googleapis.com/auth/calendar.readonly",
      callback: (response: GisTokenResponse) => {
        if (response.error)
          reject(new Error(response.error_description || response.error));
        else {
          localStorage.setItem(
            GOOGLE_CALENDAR_TOKEN_KEY,
            response.access_token,
          );
          resolve(response.access_token);
        }
      },
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

export function disconnectGoogleCalendar() {
  localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_KEY);
}

function getToken() {
  return localStorage.getItem(GOOGLE_CALENDAR_TOKEN_KEY);
}

export async function fetchGoogleCalendarEvents(
  timeMin: Date,
  timeMax: Date,
): Promise<GoogleCalendarEvent[]> {
  const token = getToken();
  if (!token) throw new Error("Connect Google Calendar first.");
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    },
  );
  if (response.status === 401) {
    disconnectGoogleCalendar();
    throw new Error("Google Calendar session expired. Please reconnect.");
  }
  if (!response.ok) {
    const body: GoogleApiError = await response.json().catch(() => ({}));
    throw new Error(
      body.error?.message || `Google Calendar error ${response.status}`,
    );
  }
  const data: GCalListEventsResponse = await response.json();
  let nextPageToken = data.nextPageToken;
  const items = [...(data.items || [])];
  const seenPageTokens = new Set<string>();
  while (nextPageToken && !seenPageTokens.has(nextPageToken)) {
    seenPageTokens.add(nextPageToken);
    const pageResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${new URLSearchParams({ ...Object.fromEntries(params), pageToken: nextPageToken })}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (pageResponse.status === 401) {
      disconnectGoogleCalendar();
      throw new Error("Google Calendar session expired. Please reconnect.");
    }
    if (!pageResponse.ok) {
      const body: GoogleApiError = await pageResponse.json().catch(() => ({}));
      throw new Error(
        body.error?.message || `Google Calendar error ${pageResponse.status}`,
      );
    }
    const page: GCalListEventsResponse = await pageResponse.json();
    items.push(...(page.items || []));
    nextPageToken = page.nextPageToken;
  }
  return items
    .filter(
      (event: GCalRawEvent) =>
        event.status !== "cancelled" &&
        (event.start?.dateTime || event.start?.date),
    )
    .map((event: GCalRawEvent) => ({
      id: event.id,
      summary: event.summary || "Untitled event",
      description: event.description,
      location: event.location,
      start: event.start.dateTime || `${event.start.date}T00:00:00`,
      end: event.end.dateTime || `${event.end.date}T00:00:00`,
      allDay: !event.start.dateTime,
    }));
}
