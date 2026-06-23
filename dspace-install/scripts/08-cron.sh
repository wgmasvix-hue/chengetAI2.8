#!/usr/bin/env bash
# 08-cron.sh — install DSpace maintenance cron jobs
set -euo pipefail
source "$(dirname "$0")/common.sh"
check_root

banner "STEP 8 — DSpace Maintenance Cron Jobs"

CRON_FILE="/etc/cron.d/dspace"
DSPACE_BIN="$DSPACE_DIR/bin/dspace"

log "Writing DSpace cron jobs to $CRON_FILE..."

cat > "$CRON_FILE" <<EOF
# ============================================================================
# DSpace Maintenance Cron Jobs — Bulawayo Polytechnic
# ============================================================================
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
DSPACE_BIN=${DSPACE_BIN}

# ── Discovery / Search Index ──────────────────────────────────────────────────
# Full re-index every Sunday at 01:00
0 1 * * 0   dspace  \$DSPACE_BIN index-discovery -f >> /var/log/dspace-cron.log 2>&1
# Incremental index every 5 minutes
*/5 * * * * dspace  \$DSPACE_BIN index-discovery    >> /var/log/dspace-cron.log 2>&1

# ── Statistics ────────────────────────────────────────────────────────────────
# Accumulate usage statistics daily at 02:00
0 2 * * *   dspace  \$DSPACE_BIN stat-general >> /var/log/dspace-cron.log 2>&1
0 2 * * *   dspace  \$DSPACE_BIN stat-report-site >> /var/log/dspace-cron.log 2>&1
# Solr statistics -> relational DB (for reports)
30 2 * * *  dspace  \$DSPACE_BIN solr-export-statistics >> /var/log/dspace-cron.log 2>&1

# ── Email subscription digests ────────────────────────────────────────────────
# Daily subscriptions at 07:00
0 7 * * *   dspace  \$DSPACE_BIN sub-daily >> /var/log/dspace-cron.log 2>&1
# Weekly subscriptions on Monday at 07:00
0 7 * * 1   dspace  \$DSPACE_BIN sub-weekly >> /var/log/dspace-cron.log 2>&1
# Monthly subscriptions on 1st at 07:00
0 7 1 * *   dspace  \$DSPACE_BIN sub-monthly >> /var/log/dspace-cron.log 2>&1

# ── Media filters / thumbnail generation ─────────────────────────────────────
# Run media filter daily at 03:00 to generate PDF thumbnails etc.
0 3 * * *   dspace  \$DSPACE_BIN filter-media >> /var/log/dspace-cron.log 2>&1

# ── Sitemap ───────────────────────────────────────────────────────────────────
0 4 * * *   dspace  \$DSPACE_BIN generate-sitemaps >> /var/log/dspace-cron.log 2>&1

# ── OAI-PMH cache ─────────────────────────────────────────────────────────────
30 4 * * *  dspace  \$DSPACE_BIN oai import -c >> /var/log/dspace-cron.log 2>&1

# ── Log rotation ──────────────────────────────────────────────────────────────
# Compress cron log weekly
0 5 * * 0   root    gzip -9 -f /var/log/dspace-cron.log && touch /var/log/dspace-cron.log
EOF

chmod 644 "$CRON_FILE"

# Create log file
touch /var/log/dspace-cron.log
chown dspace:dspace /var/log/dspace-cron.log

ok "DSpace cron jobs installed at $CRON_FILE"
