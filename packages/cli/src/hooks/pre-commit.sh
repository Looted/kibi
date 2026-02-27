#!/bin/sh
# pre-commit hook for kibi
# Blocks commits if kibi check finds violations

set -e
kibi check
