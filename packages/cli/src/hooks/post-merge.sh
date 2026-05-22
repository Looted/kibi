#!/bin/sh
# post-merge hook for kibi
# Parameter: squash_flag (not used)
# Refresh KB state after merge so branch-level assumptions remain current.
# Uses default non-coordinate-writing sync to avoid writing
# committed symbol artifacts during automatic hook execution.

kibi sync
