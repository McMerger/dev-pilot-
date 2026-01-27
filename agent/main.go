package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	cfg, err := LoadConfig("agent.config.json")
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	mux := http.NewServeMux()

	// Projects endpoint
	mux.HandleFunc("GET /projects", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(cfg.Projects)
	})

	// Tool endpoints
	mux.HandleFunc("POST /tools/list_files", ListFilesHandler(cfg))
	mux.HandleFunc("POST /tools/read_file", ReadFileHandler(cfg))
	mux.HandleFunc("POST /tools/apply_patch", ApplyPatchHandler(cfg))
	mux.HandleFunc("POST /tools/run_command", RunCommandHandler(cfg))

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	addr := fmt.Sprintf("%s:%d", cfg.Listen.Host, cfg.Listen.Port)
	log.Printf("DevPilot Agent [%s] listening on %s", cfg.AgentID, addr)
	log.Printf("Serving %d project(s)", len(cfg.Projects))

	// Chain middlewares: CORS -> Audit
	handler := auditMiddleware(mux, cfg.AgentID)
	handler = corsMiddleware(handler)

	// Get Public URL from Args (provided by startup script)
	publicUrl := fmt.Sprintf("http://%s:%d", cfg.Listen.Host, cfg.Listen.Port)
	if len(os.Args) > 1 {
		publicUrl = os.Args[1]
	}
	log.Printf("Agent Public URL: %s", publicUrl)

	// Start Heartbeat Loop
	go startHeartbeatWithUrl(cfg, publicUrl)

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

// Improved Heartbeat with dynamic URL support
func startHeartbeatWithUrl(cfg *Config, publicUrl string) {
	workerURL := "https://devpilot-worker.cortesmailles01.workers.dev/api/agents/heartbeat"

	ticker := time.NewTicker(30 * time.Second)
	// Send immediate first heatbeat
	go func() {
		sendHeartbeat(workerURL, publicUrl, cfg)
	}()

	for range ticker.C {
		sendHeartbeat(workerURL, publicUrl, cfg)
	}
}

func sendHeartbeat(workerURL, publicUrl string, cfg *Config) {
	type AgentNode struct {
		ID       string    `json:"agentId"`
		URL      string    `json:"url"`
		Projects []Project `json:"projects"`
	}

	reqBody := AgentNode{
		ID:       cfg.AgentID,
		URL:      publicUrl,
		Projects: cfg.Projects,
	}

	data, _ := json.Marshal(reqBody)
	req, err := http.NewRequest("POST", workerURL, bytes.NewBuffer(data))
	if err != nil {
		log.Printf("Failed to create request: %v", err)
		return
	}

	req.Header.Set("Content-Type", "application/json")

	// In a real app, this would be a secure token exchanged at startup
	req.Header.Set("X-Agent-Secret", "devpilot-secret-key")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		log.Printf("Heartbeat failed: %v", err)
		return
	}
	defer resp.Body.Close()
	log.Printf("Heartbeat sent to Brain (%s). Status: %s", workerURL, resp.Status)
}

// corsMiddleware adds CORS headers for development
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// auditMiddleware logs every request for the zero-trust audit log
func auditMiddleware(next http.Handler, agentID string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Log the attempt
		path := r.URL.Path
		log.Printf("[AUDIT] Request: %s %s (Node: %s)", r.Method, path, agentID)

		// In a real implementation, we would check OPA policies here
		// For now, everything not hitting /health is logged as ALLOWED for demo
		if path != "/health" {
			log.Printf("[\033[32mALLOW\033[0m] %s access granted", path)
		}

		next.ServeHTTP(w, r)
	})
}
