#!/usr/bin/env bash
# firewall.sh — configure UFW for the DSpace server
# Run this AFTER install.sh; it locks down all ports except SSH, HTTP, HTTPS
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root: sudo bash firewall.sh"; exit 1; }

echo "Configuring UFW firewall..."

apt-get install -y -qq ufw

# Reset to defaults
ufw --force reset

# Default policies
ufw default deny incoming
ufw default allow outgoing

# SSH — keep open (critical: do not close before enabling)
ufw allow 22/tcp comment "SSH"

# Web traffic
ufw allow 80/tcp  comment "HTTP"
ufw allow 443/tcp comment "HTTPS"

# Block direct access to internal services from outside
# (Tomcat, Solr, Angular are proxied through Nginx)
ufw deny 8080/tcp  comment "Block direct Tomcat access"
ufw deny 8983/tcp  comment "Block direct Solr access"
ufw deny 4000/tcp  comment "Block direct Angular UI access"
ufw deny 5432/tcp  comment "Block direct PostgreSQL access"

# Enable
ufw --force enable
ufw status verbose

echo ""
echo "Firewall enabled. SSH (22), HTTP (80), HTTPS (443) are open."
echo "All internal service ports (8080, 8983, 4000, 5432) are blocked from outside."
