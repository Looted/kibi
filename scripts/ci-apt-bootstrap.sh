#!/usr/bin/env bash
# Refresh Ubuntu apt indexes, then install generic Ubuntu packages.
# SWI-Prolog is not this script's job — use scripts/ci-install-swi-prolog.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=ci-apt-lib.sh
. "${SCRIPT_DIR}/ci-apt-lib.sh"

bootstrap_ubuntu_packages "$@"
