#!/bin/sh
# post-merge hook for kibi
# Parameter: squash_flag (not used)
# Refresh KB state after merge so branch-level assumptions remain current.

kibi sync
