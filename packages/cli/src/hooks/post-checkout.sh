#!/bin/sh
# post-checkout hook for kibi
# Parameters: old_ref new_ref branch_flag
# branch_flag is 1 for branch checkout, 0 for file checkout

old_ref=$1
new_ref=$2
branch_flag=$3

if [ "$branch_flag" = "1" ]; then
  # Try to resolve the branch we just left (strip decorations like ^ and ~)
  old_branch=$(git name-rev --name-only "$old_ref" 2>/dev/null | sed 's/\^.*//')

  # Basic validation: non-empty and does not contain ~ or ^
  if [ -n "$old_branch" ] && echo "$old_branch" | grep -qv '[~^]'; then
    kibi branch ensure --from "$old_branch" && kibi sync
  else
    kibi branch ensure && kibi sync
  fi
fi
