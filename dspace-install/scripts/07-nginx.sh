#!/usr/bin/env bash
# 07-nginx.sh — install Nginx, write vhost, optionally obtain Let's Encrypt SSL
set -euo pipefail
source "$(dirname "$0")/common.sh"
check_root

banner "STEP 7 — Nginx Reverse Proxy + SSL"

VHOST_SRC="$INSTALL_ROOT/nginx/ir.bpoly.ac.zw.conf"
VHOST_DEST="/etc/nginx/sites-available/${IR_HOSTNAME}"
SITES_ENABLED="/etc/nginx/sites-enabled/${IR_HOSTNAME}"

# ── Install Nginx ─────────────────────────────────────────────────────────────
log "Installing Nginx..."
apt-get install -y -qq nginx
systemctl enable nginx
ok "Nginx installed"

# ── Write vhost config ────────────────────────────────────────────────────────
log "Writing Nginx vhost for ${IR_HOSTNAME}..."
cp "$VHOST_SRC" "$VHOST_DEST"

sed -i \
  -e "s|%%IR_HOSTNAME%%|${IR_HOSTNAME}|g" \
  -e "s|%%TOMCAT_PORT%%|${TOMCAT_PORT:-8080}|g" \
  -e "s|%%UI_PORT%%|${UI_PORT:-4000}|g" \
  "$VHOST_DEST"

# Remove default site if present
[[ -L /etc/nginx/sites-enabled/default ]] && rm -f /etc/nginx/sites-enabled/default

ln -sfn "$VHOST_DEST" "$SITES_ENABLED"

# Test config before proceeding
nginx -t 2>&1 | tee -a "$LOG_FILE" || fail "Nginx config test failed"
systemctl reload nginx

ok "Nginx vhost enabled for ${IR_HOSTNAME}"

# ── Let's Encrypt SSL ─────────────────────────────────────────────────────────
if [[ "${ENABLE_SSL:-true}" == "true" ]]; then
  log "Installing Certbot for Let's Encrypt SSL..."
  apt-get install -y -qq certbot python3-certbot-nginx

  log "Checking DNS resolution for ${IR_HOSTNAME}..."
  if ! host "${IR_HOSTNAME}" &>/dev/null; then
    warn "DNS for ${IR_HOSTNAME} does not resolve from this server."
    warn "Skipping certbot — ensure the DNS A record points to this IP first."
    warn "Then run manually: certbot --nginx -d ${IR_HOSTNAME} --email ${CERTBOT_EMAIL} --agree-tos -n"
  else
    log "Requesting SSL certificate for ${IR_HOSTNAME}..."
    certbot --nginx \
      -d "${IR_HOSTNAME}" \
      --email "${CERTBOT_EMAIL}" \
      --agree-tos \
      --non-interactive \
      --redirect \
      2>&1 | tee -a "$LOG_FILE" && ok "SSL certificate installed" || \
      warn "Certbot failed — HTTPS not yet configured. Retry once DNS propagates."
  fi

  # Auto-renew cron
  if ! crontab -l 2>/dev/null | grep -q certbot; then
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --nginx") | crontab -
    ok "Certbot auto-renew cron added (daily at 03:00)"
  fi
else
  log "SSL disabled (ENABLE_SSL=false) — running HTTP only"
fi

systemctl reload nginx
ok "Nginx configured and running"
