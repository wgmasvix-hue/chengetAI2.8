#!/usr/bin/env bash
# 04-build.sh — download DSpace source and run Maven build
# This is the longest step (~15-25 min depending on internet speed)
set -euo pipefail
source "$(dirname "$0")/common.sh"
check_root

banner "STEP 4 — Download & Build DSpace ${DSPACE_VERSION}"

DSPACE_TGZ="/tmp/dspace-${DSPACE_VERSION}.tar.gz"
DSPACE_GH_URL="https://github.com/DSpace/DSpace/archive/refs/tags/dspace-${DSPACE_VERSION}.tar.gz"

# ── Generate local.cfg before build ──────────────────────────────────────────
# (We write config/local.cfg from the repo into the source tree)
CONFIG_SRC="$INSTALL_ROOT/config/local.cfg"
[[ -f "$CONFIG_SRC" ]] || fail "Config file missing: $CONFIG_SRC"

# ── Download source ───────────────────────────────────────────────────────────
if [[ -f "$SRC_DIR/pom.xml" ]]; then
  ok "DSpace source already present at $SRC_DIR — skipping download"
else
  log "Downloading DSpace ${DSPACE_VERSION} from GitHub (~80 MB)..."
  wget -q --show-progress -O "$DSPACE_TGZ" "$DSPACE_GH_URL" || \
    fail "Download failed: $DSPACE_GH_URL"

  log "Extracting source to $SRC_DIR..."
  mkdir -p "$SRC_DIR"
  tar -xzf "$DSPACE_TGZ" -C "$SRC_DIR" --strip-components=1
  rm -f "$DSPACE_TGZ"
  chown -R dspace:dspace "$SRC_DIR"
  ok "Source extracted"
fi

# ── Write local.cfg (with variable substitution) ──────────────────────────────
log "Writing local.cfg to source tree..."
DEST_CFG="$SRC_DIR/dspace/config/local.cfg"
cp "$CONFIG_SRC" "$DEST_CFG"

# Substitute placeholders
sed -i \
  -e "s|%%DSPACE_DIR%%|${DSPACE_DIR}|g" \
  -e "s|%%IR_HOSTNAME%%|${IR_HOSTNAME}|g" \
  -e "s|%%INSTITUTION_NAME%%|${INSTITUTION_NAME}|g" \
  -e "s|%%INSTITUTION_SHORT%%|${INSTITUTION_SHORT}|g" \
  -e "s|%%DB_HOST%%|${DB_HOST}|g" \
  -e "s|%%DB_PORT%%|${DB_PORT}|g" \
  -e "s|%%DB_NAME%%|${DB_NAME}|g" \
  -e "s|%%DB_USER%%|${DB_USER}|g" \
  -e "s|%%DB_PASSWORD%%|${DB_PASSWORD}|g" \
  -e "s|%%HANDLE_PREFIX%%|${HANDLE_PREFIX}|g" \
  -e "s|%%MAIL_SERVER%%|${MAIL_SERVER}|g" \
  -e "s|%%MAIL_PORT%%|${MAIL_PORT}|g" \
  -e "s|%%MAIL_FROM%%|${MAIL_FROM}|g" \
  -e "s|%%ADMIN_EMAIL%%|${ADMIN_EMAIL}|g" \
  -e "s|%%MAIL_ALERT%%|${MAIL_ALERT}|g" \
  -e "s|%%SOLR_PORT%%|${SOLR_PORT:-8983}|g" \
  "$DEST_CFG"
chown dspace:dspace "$DEST_CFG"
ok "local.cfg written"

# ── Maven build ───────────────────────────────────────────────────────────────
log "Running Maven package build (this will take 15-25 minutes)..."
log "Build log: /var/log/dspace-maven-build.log"

sudo -u dspace bash -c "
  export JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}
  cd $SRC_DIR
  mvn --batch-mode -q package \
    -Dmirage2.on=true \
    -Dmirage2.deps.included=false \
    2>&1 | tee /var/log/dspace-maven-build.log
"

[[ -d "$SRC_DIR/dspace/target/dspace-installer" ]] || \
  fail "Maven build failed — check /var/log/dspace-maven-build.log"

ok "Maven build complete"
