#!/usr/bin/env bash
# Historical host bootstrap helper; this does NOT deploy or configure Mana Vivaha.
# It installs host packages, adds the current user to the Docker group, changes
# firewall rules, and may run Docker's online installer. Review the current
# PRODUCTION-DEPLOY.md and host-provider guidance before using it.
# Never pipe this file directly from a URL into a shell. Run only on an approved
# fresh host after review, with the explicit acknowledgement below.
#
# Example after review: MANA_VIVAHA_ALLOW_HOST_MUTATION=YES bash scripts/oracle-setup.sh
set -euo pipefail

if [[ "${MANA_VIVAHA_ALLOW_HOST_MUTATION:-}" != "YES" ]]; then
    echo "Refusing to modify this host. Review PRODUCTION-DEPLOY.md, then set MANA_VIVAHA_ALLOW_HOST_MUTATION=YES if approved." >&2
    exit 2
fi

if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required; run as a non-root Ubuntu operator account." >&2
    exit 2
fi

echo "== 1/4 apt: git + caddy + iptables =="
sudo apt update
sudo apt install -y git caddy iptables-persistent

echo "== 2/4 docker =="
if ! command -v docker >/dev/null 2>&1; then
    echo "Installing Docker Engine using Docker's published convenience script."
    curl -fsSL https://get.docker.com | sh
else
    echo "docker already installed"
fi
sudo usermod -aG docker "$USER" || true

echo "== 3/4 firewall: open 80 + 443 =="
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null \
    || sudo iptables -I INPUT -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null \
    || sudo iptables -I INPUT -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save

echo "== 4/4 versions =="
docker --version
caddy version
git --version

echo ""
echo "Host bootstrap finished. Log out and back in to refresh Docker group membership."
echo "This did not deploy the application. Continue only with PRODUCTION-DEPLOY.md after production gates are satisfied."
