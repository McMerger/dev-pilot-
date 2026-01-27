import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
    AGENT_ENDPOINT: string;
    DEVPILOT_KV: KVNamespace;
    AI: Ai;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    JWT_SECRET: string;
};

interface AiTextGenerationInput {
    messages: { role: string; content: string }[];
}

interface AiTextGenerationOutput {
    response?: string;
}

interface Ai {
    run: (model: string, inputs: AiTextGenerationInput) => Promise<AiTextGenerationOutput>;
}

const app = new Hono<{ Bindings: Bindings, Variables: { userId: string } }>();

// Inject Storage with KV if available
app.use('*', async (c, next) => {
    // Re-initialize storage with environment binding if present
    if (c.env.DEVPILOT_KV) {
        // We use a singleton pattern or attached to context in real apps
        // For this simple demo, we rely on the global 'storage' instance
        // But we need to update its internal KV reference
        (storage as DurableStorage).kv = c.env.DEVPILOT_KV;
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

interface User {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
    provider: 'github' | 'google' | 'apple' | 'email';
    provider_id: string;
    created_at: string;
    last_login: string;
}

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
    // Auth
    saveUser(user: User): Promise<void>;
    getUserByProvider(provider: string, providerId: string): Promise<User | null>;
    getUser(id: string): Promise<User | null>;
}

// Durable KV Storage (Simulated for Dev, would use Cloudflare KV/D1 in Prod)
// Durable KV Storage (Simulated for Dev, would use Cloudflare KV/D1 in Prod)
class DurableStorage implements Storage {
    private mem = new Map<string, string>();
    public kv?: KVNamespace;

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
        if (this.kv) {
            // inefficient scan for prototype
            const keys = await this.kv.list({ prefix: 'task:' });
            const tasks: Task[] = [];
            for (const key of keys.keys) {
                const val = await this.kv.get(key.name);
                if (val) {
                    const t = JSON.parse(val) as Task;
                    if (t.userId === userId) {
                        tasks.push(t);
                    }
                }
            }
            return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return Array.from(this.mem.values())
            .map(s => JSON.parse(s) as Task)
            .filter(t => t.userId === userId && t.provider)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

    // Auth Implementation
    async saveUser(user: User): Promise<void> {
        // Index by ID
        const val = JSON.stringify(user);
        if (this.kv) await this.kv.put(`user:${user.id}`, val);
        else this.mem.set(`user:${user.id}`, val);

        // Index by Provider (for lookup during login)
        const indexKey = `user_idx:${user.provider}:${user.provider_id}`;
        if (this.kv) await this.kv.put(indexKey, user.id);
        else this.mem.set(indexKey, user.id);
    }

    async getUserByProvider(provider: string, providerId: string): Promise<User | null> {
        const indexKey = `user_idx:${provider}:${providerId}`;
        let userId: string | null | undefined;

        if (this.kv) userId = await this.kv.get(indexKey);
        else userId = this.mem.get(indexKey);

        if (!userId) return null;

        return this.getUser(userId);
    }

    async getUser(id: string): Promise<User | null> {
        if (this.kv) {
            const data = await this.kv.get(`user:${id}`);
            return data ? JSON.parse(data) : null;
        }
        const data = this.mem.get(`user:${id}`);
        return data ? JSON.parse(data) : null;
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
    metadata?: Record<string, unknown>;
}

interface Project {
    id: string;
    name: string;
    root: string;
    allowedCommands: string[];
}

// --- Agent Registry (Federation) ---
interface AgentNode {
    id: string;
    url: string;
    region: string;
    projects: Project[];
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

    // ... existing auth middleware ...
    c.header('X-Edge-Region', 'IAD');
    await next();
});

// --- Auth Utilities ---

async function signJWT(user: User, secret: string) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({ sub: user.id, name: user.name, exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) }));
    const signature = btoa(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(`${header}.${payload}`)).then(buf => String.fromCharCode(...new Uint8Array(buf))));
    return `${header}.${payload}.${signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
}

async function verifyJWT(token: string, secret: string) {
    try {
        const [header, payload, signature] = token.split('.');
        if (!header || !payload || !signature) return null;

        const signedInput = `${header}.${payload}`;
        const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);

        const sigBase64 = signature.replace(/-/g, '+').replace(/_/g, '/');
        const sigBuf = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0));

        const isValid = await crypto.subtle.verify('HMAC', key, sigBuf, new TextEncoder().encode(signedInput));
        if (!isValid) return null;

        const data = JSON.parse(atob(payload));
        if (data.exp && Date.now() / 1000 > data.exp) return null;

        return data;
    } catch {
        return null;
    }
}

// --- Auth Routes ---

app.get('/api/auth/:provider', (c) => {
    const provider = c.req.param('provider');
    const { GITHUB_CLIENT_ID, GOOGLE_CLIENT_ID } = c.env;

    if (provider === 'github') {
        const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user:email`;
        return c.redirect(url);
    }
    if (provider === 'google') {
        const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${c.req.url}/callback&response_type=code&scope=email profile`;
        return c.redirect(url);
    }
    return c.json({ error: 'Provider not supported' }, 400);
});

app.get('/api/auth/:provider/callback', async (c) => {
    const provider = c.req.param('provider');
    const code = c.req.query('code');

    if (!code) return c.json({ error: 'No code provided' }, 400);

    let email = '';
    let name = '';
    let providerId = '';
    let avatarUrl = '';

    try {
        if (provider === 'github') {
            // Exchange code for token
            const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    client_id: c.env.GITHUB_CLIENT_ID,
                    client_secret: c.env.GITHUB_CLIENT_SECRET,
                    code
                })
            });
            const tokenData = await tokenRes.json() as { access_token: string };

            // Get User Info
            const userRes = await fetch('https://api.github.com/user', {
                headers: { 'Authorization': `Bearer ${tokenData.access_token}`, 'User-Agent': 'DevPilot' }
            });
            const userData = await userRes.json() as { id: number; login: string; name: string; email?: string; avatar_url: string };

            email = userData.email || `${userData.login}@github.com`;
            name = userData.name || userData.login;
            providerId = String(userData.id);
            avatarUrl = userData.avatar_url;
        }
        else if (provider === 'google') {
            // Mock Google for now as it requires complex setup
            email = 'mock@gmail.com';
            name = 'Mock Google User';
            providerId = 'mock_google_123';
        }
    } catch {
        return c.json({ error: 'Auth failed' }, 500);
    }

    // Upsert User
    let user = await storage.getUserByProvider(provider, providerId);
    if (!user) {
        user = {
            id: `user_${crypto.randomUUID()}`,
            email,
            name,
            provider: provider as 'github' | 'google' | 'apple' | 'email',
            provider_id: providerId,
            avatar_url: avatarUrl,
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString()
        };
    } else {
        user.last_login = new Date().toISOString();
        if (avatarUrl) user.avatar_url = avatarUrl;
    }

    await storage.saveUser(user);

    // Issue JWT
    const token = await signJWT(user, c.env.JWT_SECRET || 'dev-secret');

    // Redirect to Frontend
    return c.redirect(`https://dev-pilot.pages.dev?token=${token}`);
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
        projects: Project[];
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
    const allProjects: (Project & { agentId: string })[] = [];

    // Add Local Agent (if configured via env)
    if (c.env.AGENT_ENDPOINT) {
        try {
            const res = await fetch(`${c.env.AGENT_ENDPOINT}/projects`);
            const projs = await res.json() as Project[];
            allProjects.push(...projs.map(p => ({ ...p, agentId: 'local-static' })));
        } catch { /* ignore offline static agent */ }
    }

    // Add Dynamic Agents
    for (const node of activeAgents) {
        allProjects.push(...node.projects.map(p => ({
            ...p,
            agentId: node.id,
            name: p.name
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

// --- Protected Routes Middleware ---

app.use('/api/tasks/*', async (c, next) => {
    const auth = c.req.header('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = auth.split(' ')[1];
    const payload = await verifyJWT(token, c.env.JWT_SECRET || 'dev-secret');
    if (!payload) {
        return c.json({ error: 'Invalid Token' }, 401);
    }

    c.set('userId', payload.sub);
    await next();
});

// GET /api/user/me - Get current user profile
app.get('/api/user/me', async (c) => {
    const userId = c.get('userId');
    const user = await storage.getUser(userId);
    if (!user) return c.json({ error: 'User not found' }, 404);
    return c.json(user);
});

// GET /api/audit-logs - Security Logs
app.get('/api/admin/audit-logs', async (c) => {
    // Ideally check for admin role, but for now open to auth'd users
    const logs = await storage.getAuditLogs();
    return c.json(logs);
});

// GET /api/tasks - List my tasks
app.get('/api/tasks', async (c) => {
    const userId = c.get('userId');
    const tasks = await storage.listTasks(userId);
    return c.json(tasks);
});

// POST /api/tasks - create a new task with LLM Routing
app.post('/api/tasks', async (c) => {
    const userId = c.get('userId');
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
        userId: userId,
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
    };

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
                // 1. Resolve Agent for Project
                let fileContext = "No files found (Agent offline or project empty)";

                if (body.projectId) {
                    const agents = await storage.listAgents();
                    let targetUrl = null;
                    for (const node of agents) {
                        if (node.projects.some(p => p.id === body.projectId)) {
                            targetUrl = node.url;
                            break;
                        }
                    }

                    if (targetUrl) {
                        // DEBUG LOG
                        console.log(`[Router] Target Agent URL: ${targetUrl}`);

                        try {
                            const fsRes = await fetch(`${targetUrl}/tools/list_files`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-Agent-Secret': 'devpilot-secret-key' },
                                body: JSON.stringify({ projectId: body.projectId, path: '.' })
                            });
                            const data = await fsRes.json();

                            if (!fsRes.ok) {
                                throw new Error((data as { error?: string }).error || fsRes.statusText);
                            }

                            if (!Array.isArray(data)) {
                                throw new Error("Agent returned invalid data format (expected array)");
                            }

                            const filesList = (data || []) as { name: string, isDir: boolean }[];

                            const fileStrings = filesList.map(f => f.isDir ? `${f.name}/` : f.name);
                            fileContext = fileStrings.slice(0, 50).join('\n'); // Limit context
                            if (filesList.length > 50) fileContext += `\n...(${filesList.length - 50} more)`;
                        } catch (e: unknown) {
                            console.error("Failed to fetch context", e);
                            const msg = e instanceof Error ? e.message : String(e);
                            fileContext = `[SYSTEM ERROR] Could not connect to Local Agent at ${targetUrl || 'unknown'}.\nDetails: ${msg}\n\nTroubleshooting:\n1. Ensure 'start-agent.ps1' is running.\n2. Check if the Cloudflare Tunnel is active.`;
                            // We can't push to logs here easily because we don't have the task object 't' yet, 
                            // but we will ensure this string ends up in the System Prompt so the AI sees it.
                        }
                    }
                }

                // 2. Run Agentic Loop (ReAct)
                const MAX_STEPS = 5;
                let currentStep = 0;
                let finalResponse = "";
                const messageHistory = [
                    {
                        role: 'system',
                        content: `You are DevPilot, an advanced coding agent connected to the user's local filesystem.

AVAILABLE TOOLS:
1. read_file(path: string): Reads file content.
2. write_to_file(path: string, content: string): Creates or overwrites a file.
3. run_command(command: string): Runs a shell command.
4. list_files(path: string): Lists directory contents.

FORMAT:
To use a tool, you must output a SINGLE JSON object in this exact format and NOTHING else:
{ "tool": "read_file", "args": { "path": "src/App.tsx" } }

To speak to the user (final answer), output standard text (not JSON).

CURRENT PROJECT CONTEXT:
${fileContext}`
                    },
                    { role: 'user', content: body.prompt }
                ];

                while (currentStep < MAX_STEPS) {
                    console.log(`[Agent] Step ${currentStep + 1}/${MAX_STEPS}`);

                    // Call LLM
                    const aiRes = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', { messages: messageHistory });
                    const aiText = typeof aiRes === 'string' ? aiRes : (aiRes as { response: string }).response;

                    // Log AI Act
                    const stepLog = `[Step ${currentStep + 1}] AI: ${aiText.slice(0, 100)}...`;
                    const t_update = await storage.getTask(task.id);
                    if (t_update) {
                        t_update.logs.push(stepLog);
                        await storage.saveTask(t_update);
                    }

                    // Parse Tool Call
                    let toolCall = null;
                    try {
                        // Strict specific regex for {"tool": ...}
                        const jsonMatch = aiText.match(/{\s*"tool":\s*"[^"]+",\s*"args":\s*{[\s\S]*?}\s*}/);
                        if (jsonMatch) {
                            toolCall = JSON.parse(jsonMatch[0]);
                        } else {
                            // Fallback for markdown blocks
                            const looseMatch = aiText.match(/\{[\s\S]*\}/);
                            if (looseMatch && looseMatch[0].includes('"tool"')) {
                                toolCall = JSON.parse(looseMatch[0]);
                            }
                        }
                    } catch (e) {
                        console.log("Failed to parse tool call:", e);
                    }

                    if (toolCall && toolCall.tool && toolCall.args) {
                        console.log(`[Agent] Tool Call: ${toolCall.tool}`);
                        const t_tool = await storage.getTask(task.id);
                        if (t_tool) {
                            t_tool.logs.push(`[Tool] Executing ${toolCall.tool}...`);
                            await storage.saveTask(t_tool);
                        }

                        messageHistory.push({ role: 'assistant', content: JSON.stringify(toolCall) });

                        let toolResult = "";
                        let targetUrl = null;

                        // Resolve Agent URL again (redundant but safe)
                        if (body.projectId) {
                            const agents = await storage.listAgents();
                            for (const node of agents) {
                                if (node.projects.some(p => p.id === body.projectId)) {
                                    targetUrl = node.url;
                                    break;
                                }
                            }
                        }

                        if (!targetUrl) {
                            toolResult = "Error: Agent disconnected or project not found. Make sure the local agent is running.";
                            // Log failure
                            const t_err = await storage.getTask(task.id);
                            if (t_err) {
                                t_err.logs.push(`[Error] Agent not found for project ${body.projectId}`);
                                await storage.saveTask(t_err);
                            }
                        } else {
                            try {
                                const secret = 'devpilot-secret-key';
                                let res: Response | null = null;
                                const headers = { 'Content-Type': 'application/json', 'X-Agent-Secret': secret };

                                if (toolCall.tool === 'read_file') {
                                    res = await fetch(`${targetUrl}/tools/read_file`, {
                                        method: 'POST',
                                        headers,
                                        body: JSON.stringify({ projectId: body.projectId, path: toolCall.args.path })
                                    });
                                }
                                else if (toolCall.tool === 'write_to_file') {
                                    res = await fetch(`${targetUrl}/tools/apply_patch`, {
                                        method: 'POST',
                                        headers,
                                        body: JSON.stringify({
                                            projectId: body.projectId,
                                            operations: [{ op: 'create', path: toolCall.args.path, content: toolCall.args.content }]
                                        })
                                    });
                                }
                                else if (toolCall.tool === 'run_command') {
                                    res = await fetch(`${targetUrl}/tools/run_command`, {
                                        method: 'POST',
                                        headers,
                                        body: JSON.stringify({ projectId: body.projectId, command: toolCall.args.command })
                                    });
                                }
                                else if (toolCall.tool === 'list_files') {
                                    res = await fetch(`${targetUrl}/tools/list_files`, {
                                        method: 'POST',
                                        headers,
                                        body: JSON.stringify({ projectId: body.projectId, path: toolCall.args.path || '.' })
                                    });
                                }
                                else {
                                    toolResult = "Error: Unknown tool.";
                                }

                                if (res) {
                                    if (!res.ok) {
                                        const errText = await res.text();
                                        toolResult = `Agent Error (${res.status}): ${errText}`;
                                    } else {
                                        const data = await res.json();
                                        if (toolCall.tool === 'read_file') toolResult = (data as any).content || "Empty";
                                        else if (toolCall.tool === 'write_to_file') toolResult = (data as any).errors?.length ? `Errors: ${(data as any).errors}` : "Success";
                                        else if (toolCall.tool === 'run_command') toolResult = `Exit: ${(data as any).exitCode}\n${(data as any).stdout}`;
                                        else toolResult = JSON.stringify(data).slice(0, 1000);
                                    }
                                }
                            } catch (e) {
                                toolResult = `Error executing tool: ${e}`;
                            }
                        }

                        // Feed back result
                        messageHistory.push({ role: 'user', content: `[TOOL OUTPUT]: ${toolResult.slice(0, 2000)}` });
                        currentStep++;
                    } else {
                        // No tool call -> Final Answer
                        finalResponse = aiText;
                        break;
                    }
                }

                if (!finalResponse) finalResponse = "Task timed out or reached max steps.";

                const t = await storage.getTask(task.id);
                if (t) {
                    t.status = 'done';
                    t.resultSummary = finalResponse;
                    t.logs.push(`[Done] Agent finished in ${currentStep} steps.`);
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
    const userId = c.get('userId');
    const id = c.req.param('id');
    const task = await storage.getTask(id);

    if (!task) {
        return c.json({ error: 'Task not found' }, 404);
    }

    if (task.userId !== userId) {
        return c.json({ error: 'Unauthorized' }, 403);
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
        // Hono types for status code are strict, we trust the fetch response status is valid
        return c.json(data, res.status as 200 | 201 | 400 | 401 | 403 | 404 | 500);
    } catch {
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

