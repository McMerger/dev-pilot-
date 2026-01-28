// API Configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Types
export interface Model {
    id: string;
    label: string;
}

export interface Project {
    id: string;
    name: string;
    root: string;
    allowedCommands: string[];
}

export interface Task {
    id: string;
    userId: string;
    projectId: string;
    prompt: string;
    mode: string;
    modelId: string;
    status: 'pending' | 'planning' | 'running' | 'done' | 'error';
    logs: string[];
    diffs: string[];
    resultSummary: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskRequest {
    projectId: string;
    prompt: string;
    mode: string;
    modelId: string;
    history?: { role: string; content: string }[];
}

// Helper for authenticated requests
async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('devpilot-session');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

    // Handle 401 (Token Expired)
    if (res.status === 401) {
        localStorage.removeItem('devpilot-session');
        window.location.reload();
        throw new Error('Session expired');
    }

    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'API Request Failed');
    }

    return res.json();
}

// API Functions
export async function getModels(): Promise<Model[]> {
    return fetchWithAuth('/api/models');
}

export async function getProjects(): Promise<Project[]> {
    return fetchWithAuth('/api/projects');
}

export async function getTasks(): Promise<Task[]> {
    return fetchWithAuth('/api/tasks');
}

export async function createTask(req: CreateTaskRequest): Promise<Task> {
    return fetchWithAuth('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(req),
    });
}

export async function getTask(id: string): Promise<Task> {
    return fetchWithAuth(`/api/tasks/${id}`);
}

export async function checkAgentHealth(): Promise<{ online: boolean; region: string }> {
    try {
        const token = localStorage.getItem('devpilot-session');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        };
        const res = await fetch(`${API_BASE}/api/projects`, { headers });
        const region = res.headers.get('X-Edge-Region') || 'Unknown';
        if (res.ok) return { online: true, region };
        return { online: false, region: 'Offline' };
    } catch {
        return { online: false, region: 'Offline' };
    }
}

export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    provider: string;
}

export interface AuditEntry {
    id: string;
    timestamp: string;
    action: 'ALLOW' | 'DENY';
    description: string;
    actor: string;
}

export async function getCurrentUser(): Promise<User> {
    return fetchWithAuth('/api/user/me');
}

export async function getAuditLogs(): Promise<AuditEntry[]> {
    return fetchWithAuth('/api/admin/audit-logs');
}
