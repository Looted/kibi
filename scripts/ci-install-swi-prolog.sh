#!/usr/bin/env bash
# Install SWI-Prolog on GitHub Actions without leaving a hung apt-get
# holding /var/lib/apt/lists/lock. Extra package names may be passed as args.
set -euo pipefail

APT_TIMEOUT_SECS="${KIBI_APT_TIMEOUT_SECS:-90}"
APT_ATTEMPTS="${KIBI_APT_ATTEMPTS:-4}"

wait_for_apt_lock() {
  local n=0
  while sudo fuser \
    /var/lib/apt/lists/lock \
    /var/lib/dpkg/lock-frontend \
    /var/lib/dpkg/lock \
    /var/cache/apt/archives/lock \
    >/dev/null 2>&1; do
    n=$((n + 1))
    if [ "$n" -ge 90 ]; then
      echo "Timed out waiting for apt/dpkg locks" >&2
      sudo fuser -v \
        /var/lib/apt/lists/lock \
        /var/lib/dpkg/lock-frontend \
        /var/lib/dpkg/lock \
        /var/cache/apt/archives/lock \
        >&2 || true
      return 1
    fi
    sleep 2
  done
}

# GitHub-hosted Ubuntu images pin azure.archive.ubuntu.com. That mirror can
# stall indefinitely while archive.ubuntu.com still answers. Rewrite before
# the first apt-get update so retries are not spent on a dead mirror.
prefer_archive_ubuntu_mirrors() {
  sudo tee /etc/apt/apt.conf.d/99kibi-ci-timeouts >/dev/null <<'EOF'
Acquire::Retries "2";
Acquire::http::Timeout "20";
Acquire::https::Timeout "20";
Acquire::ftp::Timeout "20";
EOF
  if [ -f /etc/apt/apt-mirrors.txt ]; then
    sudo sed -i \
      's|http://azure.archive.ubuntu.com/ubuntu|http://archive.ubuntu.com/ubuntu|g' \
      /etc/apt/apt-mirrors.txt || true
  fi
  sudo find /etc/apt -type f \( -name '*.list' -o -name '*.sources' \) \
    -exec sed -i \
      's|http://azure.archive.ubuntu.com/ubuntu|http://archive.ubuntu.com/ubuntu|g' \
      {} +
}

# Run timeout as sudo's child so SIGTERM/SIGKILL reach apt-get itself.
# `timeout sudo apt-get` kills sudo and can leave apt-get holding the lock.
run_apt() {
  wait_for_apt_lock
  sudo timeout --kill-after=20 "${APT_TIMEOUT_SECS}" "$@"
}

retry_apt() {
  local attempt=1
  until run_apt "$@"; do
    if [ "$attempt" -ge "${APT_ATTEMPTS}" ]; then
      return 1
    fi
    attempt=$((attempt + 1))
    prefer_archive_ubuntu_mirrors
    wait_for_apt_lock || true
    sleep 5
  done
}

prefer_archive_ubuntu_mirrors
retry_apt apt-get install -y software-properties-common

if [ "${GITHUB_ACTOR:-}" != "nektos/act" ]; then
  retry_apt apt-add-repository -y ppa:swi-prolog/stable
fi

retry_apt apt-get update
retry_apt apt-get install -y swi-prolog "$@"
