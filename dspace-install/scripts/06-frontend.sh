#!/usr/bin/env bash
# 06-frontend.sh — clone dspace-angular, configure, build, and run via PM2/systemd
set -euo pipefail
source "$(dirname "$0")/common.sh"
check_root

banner "STEP 6 — DSpace Angular Frontend"

ANGULAR_GH="https://github.com/DSpace/dspace-angular.git"
UI_CFG="$INSTALL_ROOT/config/dspace-ui.yml"

[[ -f "$UI_CFG" ]] || fail "UI config not found at $UI_CFG"

# ── Clone / update angular repo ───────────────────────────────────────────────
if [[ -d "$ANGULAR_SRC_DIR/.git" ]]; then
  log "dspace-angular already cloned — fetching latest tags..."
  sudo -u dspace git -C "$ANGULAR_SRC_DIR" fetch --tags -q
else
  log "Cloning dspace-angular ${DSPACE_ANGULAR_VERSION}..."
  sudo -u dspace git clone --depth=1 \
    --branch "dspace-${DSPACE_ANGULAR_VERSION}" \
    "$ANGULAR_GH" "$ANGULAR_SRC_DIR" 2>&1 | tee -a "$LOG_FILE"
fi

# Checkout exact version tag
sudo -u dspace git -C "$ANGULAR_SRC_DIR" checkout "dspace-${DSPACE_ANGULAR_VERSION}" 2>&1 | tee -a "$LOG_FILE"
ok "Source at dspace-${DSPACE_ANGULAR_VERSION}"

# ── Write config/config.yml ───────────────────────────────────────────────────
log "Writing config/config.yml..."
mkdir -p "$ANGULAR_SRC_DIR/config"
cp "$UI_CFG" "$ANGULAR_SRC_DIR/config/config.yml"

# Substitute placeholders
sed -i \
  -e "s|%%IR_HOSTNAME%%|${IR_HOSTNAME}|g" \
  -e "s|%%UI_PORT%%|${UI_PORT:-4000}|g" \
  "$ANGULAR_SRC_DIR/config/config.yml"

chown -R dspace:dspace "$ANGULAR_SRC_DIR"
ok "config/config.yml written"

# ── Yarn install ──────────────────────────────────────────────────────────────
log "Running yarn install (downloads frontend dependencies)..."
sudo -u dspace bash -c "
  cd $ANGULAR_SRC_DIR
  yarn install --frozen-lockfile 2>&1
" | tee -a "$LOG_FILE"
ok "yarn install complete"

# ── Production build ──────────────────────────────────────────────────────────
log "Building Angular production bundle (takes ~10 min)..."
sudo -u dspace bash -c "
  cd $ANGULAR_SRC_DIR
  yarn build:prod 2>&1
" | tee -a "$LOG_FILE"

[[ -d "$ANGULAR_SRC_DIR/dist" ]] || fail "Angular build failed — dist/ not found"
ok "Angular production build complete"

# ── Install systemd service for the UI server ─────────────────────────────────
log "Installing dspace-ui systemd service..."
cp "$INSTALL_ROOT/systemd/dspace-ui.service" /etc/systemd/system/dspace-ui.service

# Substitute paths in service file
sed -i \
  -e "s|%%ANGULAR_SRC_DIR%%|${ANGULAR_SRC_DIR}|g" \
  -e "s|%%UI_PORT%%|${UI_PORT:-4000}|g" \
  /etc/systemd/system/dspace-ui.service

systemctl daemon-reload
systemctl enable dspace-ui
systemctl start dspace-ui

wait_for_port localhost "${UI_PORT:-4000}" 60
ok "DSpace Angular UI running on port ${UI_PORT:-4000}"
