import type {
  GisGoogle,
  GisTokenResponse,
  GClassroomRawCourse,
  GClassroomListCoursesResponse,
  GClassroomRawCourseWork,
  GClassroomListCourseWorkResponse,
  GoogleApiError,
} from "./google-types";

// Google Classroom integration — OAuth 2.0 implicit flow + REST API.
// Requires a Google Cloud project with the Classroom API enabled.
// Create one at https://console.cloud.google.com/apis/credentials

const GOOGLE_CLIENT_ID_KEY = "timely_gc_client_id";
const GOOGLE_TOKEN_KEY = "timely_google_token";
const GOOGLE_COURSES_KEY = "timely_google_courses";

export interface GoogleClassroomConfig {
  clientId: string;
  connected: boolean;
  email?: string;
}

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
}

export interface ClassroomAssignment {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  dueDate?: string; // YYYY-MM-DD
  description?: string;
  state: string; // "CREATED" | "PUBLISHED"
}

export function getGoogleConfig(): GoogleClassroomConfig {
  if (typeof window === "undefined") return { clientId: "", connected: false };
  const clientId = localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || "";
  const token = localStorage.getItem(GOOGLE_TOKEN_KEY);
  let email: string | undefined;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      email = payload.email;
    } catch {}
  }
  return { clientId, connected: !!token, email };
}

export function saveGoogleClientId(clientId: string) {
  localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId);
}

export function disconnectGoogle() {
  localStorage.removeItem(GOOGLE_TOKEN_KEY);
  localStorage.removeItem(GOOGLE_COURSES_KEY);
}

// Load the Google Identity Services script dynamically
let gisLoaded = false;
function loadGis(): Promise<void> {
  if (gisLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => { gisLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

// Initiate OAuth 2.0 implicit flow
export async function connectGoogleClassroom(clientId: string): Promise<string> {
  if (!clientId) throw new Error("Google Client ID is required. Set it up at https://console.cloud.google.com/apis/credentials");

  saveGoogleClientId(clientId);
  await loadGis();

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Google sign-in timed out")), 120000);

    const tokenClient = (window as unknown as GisGoogle).accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.coursework.me.readonly email profile",
      callback: (resp: GisTokenResponse) => {
        clearTimeout(timeout);
        if (resp.error) {
          reject(new Error(resp.error_description || resp.error));
        } else {
          localStorage.setItem(GOOGLE_TOKEN_KEY, resp.access_token);
          resolve(resp.access_token);
        }
      },
    });

    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

function getToken(): string | null {
  return localStorage.getItem(GOOGLE_TOKEN_KEY);
}

async function apiRequest<T>(url: string): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Not connected to Google Classroom");

  const resp = await fetch(`https://classroom.googleapis.com/v1/${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (resp.status === 401) {
    disconnectGoogle();
    throw new Error("Google session expired. Please reconnect.");
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as GoogleApiError).error?.message || `Google API error ${resp.status}`);
  }

  return resp.json();
}

export async function fetchCourses(): Promise<ClassroomCourse[]> {
  const data = await apiRequest<GClassroomListCoursesResponse>("courses?courseStates=ACTIVE");
  const courses = (data.courses || []).map((c: GClassroomRawCourse) => ({
    id: c.id,
    name: c.name || "Untitled",
    section: c.section,
  }));
  localStorage.setItem(GOOGLE_COURSES_KEY, JSON.stringify(courses));
  return courses;
}

export async function fetchAssignments(courseIds?: string[]): Promise<ClassroomAssignment[]> {
  const courses = courseIds?.length
    ? courseIds.map(id => ({ id, name: "" }))
    : getCachedCourses();

  if (!courses.length) {
    const fetched = await fetchCourses();
    courses.push(...fetched);
  }

  const allAssignments: ClassroomAssignment[] = [];

  for (const course of courses) {
    try {
      const data = await apiRequest<GClassroomListCourseWorkResponse>(
        `courses/${course.id}/courseWork?orderBy=dueDate desc`
      );
      for (const cw of data.courseWork || []) {
        allAssignments.push({
          id: cw.id,
          title: cw.title || "Untitled assignment",
          courseId: course.id,
          courseName: course.name || `Course ${course.id}`,
          dueDate: cw.dueDate?.year
            ? `${cw.dueDate.year}-${String(cw.dueDate.month ?? 1).padStart(2, "0")}-${String(cw.dueDate.day ?? 1).padStart(2, "0")}`
            : undefined,
          description: cw.description || undefined,
          state: cw.state || "PUBLISHED",
        });
      }
    } catch {
      // Skip courses that fail — might not have coursework or permission denied
    }
  }

  return allAssignments;
}

function getCachedCourses(): { id: string; name: string }[] {
  try {
    const stored = localStorage.getItem(GOOGLE_COURSES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
