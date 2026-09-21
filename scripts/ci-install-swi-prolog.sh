#!/usr/bin/env bash
# Install SWI-Prolog on GitHub Actions without leaving a hung apt-get
# holding /var/lib/apt/lists/lock. Extra package names may be passed as args.
set -euo pipefail

APT_TIMEOUT_SECS="${KIBI_APT_TIMEOUT_SECS:-90}"
APT_ATTEMPTS="${KIBI_APT_ATTEMPTS:-4}"
SWI_PPA="ppa:swi-prolog/stable"
SWI_PPA_FETCH_RE="ppa.launchpadcontent.net/swi-prolog/stable"

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
      's|http://azure.archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' \
      /etc/apt/apt-mirrors.txt || true
  fi
  sudo find /etc/apt -type f \( -name '*.list' -o -name '*.sources' \) \
    -exec sed -i \
      -e 's|http://azure.archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' \
      -e 's|http://archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' \
      {} +
}

# Run timeout as sudo's child so SIGTERM/SIGKILL reach apt-get itself.
# `timeout sudo apt-get` kills sudo and can leave apt-get holding the lock.
run_apt() {
  wait_for_apt_lock
  sudo timeout --kill-after=20 "${APT_TIMEOUT_SECS}" "$@"
}

retry_until() {
  local attempt=1
  until "$@"; do
    if [ "$attempt" -ge "${APT_ATTEMPTS}" ]; then
      return 1
    fi
    attempt=$((attempt + 1))
    prefer_archive_ubuntu_mirrors
    wait_for_apt_lock || true
    sleep 5
  done
}

retry_apt() {
  retry_until run_apt "$@"
}

# apt-get update exits 0 when Launchpad returns 503 for one source. Treat a
# missing SWI PPA index as failure so Ubuntu 9.0.4 is never installed by
# accident (it lacks library(prolog_coverage)).
refresh_apt_indexes() {
  local log status
  log="$(mktemp)"
  set +o pipefail
  run_apt apt-get update 2>&1 | tee "$log"
  status=${PIPESTATUS[0]}
  set -o pipefail
  if [ "$status" -ne 0 ]; then
    rm -f "$log"
    return "$status"
  fi
  if grep -Eq "Failed to fetch .*${SWI_PPA_FETCH_RE}" "$log"; then
    echo "SWI-Prolog PPA index fetch failed; refusing Ubuntu 9.0.x fallback that lacks library(prolog_coverage)" >&2
    rm -f "$log"
    return 1
  fi
  rm -f "$log"
  return 0
}

require_prolog_coverage_library() {
  if ! command -v swipl >/dev/null 2>&1; then
    echo "swipl is not on PATH after installing swi-prolog" >&2
    return 1
  fi
  swipl --version >&2 || true
  if ! swipl -q -g "use_module(library(prolog_coverage)), halt" -t "halt(1)"; then
    echo "Installed SWI-Prolog lacks library(prolog_coverage)." >&2
    echo "Ubuntu 24.04's 9.0.4 is not sufficient; ${SWI_PPA} (10.x) is required." >&2
    return 1
  fi
}

prefer_archive_ubuntu_mirrors
retry_apt apt-get install -y software-properties-common
retry_apt apt-add-repository -y "${SWI_PPA}"
retry_until refresh_apt_indexes
retry_apt apt-get install -y swi-prolog "$@"
require_prolog_coverage_library
