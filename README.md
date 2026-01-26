markdown

# DevPilot (Working Name)

DevPilot is a **sidecar coding agent** that lets you keep working on your projects **from your phone or any browser**, even when you’re away from your laptop or desktop.

You type a prompt into a web app that looks and feels like the **Google Antigravity Agent panel** (prompt box, mode selector, model selector).
DevPilot then drives a **Local Agent** running on your machine, which edits files and runs commands in the projects you have open in your IDE (including those on external drives).

Your IDE (Antigravity, VS Code, Cursor, etc.) just needs the repo open; DevPilot handles the remote automation.

---

## Core Goal

> Let you continue real work on your existing projects **from your phone**, by sending natural-language tasks to a safe agent that runs next to your IDE on your home/office machine.

Examples:

- On the bus: “Add input validation and unit tests for the user signup endpoint.”
- At dinner: “Refactor the dashboard layout to use CSS grid and update snapshots.”
- Late at night: “Run tests on the new feature branch and summarize failures.”

DevPilot turns those into concrete file edits and commands on your machine while you’re away.

---

## High-Level Architecture

DevPilot has two parts:

1. **Cloud App (UI + Orchestrator) – Cloudflare**
2. **Local Agent – Your Machine**

Your IDE opens the same folders that the Local Agent is allowed to modify.

### 1. Cloud App (Cloudflare)

Hosted on **Cloudflare Pages + Workers**.

**Responsibilities**

- Provide an **Antigravity-style Agent UI**:
- Big “Ask anything…” prompt box.[web:37][web:132]
- **Mode selector** (e.g., `Fast`, `Planning`).[web:37][web:128][web:132]
- **Model selector** chip (e.g., `Gemini 3 Pro High`, `Gemini 3 Pro Low`, `Claude Sonnet 4.5`, `GPT OSS 120B`).[web:132]
- **Project selector** (logical projects like “Client Site 2026”, “Sports Analytics API”).
- Handle:
- Auth (login, sessions).
- Task creation and history.
- Calling the chosen model with tools.
- Forwarding tool calls to the Local Agent.

**Implementation**

- **Frontend:** React (or similar) on Cloudflare Pages.
- **Backend API:** Cloudflare Workers (TypeScript) for:
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `GET /api/models`
- `GET /api/projects`[web:88][web:89][web:96][web:102]

The Cloud App is what you use from your **phone or browser**; it never touches your disk directly.

### 2. Local Agent (Your Machine)

Runs on your dev box (Windows 11 + WSL2 recommended; Linux/macOS also fine).

**Responsibilities**

- Map **project IDs** to real directories, including external drives:
- Example mapping: `proj_client_site` → `/mnt/e/dev/client-site-2026`.[web:52][web:59]
- Expose a small HTTP API to execute tools:
- `list_files`
- `read_file`
- `apply_patch`
- `run_command`
- Enforce safety:
- Only operate inside whitelisted roots.
- Only run whitelisted commands per project.

**Implementation**

- **Runtime:** Node.js (TypeScript) in WSL2 on Windows 11 (or directly on Linux/macOS).[web:52]
- **Config:** `agent.config.json` to define:
- Agent ID, host/port.
- Projects and root paths.
- Allowed commands.

---

## Phone-First / Remote-First Workflow

This is the **main design target**.

### Requirements

- Your dev machine (laptop/desktop) is on and the Local Agent is running.
- Your IDE has the repo open (Antigravity, VS Code, etc.).
- DevPilot Cloud App is reachable from your phone (mobile browser).

### Flow

1. **At your desk (setup once)**

- Start the Local Agent.
- Open IDE with project(s) you care about.
- Confirm Local Agent can see the project roots (including external drives via `/mnt/e/...`).

1. **Away from your machine (phone)**

- Open DevPilot in mobile browser (Cloudflare Pages URL).
- Select:
- Project: e.g., `Client Site 2026`.
- Mode: `Planning` or `Fast`.
- Model: e.g., `Gemini 3 Pro High` or `Claude Sonnet 4.5`.
- Type a prompt, for example:

> “Scan this repo for TODOs in the `api` folder, create tickets.md summarizing them, and add a basic Jest test for the `userController`.”

1. **Cloud App (Worker)**

- Authenticates you and creates a Task.
- Calls the chosen model with:
- System prompt.
- Your prompt.
- Tool definitions (list_files, read_file, apply_patch, run_command).
- Forwards tool calls to the Local Agent endpoint.

1. **Local Agent**

- Lists files under the project root.
- Reads relevant files.
- Applies patches to create/update files.
- Runs tests/commands (e.g., `npm test`).
- Returns outputs (diff results, command logs) to the Cloud App.

1. **Cloud App → Phone**

- Updates the Task status and log view so you can see what happened.
- Optionally shows simple summaries and a list of files touched.

1. **Back at your machine**

- IDE shows all file changes.
- You can refine further using your IDE’s own agents (Antigravity Agent panel) or DevPilot again.

The whole experience is “continue working from phone by commanding your home dev box indirectly through a safe agent.”[web:154][web:155][web:156]

---

## UI: Antigravity-Style Agent Panel

DevPilot’s main screen intentionally mirrors the **Antigravity Agent** panel for familiarity.[web:37][web:131][web:132]

### Components

- **Top bar**
- Project selector dropdown.
- Connection indicator to Local Agent (Online/Offline).

- **Agent header**
- “DevPilot Agent” title.
- Mode dropdown (e.g., `Fast`, `Planning`).
- Model selector chip (Gemini / Claude / GPT OSS labels).[web:132]

- **Prompt area**
- Multi-line input:
- Placeholder: `Ask anything, @ to mention, / for workflows` (customizable).[web:37][web:132]
- Send button (arrow icon).

- **Task list / log**
- Each task shows:
- Status badge (`Planning`, `Running`, `Done`, `Error`).
- Short title (first sentence of the prompt).
- Key actions (e.g., `edited: src/api/user.ts`, `ran: npm test`).

This UI is what you see from both desktop browser and phone.

---

## Task & Tool Model

### Task Object

```json
{
"id": "task_123",
"userId": "user_abc",
"projectId": "proj_client_site",
"prompt": "Add JWT auth and tests",
"mode": "Planning",
"modelId": "claude-sonnet-4.5",
"status": "running",
"logs": [],
"resultSummary": null,
"createdAt": "...",
"updatedAt": "..."
}
```

### Tools (Local Agent)

- `list_files(path, glob?)`
- `read_file(path)`
- `apply_patch(operations[])` – preferred for safe multi-file edits.[web:77]
- `run_command(command, cwd)` – only from an allowlist (`npm test`, `npm run lint`, etc.).

The Cloudflare Worker runs the agent loop (model + tools), the Local Agent just executes tools on disk.

---

## Setup Instructions

### 1. Local Agent (WSL2 / Linux / macOS)

```bash
git clone https://github.com/yourname/devpilot-agent.git
cd devpilot-agent
npm install
```

Create `agent.config.json`:

```json
{
"agentId": "devpilot-agent-local-1",
"listen": { "host": "0.0.0.0", "port": 4001 },
"projects": [
{
"id": "proj_client_site",
"name": "Client Site 2026",
"root": "/mnt/e/dev/client-site-2026",
"allowedCommands": ["npm test", "npm run lint", "npm run build"]
}
]
}
```

Run:

```bash
npm run dev
```

(Optional) Expose via **Cloudflared** or **Tailscale** so the Cloud App can reach it securely.

### 2. Cloud App (Cloudflare Pages + Workers)

- **Frontend (Pages)** – repo `devpilot-web/`
- Build React app with:
- Agent panel UI.
- Project and task views.

- **Backend (Workers)** – repo `devpilot-worker/`
- Endpoints:
- `POST /api/tasks`
- `GET /api/tasks/:id`
- `GET /api/models`
- `GET /api/projects`

`worker.config.json` example:

```json
{
"agentEndpoint": "https://your-tunnel-or-localhost:4001",
"models": [
{ "id": "gemini-3-pro-high", "label": "Gemini 3 Pro High" },
{ "id": "gemini-3-pro-low", "label": "Gemini 3 Pro Low" },
{ "id": "claude-sonnet-4.5", "label": "Claude Sonnet 4.5" },
{ "id": "claude-sonnet-4.5-thinking", "label": "Claude Sonnet 4.5 (Thinking)" },
{ "id": "gpt-oss-120b", "label": "GPT OSS 120B (Medium)" }
]
}
```

Deploy:

```bash
cd devpilot-worker
npm install
npx wrangler deploy
```

Connect the frontend to the Worker API via environment config.

---

## Safety & Guardrails

- **Project allowlist:** Only configured project roots are accessible.
- **Command allowlist:** Only specified commands per project can run.
- **No direct filesystem from Cloudflare:** Cloud App can only call tools exposed by the Local Agent.
- **Auth & rate limiting:** Tasks require authenticated users and are rate-limited.
- **Logging & observability:** Log task actions (files edited, commands run) so you can review whatever happened while you were away.[web:140][web:149][web:163]

---

## Roadmap

- Mobile-optimized UI (first-class phone UX).
- Git diff view and one-click revert.
- Multi-machine support (choose which agent/machine to use per task).
- Optional integrations (Slack/Discord/WhatsApp) once the core phone-first web app is solid.

---

## License

TBD (MIT or similar).
