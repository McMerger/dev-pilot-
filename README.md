# DevPilot

Work on your projects from your phone. DevPilot is an open-source sidecar agent that lets you send natural-language coding tasks to your dev machine from anywhere.

You type a prompt into a mobile-friendly web app. DevPilot forwards your task to a local agent running on your machine, which edits files and runs commands in the projects you have open in your IDE.

Works with any IDE: VS Code, Cursor, Windsurf, Antigravity, Neovim, JetBrains, or anything that opens files from disk.

---

## Features

- Remote development from your phone
- IDE-agnostic — works alongside any editor
- Bring your own AI — use Gemini, Claude, GPT, or any LLM API
- Safe execution via whitelisted commands and sandboxed file access
- Real-time status updates

---

## Architecture

```
┌─────────────────┐        ┌────────────────────┐        ┌──────────────────┐
│  Your Phone     │   →    │  Cloudflare Worker │   →    │   Local Agent    │
│  (Web App)      │   ←    │  (API + LLM Call)  │   ←    │  (Your Machine)  │
└─────────────────┘        └────────────────────┘        └──────────────────┘
                                    ↓
                           ┌────────────────┐
                           │  LLM API       │
                           │  (Gemini/etc)  │
                           └────────────────┘
```

| Component | Tech | Purpose |
|-----------|------|---------|
| Web App | React, TypeScript, Tailwind | Mobile-friendly UI |
| Worker | Cloudflare Workers, Hono | API orchestration, LLM calls |
| Agent | Go | Local file and command execution |

---

## Quick Start

### Prerequisites

- Node.js 18+
- Go 1.21+
- Cloudflare account (for Workers deployment)

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

### 3. Run Locally

Terminal 1 — Go Agent:

```bash
cd agent && go run .
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

DevPilot does not replace your IDE's AI features. It extends them for remote use.

1. Keep your IDE open with the project folder loaded
2. Start the Local Agent on the same machine
3. Use DevPilot from your phone to send tasks
4. Changes appear in your IDE in real-time

### Supported IDEs

Any IDE that opens files from disk works with DevPilot:

| IDE | Notes |
|-----|-------|
| VS Code | File changes appear via file watcher |
| Cursor | Works seamlessly |
| Windsurf | Full support |
| Antigravity | Native integration path |
| Neovim / Vim | Use `:e!` to reload files |
| JetBrains | Enable "Synchronize files on frame activation" |

---

## Configuration

### Environment Variables

Create `.env` in the root:

```env
VITE_API_URL=http://localhost:8787
```

### Worker Config

In `worker/wrangler.toml`:

```toml
[vars]
AGENT_ENDPOINT = "http://localhost:4001"
```

For production, set this to your Cloudflare Tunnel or Tailscale URL.

---

## Deployment

### Deploy Worker to Cloudflare

```bash
cd worker
npx wrangler deploy
```

### Expose Local Agent

Use Cloudflare Tunnel or Tailscale to make your agent reachable:

```bash
# Cloudflare Tunnel
cloudflared tunnel --url http://localhost:4001

# Or Tailscale
tailscale serve 4001
```

Update `AGENT_ENDPOINT` in your Worker config to the tunnel URL.

---

## Security

- Project allowlist — only configured directories are accessible
- Command allowlist — only specified commands per project can run
- No direct cloud access — cloud Worker can only call exposed agent tools
- Auth ready — add your own auth layer (Cloudflare Access, Auth0, etc.)

---

## API Reference

### Worker Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/models | List available LLM models |
| GET | /api/projects | List projects from agent |
| POST | /api/tasks | Create a new task |
| GET | /api/tasks/:id | Get task status |

### Agent Tools

| Tool | Description |
|------|-------------|
| list_files | List directory contents |
| read_file | Read file content |
| apply_patch | Create, update, or delete files |
| run_command | Execute whitelisted commands |

---

## Contributing

Contributions welcome.

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a PR

---

## License

MIT License — see LICENSE for details.

---

Built with React, Vite, Tailwind CSS, Radix UI, Hono, and Go.
