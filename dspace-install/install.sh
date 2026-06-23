#!/usr/bin/env bash
# ============================================================================
#  install.sh — DSpace 7.6 Full Installer for Bulawayo Polytechnic
#  Usage:  sudo bash install.sh [--step N] [--from N] [--help]
#
#  Steps:
#    00  Preflight checks (OS, RAM, disk, network)
#    01  System dependencies (Java 17, Maven, Ant, Node 18, Yarn, Tomcat)
#    02  PostgreSQL 15 (database + pgcrypto)
#    03  Apache Solr 8.11
#    04  DSpace build (Maven package ~20 min)
#    05  DSpace deploy (Ant fresh_install + DB migrate + admin)
#    06  Angular UI (yarn build + systemd service)
#    07  Nginx reverse proxy + Let's Encrypt SSL
#    08  Maintenance cron jobs
#    09  Verification & health checks
#
#  Examples:
#    sudo bash install.sh                # full install (all steps)
#    sudo bash install.sh --step 4      # run only step 04
#    sudo bash install.sh --from 5      # resume from step 05
#    sudo bash install.sh --step 9      # run only verification
# ============================================================================
set -euo pipefail

INSTALL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/dspace-install.log"

# ── Must be root ─────────────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || { echo "Run as root: sudo bash install.sh"; exit 1; }

# ── Colours ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'
RED='\033[0;31m'; BOLD='\033[1m'; RESET='\033[0m'

# ── Parse args ────────────────────────────────────────────────────────────────
ONLY_STEP=""
FROM_STEP=0

usage() {
  echo "Usage: sudo bash install.sh [--step N|--from N|--help]"
  echo "  --step N   Run only step N (0-9)"
  echo "  --from N   Run from step N to end"
  echo "  --help     Show this help"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --step) ONLY_STEP="$2"; shift 2 ;;
    --from) FROM_STEP="$2"; shift 2 ;;
    --help|-h) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

# ── .env check ────────────────────────────────────────────────────────────────
ENV_FILE="$INSTALL_ROOT/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}ERROR:${RESET} .env not found."
  echo -e "Run:  cp $INSTALL_ROOT/.env.example $INSTALL_ROOT/.env"
  echo -e "Then: nano $INSTALL_ROOT/.env   # set DB_PASSWORD at minimum"
  exit 1
fi
source "$ENV_FILE"

if [[ -z "${DB_PASSWORD:-}" ]]; then
  echo -e "${RED}ERROR:${RESET} DB_PASSWORD is not set in $ENV_FILE"
  exit 1
fi

# ── Logging ───────────────────────────────────────────────────────────────────
mkdir -p /var/log
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║  DSpace 7.6 Installer — Bulawayo Polytechnic             ║${RESET}"
echo -e "${BOLD}${CYAN}║  Repository: https://${IR_HOSTNAME:-ir.bpoly.ac.zw}     ║${RESET}"
echo -e "${BOLD}${CYAN}║  Log file:   $LOG_FILE                     ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "Started: $(date)"
echo ""

# ── Steps map ─────────────────────────────────────────────────────────────────
SCRIPTS=(
  "00-preflight.sh"
  "01-system-deps.sh"
  "02-postgres.sh"
  "03-solr.sh"
  "04-build.sh"
  "05-deploy.sh"
  "06-frontend.sh"
  "07-nginx.sh"
  "08-cron.sh"
  "09-verify.sh"
)

LABELS=(
  "Preflight checks"
  "System dependencies"
  "PostgreSQL 15"
  "Apache Solr 8.11"
  "DSpace source build (Maven)"
  "DSpace deployment (Ant + DB)"
  "Angular UI (yarn + systemd)"
  "Nginx + SSL"
  "Cron jobs"
  "Verification"
)

run_step() {
  local idx="$1"
  local script="${SCRIPTS[$idx]}"
  local label="${LABELS[$idx]}"
  local script_path="$INSTALL_ROOT/scripts/$script"

  if [[ ! -f "$script_path" ]]; then
    echo -e "${RED}Missing script:${RESET} $script_path"
    return 1
  fi

  echo ""
  echo -e "${BOLD}${CYAN}── Step $(printf '%02d' $idx): $label ─────────────────────────────────${RESET}"
  echo -e "${CYAN}   Script: $script_path${RESET}"
  echo ""

  START=$(date +%s)
  bash "$script_path"
  END=$(date +%s)

  echo ""
  echo -e "${GREEN}✓ Step $(printf '%02d' $idx) complete in $((END - START))s${RESET}"
}

# ── Execute ───────────────────────────────────────────────────────────────────
TOTAL_START=$(date +%s)

if [[ -n "$ONLY_STEP" ]]; then
  run_step "$ONLY_STEP"
else
  for i in "${!SCRIPTS[@]}"; do
    [[ $i -lt $FROM_STEP ]] && continue
    run_step "$i"
  done
fi

TOTAL_END=$(date +%s)
ELAPSED=$(( (TOTAL_END - TOTAL_START) / 60 ))

echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║  Installation complete in ${ELAPSED} minutes                     ║${RESET}"
echo -e "${BOLD}${GREEN}║  Repository: https://${IR_HOSTNAME:-ir.bpoly.ac.zw}     ║${RESET}"
echo -e "${BOLD}${GREEN}║  Admin:      ${ADMIN_EMAIL:-library@bpoly.ac.zw}       ║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""
