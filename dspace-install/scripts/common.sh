#!/usr/bin/env bash
# common.sh — shared helpers sourced by every step script

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

LOG_FILE="/var/log/dspace-install.log"

log()  { echo -e "${CYAN}[$(date '+%H:%M:%S')]${RESET} $*" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${GREEN}[  OK  ]${RESET} $*" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[ WARN ]${RESET} $*" | tee -a "$LOG_FILE"; }
fail() { echo -e "${RED}[ FAIL ]${RESET} $*" | tee -a "$LOG_FILE"; exit 1; }

banner() {
  echo -e "\n${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}"
  echo -e "${BOLD}${CYAN}  $*${RESET}"
  echo -e "${BOLD}${CYAN}══════════════════════════════════════════════════════${RESET}\n"
}

check_root() {
  [[ $EUID -eq 0 ]] || fail "This script must be run as root (use sudo)"
}

require_env() {
  local var="$1"
  [[ -n "${!var:-}" ]] || fail "Required variable \$$var is not set. Check .env"
}

service_active() {
  systemctl is-active --quiet "$1"
}

wait_for_port() {
  local host="$1" port="$2" secs="${3:-60}"
  log "Waiting for $host:$port to open (timeout ${secs}s)..."
  for ((i=0; i<secs; i++)); do
    nc -z "$host" "$port" 2>/dev/null && { ok "$host:$port is open"; return 0; }
    sleep 1
  done
  fail "$host:$port did not open within ${secs}s"
}

# Source .env from the install root (two levels up from scripts/)
INSTALL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$INSTALL_ROOT/.env"

[[ -f "$ENV_FILE" ]] || fail ".env not found at $ENV_FILE — copy .env.example to .env and fill in DB_PASSWORD"
# shellcheck source=/dev/null
source "$ENV_FILE"

# Derived vars used across scripts
SRC_DIR="$BUILD_DIR/dspace-src"
ANGULAR_SRC_DIR="$BUILD_DIR/dspace-angular"
