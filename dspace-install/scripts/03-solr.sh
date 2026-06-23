#!/usr/bin/env bash
# 03-solr.sh — install Apache Solr 8.11 as a system service
set -euo pipefail
source "$(dirname "$0")/common.sh"
check_root

banner "STEP 3 — Apache Solr ${SOLR_VERSION}"

SOLR_INSTALL_DIR="/opt/solr-${SOLR_VERSION}"
SOLR_LINK="/opt/solr"
SOLR_HOME="/var/solr"
SOLR_TGZ="/tmp/solr-${SOLR_VERSION}.tgz"

# ── Download ──────────────────────────────────────────────────────────────────
if [[ ! -d "$SOLR_INSTALL_DIR" ]]; then
  log "Downloading Solr ${SOLR_VERSION}..."
  SOLR_DOWNLOAD_URL="https://archive.apache.org/dist/lucene/solr/${SOLR_VERSION}/solr-${SOLR_VERSION}.tgz"
  wget -q --show-progress -O "$SOLR_TGZ" "$SOLR_DOWNLOAD_URL" || \
    fail "Failed to download Solr from $SOLR_DOWNLOAD_URL"

  log "Extracting Solr..."
  tar -xzf "$SOLR_TGZ" -C /opt/
  rm -f "$SOLR_TGZ"
  ok "Solr extracted to /opt/solr-${SOLR_VERSION}"
else
  ok "Solr ${SOLR_VERSION} already extracted at $SOLR_INSTALL_DIR"
fi

# ── Symlink ───────────────────────────────────────────────────────────────────
ln -sfn "$SOLR_INSTALL_DIR" "$SOLR_LINK"

# ── solr system user ──────────────────────────────────────────────────────────
if ! id -u solr &>/dev/null; then
  useradd -r -m -d "$SOLR_HOME" -s /bin/bash -c "Solr Service User" solr
fi

mkdir -p "$SOLR_HOME/data" "$SOLR_HOME/logs"
chown -R solr:solr "$SOLR_HOME" "$SOLR_INSTALL_DIR"

# ── systemd service ───────────────────────────────────────────────────────────
log "Creating Solr systemd service..."
cat > /etc/systemd/system/solr.service <<EOF
[Unit]
Description=Apache Solr ${SOLR_VERSION}
After=network.target

[Service]
Type=forking
User=solr
Group=solr
Environment=SOLR_INCLUDE=/etc/default/solr.in.sh
ExecStart=${SOLR_LINK}/bin/solr start -s ${SOLR_HOME}/data
ExecStop=${SOLR_LINK}/bin/solr stop
PIDFile=${SOLR_HOME}/solr.pid
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

# ── Solr environment config ───────────────────────────────────────────────────
cat > /etc/default/solr.in.sh <<EOF
SOLR_PID_DIR="${SOLR_HOME}"
SOLR_HOME="${SOLR_HOME}/data"
LOG4J_PROPS="${SOLR_HOME}/log4j2.xml"
SOLR_LOGS_DIR="${SOLR_HOME}/logs"
SOLR_PORT="${SOLR_PORT:-8983}"
SOLR_HEAP="512m"
JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
EOF

# Ensure the data directory exists
sudo -u solr mkdir -p "${SOLR_HOME}/data"

systemctl daemon-reload
systemctl enable solr
systemctl start solr

wait_for_port localhost "${SOLR_PORT:-8983}" 60

# ── Smoke test ────────────────────────────────────────────────────────────────
STATUS=$(curl -sf "http://localhost:${SOLR_PORT:-8983}/solr/admin/info/system?wt=json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['lucene']['solr-spec-version'])" 2>/dev/null || echo "unknown")
ok "Solr is running — version: $STATUS"
