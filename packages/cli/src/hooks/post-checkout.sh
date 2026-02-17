#!/bin/sh
# post-checkout hook for kibi
# Parameters: old_ref new_ref branch_flag

old_ref=$1
new_ref=$2
branch_flag=$3

if [ "$branch_flag" = "1" ]; then
  kibi branch ensure && kibi sync
fi
