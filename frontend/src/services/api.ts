import type {
  ConversationResponse,
  ImportRequest,
  LeaderboardEntry,
  StatsResponse,
} from '../types/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081').replace(/\/$/, '');

const STORAGE_KEY_AUTH = 'dc_auth_token';
const STORAGE_KEY_USER = 'dc_auth_username';

function getStoredAuth(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY_AUTH);
  } catch {
    return null;
  }
}

function getStoredUsername(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY_USER) || 'Admin';
  } catch {
    return 'Admin';
  }
}

function setStoredAuth(username: string, token: string) {
  try {
    sessionStorage.setItem(STORAGE_KEY_AUTH, token);
    sessionStorage.setItem(STORAGE_KEY_USER, username);
  } catch {
    // SessionStorage unavailable
  }
}

function clearStoredAuth() {
  try {
    sessionStorage.removeItem(STORAGE_KEY_AUTH);
    sessionStorage.removeItem(STORAGE_KEY_USER);
  } catch {
    // SessionStorage unavailable
  }
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  const token = getStoredAuth();
  if (token) {
    headers['Authorization'] = token;
  }
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    clearStoredAuth();
    throw new Error('Unauthorized: Invalid credentials or session expired.');
  }

  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await response.json().catch(() => ({})) : await response.text();

  if (!response.ok) {
    const message = isJson && body.error ? body.error : typeof body === 'string' && body ? body : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}

export const api = {
  isAuthenticated(): boolean {
    return getStoredAuth() !== null;
  },

  getUsername(): string {
    return getStoredUsername();
  },

  async login(username: string, password: string): Promise<{ username: string }> {
    const token = `Basic ${btoa(`${username}:${password}`)}`;
    // Test the credentials against the backend
    const url = `${API_BASE}/api/stats`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: token,
      },
      credentials: 'include',
    });

    if (response.status === 401 || response.status === 403) {
      throw new Error('Invalid username or password. Please check the credentials in your server configuration.');
    }

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}. Make sure the backend is running.`);
    }

    setStoredAuth(username, token);
    return { username };
  },

  logout() {
    clearStoredAuth();
  },

  getConversations(): Promise<ConversationResponse[]> {
    return request<ConversationResponse[]>('/api/conversations');
  },

  getConversation(id: string): Promise<ConversationResponse> {
    return request<ConversationResponse>(`/api/conversations/${encodeURIComponent(id)}`);
  },

  getStats(): Promise<StatsResponse> {
    return request<StatsResponse>('/api/stats');
  },

  getLeaderboard(sort: string = 'time', provider?: string, topic?: string): Promise<LeaderboardEntry[]> {
    const params = new URLSearchParams({ sort });
    if (provider && provider.trim()) params.set('provider', provider.trim());
    if (topic && topic.trim()) params.set('topic', topic.trim());
    return request<LeaderboardEntry[]>(`/api/leaderboard?${params.toString()}`);
  },

  importConversation(payload: ImportRequest): Promise<ConversationResponse> {
    return request<ConversationResponse>('/api/conversations/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  reanalyzeConversation(id: string): Promise<ConversationResponse> {
    return request<ConversationResponse>(`/api/conversations/${encodeURIComponent(id)}/reanalyze`, {
      method: 'POST',
    });
  },

  deleteConversation(id: string): Promise<void> {
    return request<void>(`/api/conversations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
