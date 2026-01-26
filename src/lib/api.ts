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
    resultSummary: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTaskRequest {
    projectId: string;
    prompt: string;
    mode: string;
    modelId: string;
}

// API Functions
export async function getModels(): Promise<Model[]> {
    const res = await fetch(`${API_BASE}/api/models`);
    if (!res.ok) throw new Error('Failed to fetch models');
    return res.json();
}

export async function getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/api/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
}

export async function createTask(req: CreateTaskRequest): Promise<Task> {
    const res = await fetch(`${API_BASE}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
}

export async function getTask(id: string): Promise<Task> {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`);
    if (!res.ok) throw new Error('Task not found');
    return res.json();
}

export async function checkAgentHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/api/projects`);
        return res.ok;
    } catch {
        return false;
    }
}
