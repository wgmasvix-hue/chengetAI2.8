#!/usr/bin/env bash
# 09-verify.sh — health checks for all DSpace components
set -euo pipefail
source "$(dirname "$0")/common.sh"
check_root

banner "STEP 9 — Verification & Health Checks"

PASS=0; FAIL=0
check() {
  local label="$1" result="$2"
  if [[ "$result" == "ok" ]]; then
    ok "  $label"
    (( PASS++ )) || true
  else
    echo -e "${RED}[ FAIL ]${RESET}  $label — $result" | tee -a "$LOG_FILE"
    (( FAIL++ )) || true
  fi
}

# ── Services ──────────────────────────────────────────────────────────────────
log "Checking system services..."
for svc in postgresql solr tomcat9 nginx dspace-ui; do
  if systemctl is-active --quiet "$svc"; then
    check "$svc service" "ok"
  else
    check "$svc service" "not running (run: systemctl status $svc)"
  fi
done

# ── PostgreSQL ────────────────────────────────────────────────────────────────
log "Checking PostgreSQL..."
if PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" \
   -c "SELECT COUNT(*) FROM eperson;" -tA &>/dev/null; then
  EPERSON_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -U "$DB_USER" \
    -d "$DB_NAME" -c "SELECT COUNT(*) FROM eperson;" -tA)
  check "PostgreSQL — eperson table ($EPERSON_COUNT rows)" "ok"
else
  check "PostgreSQL — connection" "failed"
fi

# ── Solr ──────────────────────────────────────────────────────────────────────
log "Checking Solr cores..."
for core in search statistics authority oai; do
  STATUS=$(curl -sf \
    "http://localhost:${SOLR_PORT:-8983}/solr/admin/cores?action=STATUS&core=${core}&wt=json" \
    | python3 -c "
import sys,json
d = json.load(sys.stdin)
s = d.get('status',{}).get('${core}',{})
print('ok' if s.get('name') else 'missing')
" 2>/dev/null || echo "unreachable")
  check "Solr core '${core}'" "$STATUS"
done

# ── Tomcat REST API ───────────────────────────────────────────────────────────
log "Checking DSpace REST API on Tomcat..."
HTTP_STATUS=$(curl -so /dev/null -w "%{http_code}" \
  "http://localhost:${TOMCAT_PORT:-8080}/server/api" 2>/dev/null || echo "0")
if [[ "$HTTP_STATUS" == "200" || "$HTTP_STATUS" == "401" ]]; then
  check "DSpace REST API (Tomcat :${TOMCAT_PORT:-8080})" "ok — HTTP $HTTP_STATUS"
else
  check "DSpace REST API" "HTTP $HTTP_STATUS (expected 200 or 401)"
fi

# ── Angular UI ────────────────────────────────────────────────────────────────
log "Checking Angular UI..."
HTTP_UI=$(curl -so /dev/null -w "%{http_code}" \
  "http://localhost:${UI_PORT:-4000}" 2>/dev/null || echo "0")
if [[ "$HTTP_UI" == "200" ]]; then
  check "Angular UI (Node :${UI_PORT:-4000})" "ok — HTTP $HTTP_UI"
else
  check "Angular UI" "HTTP $HTTP_UI (expected 200)"
fi

# ── Nginx ─────────────────────────────────────────────────────────────────────
log "Checking Nginx..."
if nginx -t 2>/dev/null; then
  check "Nginx config syntax" "ok"
else
  check "Nginx config syntax" "invalid"
fi

PROTO="http"
[[ "${ENABLE_SSL:-true}" == "true" ]] && PROTO="https"
HTTP_NGINX=$(curl -sko /dev/null -w "%{http_code}" "${PROTO}://${IR_HOSTNAME}" 2>/dev/null || echo "0")
if [[ "$HTTP_NGINX" == "200" || "$HTTP_NGINX" == "302" || "$HTTP_NGINX" == "301" ]]; then
  check "Nginx public endpoint (${PROTO}://${IR_HOSTNAME})" "ok — HTTP $HTTP_NGINX"
else
  check "Nginx public endpoint" "HTTP $HTTP_NGINX — DNS may not resolve yet"
fi

# ── DSpace bin ────────────────────────────────────────────────────────────────
log "Checking DSpace database..."
if sudo -u dspace "$DSPACE_DIR/bin/dspace" database test 2>&1 | grep -qi "success\|passed\|connected"; then
  check "DSpace database test" "ok"
else
  check "DSpace database test" "failed — check /var/log/dspace-install.log"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  VERIFICATION SUMMARY${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
echo -e "  ${GREEN}PASSED: ${PASS}${RESET}   ${RED}FAILED: ${FAIL}${RESET}"
echo ""
if [[ $FAIL -eq 0 ]]; then
  echo -e "  ${GREEN}${BOLD}🎉 DSpace is fully operational!${RESET}"
  echo -e "  ${CYAN}URL: ${PROTO}://${IR_HOSTNAME}${RESET}"
  echo -e "  ${CYAN}REST: ${PROTO}://${IR_HOSTNAME}/server${RESET}"
else
  echo -e "  ${YELLOW}Some checks failed. Review output above and check:${RESET}"
  echo -e "  ${YELLOW}  /var/log/dspace-install.log${RESET}"
  echo -e "  ${YELLOW}  /var/log/dspace-maven-build.log${RESET}"
  echo -e "  ${YELLOW}  journalctl -u tomcat9 -u solr -u dspace-ui --no-pager${RESET}"
fi
echo ""
