#!/bin/sh
# pre-commit hook for kibi
# Hard enforcement boundary: commits are blocked only here via kibi check.
# The OpenCode plugin remains advisory and must not replace this gate.
# Behavior-changing source edits require staged KB evidence; .kb/symbols.yaml
# must cover every staged declaration. Symbol coordinates are derived locally
# and never committed.

set -e
kibi check --staged
