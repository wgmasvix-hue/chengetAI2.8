#!/usr/bin/env bash
# 01-system-deps.sh — install Java 17, Maven, Ant, Node.js 18, Yarn, PM2, Tomcat 9
set -euo pipefail
source "$(dirname "$0")/common.sh"
check_root

banner "STEP 1 — System Dependencies"

log "Updating apt package lists..."
apt-get update -qq

log "Installing base utilities..."
apt-get install -y -qq \
  curl wget gnupg2 ca-certificates lsb-release \
  unzip zip tar git netcat-openbsd python3 \
  build-essential software-properties-common

# ── Java 17 ───────────────────────────────────────────────────────────────────
log "Installing OpenJDK ${JAVA_VERSION}..."
apt-get install -y -qq "openjdk-${JAVA_VERSION}-jdk"

JAVA_HOME_PATH=$(update-java-alternatives -l 2>/dev/null | grep "java-1.${JAVA_VERSION}" | awk '{print $3}' | head -1)
if [[ -z "$JAVA_HOME_PATH" ]]; then
  JAVA_HOME_PATH="/usr/lib/jvm/java-${JAVA_VERSION}-openjdk-amd64"
fi

# Set as default if multiple JVMs present
update-alternatives --set java "${JAVA_HOME_PATH}/bin/java" 2>/dev/null || true
update-alternatives --set javac "${JAVA_HOME_PATH}/bin/javac" 2>/dev/null || true

# Persist JAVA_HOME system-wide
cat > /etc/profile.d/java.sh <<EOF
export JAVA_HOME=${JAVA_HOME_PATH}
export PATH=\$JAVA_HOME/bin:\$PATH
EOF
export JAVA_HOME="$JAVA_HOME_PATH"

INSTALLED_JAVA=$(java -version 2>&1 | head -1)
ok "Java installed: $INSTALLED_JAVA"

# ── Maven ─────────────────────────────────────────────────────────────────────
log "Installing Apache Maven..."
apt-get install -y -qq maven
MVN_VERSION=$(mvn -version 2>&1 | head -1)
ok "Maven installed: $MVN_VERSION"

# ── Apache Ant ────────────────────────────────────────────────────────────────
log "Installing Apache Ant..."
apt-get install -y -qq ant
ANT_VERSION=$(ant -version 2>&1)
ok "Ant installed: $ANT_VERSION"

# ── Tomcat 9 ──────────────────────────────────────────────────────────────────
log "Installing Apache Tomcat 9..."
apt-get install -y -qq tomcat9 tomcat9-admin

# Increase Tomcat memory for DSpace
TOMCAT_DEFAULT="/etc/default/tomcat9"
if ! grep -q "Xmx2048m" "$TOMCAT_DEFAULT" 2>/dev/null; then
  cat >> "$TOMCAT_DEFAULT" <<'EOF'

# DSpace memory tuning
JAVA_OPTS="-Djava.awt.headless=true -Xms512m -Xmx2048m -XX:+UseG1GC -Dfile.encoding=UTF-8 -Djava.security.egd=file:/dev/./urandom"
EOF
fi

# Ensure URIEncoding is UTF-8 in server.xml
TOMCAT_SERVER_XML="/etc/tomcat9/server.xml"
if ! grep -q 'URIEncoding="UTF-8"' "$TOMCAT_SERVER_XML"; then
  sed -i 's/port="8080" protocol="HTTP\/1.1"/port="8080" protocol="HTTP\/1.1"\n               URIEncoding="UTF-8"/' "$TOMCAT_SERVER_XML"
fi

systemctl enable tomcat9
ok "Tomcat 9 installed and configured"

# ── Node.js 18 ────────────────────────────────────────────────────────────────
log "Installing Node.js ${NODE_VERSION}..."
if ! command -v node &>/dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt $NODE_VERSION ]]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y -qq nodejs
fi
NODE_VER=$(node -v)
ok "Node.js installed: $NODE_VER"

# ── Yarn ──────────────────────────────────────────────────────────────────────
log "Installing Yarn..."
npm install -g yarn --silent
YARN_VER=$(yarn -v)
ok "Yarn installed: $YARN_VER"

# ── PM2 ───────────────────────────────────────────────────────────────────────
log "Installing PM2 (Node.js process manager)..."
npm install -g pm2 --silent
ok "PM2 installed: $(pm2 -v)"

# ── dspace system user ────────────────────────────────────────────────────────
log "Creating dspace system user..."
if ! id -u dspace &>/dev/null; then
  useradd -m -d /home/dspace -s /bin/bash -c "DSpace Service Account" dspace
  ok "User 'dspace' created"
else
  ok "User 'dspace' already exists"
fi

# Create directories
mkdir -p "$DSPACE_DIR" "$BUILD_DIR" "$SRC_DIR" "$ANGULAR_SRC_DIR"
chown -R dspace:dspace "$DSPACE_DIR" "$BUILD_DIR"

ok "System dependencies installed"
