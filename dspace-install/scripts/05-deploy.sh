#!/usr/bin/env bash
# 05-deploy.sh — Ant fresh_install, Solr cores, DB migrate, create admin, deploy to Tomcat
set -euo pipefail
source "$(dirname "$0")/common.sh"
check_root

banner "STEP 5 — Deploy DSpace Backend"

INSTALLER_DIR="$SRC_DIR/dspace/target/dspace-installer"

[[ -d "$INSTALLER_DIR" ]] || fail "Installer directory not found at $INSTALLER_DIR — run step 04-build.sh first"

# ── Ant fresh_install ─────────────────────────────────────────────────────────
if [[ -f "$DSPACE_DIR/bin/dspace" ]]; then
  log "Existing DSpace detected — running 'ant update' instead of 'ant fresh_install'..."
  sudo -u dspace ant -f "$INSTALLER_DIR/build.xml" update 2>&1 | tee -a "$LOG_FILE"
else
  log "Running 'ant fresh_install' into $DSPACE_DIR (takes ~5 min)..."
  sudo -u dspace ant -f "$INSTALLER_DIR/build.xml" fresh_install 2>&1 | tee -a "$LOG_FILE"
fi

chown -R dspace:dspace "$DSPACE_DIR"
ok "DSpace installed to $DSPACE_DIR"

# ── Register Solr cores ───────────────────────────────────────────────────────
log "Registering DSpace Solr cores..."
SOLR_DATA="${SOLR_HOME:-/var/solr}/data"

for core in search statistics authority oai; do
  CORE_CONF_SRC="$DSPACE_DIR/solr/${core}"
  CORE_DEST="$SOLR_DATA/${core}"

  if [[ ! -d "$CORE_CONF_SRC" ]]; then
    warn "Solr core config not found: $CORE_CONF_SRC — skipping"
    continue
  fi

  if [[ -d "${CORE_DEST}/conf" ]]; then
    ok "Solr core '${core}' already registered"
    continue
  fi

  mkdir -p "${CORE_DEST}/data"
  cp -r "${CORE_CONF_SRC}/conf" "${CORE_DEST}/conf"
  chown -R solr:solr "${CORE_DEST}"

  # Create core via Solr admin API
  CREATE_RESP=$(curl -sf \
    "http://localhost:${SOLR_PORT:-8983}/solr/admin/cores?action=CREATE&name=${core}&instanceDir=${CORE_DEST}&config=solrconfig.xml&schema=schema.xml&dataDir=data" \
    || echo '{"responseHeader":{"status":1}}')

  if echo "$CREATE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); sys.exit(d['responseHeader']['status'])" 2>/dev/null; then
    ok "Solr core '${core}' created"
  else
    warn "Solr core '${core}' may need manual creation — check Solr admin at http://localhost:${SOLR_PORT:-8983}"
  fi
done

systemctl restart solr
wait_for_port localhost "${SOLR_PORT:-8983}" 60

# ── Database migration ────────────────────────────────────────────────────────
log "Running DSpace database migration..."
sudo -u dspace "$DSPACE_DIR/bin/dspace" database migrate 2>&1 | tee -a "$LOG_FILE"
ok "Database schema migrated"

# ── Create administrator account ──────────────────────────────────────────────
log "Creating DSpace administrator account..."
log "  Email:     ${ADMIN_EMAIL}"
log "  Name:      ${ADMIN_FIRST} ${ADMIN_LAST}"

# Use expect-style non-interactive creation if available, else print instructions
if command -v expect &>/dev/null; then
  expect -c "
    set timeout 60
    spawn sudo -u dspace ${DSPACE_DIR}/bin/dspace create-administrator
    expect \"E-mail address:\"          { send \"${ADMIN_EMAIL}\r\" }
    expect \"First name:\"              { send \"${ADMIN_FIRST}\r\" }
    expect \"Last name:\"               { send \"${ADMIN_LAST}\r\" }
    expect \"Password:\"                { send \"${DB_PASSWORD}\r\" }
    expect \"Again to confirm:\"        { send \"${DB_PASSWORD}\r\" }
    expect \"Phone:\"                   { send \"${ADMIN_PHONE:-+2630000000}\r\" }
    expect \"Is the above information correct\"  { send \"y\r\" }
    expect eof
  " 2>&1 | tee -a "$LOG_FILE" || true
else
  warn "'expect' not installed — run the following command manually to create the admin:"
  echo -e "\n  ${YELLOW}sudo -u dspace ${DSPACE_DIR}/bin/dspace create-administrator${RESET}"
  echo -e "  Use: Email=${ADMIN_EMAIL}  Password=<your_choice>\n"
fi

# ── Deploy to Tomcat ──────────────────────────────────────────────────────────
log "Deploying DSpace REST API to Tomcat..."
TOMCAT_WEBAPPS="/var/lib/tomcat9/webapps"

# Remove old deployment if it exists
[[ -e "${TOMCAT_WEBAPPS}/server" ]] && rm -rf "${TOMCAT_WEBAPPS}/server"

ln -sf "${DSPACE_DIR}/webapps/server" "${TOMCAT_WEBAPPS}/server"
chown -h tomcat:tomcat "${TOMCAT_WEBAPPS}/server"

# Allow Tomcat to read DSpace files
usermod -aG dspace tomcat 2>/dev/null || true

systemctl restart tomcat9
wait_for_port localhost "${TOMCAT_PORT:-8080}" 90

ok "DSpace REST API deployed and Tomcat running"
