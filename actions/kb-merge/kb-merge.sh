#!/usr/bin/env bash
# Kibi KB merge: keep pull requests mergeable when the only thing that
# conflicts with the base branch is a Kibi manifest.
#
# GitHub's own merge check never runs a custom merge driver, so two pull
# requests that each append records to .kb/symbols.yaml (or to the same
# .kb/relationships shard) conflict as soon as one of them merges. For each
# open same-repository pull request into the base branch this script:
#
#   1. test-merges the base into the PR head with `git merge-tree`;
#   2. skips a PR that merges cleanly, and leaves one with any conflict
#      outside the Kibi manifests for a person;
#   3. merges the base into the PR head with `kibi merge-driver` in a scratch
#      worktree, compiles the merged KB with `kibi sync` (which must not
#      rewrite a tracked file), and runs the check command;
#   4. pushes the merge commit only when the check passed, and starts over
#      from step 1 when the branch moved while it worked.
#
# It runs from the repository the base branch is checked out in, with the
# credentials of that checkout. Configuration comes from the environment:
#
#   KB_MERGE_BASE       base branch (required)
#   KB_MERGE_KIBI       command that runs the base branch's Kibi (required
#                       unless KB_MERGE_LIST_ONLY is true)
#   KB_MERGE_CHECK      shell command run in the merged tree before pushing;
#                       KIBI and KIBI_BRANCH are exported to it. Empty: none.
#   KB_MERGE_BRANCHES   PR head branches to consider, newline or space
#                       separated, or a JSON array. Empty: every open PR.
#   KB_MERGE_LIST_ONLY  true: print the branches that need a merge and stop
#   KB_MERGE_ATTEMPTS   tries per branch when the branch moves (default 3)
#   KB_MERGE_REMOTE     remote to fetch from and push to (default origin)
#   KB_MERGE_SKIP_LABEL pull requests with this label are left alone, for
#                       example the label a merge train boards with: the train
#                       merges manifests itself, and a push to a boarded PR
#                       would restart its checks under the train. Empty: none.
#
# gh (with GH_TOKEN) lists the open pull requests. Results go to stdout,
# to GITHUB_OUTPUT (branches, merged, blocked, failed as JSON arrays) and to
# GITHUB_STEP_SUMMARY when those are set. The exit status is non-zero only
# when a branch that the driver should have handled could not be merged,
# checked, or pushed.

set -euo pipefail

BASE="${KB_MERGE_BASE:?KB_MERGE_BASE names the base branch}"
KIBI="${KB_MERGE_KIBI:-}"
CHECK="${KB_MERGE_CHECK:-}"
LIST_ONLY="${KB_MERGE_LIST_ONLY:-false}"
ATTEMPTS="${KB_MERGE_ATTEMPTS:-3}"
REMOTE="${KB_MERGE_REMOTE:-origin}"
SKIP_LABEL="${KB_MERGE_SKIP_LABEL:-}"

# The manifests `kibi merge-driver` merges, and the derived coordinate cache
# that branches from before KB schema 13 may still track.
MANIFEST_ATTRIBUTES=('.kb/symbols.yaml merge=kibi' '.kb/relationships/*.yaml merge=kibi')
RESOLVABLE='^\.kb/(symbols\.yaml|symbol-coordinates\.yaml|relationships/[^/]+\.yaml)$'
COMMITTER_NAME="${KB_MERGE_COMMITTER_NAME:-github-actions[bot]}"
COMMITTER_EMAIL="${KB_MERGE_COMMITTER_EMAIL:-41898282+github-actions[bot]@users.noreply.github.com}"

if ! [[ "$ATTEMPTS" =~ ^[1-9][0-9]*$ ]]; then
  echo "::error::KB_MERGE_ATTEMPTS must be a positive integer, got '$ATTEMPTS'." >&2
  exit 2
fi
if [ "$LIST_ONLY" != "true" ] && [ -z "$KIBI" ]; then
  echo "::error::KB_MERGE_KIBI must name the Kibi command (for example node_modules/.bin/kibi)." >&2
  exit 2
fi

# Git without the repository's hooks: a pre-commit or pre-push hook installed
# by the base checkout's dependencies must not judge or block the merge; the
# check command is the gate.
g() { git -c core.hooksPath=/dev/null "$@"; }

json_array() { jq -cn '$ARGS.positional' --args "$@"; }

WORK=$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/kibi-kb-merge.XXXXXX")
cleanup() {
  for tree in "$WORK"/tree-*; do
    [ -d "$tree" ] && g worktree remove --force "$tree" >/dev/null 2>&1
  done
  g worktree prune >/dev/null 2>&1 || true
  rm -rf "$WORK"
}
trap cleanup EXIT

# --- Which pull requests ----------------------------------------------------

wanted_branches() {
  local raw="${KB_MERGE_BRANCHES:-}"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  if [ -z "$raw" ]; then return 0; fi
  if [ "${raw:0:1}" = "[" ]; then
    jq -r '.[]' <<<"$raw"
  else
    tr ' ' '\n' <<<"$raw" | sed '/^$/d'
  fi
}

# Prints "<head>\t<cross-repository>\t<labels, newline-free, comma joined>"
# for every open PR into BASE.
open_pulls() {
  gh pr list --base "$BASE" --state open --limit 500 \
    --json headRefName,isCrossRepository,labels \
    --jq '.[] | "\(.headRefName)\t\(.isCrossRepository)\t\([.labels[].name] | join(","))"'
}

candidates() {
  local wanted pulls head cross labels filtered=""
  # A malformed list fails here rather than dropping the filter and handling
  # every open pull request; a list that names none handles none.
  local requested="${KB_MERGE_BRANCHES:-}"
  if [ -n "${requested//[[:space:]]/}" ]; then filtered=1; fi
  if ! wanted=$(wanted_branches); then
    echo "::error::KB_MERGE_BRANCHES is not a JSON list of branch names or a space-separated list: $requested" >&2
    return 1
  fi
  # A command substitution does not inherit `set -e`, so a failed listing
  # (a token without pull-requests: read) is caught here, not read as "none".
  if ! pulls=$(open_pulls); then
    echo "::error::Could not list the open pull requests into $BASE; the token needs pull-requests: read." >&2
    return 1
  fi
  while IFS=$'\t' read -r head cross labels; do
    [ -n "$head" ] || continue
    if [ -n "$filtered" ] && ! grep -Fxq -- "$head" <<<"$wanted"; then continue; fi
    if [ "$cross" = "true" ]; then
      echo "$head: skipped, the pull request comes from a fork and cannot be pushed to" >&2
      continue
    fi
    if [ -n "$SKIP_LABEL" ] && tr ',' '\n' <<<"$labels" | grep -Fxq -- "$SKIP_LABEL"; then
      echo "$head: skipped, the pull request has the $SKIP_LABEL label" >&2
      continue
    fi
    printf '%s\n' "$head"
  done <<<"$pulls"
}

fetch() {
  g fetch --quiet --no-tags "$REMOTE" \
    "+refs/heads/$BASE:refs/remotes/$REMOTE/$BASE" \
    "+refs/heads/$1:refs/remotes/$REMOTE/$1"
}

# clean | kb-only | person:<files> | error:<status>
classify() {
  local head="$1" out status=0 conflicts
  out=$(g merge-tree --write-tree --name-only --no-messages \
    "$REMOTE/$BASE" "$REMOTE/$head") || status=$?
  if [ "$status" -eq 0 ]; then echo clean; return; fi
  if [ "$status" -ne 1 ]; then echo "error:$status"; return; fi
  conflicts=$(printf '%s\n' "$out" | tail -n +2 | sed '/^$/d')
  if printf '%s\n' "$conflicts" | grep -Evq "$RESOLVABLE"; then
    echo "person:$(printf '%s ' $conflicts)"
    return
  fi
  echo kb-only
}

# --- Merging one branch -------------------------------------------------------

# Routes the manifests to the driver. The driver command itself is passed only
# to the merge, so the test-merge in classify sees what GitHub sees.
route_manifests() {
  local info
  info="$(g rev-parse --git-common-dir)/info"
  mkdir -p "$info"
  # Worktrees read info/attributes from the common directory, and it wins
  # over a .gitattributes that does not declare the driver yet.
  # Each line is added once, so repeated runs on one clone do not pile up.
  local line
  touch "$info/attributes"
  for line in "${MANIFEST_ATTRIBUTES[@]}"; do
    grep -Fxq -- "$line" "$info/attributes" || printf '%s\n' "$line" >>"$info/attributes"
  done
}

# Merges BASE into HEAD in a scratch worktree at $TREE. Prints merged |
# up-to-date | person:<files> | failed:<reason>.
merge_one() {
  local head="$1" unmerged
  g worktree add --quiet --detach "$TREE" "$REMOTE/$head" >&2
  (
    cd "$TREE"
    if ! g -c merge.kibi.driver="$KIBI merge-driver %O %A %B" \
      -c user.name="$COMMITTER_NAME" -c user.email="$COMMITTER_EMAIL" \
      merge --no-ff --no-commit "$REMOTE/$BASE" >&2; then :; fi
    if ! g rev-parse -q --verify MERGE_HEAD >/dev/null; then
      if g merge-base --is-ancestor "$REMOTE/$BASE" HEAD; then
        echo up-to-date
      else
        echo "failed:the merge did not start"
      fi
      exit 0
    fi
    # Derived since KB schema 13 and no longer tracked: drop the branch copy.
    if g ls-files --error-unmatch .kb/symbol-coordinates.yaml >/dev/null 2>&1; then
      g rm --cached --quiet -- .kb/symbol-coordinates.yaml
    fi
    unmerged=$(g diff --name-only --diff-filter=U)
    if [ -n "$unmerged" ]; then
      g merge --abort
      echo "person:$(printf '%s ' $unmerged)"
      exit 0
    fi
    g -c user.name="$COMMITTER_NAME" -c user.email="$COMMITTER_EMAIL" \
      commit --quiet --no-verify -m "Merge $BASE into $head" \
      -m "kibi merge-driver resolved the .kb manifest conflicts." >&2
    echo merged
  )
}

# Compiles the merged KB and runs the check, in the merged tree. Prints
# nothing on success; the reason on failure.
verify_one() {
  local head="$1"
  (
    cd "$TREE"
    # The tree holds pull request content: its commands never get the token
    # that pushes.
    unset GH_TOKEN GITHUB_TOKEN GH_ENTERPRISE_TOKEN GITHUB_ENTERPRISE_TOKEN \
      ACTIONS_RUNTIME_TOKEN ACTIONS_ID_TOKEN_REQUEST_TOKEN ACTIONS_ID_TOKEN_REQUEST_URL
    export KIBI="$KIBI" KIBI_BRANCH="$head"
    if ! bash -c "$KIBI sync" >&2; then
      echo "kibi sync failed on the merged tree"
      exit 0
    fi
    if ! g diff --quiet HEAD; then
      echo "kibi sync changed tracked files after the merge: $(g diff --name-only HEAD | tr '\n' ' ')"
      exit 0
    fi
    if [ -n "$CHECK" ] && ! bash -c "$CHECK" >&2; then
      echo "the check failed on the merged tree"
      exit 0
    fi
  )
}

# Pushes the merge. Prints pushed | moved | failed:<git's error>: a push
# refused for any other reason than a moved branch (no write access, a
# protected branch, an expired token) is not retried.
push_one() {
  local head="$1" before="$2" error now
  # The lease refuses the push when someone else moved the branch since it
  # was fetched, even if the new tip happens to contain the merge.
  if error=$(cd "$TREE" && g push --quiet --force-with-lease="refs/heads/$head:$before" \
    "$REMOTE" "HEAD:refs/heads/$head" 2>&1); then
    echo pushed
    return
  fi
  now=$(g ls-remote "$REMOTE" "refs/heads/$head" 2>/dev/null | cut -f1)
  if [ -n "$now" ] && [ "$now" != "$before" ]; then
    echo moved
    return
  fi
  echo "failed:$(printf '%s' "$error" | tr '\n' ' ' | sed 's/ *$//')"
}

MERGED=()
BLOCKED=()
FAILED=()
LISTED=()
SUMMARY=()

note() { SUMMARY+=("| \`$1\` | $2 |"); echo "$1: $2"; }

resolve_branch() {
  local head="$1" attempt state outcome reason before
  for ((attempt = 1; attempt <= ATTEMPTS; attempt++)); do
    if ! fetch "$head"; then
      FAILED+=("$head"); note "$head" "failed: could not fetch the branch"; return
    fi
    state=$(classify "$head")
    case "$state" in
      clean) note "$head" "already merges cleanly"; return ;;
      person:*)
        BLOCKED+=("$head")
        note "$head" "left for a person, conflicts outside Kibi manifests: ${state#person:}"
        echo "::warning::$head conflicts with $BASE outside Kibi manifests: ${state#person:}"
        return ;;
      error:*)
        FAILED+=("$head"); note "$head" "failed: git merge-tree exit ${state#error:}"; return ;;
    esac
    before=$(g rev-parse "$REMOTE/$head")
    TREE="$WORK/tree-$attempt-$(printf '%s' "$head" | tr -c 'A-Za-z0-9._-' '_')"
    outcome=$(merge_one "$head")
    case "$outcome" in
      up-to-date) note "$head" "already contains $BASE"; return ;;
      person:*)
        BLOCKED+=("$head")
        note "$head" "left for a person, a real conflict inside a manifest: ${outcome#person:}"
        echo "::warning::kibi merge-driver left a real conflict in $head: ${outcome#person:}"
        return ;;
      failed:*) FAILED+=("$head"); note "$head" "failed: ${outcome#failed:}"; return ;;
    esac
    reason=$(verify_one "$head")
    if [ -n "$reason" ]; then
      FAILED+=("$head"); note "$head" "not pushed: $reason"
      echo "::error::$head was not pushed: $reason"
      return
    fi
    outcome=$(push_one "$head" "$before")
    case "$outcome" in
      pushed)
        MERGED+=("$head"); note "$head" "merged $BASE and pushed $(g -C "$TREE" rev-parse --short HEAD)"
        return ;;
      failed:*)
        FAILED+=("$head"); note "$head" "not pushed: ${outcome#failed:}"
        echo "::error::$head was not pushed: ${outcome#failed:}"
        return ;;
    esac
    echo "$head: the branch moved while it was being merged (attempt $attempt of $ATTEMPTS)"
  done
  FAILED+=("$head")
  note "$head" "failed: the branch kept moving; $ATTEMPTS attempts"
  echo "::error::$head moved during each of $ATTEMPTS merge attempts."
}

write_outputs() {
  local merged blocked failed listed
  merged=$(json_array ${MERGED[@]+"${MERGED[@]}"})
  blocked=$(json_array ${BLOCKED[@]+"${BLOCKED[@]}"})
  failed=$(json_array ${FAILED[@]+"${FAILED[@]}"})
  listed=$(json_array ${LISTED[@]+"${LISTED[@]}"})
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    {
      echo "branches=$listed"
      echo "merged=$merged"
      echo "blocked=$blocked"
      echo "failed=$failed"
    } >>"$GITHUB_OUTPUT"
  fi
  if [ -n "${GITHUB_STEP_SUMMARY:-}" ] && [ "${#SUMMARY[@]}" -gt 0 ]; then
    {
      echo "### Kibi KB merge into pull requests from \`$BASE\`"
      echo
      echo "| Branch | Result |"
      echo "| --- | --- |"
      printf '%s\n' "${SUMMARY[@]}"
    } >>"$GITHUB_STEP_SUMMARY"
  fi
}

main() {
  local head state
  local list
  list=$(candidates) || exit 1
  mapfile -t heads < <(printf '%s' "$list" | sed '/^$/d')
  if [ "$LIST_ONLY" = "true" ]; then
    for head in ${heads[@]+"${heads[@]}"}; do
      if ! fetch "$head"; then
        echo "::warning::Could not fetch $head"; continue
      fi
      state=$(classify "$head")
      case "$state" in
        kb-only) LISTED+=("$head"); note "$head" "Kibi manifest conflicts only" ;;
        clean) ;;
        person:*) note "$head" "needs a person: ${state#person:}" ;;
        error:*) echo "::warning::Could not test-merge $head (git merge-tree exit ${state#error:})" ;;
      esac
    done
    write_outputs
    return 0
  fi
  route_manifests
  for head in ${heads[@]+"${heads[@]}"}; do
    resolve_branch "$head"
  done
  write_outputs
  [ "${#FAILED[@]}" -eq 0 ]
}

main
