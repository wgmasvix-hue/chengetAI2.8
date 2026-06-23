# =============================================================================
# Makefile — DSpace 7.6 installer shortcuts
# Usage: make <target>   (run from the dspace-install/ directory)
# =============================================================================

SHELL := /bin/bash
INSTALL_DIR := $(shell pwd)
COMPOSE := docker compose -f $(INSTALL_DIR)/test/docker-compose.yml

.DEFAULT_GOAL := help

.PHONY: help install install-step install-from upgrade verify \
        test test-syntax test-services test-docker \
        cloud-init aws-launch firewall \
        logs clean

# ── Help ──────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  Bulawayo Polytechnic — DSpace 7.6 Installer"
	@echo "  ─────────────────────────────────────────────"
	@echo ""
	@echo "  Server installation:"
	@echo "    make setup          Copy .env.example → .env (edit DB_PASSWORD before running)"
	@echo "    make install        Full install (all 10 steps)"
	@echo "    make install-step N=4   Run only step N"
	@echo "    make install-from N=5   Resume from step N"
	@echo "    make verify         Run step 09 (health checks only)"
	@echo "    make upgrade V=7.6.3    Upgrade to a new DSpace version"
	@echo "    make firewall       Configure UFW (run after install)"
	@echo ""
	@echo "  Testing:"
	@echo "    make test           Run full test suite (Docker)"
	@echo "    make test-syntax    Bash syntax + shellcheck only"
	@echo "    make test-config    Config file substitution only"
	@echo "    make test-services  Start backing services + run suite"
	@echo "    make test-down      Stop and remove test containers"
	@echo ""
	@echo "  Cloud:"
	@echo "    make cloud-init     Show cloud-init.yml path (paste into cloud console)"
	@echo "    make aws-launch     Launch an EC2 instance (requires AWS CLI)"
	@echo ""
	@echo "  Monitoring:"
	@echo "    make logs           Tail the install log"
	@echo "    make status         Check all DSpace service statuses"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────────────────
setup:
	@if [ ! -f "$(INSTALL_DIR)/.env" ]; then \
	  cp "$(INSTALL_DIR)/.env.example" "$(INSTALL_DIR)/.env"; \
	  echo "✓ .env created — open it and set DB_PASSWORD before running 'make install'"; \
	  echo "  nano $(INSTALL_DIR)/.env"; \
	else \
	  echo "✓ .env already exists"; \
	fi

# ── Installation ──────────────────────────────────────────────────────────────
install: _require-env
	sudo bash "$(INSTALL_DIR)/install.sh"

install-step: _require-env
	@[ -n "$(N)" ] || { echo "Usage: make install-step N=4"; exit 1; }
	sudo bash "$(INSTALL_DIR)/install.sh" --step $(N)

install-from: _require-env
	@[ -n "$(N)" ] || { echo "Usage: make install-from N=5"; exit 1; }
	sudo bash "$(INSTALL_DIR)/install.sh" --from $(N)

verify: _require-env
	sudo bash "$(INSTALL_DIR)/install.sh" --step 9

upgrade: _require-env
	@[ -n "$(V)" ] || { echo "Usage: make upgrade V=7.6.3"; exit 1; }
	sudo bash "$(INSTALL_DIR)/upgrade.sh" $(V)

firewall:
	sudo bash "$(INSTALL_DIR)/firewall.sh"

# ── Testing ───────────────────────────────────────────────────────────────────
test: _require-docker
	cp "$(INSTALL_DIR)/test/.env.test" "$(INSTALL_DIR)/.env"
	$(COMPOSE) up --build --abort-on-container-exit dspace-test
	$(MAKE) test-down

test-syntax:
	@echo "── Bash syntax checks ──────────────────────────────────"
	@FAIL=0; \
	for f in "$(INSTALL_DIR)"/scripts/*.sh "$(INSTALL_DIR)"/install.sh \
	          "$(INSTALL_DIR)"/firewall.sh "$(INSTALL_DIR)"/upgrade.sh; do \
	  if bash -n "$$f" 2>&1; then echo "  ✓ $$(basename $$f)"; \
	  else echo "  ✗ $$(basename $$f)"; FAIL=1; fi; \
	done; exit $$FAIL
	@echo ""
	@if command -v shellcheck &>/dev/null; then \
	  echo "── ShellCheck ──────────────────────────────────────────"; \
	  shellcheck -e SC1091,SC2086,SC2034 \
	    "$(INSTALL_DIR)"/scripts/*.sh \
	    "$(INSTALL_DIR)"/install.sh || true; \
	else \
	  echo "  (shellcheck not installed — run: sudo apt install shellcheck)"; \
	fi

test-config:
	@cp "$(INSTALL_DIR)/test/.env.test" "$(INSTALL_DIR)/.env"
	INSTALL_ROOT="$(INSTALL_DIR)" bash "$(INSTALL_DIR)/test/run-tests.sh"

test-services: _require-docker
	cp "$(INSTALL_DIR)/test/.env.test" "$(INSTALL_DIR)/.env"
	$(COMPOSE) up -d postgres solr
	@echo "Waiting for services to be healthy..."
	@timeout 90 bash -c 'until $(COMPOSE) ps | grep -q "healthy"; do sleep 3; done' \
	  || { echo "Services did not become healthy in time"; exit 1; }
	$(COMPOSE) run --rm dspace-test
	$(MAKE) test-down

test-down:
	$(COMPOSE) down -v 2>/dev/null || true

# ── Cloud ─────────────────────────────────────────────────────────────────────
cloud-init:
	@echo ""
	@echo "  Cloud-init file: $(INSTALL_DIR)/cloud/cloud-init.yml"
	@echo ""
	@echo "  Paste contents as 'User Data' on any of these clouds:"
	@echo "    AWS EC2:      Launch Instance → Advanced → User data"
	@echo "    GCP:          Create VM → Management → Startup script"
	@echo "    Azure:        Create VM → Advanced → Custom data"
	@echo "    DigitalOcean: Create Droplet → Advanced → User data"
	@echo "    Hetzner:      Create Server → Cloud config"
	@echo ""
	@echo "  IMPORTANT: Edit DB_PASSWORD in the file first!"
	@echo ""

aws-launch:
	bash "$(INSTALL_DIR)/cloud/aws-ec2-launch.sh"

# ── Monitoring ────────────────────────────────────────────────────────────────
logs:
	tail -f /var/log/dspace-install.log

status:
	@echo "── Service Status ───────────────────────────────────────"
	@for svc in postgresql solr tomcat9 nginx dspace-ui; do \
	  if systemctl is-active --quiet $$svc 2>/dev/null; then \
	    echo "  ✓ $$svc"; \
	  else \
	    echo "  ✗ $$svc (inactive)"; \
	  fi; \
	done
	@echo ""

# ── Internal guards ───────────────────────────────────────────────────────────
_require-env:
	@[ -f "$(INSTALL_DIR)/.env" ] || { \
	  echo "ERROR: .env not found. Run: make setup"; exit 1; }
	@source "$(INSTALL_DIR)/.env" && \
	  [ -n "$$DB_PASSWORD" ] || { \
	    echo "ERROR: DB_PASSWORD is not set in .env"; exit 1; }

_require-docker:
	@command -v docker &>/dev/null || { \
	  echo "ERROR: Docker not installed. See https://docs.docker.com/get-docker/"; exit 1; }
	@docker compose version &>/dev/null || { \
	  echo "ERROR: Docker Compose v2 not found. Update Docker Desktop or install the plugin."; exit 1; }
