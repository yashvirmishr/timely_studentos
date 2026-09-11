import type {
  GisGoogle,
  GisTokenResponse,
  GDriveRawFile,
  GDriveListFilesResponse,
  GDriveAboutResponse,
  GDriveUploadResponse,
  GoogleApiError,
} from "./google-types";

const DRIVE_TOKEN_KEY = "timely_gdrive_token";
const DRIVE_CLIENT_ID_KEY = "timely_gdrive_client_id";
const DRIVE_FOLDER_KEY = "timely_gdrive_folder_id";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const APP_FOLDER_NAME = "Timely";

export interface GoogleDriveConfig {
  clientId: string;
  connected: boolean;
}

export interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
}

export interface DriveStorageQuota {
  limit: number;
  usage: number;
}

export function getGoogleDriveConfig(): GoogleDriveConfig {
  if (typeof window === "undefined") return { clientId: "", connected: false };
  return {
    clientId: localStorage.getItem(DRIVE_CLIENT_ID_KEY) || "",
    connected: !!localStorage.getItem(DRIVE_TOKEN_KEY),
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
    script.onerror = () => reject(new Error("Could not load Google sign-in. Check if an ad blocker is blocking accounts.google.com, or try a different browser."));
    document.head.appendChild(script);
  });
}

export async function connectGoogleDrive(clientId: string): Promise<string> {
  if (!clientId.trim())
    throw new Error("Google OAuth Client ID is required.");
  localStorage.setItem(DRIVE_CLIENT_ID_KEY, clientId.trim());
  await loadGoogleIdentity();
  return new Promise<string>((resolve, reject) => {
    const client = (
      window as unknown as GisGoogle
    ).accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response: GisTokenResponse) => {
        if (response.error)
          reject(new Error(response.error_description || response.error));
        else {
          localStorage.setItem(DRIVE_TOKEN_KEY, response.access_token);
          resolve(response.access_token);
        }
      },
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}

export function disconnectGoogleDrive() {
  localStorage.removeItem(DRIVE_TOKEN_KEY);
  localStorage.removeItem(DRIVE_FOLDER_KEY);
}

function getToken(): string | null {
  return localStorage.getItem(DRIVE_TOKEN_KEY);
}

function getFolderId(): string | null {
  return localStorage.getItem(DRIVE_FOLDER_KEY);
}

function setFolderId(id: string) {
  localStorage.setItem(DRIVE_FOLDER_KEY, id);
}

async function driveRequest<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("Not connected to Google Drive");

  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (resp.status === 401) {
    disconnectGoogleDrive();
    throw new Error("Google Drive session expired. Please reconnect.");
  }

  if (!resp.ok) {
    const body: GoogleApiError = await resp.json().catch(() => ({}));
    throw new Error(
      body.error?.message || `Google Drive error ${resp.status}`,
    );
  }

  return resp.json();
}

/** Find or create the "Timely" app folder in Drive. */
async function ensureAppFolder(): Promise<string> {
  const existing = getFolderId();
  if (existing) return existing;

  // Search for existing folder
  const searchParams = new URLSearchParams({
    q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });
  const searchResult = await driveRequest<GDriveListFilesResponse>(
    `${DRIVE_API}/files?${searchParams}`,
  );

  if (searchResult.files && searchResult.files.length > 0) {
    const folderId = searchResult.files[0].id;
    setFolderId(folderId);
    return folderId;
  }

  // Create the folder
  const createResp = await fetch(`${DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createResp.ok) {
    throw new Error("Failed to create Timely folder in Google Drive.");
  }

  const folder = await createResp.json();
  setFolderId(folder.id);
  return folder.id;
}

/** List all files in the Timely folder. */
export async function listDriveFiles(): Promise<DriveFileInfo[]> {
  const folderId = await ensureAppFolder();
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields:
      "files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)",
    orderBy: "modifiedTime desc",
    spaces: "drive",
  });

  const result = await driveRequest<GDriveListFilesResponse>(
    `${DRIVE_API}/files?${params}`,
  );

  return (result.files || []).map((f: GDriveRawFile) => ({
    id: f.id,
    name: f.name,
    mimeType: f.mimeType,
    size: parseInt(f.size || "0", 10),
    createdTime: f.createdTime || "",
    modifiedTime: f.modifiedTime || "",
    webViewLink: f.webViewLink,
  }));
}

/** Upload a file to the Timely folder. */
export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<DriveFileInfo> {
  const folderId = await ensureAppFolder();

  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  // Use multipart upload for files < 5MB, resumable for larger
  if (file.size < 5 * 1024 * 1024) {
    const form = new FormData();
    form.append(
      "metadata",
      new Blob([JSON.stringify(metadata)], { type: "application/json" }),
    );
    form.append("file", file);

    const resp = await fetch(
      `${DRIVE_UPLOAD_API}/upload?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      },
    );

    if (!resp.ok) {
      const err: GoogleApiError = await resp.json().catch(() => ({}));
      throw new Error(
        err.error?.message || `Upload failed (${resp.status})`,
      );
    }

    const data: GDriveUploadResponse = await resp.json();
    onProgress?.(100);
    return {
      id: data.id,
      name: data.name,
      mimeType: data.mimeType,
      size: parseInt(String(data.size || file.size), 10),
      createdTime: data.createdTime || new Date().toISOString(),
      modifiedTime: data.createdTime || new Date().toISOString(),
      webViewLink: data.webViewLink,
    };
  }

  // Resumable upload for larger files
  const initResp = await fetch(
    `${DRIVE_UPLOAD_API}/upload?uploadType=resumable&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": file.type,
        "X-Upload-Content-Length": String(file.size),
      },
      body: JSON.stringify(metadata),
    },
  );

  if (!initResp.ok) {
    throw new Error(`Failed to initialize upload (${initResp.status})`);
  }

  const uploadUrl = initResp.headers.get("Location");
  if (!uploadUrl) throw new Error("No upload URL returned");

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  let offset = 0;

  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const chunk = file.slice(offset, end);

    const chunkResp = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(end - offset),
        "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
      },
      body: chunk,
    });

    if (chunkResp.status === 308) {
      // Chunk accepted, continue
      offset = end;
      onProgress?.(Math.round((offset / file.size) * 100));
    } else if (chunkResp.ok) {
      // Final chunk
      const data: GDriveUploadResponse = await chunkResp.json();
      onProgress?.(100);
      return {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        size: parseInt(String(data.size || file.size), 10),
        createdTime: data.createdTime || new Date().toISOString(),
        modifiedTime: data.createdTime || new Date().toISOString(),
        webViewLink: data.webViewLink,
      };
    } else {
      const err: GoogleApiError = await chunkResp.json().catch(() => ({}));
      throw new Error(
        err.error?.message || `Upload chunk failed (${chunkResp.status})`,
      );
    }
  }

  throw new Error("Upload completed without response");
}

/** Delete a file from Google Drive. */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("Not connected to Google Drive");

  const resp = await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (resp.status === 401) {
    disconnectGoogleDrive();
    throw new Error("Google Drive session expired. Please reconnect.");
  }

  if (!resp.ok) {
    const err: GoogleApiError = await resp.json().catch(() => ({}));
    throw new Error(
      err.error?.message || `Delete failed (${resp.status})`,
    );
  }
}

/** Get storage quota info. */
export async function getDriveStorageQuota(): Promise<DriveStorageQuota> {
  const result = await driveRequest<GDriveAboutResponse>(
    `${DRIVE_API}/about?fields=storageQuota`,
  );
  return {
    limit: parseInt(result.storageQuota?.limit || "0", 10),
    usage: parseInt(result.storageQuota?.usage || "0", 10),
  };
}

/** Get a download URL for a file. */
export function getDownloadUrl(fileId: string): string {
  return `${DRIVE_API}/files/${fileId}?alt=media`;
}

/** Download file contents as a Blob. */
export async function downloadFile(fileId: string): Promise<Blob> {
  const token = getToken();
  if (!token) throw new Error("Not connected to Google Drive");

  const resp = await fetch(getDownloadUrl(fileId), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (resp.status === 401) {
    disconnectGoogleDrive();
    throw new Error("Google Drive session expired. Please reconnect.");
  }

  if (!resp.ok) {
    throw new Error(`Download failed (${resp.status})`);
  }

  return resp.blob();
}
