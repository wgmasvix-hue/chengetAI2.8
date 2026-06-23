# =============================================================================
# DSpace test runner — Ubuntu 22.04 with all prerequisites pre-installed
# Mirrors what 01-system-deps.sh would install on the real server
# =============================================================================
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Africa/Harare
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PATH=$JAVA_HOME/bin:$PATH

# ── Base packages ─────────────────────────────────────────────────────────────
RUN apt-get update -qq && apt-get install -y -qq \
    curl wget gnupg2 ca-certificates lsb-release \
    unzip zip tar git netcat-openbsd python3 \
    build-essential software-properties-common \
    ant maven cron nginx \
    postgresql-client-15 \
    shellcheck \
    && rm -rf /var/lib/apt/lists/*

# ── Java 17 ───────────────────────────────────────────────────────────────────
RUN apt-get update -qq && apt-get install -y -qq openjdk-17-jdk \
    && rm -rf /var/lib/apt/lists/*

# ── Node.js 18 ────────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y -qq nodejs \
    && npm install -g yarn --silent \
    && rm -rf /var/lib/apt/lists/*

# ── dspace system user ────────────────────────────────────────────────────────
RUN useradd -m -d /home/dspace -s /bin/bash dspace

# ── Create expected directories ───────────────────────────────────────────────
RUN mkdir -p /dspace/bin /dspace/config /dspace/webapps/server \
             /dspace/solr/search/conf /dspace/solr/statistics/conf \
             /dspace/solr/authority/conf /dspace/solr/oai/conf \
             /dspace/assetstore /build/dspace-src /build/dspace-angular \
    && chown -R dspace:dspace /dspace /build

# ── Mock DSpace binaries (for testing deploy/verify scripts) ──────────────────
RUN printf '#!/bin/bash\necho "DSpace mock: $*"\nif [[ "$1" == "database" && "$2" == "test" ]]; then echo "SUCCESS: Connected"; fi\nif [[ "$1" == "database" && "$2" == "migrate" ]]; then echo "SUCCESS: Migrated"; fi\n' \
    > /dspace/bin/dspace && chmod +x /dspace/bin/dspace

WORKDIR /opt/dspace-install

CMD ["bash"]
