package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
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

	if err := http.ListenAndServe(addr, corsMiddleware(mux)); err != nil {
		log.Fatalf("Server failed: %v", err)
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
