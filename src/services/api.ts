/**
 * Cliente HTTP da API do backend (FastAPI). Fetch + JWT (bearer) + tratamento de erro
 * no padrão Problem Details (RFC 7807). Toda tela consome o backend por aqui.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8000';
const TOKEN_KEY = 'erario_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public title: string,
    public detail?: string,
  ) {
    super(detail || title);
  }
}

function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    setToken(null);
    throw new ApiError(401, 'Sessão expirada', 'Faça login novamente.');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.title || `Erro ${res.status}`, body.detail);
  }
  return body as T;
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
): Promise<T> {
  const url = new URL(BASE + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { headers: authHeaders() });
  return handle<T>(res);
}

/** POST JSON autenticado, com os mesmos query params e Problem Details do GET. */
export async function apiPost<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  params?: Record<string, string | number | undefined | null>,
): Promise<TResponse> {
  const url = new URL(BASE + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handle<TResponse>(res);
}

/** PATCH JSON autenticado (mesmo tratamento de erro Problem Details). */
export async function apiPatch<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  params?: Record<string, string | number | undefined | null>,
): Promise<TResponse> {
  const url = new URL(BASE + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: 'PATCH',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handle<TResponse>(res);
}

/** PUT JSON autenticado (cadastros idempotentes, ex.: meta fiscal da LDO). */
export async function apiPut<TResponse, TBody = unknown>(
  path: string,
  body: TBody,
  params?: Record<string, string | number | undefined | null>,
): Promise<TResponse> {
  const url = new URL(BASE + path);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handle<TResponse>(res);
}

/** DELETE autenticado. 204 não tem corpo — resolve sem tentar desserializar. */
export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(BASE + path, { method: 'DELETE', headers: authHeaders() });
  if (res.status === 204) return;
  await handle<unknown>(res);
}

/** Download autenticado de artefatos binários sem expor o JWT na URL. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const res = await fetch(BASE + path, { headers: authHeaders() });
  if (!res.ok) {
    if (res.status === 401) setToken(null);
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.title || `Erro ${res.status}`, body.detail);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function login(email: string, senha: string): Promise<string> {
  const form = new URLSearchParams({ username: email, password: senha });
  const res = await fetch(BASE + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.title || 'Falha no login', body.detail || 'Credenciais inválidas.');
  }
  setToken(body.access_token);
  return body.access_token as string;
}
