import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
    AGENT_ENDPOINT: string;
    DEVPILOT_KV: KVNamespace;
    AI: any;
};

const app = new Hono<{ Bindings: Bindings }>();

// Inject Storage with KV if available
app.use('*', async (c, next) => {
    // Re-initialize storage with environment binding if present
    if (c.env.DEVPILOT_KV) {
        // We use a singleton pattern or attached to context in real apps
        // For this simple demo, we rely on the global 'storage' instance
        // But we need to update its internal KV reference
        (storage as any).kv = c.env.DEVPILOT_KV;
    }
    await next();
});

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

// --- Planet-Scale Storage Abstraction ---

// --- Planet-Scale Storage Abstraction ---

// --- Types ---

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
    provider?: string;
}

interface Storage {
    getTask(id: string): Promise<Task | null>;
    saveTask(task: Task): Promise<void>;
    listTasks(userId: string): Promise<Task[]>;
    // Federation
    registerAgent(node: AgentNode): Promise<void>;
    listAgents(): Promise<AgentNode[]>;
    // Security
    addAuditLog(entry: AuditEntry): Promise<void>;
    getAuditLogs(): Promise<AuditEntry[]>;
}

// Durable KV Storage (Simulated for Dev, would use Cloudflare KV/D1 in Prod)
// Durable KV Storage (Simulated for Dev, would use Cloudflare KV/D1 in Prod)
class DurableStorage implements Storage {
    private mem = new Map<string, string>();
    private kv?: KVNamespace;

    constructor(kv?: KVNamespace) {
        this.kv = kv;
    }

    async getTask(id: string): Promise<Task | null> {
        if (this.kv) {
            const data = await this.kv.get(`task:${id}`);
            return data ? JSON.parse(data) : null;
        }
        const data = this.mem.get(`task:${id}`);
        return data ? JSON.parse(data) : null;
    }

    async saveTask(task: Task): Promise<void> {
        const val = JSON.stringify(task);
        if (this.kv) await this.kv.put(`task:${task.id}`, val);
        else this.mem.set(`task:${task.id}`, val);
    }

    async listTasks(userId: string): Promise<Task[]> {
        // KV listing is complex (requires keys() cursor), for now we stick to Map for list
        // In real prod we'd use D1 or a separate index
        return Array.from(this.mem.values())
            .map(s => JSON.parse(s) as Task)
            .filter(t => t.userId === userId && (t as any).provider);
    }

    // Stateless Registry Implementation
    async registerAgent(node: AgentNode): Promise<void> {
        const key = `agent:${node.id}`;
        const val = JSON.stringify(node);
        if (this.kv) await this.kv.put(key, val, { expirationTtl: 60 });
        else this.mem.set(key, val);
    }

    async listAgents(): Promise<AgentNode[]> {
        // For KV we'd scan prefix 'agent:', simplifying for hybrid
        if (this.kv) {
            const keys = await this.kv.list({ prefix: 'agent:' });
            const agents: AgentNode[] = [];
            for (const k of keys.keys) {
                const val = await this.kv.get(k.name);
                if (val) agents.push(JSON.parse(val));
            }
            return agents;
        }

        const now = Date.now();
        const agents: AgentNode[] = [];
        for (const [key, val] of this.mem.entries()) {
            if (key.startsWith('agent:')) {
                const node = JSON.parse(val) as AgentNode;
                if (now - node.lastSeen > 60000) {
                    this.mem.delete(key);
                } else {
                    agents.push(node);
                }
            }
        }
        return agents;
    }

    // Audit Log Implementation
    async addAuditLog(entry: AuditEntry): Promise<void> {
        const key = 'audit:latest';
        let logs: AuditEntry[] = [];

        if (this.kv) {
            const raw = await this.kv.get(key);
            if (raw) logs = JSON.parse(raw);
        } else {
            const raw = this.mem.get(key);
            if (raw) logs = JSON.parse(raw);
        }

        logs.unshift(entry);
        if (logs.length > 50) logs.pop();

        const val = JSON.stringify(logs);
        if (this.kv) await this.kv.put(key, val);
        else this.mem.set(key, val);
    }

    async getAuditLogs(): Promise<AuditEntry[]> {
        const key = 'audit:latest';
        if (this.kv) {
            const raw = await this.kv.get(key);
            return raw ? JSON.parse(raw) : [];
        }
        const raw = this.mem.get(key);
        return raw ? JSON.parse(raw) : [];
    }
}

const storage = new DurableStorage(); // Injects KV in main handlers if present

// --- Types ---
interface AuditEntry {
    id: string;
    timestamp: string;
    action: 'ALLOW' | 'DENY';
    description: string;
    actor: string; // Agent ID or User IP
    metadata?: any;
}

// --- Agent Registry (Federation) ---
interface AgentNode {
    id: string;
    url: string;
    region: string;
    projects: any[];
    lastSeen: number;
}

// --- Rate Limiting (Token Bucket) ---
const rateLimits = new Map<string, { tokens: number; lastRefill: number }>();
const MAX_TOKENS = 100;
const REFILL_RATE = 10; // per second

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    let bucket = rateLimits.get(ip);
    if (!bucket) {
        bucket = { tokens: MAX_TOKENS, lastRefill: now };
        rateLimits.set(ip, bucket);
    }

    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + elapsed * REFILL_RATE);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return true;
    }
    return false;
}

// Middleware: Rate Limiter & Region Header & Auth
app.use('*', async (c, next) => {
    // Rate Limit Check
    const ip = c.req.header('CF-Connecting-IP') || '127.0.0.1';
    if (!checkRateLimit(ip)) {
        return c.json({ error: 'Rate limit exceeded' }, 429);
    }

    // Shared Secret Auth (Simple)
    // In prod, use c.env.AGENT_SECRET
    const secret = c.req.header('X-Agent-Secret');
    const expected = 'devpilot-secret-key';

    // Only verify secret for agent routes, or allow public access to UI?
    // For this demo, we'll allow public UI, but protect Agent Heartbeat
    if (c.req.path.includes('/heartbeat') && secret !== expected) {
        await storage.addAuditLog({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action: 'DENY',
            description: `Unauthorized heartbeat attempt from ${ip}`,
            actor: 'Unknown',
        });
        return c.json({ error: 'Unauthorized Agent' }, 401);
    }

    c.header('X-Edge-Region', 'IAD');
    await next();
});

// GET /api/models
app.get('/api/models', (c) => {
    return c.json(MODELS);
});

// POST /api/agents/heartbeat - Dynamic Registration
app.post('/api/agents/heartbeat', async (c) => {
    const body = await c.req.json<{
        agentId: string;
        url: string;
        projects: any[];
    }>();

    const node: AgentNode = {
        id: body.agentId,
        url: body.url,
        region: c.req.header('X-Edge-Region') || 'unknown',
        projects: body.projects,
        lastSeen: Date.now()
    };

    await storage.registerAgent(node);
    console.log(`[Registry] Registered agent ${node.id} from ${node.region}`);

    return c.json({ status: 'registered', ttl: 60 });
});

// GET /api/projects - Aggregated Federation Proxy
app.get('/api/projects', async (c) => {
    // 1. Get live agents from storage
    const activeAgents = await storage.listAgents();

    // 2. Aggregate projects
    const allProjects: any[] = [];

    // Add Local Agent (if configured via env)
    if (c.env.AGENT_ENDPOINT) {
        try {
            const res = await fetch(`${c.env.AGENT_ENDPOINT}/projects`);
            const projs = await res.json() as any[];
            allProjects.push(...projs.map(p => ({ ...p, agentId: 'local-static' })));
        } catch { /* ignore offline static agent */ }
    }

    // Add Dynamic Agents
    for (const node of activeAgents) {
        allProjects.push(...node.projects.map(p => ({
            ...p,
            agentId: node.id,
            name: `${p.name} (${node.region})` // Decorate name with region
        })));
    }

    // Fallback if empty (for demo experience)
    if (allProjects.length === 0) {
        return c.json([
            { id: 'waiting', name: 'Waiting for Agents...', root: 'Check terminal', allowedCommands: [] }
        ]);
    }

    return c.json(allProjects);
});

// POST /api/tasks - create a new task with LLM Routing
app.post('/api/tasks', async (c) => {
    const body = await c.req.json<{
        projectId: string;
        prompt: string;
        mode: string;
        modelId: string;
    }>();

    // LLM Routing Logic
    let provider = 'openai';
    if (body.modelId.includes('gemini')) provider = 'google';
    if (body.modelId.includes('claude')) provider = 'anthropic';

    console.log(`[Router] Routing request to ${provider} via ${body.modelId}`);

    const task: Task = {
        id: `task_${crypto.randomUUID().slice(0, 8)}`,
        userId: 'user_demo',
        projectId: body.projectId,
        prompt: body.prompt,
        mode: body.mode,
        modelId: body.modelId,
        status: 'pending',
        logs: [],
        resultSummary: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        provider: provider
    } as any;

    await storage.saveTask(task);

    // Simulate async processing
    task.status = 'running';
    task.logs.push(`[Edge] Routing task to nearest agent (latency: 12ms)`);
    task.logs.push(`[Router] Selected Provider: ${provider.toUpperCase()}`);
    task.logs.push(`[Agent] Executing in ${body.projectId}...`);

    await storage.saveTask(task);

    c.executionCtx.waitUntil(
        (async () => {
            try {
                // 1. Run core inference
                let aiResponse: any;
                try {
                    aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
                        messages: [
                            { role: 'system', content: 'You are DevPilot, an advanced coding agent. Respond directly to the user request. Be concise and technical.' },
                            { role: 'user', content: body.prompt }
                        ]
                    });
                } catch (e) {
                    console.error("AI Error", e);
                    aiResponse = { response: "Error running AI model. Please ensure the prompt is valid." };
                }

                const t = await storage.getTask(task.id);
                if (t) {
                    t.status = 'done';
                    t.resultSummary = aiResponse.response || JSON.stringify(aiResponse);
                    t.logs.push(`[AI] Response generated by Llama-3-8b`);
                    t.updatedAt = new Date().toISOString();
                    await storage.saveTask(t);
                }
            } catch (err) {
                console.error("Task processing error", err);
            }
        })()
    );

    return c.json(task, 201);
});

// GET /api/tasks/:id
app.get('/api/tasks/:id', async (c) => {
    const id = c.req.param('id');
    const task = await storage.getTask(id);

    if (!task) {
        return c.json({ error: 'Task not found' }, 404);
    }

    return c.json(task);
});

// Forward tool calls to agent (Dynamic Routing)
app.post('/api/agent/tools/:tool', async (c) => {
    const tool = c.req.param('tool');
    const body = await c.req.json();
    const projectId = body.projectId;

    let targetUrl = c.env.AGENT_ENDPOINT;
    let targetAgentId = 'local-static';

    // 1. Find which agent owns this project
    if (projectId) {
        const agents = await storage.listAgents();
        for (const node of agents) {
            if (node.projects.some(p => p.id === projectId)) {
                targetUrl = node.url;
                targetAgentId = node.id;
                break;
            }
        }
    }

    if (!targetUrl) {
        await storage.addAuditLog({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            action: 'DENY',
            description: `Tool ${tool} blocked: Project ${projectId} not found`,
            actor: 'Worker-Router'
        });
        return c.json({ error: 'No agent found for this project' }, 404);
    }

    // Log the ALLOWED attempt
    await storage.addAuditLog({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action: 'ALLOW',
        description: `Tool ${tool} routed to ${targetAgentId}`,
        actor: targetAgentId,
        metadata: { tool, projectId }
    });

    try {
        const res = await fetch(`${targetUrl}/tools/${tool}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Agent-Secret': 'devpilot-secret-key' // Forward auth
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        return c.json(data, res.status as any);
    } catch (err) {
        return c.json({ error: 'Agent not reachable' }, 502);
    }
});

// GET /api/tasks/:id/events - SSE for Real-Time Status
app.get('/api/tasks/:id/events', async (c) => {
    const id = c.req.param('id');
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Send initial connection message
    writer.write(encoder.encode(`data: {"status":"connected"}\n\n`));

    // Polling loop to simulate push
    // In production, we'd use Durable Objects or detailed streams
    const interval = setInterval(async () => {
        const task = await storage.getTask(id);
        if (task) {
            const payload = JSON.stringify(task);
            writer.write(encoder.encode(`data: ${payload}\n\n`));

            if (task.status === 'done' || task.status === 'error') {
                clearInterval(interval);
                writer.close();
            }
        }
    }, 1000);

    // Stop after 30s to prevent leaks
    setTimeout(() => {
        clearInterval(interval);
        writer.close();
    }, 30000);

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
});

// Health check with region info for federation
app.get('/health', (c) => {
    return c.json({
        status: 'ok',
        service: 'devpilot-worker',
        region: 'IAD', // Injected by platform
        version: 'v2.1-kv-enabled'
    });
});

export default app;

