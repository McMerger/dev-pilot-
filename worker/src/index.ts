import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
    AGENT_ENDPOINT: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS for frontend
app.use('/*', cors());

// Available models
const MODELS = [
    { id: 'gemini-3-pro-high', label: 'Gemini 3 Pro High' },
    { id: 'gemini-3-pro-low', label: 'Gemini 3 Pro Low' },
    { id: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
    { id: 'claude-sonnet-4.5-thinking', label: 'Claude Sonnet 4.5 (Thinking)' },
    { id: 'gpt-oss-120b', label: 'GPT OSS 120B (Medium)' },
];

// In-memory task store (use D1/KV in production)
const tasks = new Map<string, Task>();

interface Task {
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

// GET /api/models
app.get('/api/models', (c) => {
    return c.json(MODELS);
});

// GET /api/projects - proxy to local agent
app.get('/api/projects', async (c) => {
    const agentEndpoint = c.env.AGENT_ENDPOINT;
    try {
        const res = await fetch(`${agentEndpoint}/projects`);
        const data = await res.json();
        return c.json(data);
    } catch (err) {
        return c.json({ error: 'Agent not reachable' }, 502);
    }
});

// POST /api/tasks - create a new task
app.post('/api/tasks', async (c) => {
    const body = await c.req.json<{
        projectId: string;
        prompt: string;
        mode: string;
        modelId: string;
    }>();

    const task: Task = {
        id: `task_${crypto.randomUUID().slice(0, 8)}`,
        userId: 'user_demo', // In prod, from auth
        projectId: body.projectId,
        prompt: body.prompt,
        mode: body.mode,
        modelId: body.modelId,
        status: 'pending',
        logs: [],
        resultSummary: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    tasks.set(task.id, task);

    // TODO: In production, this would trigger the agent loop
    // For now, simulate processing
    task.status = 'running';
    task.logs.push(`Task created with model: ${body.modelId}`);
    task.logs.push(`Project: ${body.projectId}`);
    task.logs.push(`Prompt: ${body.prompt.slice(0, 100)}...`);

    // Simulate completion after a short delay (in real impl, this is async)
    setTimeout(() => {
        const t = tasks.get(task.id);
        if (t) {
            t.status = 'done';
            t.resultSummary = 'Task completed successfully';
            t.updatedAt = new Date().toISOString();
        }
    }, 3000);

    return c.json(task, 201);
});

// GET /api/tasks/:id
app.get('/api/tasks/:id', (c) => {
    const id = c.req.param('id');
    const task = tasks.get(id);

    if (!task) {
        return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(task);
});

// Forward tool calls to agent
app.post('/api/agent/tools/:tool', async (c) => {
    const tool = c.req.param('tool');
    const agentEndpoint = c.env.AGENT_ENDPOINT;
    const body = await c.req.json();

    try {
        const res = await fetch(`${agentEndpoint}/tools/${tool}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return c.json(data, res.status as any);
    } catch (err) {
        return c.json({ error: 'Agent not reachable' }, 502);
    }
});

// Health check
app.get('/health', (c) => {
    return c.json({ status: 'ok', service: 'devpilot-worker' });
});

export default app;
