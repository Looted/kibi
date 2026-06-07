#!/bin/sh
# pre-commit hook for kibi
# Hard enforcement boundary: commits are blocked only here via kibi check.
# The OpenCode plugin remains advisory and must not replace this gate.
# Behavior-changing source edits require staged KB evidence or refreshed
# documentation/symbol-coordinates.yaml. Run:
#   kibi sync --refresh-symbol-coordinates && git add documentation/symbol-coordinates.yaml documentation/symbols.yaml

set -e
kibi check --staged
