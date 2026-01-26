package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
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

	// Start Heartbeat Loop
	go startHeartbeat(cfg)

	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func startHeartbeat(cfg *Config) {
	// In prod, this URL comes from flags or env
	workerURL := "http://localhost:8787/api/agents/heartbeat"

	// Payload
	type HeartbeatReq struct {
		AgentID  string    `json:"agentId"`
		URL      string    `json:"url"`
		Projects []Project `json:"projects"`
	}

	ticker := time.NewTicker(30 * time.Second)
	for ; true; <-ticker.C {
		// Assume agent is reachable at localhost:4001 for now (or tunnel URL)
		reqBody := HeartbeatReq{
			AgentID:  cfg.AgentID,
			URL:      fmt.Sprintf("http://%s:%d", cfg.Listen.Host, cfg.Listen.Port),
			Projects: cfg.Projects,
		}

		data, _ := json.Marshal(reqBody)
		req, err := http.NewRequest("POST", workerURL, bytes.NewBuffer(data))
		if err != nil {
			log.Printf("Failed to create request: %v", err)
			continue
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Agent-Secret", "devpilot-secret-key") // Auth

		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			log.Printf("Heartbeat failed: %v", err)
			continue
		}
		resp.Body.Close()
		log.Printf("Heartbeat sent to Cluster. Status: %s", resp.Status)
	}
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
