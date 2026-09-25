#!/usr/bin/env bash
# Install SWI-Prolog 10.x for CI. Ubuntu extras (bubblewrap, etc.) belong in
# scripts/ci-apt-bootstrap.sh so they never install against a stale index.
#
# Do not use apt-add-repository: it calls Launchpad's getSigningKeyData API,
# which 500s with GPGKeyTemporarilyNotFoundError and previously caused CI to
# install Ubuntu 9.0.4 (no library(prolog_coverage)).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ci-apt-lib.sh
. "${SCRIPT_DIR}/ci-apt-lib.sh"

SWI_PPA_FETCH_RE="ppa.launchpadcontent.net/swi-prolog/stable"
# Full fingerprint of the Launchpad ~swi-prolog/stable signing key.
SWI_PPA_KEY_FINGERPRINT="E8B739E3753FF4A12360BA6A4AB3A5F60EA9AEB3"
SWI_PPA_KEYRING="$(ci_apt_path /usr/share/keyrings/swi-prolog-stable.gpg)"
SWIPL_SRC_VERSION="${KIBI_SWIPL_SRC_VERSION:-10.0.2}"
SWIPL_SRC_SHA256="${KIBI_SWIPL_SRC_SHA256:-e42cc098f7b8a6051c4f79a99b55162d467098aba60f69649bdc7583f0734b57}"
SWIPL_SRC_URL="${KIBI_SWIPL_SRC_URL:-https://www.swi-prolog.org/download/stable/src/swipl-${SWIPL_SRC_VERSION}.tar.gz}"
SWIPL_CACHE_DIR="${KIBI_SWIPL_CACHE_DIR:-}"

# apt-get update exits 0 when Launchpad returns 503 for one source. Treat a
# missing SWI PPA index as failure so Ubuntu 9.0.4 is never installed.
refresh_swi_ppa_indexes() {
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

prepend_swipl_cache_path() {
  local prefix="$1"
  if [ -d "${prefix}/bin" ]; then
    export PATH="${prefix}/bin:${PATH}"
    if [ -n "${GITHUB_PATH:-}" ]; then
      echo "${prefix}/bin" >> "${GITHUB_PATH}"
    fi
  fi
}

try_cached_swipl() {
  if [ -z "${SWIPL_CACHE_DIR}" ]; then
    return 1
  fi
  if [ ! -x "${SWIPL_CACHE_DIR}/bin/swipl" ]; then
    return 1
  fi
  prepend_swipl_cache_path "${SWIPL_CACHE_DIR}"
  require_prolog_coverage_library
}

add_swi_ppa_without_launchpad_api() {
  local codename tmp fingerprint
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
  fingerprint="$(gpg --batch --with-colons --show-keys "$tmp" | awk -F: '/^fpr:/ { print $10; exit }')"
  if [ "$fingerprint" != "$SWI_PPA_KEY_FINGERPRINT" ]; then
    echo "SWI-Prolog PPA key fingerprint ${fingerprint:-missing} does not match ${SWI_PPA_KEY_FINGERPRINT}" >&2
    rm -f "$tmp"
    return 1
  fi
  sudo mkdir -p "$(dirname "${SWI_PPA_KEYRING}")"
  gpg --batch --yes --dearmor <"$tmp" | sudo tee "${SWI_PPA_KEYRING}" >/dev/null
  rm -f "$tmp"
  sudo chmod 644 "${SWI_PPA_KEYRING}"
  sudo mkdir -p "$(ci_apt_path /etc/apt/sources.list.d)"
  sudo tee "$(ci_apt_path /etc/apt/sources.list.d/swi-prolog-stable.sources)" >/dev/null <<EOF
Types: deb
URIs: https://ppa.launchpadcontent.net/swi-prolog/stable/ubuntu
Suites: ${codename}
Components: main
Signed-By: ${SWI_PPA_KEYRING}
EOF
}

install_swi_via_ppa() {
  add_swi_ppa_without_launchpad_api
  retry_until refresh_swi_ppa_indexes
  retry_apt apt-get install -y swi-prolog
  require_prolog_coverage_library
}

install_swi_from_official_source() {
  local src_dir tarball prefix
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
  prefix="${SWIPL_CACHE_DIR:-/usr}"
  src_dir="$(mktemp -d)"
  tarball="${src_dir}/swipl-${SWIPL_SRC_VERSION}.tar.gz"
  curl -fsSL --max-time 120 "${SWIPL_SRC_URL}" -o "$tarball"
  echo "${SWIPL_SRC_SHA256}  ${tarball}" | sha256sum -c -
  tar -xzf "$tarball" -C "$src_dir"
  cmake -S "${src_dir}/swipl-${SWIPL_SRC_VERSION}" -B "${src_dir}/build" \
    -DCMAKE_BUILD_TYPE=Release \
    -DSWIPL_PACKAGES_X=OFF \
    -DSWIPL_PACKAGES_JAVA=OFF \
    -DCMAKE_INSTALL_PREFIX="${prefix}" \
    -G Ninja
  cmake --build "${src_dir}/build" --parallel "$(nproc)"
  sudo cmake --install "${src_dir}/build"
  rm -rf "$src_dir"
  if [ "${prefix}" != "/usr" ]; then
    prepend_swipl_cache_path "${prefix}"
  fi
}

if [ "$#" -gt 0 ]; then
  echo "ci-install-swi-prolog.sh no longer installs generic Ubuntu packages." >&2
  echo "Pass extras to scripts/ci-apt-bootstrap.sh instead. Received: $*" >&2
  exit 2
fi

prefer_archive_ubuntu_mirrors
retry_until refresh_ubuntu_indexes

if try_cached_swipl; then
  exit 0
fi

if install_swi_via_ppa; then
  exit 0
fi

echo "SWI-Prolog PPA is unavailable; building ${SWIPL_SRC_VERSION} from official source" >&2
install_swi_from_official_source
require_prolog_coverage_library
