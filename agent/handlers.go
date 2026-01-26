package main

import (
	"encoding/json"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// --- List Files ---

type ListFilesRequest struct {
	ProjectID string `json:"projectId"`
	Path      string `json:"path"`
	Glob      string `json:"glob,omitempty"`
}

type FileEntry struct {
	Name  string `json:"name"`
	IsDir bool   `json:"isDir"`
	Size  int64  `json:"size,omitempty"`
}

func ListFilesHandler(cfg *Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ListFilesRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
			return
		}

		project := cfg.GetProject(req.ProjectID)
		if project == nil {
			http.Error(w, `{"error":"project not found"}`, http.StatusNotFound)
			return
		}

		targetPath := filepath.Join(project.Root, req.Path)
		if !strings.HasPrefix(targetPath, project.Root) {
			http.Error(w, `{"error":"path traversal not allowed"}`, http.StatusForbidden)
			return
		}

		entries, err := os.ReadDir(targetPath)
		if err != nil {
			http.Error(w, `{"error":"failed to read directory"}`, http.StatusInternalServerError)
			return
		}

		var files []FileEntry
		for _, e := range entries {
			info, _ := e.Info()
			size := int64(0)
			if info != nil && !e.IsDir() {
				size = info.Size()
			}
			files = append(files, FileEntry{
				Name:  e.Name(),
				IsDir: e.IsDir(),
				Size:  size,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(files)
	}
}

// --- Read File ---

type ReadFileRequest struct {
	ProjectID string `json:"projectId"`
	Path      string `json:"path"`
}

type ReadFileResponse struct {
	Content string `json:"content"`
}

func ReadFileHandler(cfg *Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ReadFileRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
			return
		}

		project := cfg.GetProject(req.ProjectID)
		if project == nil {
			http.Error(w, `{"error":"project not found"}`, http.StatusNotFound)
			return
		}

		targetPath := filepath.Join(project.Root, req.Path)
		if !strings.HasPrefix(targetPath, project.Root) {
			http.Error(w, `{"error":"path traversal not allowed"}`, http.StatusForbidden)
			return
		}

		content, err := os.ReadFile(targetPath)
		if err != nil {
			http.Error(w, `{"error":"failed to read file"}`, http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ReadFileResponse{Content: string(content)})
	}
}

// --- Apply Patch ---

type PatchOperation struct {
	Op      string `json:"op"` // "create", "update", "delete"
	Path    string `json:"path"`
	Content string `json:"content,omitempty"`
}

type ApplyPatchRequest struct {
	ProjectID  string           `json:"projectId"`
	Operations []PatchOperation `json:"operations"`
}

type ApplyPatchResponse struct {
	Applied int      `json:"applied"`
	Errors  []string `json:"errors,omitempty"`
}

func ApplyPatchHandler(cfg *Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req ApplyPatchRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
			return
		}

		project := cfg.GetProject(req.ProjectID)
		if project == nil {
			http.Error(w, `{"error":"project not found"}`, http.StatusNotFound)
			return
		}

		var errors []string
		applied := 0

		for _, op := range req.Operations {
			targetPath := filepath.Join(project.Root, op.Path)
			if !strings.HasPrefix(targetPath, project.Root) {
				errors = append(errors, "path traversal not allowed: "+op.Path)
				continue
			}

			switch op.Op {
			case "create", "update":
				dir := filepath.Dir(targetPath)
				if err := os.MkdirAll(dir, 0755); err != nil {
					errors = append(errors, "failed to create dir: "+err.Error())
					continue
				}
				if err := os.WriteFile(targetPath, []byte(op.Content), 0644); err != nil {
					errors = append(errors, "failed to write file: "+err.Error())
					continue
				}
				applied++

			case "delete":
				if err := os.Remove(targetPath); err != nil {
					errors = append(errors, "failed to delete: "+err.Error())
					continue
				}
				applied++

			default:
				errors = append(errors, "unknown operation: "+op.Op)
			}
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(ApplyPatchResponse{Applied: applied, Errors: errors})
	}
}

// --- Run Command ---

type RunCommandRequest struct {
	ProjectID string `json:"projectId"`
	Command   string `json:"command"`
}

type RunCommandResponse struct {
	Stdout   string `json:"stdout"`
	Stderr   string `json:"stderr"`
	ExitCode int    `json:"exitCode"`
}

func RunCommandHandler(cfg *Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req RunCommandRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid request"}`, http.StatusBadRequest)
			return
		}

		project := cfg.GetProject(req.ProjectID)
		if project == nil {
			http.Error(w, `{"error":"project not found"}`, http.StatusNotFound)
			return
		}

		if !project.IsCommandAllowed(req.Command) {
			http.Error(w, `{"error":"command not allowed"}`, http.StatusForbidden)
			return
		}

		// Execute command in project root
		cmd := exec.Command("sh", "-c", req.Command)
		cmd.Dir = project.Root

		stdout, _ := cmd.StdoutPipe()
		stderr, _ := cmd.StderrPipe()

		if err := cmd.Start(); err != nil {
			http.Error(w, `{"error":"failed to start command"}`, http.StatusInternalServerError)
			return
		}

		outBytes, _ := io.ReadAll(stdout)
		errBytes, _ := io.ReadAll(stderr)

		cmd.Wait()

		exitCode := 0
		if cmd.ProcessState != nil {
			exitCode = cmd.ProcessState.ExitCode()
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(RunCommandResponse{
			Stdout:   string(outBytes),
			Stderr:   string(errBytes),
			ExitCode: exitCode,
		})
	}
}
