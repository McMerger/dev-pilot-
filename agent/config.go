package main

import (
	"encoding/json"
	"os"
	"strings"
)

type Config struct {
	AgentID  string    `json:"agentId"`
	Listen   Listen    `json:"listen"`
	Projects []Project `json:"projects"`
}

type Listen struct {
	Host string `json:"host"`
	Port int    `json:"port"`
}

type Project struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Root            string   `json:"root"`
	AllowedCommands []string `json:"allowedCommands"`
}

func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

// GetProject finds a project by ID
func (c *Config) GetProject(id string) *Project {
	for i := range c.Projects {
		if c.Projects[i].ID == id {
			return &c.Projects[i]
		}
	}
	return nil
}

// IsCommandAllowed checks if a command starts with an entry in the project's allowlist
func (p *Project) IsCommandAllowed(cmd string) bool {
	for _, allowed := range p.AllowedCommands {
		if strings.HasPrefix(cmd, allowed) {
			return true
		}
	}
	return false
}
