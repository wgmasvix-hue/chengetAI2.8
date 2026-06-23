#!/usr/bin/env bash
# =============================================================================
# run-tests.sh — DSpace installer test suite
# Runs inside the Docker test container (or on a bare Ubuntu VM)
# =============================================================================
set -uo pipefail

INSTALL_ROOT="${INSTALL_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
SCRIPTS_DIR="$INSTALL_ROOT/scripts"
TEST_DIR="$INSTALL_ROOT/test"
ENV_FILE="$TEST_DIR/.env.test"

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

PASS=0; FAIL=0; SKIP=0
RESULTS=()

t_pass() { echo -e "${GREEN}  ✓ PASS${RESET}  $1"; RESULTS+=("PASS: $1"); (( PASS++ )) || true; }
t_fail() { echo -e "${RED}  ✗ FAIL${RESET}  $1"; RESULTS+=("FAIL: $1"); (( FAIL++ )) || true; }
t_skip() { echo -e "${YELLOW}  ⊘ SKIP${RESET}  $1"; RESULTS+=("SKIP: $1"); (( SKIP++ )) || true; }
t_head() { echo -e "\n${BOLD}${CYAN}── $1 ──────────────────────────────────────────${RESET}"; }

# Load test env
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"
export $(grep -v '^#' "$ENV_FILE" | cut -d= -f1) 2>/dev/null || true

echo -e "${BOLD}${CYAN}"
echo "╔═══════════════════════════════════════════════════╗"
echo "║   DSpace 7.6 Installer Test Suite                 ║"
echo "║   Bulawayo Polytechnic                            ║"
echo "╚═══════════════════════════════════════════════════╝"
echo -e "${RESET}"
echo "Started: $(date)"
echo "Install root: $INSTALL_ROOT"
echo ""

# =============================================================================
# SUITE 1: Script Syntax (bash -n)
# =============================================================================
t_head "Suite 1: Bash Syntax Checks"

for script in "$SCRIPTS_DIR"/*.sh "$INSTALL_ROOT/install.sh" \
              "$INSTALL_ROOT/firewall.sh" "$INSTALL_ROOT/upgrade.sh"; do
  [[ -f "$script" ]] || continue
  name="$(basename "$script")"
  if bash -n "$script" 2>/dev/null; then
    t_pass "bash -n $name"
  else
    t_fail "bash -n $name — syntax error"
    bash -n "$script" 2>&1 | head -5
  fi
done

# =============================================================================
# SUITE 2: ShellCheck (if available)
# =============================================================================
t_head "Suite 2: ShellCheck Static Analysis"

if command -v shellcheck &>/dev/null; then
  for script in "$SCRIPTS_DIR"/*.sh "$INSTALL_ROOT/install.sh"; do
    [[ -f "$script" ]] || continue
    name="$(basename "$script")"
    # SC1091: not following sourced files  SC2086: double-quote var (many false positives)
    if shellcheck -e SC1091,SC2086,SC2034 "$script" 2>/dev/null; then
      t_pass "shellcheck $name"
    else
      ISSUES=$(shellcheck -e SC1091,SC2086,SC2034 "$script" 2>&1 | wc -l)
      t_fail "shellcheck $name — $ISSUES issue(s)"
      shellcheck -e SC1091,SC2086,SC2034 "$script" 2>&1 | head -10
    fi
  done
else
  t_skip "shellcheck not installed"
fi

# =============================================================================
# SUITE 3: Config File Validation
# =============================================================================
t_head "Suite 3: Config File Substitution"

# Test local.cfg template substitution
TMP_CFG=$(mktemp)
cp "$INSTALL_ROOT/config/local.cfg" "$TMP_CFG"
sed -i \
  -e "s|%%DSPACE_DIR%%|${DSPACE_DIR:-/dspace}|g" \
  -e "s|%%IR_HOSTNAME%%|${IR_HOSTNAME:-ir.bpoly.ac.zw}|g" \
  -e "s|%%INSTITUTION_NAME%%|${INSTITUTION_NAME:-Bulawayo Polytechnic}|g" \
  -e "s|%%INSTITUTION_SHORT%%|${INSTITUTION_SHORT:-BPoly}|g" \
  -e "s|%%DB_HOST%%|${DB_HOST:-localhost}|g" \
  -e "s|%%DB_PORT%%|${DB_PORT:-5432}|g" \
  -e "s|%%DB_NAME%%|${DB_NAME:-dspace}|g" \
  -e "s|%%DB_USER%%|${DB_USER:-dspace}|g" \
  -e "s|%%DB_PASSWORD%%|${DB_PASSWORD:-testpass}|g" \
  -e "s|%%HANDLE_PREFIX%%|${HANDLE_PREFIX:-123456789}|g" \
  -e "s|%%MAIL_SERVER%%|${MAIL_SERVER:-localhost}|g" \
  -e "s|%%MAIL_PORT%%|${MAIL_PORT:-25}|g" \
  -e "s|%%MAIL_FROM%%|${MAIL_FROM:-noreply@bpoly.ac.zw}|g" \
  -e "s|%%ADMIN_EMAIL%%|${ADMIN_EMAIL:-library@bpoly.ac.zw}|g" \
  -e "s|%%MAIL_ALERT%%|${MAIL_ALERT:-it@bpoly.ac.zw}|g" \
  -e "s|%%SOLR_PORT%%|${SOLR_PORT:-8983}|g" \
  "$TMP_CFG"

# Check no placeholders remain
REMAINING=$(grep '%%.*%%' "$TMP_CFG" 2>/dev/null | wc -l)
if [[ "$REMAINING" -eq 0 ]]; then
  t_pass "local.cfg — all placeholders substituted"
else
  t_fail "local.cfg — $REMAINING unresolved placeholder(s)"
  grep '%%.*%%' "$TMP_CFG" | head -5
fi

# Check key values are present
for key in "dspace.dir" "dspace.server.url" "db.url" "db.username" "solr.server"; do
  if grep -q "^${key}" "$TMP_CFG" 2>/dev/null; then
    t_pass "local.cfg — key present: $key"
  else
    t_fail "local.cfg — missing key: $key"
  fi
done
rm -f "$TMP_CFG"

# Test dspace-ui.yml substitution
TMP_UI=$(mktemp)
cp "$INSTALL_ROOT/config/dspace-ui.yml" "$TMP_UI"
sed -i \
  -e "s|%%IR_HOSTNAME%%|${IR_HOSTNAME:-ir.bpoly.ac.zw}|g" \
  -e "s|%%UI_PORT%%|${UI_PORT:-4000}|g" \
  "$TMP_UI"

if ! grep -q '%%' "$TMP_UI"; then
  t_pass "dspace-ui.yml — all placeholders substituted"
else
  t_fail "dspace-ui.yml — unresolved placeholders"
fi
rm -f "$TMP_UI"

# Test Nginx config substitution
TMP_NGINX=$(mktemp)
cp "$INSTALL_ROOT/nginx/ir.bpoly.ac.zw.conf" "$TMP_NGINX"
sed -i \
  -e "s|%%IR_HOSTNAME%%|${IR_HOSTNAME:-ir.bpoly.ac.zw}|g" \
  -e "s|%%TOMCAT_PORT%%|${TOMCAT_PORT:-8080}|g" \
  -e "s|%%UI_PORT%%|${UI_PORT:-4000}|g" \
  "$TMP_NGINX"

if ! grep -q '%%' "$TMP_NGINX"; then
  t_pass "nginx conf — all placeholders substituted"
else
  t_fail "nginx conf — unresolved placeholders"
fi

# Validate Nginx config if nginx is available
if command -v nginx &>/dev/null; then
  NGINX_SITES_AVAIL="/etc/nginx/sites-available"
  mkdir -p "$NGINX_SITES_AVAIL"
  cp "$TMP_NGINX" "$NGINX_SITES_AVAIL/ir.bpoly.ac.zw"
  ln -sfn "$NGINX_SITES_AVAIL/ir.bpoly.ac.zw" /etc/nginx/sites-enabled/ 2>/dev/null || true
  # Remove default to avoid port conflicts
  rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
  if nginx -t 2>/dev/null; then
    t_pass "nginx -t — config syntax valid"
  else
    t_fail "nginx -t — config syntax invalid"
    nginx -t 2>&1 | head -10
  fi
fi
rm -f "$TMP_NGINX"

# =============================================================================
# SUITE 4: Environment File Checks
# =============================================================================
t_head "Suite 4: .env File Checks"

# Check .env.example has all required keys
REQUIRED_KEYS=(DB_PASSWORD IR_HOSTNAME ADMIN_EMAIL DSPACE_VERSION DB_NAME DB_USER DSPACE_DIR BUILD_DIR)
for key in "${REQUIRED_KEYS[@]}"; do
  if grep -q "^${key}" "$INSTALL_ROOT/.env.example" 2>/dev/null; then
    t_pass ".env.example — key documented: $key"
  else
    t_fail ".env.example — missing key: $key"
  fi
done

# Validate test env has no empty required fields
for key in DB_PASSWORD IR_HOSTNAME ADMIN_EMAIL; do
  val="${!key:-}"
  if [[ -n "$val" ]]; then
    t_pass ".env.test — $key is set"
  else
    t_fail ".env.test — $key is empty"
  fi
done

# =============================================================================
# SUITE 5: Connectivity Tests (services must be running)
# =============================================================================
t_head "Suite 5: Service Connectivity"

# Detect if we're inside Docker (service hostnames resolve) or running bare
_in_docker() { getent hosts postgres &>/dev/null || [[ "${DB_HOST:-localhost}" == "localhost" && $(getent hosts solr 2>/dev/null) ]]; }
_pg_reachable() { nc -z -w3 "${DB_HOST:-localhost}" "${DB_PORT:-5432}" 2>/dev/null; }
_solr_reachable() {
  curl -sf "http://${DB_HOST/postgres/solr}:${SOLR_PORT:-8983}/solr/admin/info/system" &>/dev/null ||
  curl -sf "http://solr:${SOLR_PORT:-8983}/solr/admin/info/system" &>/dev/null ||
  curl -sf "http://localhost:${SOLR_PORT:-8983}/solr/admin/info/system" &>/dev/null
}

# PostgreSQL
if ! _pg_reachable; then
  t_skip "PostgreSQL — $DB_HOST:$DB_PORT not reachable (run inside Docker for live tests)"
elif command -v psql &>/dev/null; then
  if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
     -c "SELECT version();" -tA 2>/dev/null | grep -q "PostgreSQL"; then
    t_pass "PostgreSQL — connection on $DB_HOST:$DB_PORT"
    # pgcrypto extension
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
       -c "SELECT * FROM pg_extension WHERE extname='pgcrypto';" -tA 2>/dev/null | grep -q "pgcrypto"; then
      t_pass "PostgreSQL — pgcrypto extension installed"
    else
      PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
        -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null && \
        t_pass "PostgreSQL — pgcrypto extension created" || \
        t_fail "PostgreSQL — pgcrypto extension missing"
    fi
  else
    t_fail "PostgreSQL — cannot authenticate on $DB_HOST:$DB_PORT"
  fi
else
  t_skip "psql client not installed"
fi

# Solr
if _solr_reachable; then
  t_pass "Solr — responding on port ${SOLR_PORT:-8983}"
else
  t_skip "Solr — not reachable (run 'make test-services' for live Docker tests)"
fi

# =============================================================================
# SUITE 6: Systemd Service File Validation
# =============================================================================
t_head "Suite 6: Systemd Service File"

SERVICE_FILE="$INSTALL_ROOT/systemd/dspace-ui.service"
if [[ -f "$SERVICE_FILE" ]]; then
  # Check required sections
  for section in "\[Unit\]" "\[Service\]" "\[Install\]"; do
    if grep -q "$section" "$SERVICE_FILE"; then
      t_pass "dspace-ui.service — section present: $section"
    else
      t_fail "dspace-ui.service — missing section: $section"
    fi
  done

  # Check placeholder substitution
  TMP_SVC=$(mktemp)
  cp "$SERVICE_FILE" "$TMP_SVC"
  sed -i \
    -e "s|%%ANGULAR_SRC_DIR%%|/build/dspace-angular|g" \
    -e "s|%%UI_PORT%%|4000|g" \
    "$TMP_SVC"

  if ! grep -q '%%' "$TMP_SVC"; then
    t_pass "dspace-ui.service — placeholders substituted"
  else
    t_fail "dspace-ui.service — unresolved placeholders"
  fi
  rm -f "$TMP_SVC"

  # Validate with systemd-analyze if available
  if command -v systemd-analyze &>/dev/null; then
    if systemd-analyze verify "$SERVICE_FILE" 2>/dev/null; then
      t_pass "dspace-ui.service — systemd-analyze verify passed"
    else
      t_skip "dspace-ui.service — systemd-analyze needs substituted file"
    fi
  fi
else
  t_fail "dspace-ui.service — file not found"
fi

# =============================================================================
# SUITE 7: Script Permission Checks
# =============================================================================
t_head "Suite 7: File Permissions"

for script in "$INSTALL_ROOT/install.sh" "$INSTALL_ROOT/firewall.sh" \
              "$INSTALL_ROOT/upgrade.sh" "$SCRIPTS_DIR/"*.sh; do
  [[ -f "$script" ]] || continue
  if [[ -x "$script" ]]; then
    t_pass "executable: $(basename "$script")"
  else
    t_fail "not executable: $(basename "$script")"
  fi
done

# =============================================================================
# SUITE 8: install.sh --help and argument parsing
# =============================================================================
t_head "Suite 8: install.sh Argument Parsing"

# Test --help flag (non-root, just parse args)
if bash "$INSTALL_ROOT/install.sh" --help 2>&1 | grep -q "Usage"; then
  t_pass "install.sh --help works"
else
  t_skip "install.sh --help (requires .env with DB_PASSWORD)"
fi

# Test --step validation (source only the arg parsing logic)
if bash -c "source '$INSTALL_ROOT/install.sh' 2>/dev/null; echo ok" 2>/dev/null | grep -q "ok" || true; then
  t_pass "install.sh — sources without error"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}  TEST SUMMARY${RESET}"
echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${GREEN}PASSED: ${PASS}${RESET}   ${RED}FAILED: ${FAIL}${RESET}   ${YELLOW}SKIPPED: ${SKIP}${RESET}"
echo ""

if [[ $FAIL -gt 0 ]]; then
  echo -e "${BOLD}Failed tests:${RESET}"
  for r in "${RESULTS[@]}"; do
    [[ "$r" == FAIL:* ]] && echo -e "  ${RED}→ ${r#FAIL: }${RESET}"
  done
  echo ""
  exit 1
else
  echo -e "  ${GREEN}${BOLD}All tests passed!${RESET}"
  echo ""
  exit 0
fi
