#!/usr/bin/env bash
# Install SWI-Prolog 10.x for CI. Extra apt package names may be passed as args
# (for example bubblewrap) and are installed from Ubuntu independently of SWI.
#
# Do not use apt-add-repository: it calls Launchpad's getSigningKeyData API,
# which 500s with GPGKeyTemporarilyNotFoundError and previously caused CI to
# install Ubuntu 9.0.4 (no library(prolog_coverage)).
set -euo pipefail

APT_TIMEOUT_SECS="${KIBI_APT_TIMEOUT_SECS:-90}"
APT_ATTEMPTS="${KIBI_APT_ATTEMPTS:-4}"
SWI_PPA_FETCH_RE="ppa.launchpadcontent.net/swi-prolog/stable"
SWI_PPA_KEY_FINGERPRINT="EF8406856DBFCA18"
SWI_PPA_KEYRING="/usr/share/keyrings/swi-prolog-stable.gpg"
SWIPL_SRC_VERSION="${KIBI_SWIPL_SRC_VERSION:-10.0.2}"
SWIPL_SRC_SHA256="${KIBI_SWIPL_SRC_SHA256:-e42cc098f7b8a6051c4f79a99b55162d467098aba60f69649bdc7583f0734b57}"
SWIPL_SRC_URL="${KIBI_SWIPL_SRC_URL:-https://www.swi-prolog.org/download/stable/src/swipl-${SWIPL_SRC_VERSION}.tar.gz}"

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
# missing SWI PPA index as failure so Ubuntu 9.0.4 is never installed.
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
    echo "swipl is not on PATH after installing SWI-Prolog" >&2
    return 1
  fi
  swipl --version >&2 || true
  if ! swipl -q -g "use_module(library(prolog_coverage)), halt" -t "halt(1)"; then
    echo "Installed SWI-Prolog lacks library(prolog_coverage)." >&2
    echo "Ubuntu 24.04's 9.0.4 is not sufficient; SWI-Prolog ${SWIPL_SRC_VERSION}+ is required." >&2
    return 1
  fi
}

add_swi_ppa_without_launchpad_api() {
  local codename tmp
  # shellcheck source=/dev/null
  . /etc/os-release
  codename="${VERSION_CODENAME:?}"
  tmp="$(mktemp)"
  if ! timeout --kill-after=5 20 curl -fsSL \
    "https://keyserver.ubuntu.com/pks/lookup?op=get&options=mr&search=0x${SWI_PPA_KEY_FINGERPRINT}" \
    -o "$tmp"; then
    echo "Could not download SWI-Prolog PPA signing key from the Ubuntu keyserver" >&2
    rm -f "$tmp"
    return 1
  fi
  if ! grep -q "BEGIN PGP PUBLIC KEY BLOCK" "$tmp"; then
    echo "Ubuntu keyserver did not return an OpenPGP public key for ${SWI_PPA_KEY_FINGERPRINT}" >&2
    rm -f "$tmp"
    return 1
  fi
  local fingerprint
  fingerprint="$(gpg --batch --with-colons --show-keys "$tmp" | awk -F: '/^fpr:/ { print $10; exit }')"
  case "$fingerprint" in
    *"${SWI_PPA_KEY_FINGERPRINT}") ;;
    *)
      echo "SWI-Prolog PPA key fingerprint ${fingerprint:-missing} does not end with ${SWI_PPA_KEY_FINGERPRINT}" >&2
      rm -f "$tmp"
      return 1
      ;;
  esac
  gpg --batch --yes --dearmor <"$tmp" | sudo tee "${SWI_PPA_KEYRING}" >/dev/null
  rm -f "$tmp"
  sudo chmod 644 "${SWI_PPA_KEYRING}"
  sudo tee /etc/apt/sources.list.d/swi-prolog-stable.sources >/dev/null <<EOF
Types: deb
URIs: https://ppa.launchpadcontent.net/swi-prolog/stable/ubuntu
Suites: ${codename}
Components: main
Signed-By: ${SWI_PPA_KEYRING}
EOF
}

install_swi_via_ppa() {
  add_swi_ppa_without_launchpad_api
  retry_until refresh_apt_indexes
  retry_apt apt-get install -y swi-prolog
  require_prolog_coverage_library
}

install_swi_from_official_source() {
  local src_dir tarball
  retry_apt apt-get install -y \
    cmake \
    ninja-build \
    gcc \
    g++ \
    libarchive-dev \
    libgmp-dev \
    libossp-uuid-dev \
    libpcre2-dev \
    libreadline-dev \
    libssl-dev \
    zlib1g-dev
  src_dir="$(mktemp -d)"
  tarball="${src_dir}/swipl-${SWIPL_SRC_VERSION}.tar.gz"
  curl -fsSL --max-time 120 "${SWIPL_SRC_URL}" -o "$tarball"
  echo "${SWIPL_SRC_SHA256}  ${tarball}" | sha256sum -c -
  tar -xzf "$tarball" -C "$src_dir"
  cmake -S "${src_dir}/swipl-${SWIPL_SRC_VERSION}" -B "${src_dir}/build" \
    -DCMAKE_BUILD_TYPE=Release \
    -DSWIPL_PACKAGES_X=OFF \
    -DSWIPL_PACKAGES_JAVA=OFF \
    -DCMAKE_INSTALL_PREFIX=/usr \
    -G Ninja
  cmake --build "${src_dir}/build" --parallel "$(nproc)"
  sudo cmake --install "${src_dir}/build"
  rm -rf "$src_dir"
}

prefer_archive_ubuntu_mirrors
if [ "$#" -gt 0 ]; then
  retry_apt apt-get install -y "$@"
fi

if install_swi_via_ppa; then
  exit 0
fi

echo "SWI-Prolog PPA is unavailable; building ${SWIPL_SRC_VERSION} from official source" >&2
install_swi_from_official_source
require_prolog_coverage_library
