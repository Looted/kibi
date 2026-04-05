#!/bin/sh
# pre-commit hook for kibi
# Hard enforcement boundary: commits are blocked only here via kibi check.
# The OpenCode plugin remains advisory and must not replace this gate.

set -e
kibi check --staged
