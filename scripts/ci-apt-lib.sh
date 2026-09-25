# Shared apt helpers for CI bootstrap and SWI-Prolog install.
# Sourced by scripts/ci-apt-bootstrap.sh and scripts/ci-install-swi-prolog.sh.
# Do not invoke this file directly.

APT_TIMEOUT_SECS="${KIBI_APT_TIMEOUT_SECS:-90}"
APT_ATTEMPTS="${KIBI_APT_ATTEMPTS:-4}"
CI_APT_ROOT="${KIBI_CI_APT_ROOT:-}"

ci_apt_path() {
  printf '%s%s\n' "${CI_APT_ROOT}" "$1"
}

wait_for_apt_lock() {
  local n=0
  while sudo fuser \
    "$(ci_apt_path /var/lib/apt/lists/lock)" \
    "$(ci_apt_path /var/lib/dpkg/lock-frontend)" \
    "$(ci_apt_path /var/lib/dpkg/lock)" \
    "$(ci_apt_path /var/cache/apt/archives/lock)" \
    >/dev/null 2>&1; do
    n=$((n + 1))
    if [ "$n" -ge 90 ]; then
      echo "Timed out waiting for apt/dpkg locks" >&2
      return 1
    fi
    sleep 2
  done
}

# GitHub-hosted Ubuntu images pin azure.archive.ubuntu.com. That mirror can
# stall indefinitely while archive.ubuntu.com still answers. Rewrite before
# the first apt-get update so retries are not spent on a dead mirror.
prefer_archive_ubuntu_mirrors() {
  sudo mkdir -p "$(ci_apt_path /etc/apt/apt.conf.d)"
  sudo tee "$(ci_apt_path /etc/apt/apt.conf.d/99kibi-ci-timeouts)" >/dev/null <<'EOF'
Acquire::Retries "2";
Acquire::http::Timeout "20";
Acquire::https::Timeout "20";
Acquire::ftp::Timeout "20";
EOF
  if [ -f "$(ci_apt_path /etc/apt/apt-mirrors.txt)" ]; then
    sudo sed -i \
      's|http://azure.archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' \
      "$(ci_apt_path /etc/apt/apt-mirrors.txt)" || true
  fi
  if [ -d "$(ci_apt_path /etc/apt)" ]; then
    sudo find "$(ci_apt_path /etc/apt)" -type f \( -name '*.list' -o -name '*.sources' \) \
      -exec sed -i \
        -e 's|http://azure.archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' \
        -e 's|http://archive.ubuntu.com/ubuntu|https://archive.ubuntu.com/ubuntu|g' \
        {} + || true
  fi
}

# Run timeout as sudo's child so SIGTERM/SIGKILL reach apt-get itself.
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

# Refresh Ubuntu indexes. Extra sources (PPAs) are not required here.
refresh_ubuntu_indexes() {
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
  if grep -Eq "Failed to fetch .*archive\\.ubuntu\\.com" "$log"; then
    echo "Ubuntu archive index fetch failed; refusing package install against a stale index" >&2
    rm -f "$log"
    return 1
  fi
  rm -f "$log"
  return 0
}

bootstrap_ubuntu_packages() {
  prefer_archive_ubuntu_mirrors
  retry_until refresh_ubuntu_indexes
  if [ "$#" -gt 0 ]; then
    retry_apt apt-get install -y "$@"
  fi
}
