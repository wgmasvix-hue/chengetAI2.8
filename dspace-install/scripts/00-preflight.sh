#!/usr/bin/env bash
# 00-preflight.sh — validate the server before installation begins
set -euo pipefail
source "$(dirname "$0")/common.sh"
check_root

banner "PREFLIGHT CHECKS — Bulawayo Polytechnic DSpace 7.6"

# ── OS ────────────────────────────────────────────────────────────────────────
log "Checking OS..."
if [[ -f /etc/os-release ]]; then
  source /etc/os-release
  log "Detected: $PRETTY_NAME"
  [[ "$ID" == "ubuntu" || "$ID" == "debian" ]] || \
    warn "Untested OS '$ID'. This script targets Ubuntu 22.04 / Debian 11."
else
  fail "Cannot detect OS (missing /etc/os-release)"
fi

# ── RAM ───────────────────────────────────────────────────────────────────────
log "Checking RAM..."
TOTAL_MEM_MB=$(awk '/MemTotal/ { printf "%.0f", $2/1024 }' /proc/meminfo)
log "Total RAM: ${TOTAL_MEM_MB} MB"
(( TOTAL_MEM_MB >= 7000 )) || warn "Recommended RAM is 8 GB. Found ~${TOTAL_MEM_MB} MB. Proceed with caution."

# ── Disk ──────────────────────────────────────────────────────────────────────
log "Checking disk space on /..."
DISK_FREE_GB=$(df -BG / | awk 'NR==2 {gsub("G",""); print $4}')
log "Free disk space: ${DISK_FREE_GB} GB"
(( DISK_FREE_GB >= 50 )) || warn "Recommended free space is 100 GB. Found ${DISK_FREE_GB} GB."

# ── Network ───────────────────────────────────────────────────────────────────
log "Checking outbound internet (github.com:443)..."
if nc -z -w 5 github.com 443 2>/dev/null; then
  ok "Outbound HTTPS reachable"
else
  fail "Cannot reach github.com:443. DSpace source download will fail without internet access."
fi

log "Checking outbound Maven Central (repo1.maven.org:443)..."
if nc -z -w 5 repo1.maven.org 443 2>/dev/null; then
  ok "Maven Central reachable"
else
  warn "Cannot reach repo1.maven.org:443. Maven build may fail if dependencies aren't cached."
fi

# ── Required ENV vars ─────────────────────────────────────────────────────────
log "Checking required configuration..."
require_env "DB_PASSWORD"
require_env "IR_HOSTNAME"
require_env "ADMIN_EMAIL"
[[ "${#DB_PASSWORD}" -ge 12 ]] || fail "DB_PASSWORD must be at least 12 characters"

# ── Port conflicts ────────────────────────────────────────────────────────────
log "Checking for port conflicts..."
for port in 80 443 8080 8983 4000; do
  if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
    warn "Port $port is already in use. Check for conflicting services."
  fi
done

# ── Existing DSpace ───────────────────────────────────────────────────────────
if [[ -d "$DSPACE_DIR/bin" ]]; then
  warn "Existing DSpace installation found at $DSPACE_DIR"
  warn "Running install.sh will OVERWRITE it. Back up first if needed."
fi

ok "Preflight checks complete"
