import { getToken, clearToken } from "./auth";

const BASE = "/api";

async function request(method, path, body) {
  const token = getToken();
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearToken();
    window.location.reload();
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  listWords: (params) => {
    const qs = new URLSearchParams();
    if (params.search) qs.set("search", params.search);
    if (params.speech_part) qs.set("speech_part", params.speech_part);
    if (params.entry_type) qs.set("entry_type", params.entry_type);
    if (params.sort) qs.set("sort", params.sort);
    if (params.mastery_min != null) qs.set("mastery_min", params.mastery_min);
    if (params.mastery_max != null) qs.set("mastery_max", params.mastery_max);
    return request("GET", `/words?${qs}`);
  },
  createWord: (data) => request("POST", "/words", data),
  updateWord: (id, data) => request("PATCH", `/words/${id}`, data),
  deleteWord: (id) => request("DELETE", `/words/${id}`),
  getStats: () => request("GET", "/stats"),
  getQuizWords: (params) => request("POST", "/quiz", params),
  updateMastery: (id, correct) => request("POST", `/words/${id}/mastery`, { correct }),
  exportCsv: () => {
    const token = getToken();
    return fetch("/api/export/csv", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? match[1] : "vocab.csv";
      return res.blob().then((blob) => ({ blob, filename }));
    });
  },
  uploadAudio: (id, file) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    return fetch(`/api/words/${id}/audio`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async (res) => {
      if (res.status === 401) { clearToken(); window.location.reload(); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },
  deleteAudio: (id) => request("DELETE", `/words/${id}/audio`),
  getAudioUrl: (id) => `/api/words/${id}/audio`,
  importCsv: (file) => {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    return fetch("/api/import/csv", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }).then(async (res) => {
      if (res.status === 401) { clearToken(); window.location.reload(); return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }
      return res.json();
    });
  },
};
