#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting DevPilot Local Bridge (Unix/Mac)...${NC}"

# --- 0. Self-Healing: Kill Zombies on Port 4001 ---
PORT=4001
PID=$(lsof -ti :$PORT 2>/dev/null || true)
if [ ! -z "$PID" ]; then
    echo -e "${YELLOW}   > Found zombie process (PID $PID) on port $PORT. Killing...${NC}"
    kill -9 $PID
fi

# --- 1. Dependencies Check ---
if ! command -v go &> /dev/null; then
    echo -e "${RED}Error: 'go' is not installed or not in PATH.${NC}"
    exit 1
fi
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}Error: 'cloudflared' is not found.${NC}"
    echo "Please install it: brew install cloudflare/cloudflare/cloudflared"
    exit 1
fi

# --- 2. Start Cloudflare Tunnel ---
rm -f tunnel.log
echo -e "${GREEN}   > Initializing Secure Tunnel...${NC}"
# Run cloudflared in background
cloudflared tunnel --url http://localhost:$PORT > tunnel.log 2>&1 &
TUNNEL_PID=$!

# Wait for URL
echo -e "   > Waiting for Public URL..."
MAX_RETRIES=20
URL=""
for i in $(seq 1 $MAX_RETRIES); do
    sleep 1
    if grep -q "trycloudflare.com" tunnel.log; then
        URL=$(grep -o "https://[a-zA-Z0-9-]*\.trycloudflare\.com" tunnel.log | head -n 1)
        break
    fi
done

if [ -z "$URL" ]; then
    echo -e "${RED}Failed to get Tunnel URL. Check tunnel.log${NC}"
    kill $TUNNEL_PID
    exit 1
fi

echo -e "${GREEN}   > Tunnel Live: ${YELLOW}$URL${NC}"

# --- 3. Start Agent ---
echo -e "   > Connecting Agent to Cloud Brain..."
echo -e "   > (Press Ctrl+C to stop)"

cleanup() {
    echo -e "\n${RED}🛑 Shutting down...${NC}"
    kill $TUNNEL_PID 2>/dev/null || true
    rm -f tunnel.log
    exit
}
trap cleanup SIGINT SIGTERM

# Run the agent (Go run for portability on Unix)
go run . "$URL"
