#!/usr/bin/env bash
# Install SWI-Prolog on GitHub Actions without leaving a hung apt-get
# holding /var/lib/apt/lists/lock. Extra package names may be passed as args.
set -euo pipefail

APT_TIMEOUT_SECS="${KIBI_APT_TIMEOUT_SECS:-300}"
APT_ATTEMPTS="${KIBI_APT_ATTEMPTS:-3}"

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
    wait_for_apt_lock || true
    sleep 10
  done
}

retry_apt apt-get install -y software-properties-common

if [ "${GITHUB_ACTOR:-}" != "nektos/act" ]; then
  retry_apt apt-add-repository -y ppa:swi-prolog/stable
fi

retry_apt apt-get update
retry_apt apt-get install -y swi-prolog "$@"
