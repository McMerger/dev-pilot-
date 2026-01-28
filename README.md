# DevPilot

Work on your projects from your phone.

DevPilot is an open‑source sidecar agent that lets you send natural‑language coding tasks to your dev machine from anywhere, then continue the same conversations you have in your IDE’s AI chat while you’re away.

You type a prompt into a mobile‑friendly web app. DevPilot forwards your task (plus recent project context) to a local agent running on your machine, which edits files and runs commands in the projects you have open in your IDE.

Works with any IDE: VS Code, Cursor, Windsurf, Antigravity, Neovim, JetBrains, or anything that opens files from disk.

---

## Features

- **Remote development from your phone** — keep your IDE’s AI agent working while you’re away, on any device.
- **IDE‑agnostic** — sidecar agent works alongside any editor that uses the filesystem.
- **Bring your own AI** — plug in Gemini, Claude, GPT, Kimi K2.5, or any LLM API you already pay for; DevPilot just routes requests.
- **Conversation continuity** — persists per‑project chat history and summaries so you can resume the same thread from desktop or phone.
- **Safe execution** — whitelisted commands, sandboxed file access, zero‑trust design.
- **Real‑time status updates** — live task progress, logs, and diffs streamed back to the UI.
- **Edge‑native architecture** — Cloudflare Worker at the edge for low‑latency routing.
- **Stateless & horizontally scalable** — worker is stateless; local agents can be scaled across machines or a small fleet.

---

## Architecture

DevPilot uses a distributed edge‑first architecture designed for reliability, minimal latency, and safe access to your local projects.

```text
                          ╔════════════════════════════════════╗
                          ║        Global Edge Network         ║
                          ║    (Cloudflare Workers / PoPs)     ║
                          ╚═════════════════╦══════════════════╝
                                            ║
          ┌─────────────────────────────────╫─────────────────────────────────┐
          │                                 ║                                 │
          ▼                                 ▼                                 ▼
┌───────────────────┐             ┌───────────────────┐             ┌───────────────────┐
│   User Device A   │             │   User Device B   │             │   User Device N   │
│   (Any Region)    │             │   (Any Region)    │             │   (Any Region)    │
└─────────┬─────────┘             └─────────┬─────────┘             └─────────┬─────────┘
          │                                 │                                 │
          └─────────────────────────────────╫─────────────────────────────────┘
                                            ▼
                          ┌────────────────────────────────────┐
                          │          Local Agent Pool          │
                          │   (Your Machines / Fleet / VMs)    │
                          └────────────────────────────────────┘
```

| Component | Tech | Purpose |
| :--- | :--- | :--- |
| **Web App** | React, TypeScript, Tailwind | Mobile‑optimized PWA UI for prompts, logs, and diffs |
| **Edge Worker** | Cloudflare Workers, Hono | Stateless API, auth, per‑project memory lookup, LLM routing |
| **Agent** | Go | Local file and command execution (isolated) |

### Design Principles

- **Stateless Workers** — all long‑term state (projects, chat history) is stored in your agent or backing store; workers can scale to zero and wake instantly.
- **Edge‑First** — requests are handled at the nearest PoP for sub‑50 ms latency when possible.
- **Agent Federation** — connect multiple agents (laptop, desktop, remote box) and target them per project.
- **LLM Agnostic** — route to any provider (Gemini, Claude, GPT, Kimi K2.5, Mistral, local models) without changing core logic.
- **Memory‑aware** — per‑project rolling histories and summaries give you a “good enough” long‑term memory layer without extra SaaS.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Go 1.21+
- Cloudflare account (for Workers deployment)
- At least one LLM API key (e.g. Gemini, Claude, OpenAI, Kimi, Cloudflare Workers AI)

### 1. Clone and Install

```bash
git clone https://github.com/McMerger/dev-pilot-.git
cd dev-pilot-

# Frontend
npm install

# Worker
cd worker && npm install && cd ..

# Agent
cd agent && go mod tidy && cd ..
```

### 2. Configure the Local Agent

Edit `agent/agent.config.json` to add your projects:

```json
{
  "agentId": "my-devpilot-agent",
  "listen": { "host": "0.0.0.0", "port": 4001 },
  "projects": [
    {
      "id": "my-project",
      "name": "My Project",
      "root": "/path/to/your/project",
      "allowedCommands": ["npm test", "npm run build", "go test ./..."]
    }
  ]
}
```

You can add multiple projects and tighten `allowedCommands` per repo.

### 3. Run Locally

Terminal 1 — Go Agent:

```bash
# Windows
.\start-agent.ps1

# Linux / macOS
./start-agent.sh
```

Terminal 2 — Cloudflare Worker (local dev):

```bash
cd worker && npm run dev
```

Terminal 3 — Frontend:

```bash
npm run dev
```

Open `http://localhost:5173` on your phone (same network) or desktop.

---

## Using with Your IDE

DevPilot does not replace your IDE’s AI features; it extends them for remote use and shared memory.

1. Keep your IDE open with the project folder loaded.
2. Start the local agent on the same machine.
3. Use DevPilot from your phone to:
   - Continue existing AI conversations about that project.
   - Ask for new tasks (refactors, tests, small features).
4. File changes and command output appear in your IDE in real time.

### Supported IDEs

Any IDE that opens files from disk works with DevPilot:

| IDE | Notes |
| :--- | :--- |
| **VS Code** | File changes appear via file watcher |
| **Cursor** | Works seamlessly with agentic workflows |
| **Windsurf** | Full support |
| **Antigravity** | Designed to sit alongside the built‑in AI panel |
| **Neovim / Vim** | Use `:e!` to reload files |
| **JetBrains** | Enable “Synchronize files on frame activation” |

---

## Configuration

### Environment Variables

Create `.env` in the root:

```env
# API endpoint for the Worker
VITE_API_URL=http://localhost:8787

# Example: configure your default model provider
VITE_DEFAULT_MODEL_PROVIDER=gemini
VITE_DEFAULT_MODEL_ID=gemini-1.5-pro
# or kimi, claude, openai, etc.
```

### Worker Config

In `worker/wrangler.toml`:

```toml
[vars]
AGENT_ENDPOINT = "http://localhost:4001"
# Optional: default model config for hosted mode
DEFAULT_MODEL_PROVIDER = "gemini"
DEFAULT_MODEL_ID = "gemini-1.5-pro"
```

For production, set `AGENT_ENDPOINT` to your Cloudflare Tunnel or Tailscale URL.

---

## Memory & Conversation Continuity

DevPilot keeps lightweight, per‑project memory so you can resume work from anywhere:

- Stores recent chat turns per `projectId` + thread.
- Maintains short project and thread summaries to keep context under token limits.
- On each request, sends the summaries plus the most recent messages to your LLM, so your phone feels like a continuation of the same IDE convo.

The default implementation uses a simple database / KV store and can be swapped for a dedicated memory service later.

---

## Deployment

DevPilot is designed for instant global deployment with minimal provisioning.

### Deploy Worker to Cloudflare

```bash
cd worker
npx wrangler deploy
```

Your Worker is now live across 300+ edge locations worldwide.

### Expose Local Agent

Use Cloudflare Tunnel or Tailscale to make your agent reachable:

```bash
# Cloudflare Tunnel
cloudflared tunnel --url http://localhost:4001

# Or Tailscale
tailscale serve 4001
```

Update `AGENT_ENDPOINT` in your Worker config to the tunnel URL.

### Production Recommendations

- **Multi‑region Workers** — Cloudflare Workers automatically run in every data center.
- **Agent Clustering** — run multiple agents behind a simple load‑balancing layer for high availability.
- **Durable Objects / KV / R2** — optionally store task history or larger context at the edge.

---

## Security

DevPilot follows a zero‑trust, defense‑in‑depth security model:

- **Project allowlist** — only configured directories are accessible.
- **Command allowlist** — only specified commands per project can run.
- **No direct cloud access** — the cloud Worker can only call exposed agent tools, never arbitrary shell access.
- **Auth‑ready** — plug in your own auth layer (Cloudflare Access, Auth0, custom JWTs).
- **End‑to‑end encryption** — use HTTPS/WSS for all connections.
- **Audit logging** — all tool invocations are logged locally by the agent.

---

## API Reference

### Worker Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/models` | List available LLM models |
| **GET** | `/api/projects` | List projects from agent |
| **POST** | `/api/tasks` | Create a new task |
| **GET** | `/api/tasks/:id` | Get task status |

### Agent Tools

| Tool | Description |
| :--- | :--- |
| `list_files` | List directory contents |
| `read_file` | Read file content |
| `apply_patch` | Create, update, or delete files |
| `run_command` | Execute whitelisted commands |

---

## Contributing

Contributions welcome.

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

---

## License

MIT License — see `LICENSE` for details.

---

Built with React, Vite, Tailwind CSS, Radix UI, Hono, Go, and Cloudflare Workers.
