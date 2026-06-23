#!/usr/bin/env bash
# upgrade.sh — upgrade an existing DSpace 7.x installation to a new version
# Usage: sudo bash upgrade.sh NEW_VERSION
# Example: sudo bash upgrade.sh 7.6.3
set -euo pipefail

INSTALL_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$INSTALL_ROOT/scripts/common.sh"
check_root

NEW_VERSION="${1:-}"
[[ -n "$NEW_VERSION" ]] || fail "Usage: sudo bash upgrade.sh NEW_VERSION (e.g. 7.6.3)"

OLD_VERSION=$(cat "$DSPACE_DIR/version.txt" 2>/dev/null || echo "unknown")
banner "DSpace Upgrade: $OLD_VERSION → $NEW_VERSION"

log "Backing up current installation..."
BACKUP_DIR="/backup/dspace-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

log "  Backup target: $BACKUP_DIR"
# Config backup
cp -r "$DSPACE_DIR/config" "$BACKUP_DIR/"
log "  Config backed up"

# Database dump
PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
  -F custom -f "$BACKUP_DIR/dspace-db.pgdump" 2>&1 | tee -a "$LOG_FILE"
log "  Database dumped to $BACKUP_DIR/dspace-db.pgdump"

# Stop services
log "Stopping services..."
systemctl stop dspace-ui tomcat9 || true

# Download new DSpace source
NEW_SRC="$BUILD_DIR/dspace-src-${NEW_VERSION}"
TGZ="/tmp/dspace-${NEW_VERSION}.tar.gz"

log "Downloading DSpace $NEW_VERSION..."
wget -q --show-progress -O "$TGZ" \
  "https://github.com/DSpace/DSpace/archive/refs/tags/dspace-${NEW_VERSION}.tar.gz" || \
  fail "Download failed for version $NEW_VERSION"

mkdir -p "$NEW_SRC"
tar -xzf "$TGZ" -C "$NEW_SRC" --strip-components=1
rm -f "$TGZ"

# Copy existing local.cfg into new source
cp "$DSPACE_DIR/config/local.cfg" "$NEW_SRC/dspace/config/local.cfg"
chown -R dspace:dspace "$NEW_SRC"

# Maven build
log "Building DSpace $NEW_VERSION (this will take ~20 min)..."
sudo -u dspace bash -c "
  export JAVA_HOME=${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}
  cd $NEW_SRC
  mvn --batch-mode -q package -Dmirage2.on=true -Dmirage2.deps.included=false 2>&1
" | tee /var/log/dspace-upgrade-build.log

# Ant update (not fresh_install for upgrades)
log "Running ant update..."
sudo -u dspace ant -f "$NEW_SRC/dspace/target/dspace-installer/build.xml" update \
  2>&1 | tee -a "$LOG_FILE"
chown -R dspace:dspace "$DSPACE_DIR"

# Database migration
log "Running database migration..."
sudo -u dspace "$DSPACE_DIR/bin/dspace" database migrate 2>&1 | tee -a "$LOG_FILE"

# Restart services
systemctl start tomcat9
systemctl start dspace-ui

# Full reindex
log "Running full reindex (discovery)..."
sudo -u dspace "$DSPACE_DIR/bin/dspace" index-discovery -f 2>&1 | tee -a "$LOG_FILE"

ok "Upgrade to DSpace $NEW_VERSION complete"
ok "Backup stored at $BACKUP_DIR"
log "Run: sudo bash $INSTALL_ROOT/install.sh --step 9   to verify"
