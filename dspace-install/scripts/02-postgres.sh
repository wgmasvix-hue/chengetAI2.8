#!/usr/bin/env bash
# 02-postgres.sh — install PostgreSQL 15, create dspace DB and user
set -euo pipefail
source "$(dirname "$0")/common.sh"
check_root

banner "STEP 2 — PostgreSQL"

# ── Install ───────────────────────────────────────────────────────────────────
log "Adding PostgreSQL 15 apt repository..."
if ! apt-cache show postgresql-15 &>/dev/null; then
  curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | \
    gpg --dearmor -o /usr/share/keyrings/postgresql.gpg
  echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
    > /etc/apt/sources.list.d/pgdg.list
  apt-get update -qq
fi

log "Installing PostgreSQL 15..."
apt-get install -y -qq postgresql-15 postgresql-client-15

systemctl enable --now postgresql
wait_for_port localhost 5432 30

# ── Create user and database ──────────────────────────────────────────────────
log "Creating PostgreSQL role '${DB_USER}'..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  ok "Role '${DB_USER}' already exists"
else
  sudo -u postgres psql -c \
    "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}' CREATEDB;"
  ok "Role '${DB_USER}' created"
fi

log "Creating database '${DB_NAME}'..."
if sudo -u postgres psql -lqt | cut -d\| -f1 | grep -qw "${DB_NAME}"; then
  ok "Database '${DB_NAME}' already exists"
else
  sudo -u postgres createdb --owner="${DB_USER}" --encoding=UNICODE "${DB_NAME}"
  ok "Database '${DB_NAME}' created"
fi

log "Enabling pgcrypto extension..."
sudo -u postgres psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>&1 | \
  grep -v "already exists" || true
ok "pgcrypto extension ready"

# ── pg_hba: allow local password auth for dspace ─────────────────────────────
PG_HBA=$(sudo -u postgres psql -tAc "SHOW hba_file")
log "Configuring pg_hba.conf at $PG_HBA..."

if ! grep -q "^host.*${DB_NAME}.*${DB_USER}.*md5" "$PG_HBA" 2>/dev/null; then
  cat >> "$PG_HBA" <<EOF
# DSpace — allow password auth from localhost
host    ${DB_NAME}    ${DB_USER}    127.0.0.1/32    md5
host    ${DB_NAME}    ${DB_USER}    ::1/128          md5
EOF
  sudo -u postgres pg_ctl reload -D "$(sudo -u postgres psql -tAc "SHOW data_directory")" \
    2>/dev/null || systemctl reload postgresql || true
  ok "pg_hba.conf updated"
fi

# ── Smoke test ────────────────────────────────────────────────────────────────
log "Testing database connection..."
PGPASSWORD="$DB_PASSWORD" psql -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT version();" -tA | head -1 | grep -q "PostgreSQL" && \
  ok "Database connection successful" || fail "Database connection failed"
