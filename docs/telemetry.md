# Usage telemetry

Kibi sends anonymous usage statistics so its maintainers can see which operations people run, how long they take and how they fail. It is on by default, tells you so the first time it runs, and is easy to turn off.

## Turning it off

Any one of these turns telemetry off:

- `kibi telemetry disable`, which saves the choice for your user account and deletes any events still waiting to be sent. `kibi telemetry enable` turns it back on, and `kibi telemetry status` shows the current state and why, the channel events carry and where it comes from, and the host (`--format json`: `channel`, `channelSource` and `host`).
- `KIBI_TELEMETRY=0` in the environment.
- `DO_NOT_TRACK=1` in the environment.

Telemetry is also off in CI and under test runners, even after `kibi telemetry enable`. Kibi treats a run as CI when `CI`, `CONTINUOUS_INTEGRATION`, `GITHUB_ACTIONS`, `GITLAB_CI`, `BUILDKITE`, `CIRCLECI`, `TRAVIS`, `TF_BUILD`, `JENKINS_URL`, `TEAMCITY_VERSION`, `BITBUCKET_BUILD_NUMBER`, `CODEBUILD_BUILD_ID`, `DRONE`, `APPVEYOR`, `SEMAPHORE`, `BUILDKITE_BUILD_ID`, `CF_BUILD_ID` or `HEROKU_TEST_RUN_ID` is set, and as a test run when `NODE_ENV=test`, `JEST_WORKER_ID`, `VITEST`, `VITEST_WORKER_ID` or `NODE_TEST_CONTEXT` is set. It is off as well when the home directory (`HOME`) lies inside the system temp directory, which is how eval, packaging and end-to-end harnesses isolate each run. Only an explicit `KIBI_TELEMETRY=1` sends from those environments.

The daily update check is separate from telemetry: it only reads `kibi-cli/latest` from the npm registry and sends no events. `KIBI_UPDATE_CHECK=0` or `NO_UPDATE_NOTIFIER=1` turns it off (see [Update notices](install.md#update-notices)).

## What is sent

Kibi sends two kinds of event to its PostHog project in the EU region:

- `kibi_operation`, once for each MCP tool call and each CLI command. It contains the interface (`mcp` or `cli`), the registered tool or command name (for example `kb_search` or `storage compact`), its outcome, its duration, the CLI exit code, and for a failure a fixed category: an error code such as `tool_timeout`, `stale_snapshot` or `upsert_dry_run_invalid`, or the names of the failing checks for `kibi doctor` (for example `doctor:git_hooks`). A category that isn't a fixed identifier is sent as `unclassified`. The outcome is `success`, `rejected` when Kibi refused the request on purpose (an invalid payload, check findings, a contradiction, a firm decision, a missing entity), or `error` when Kibi itself failed. For an `error`, the event also names the JavaScript class of the thrown error (for example `TypeError` or `SyncError`) when it is a plain identifier, never its message.

  To show where agents struggle, `kibi_operation` events can also carry these signals, each a fixed name, a range or a yes/no:
  - for a refused payload, the rule it broke (a JSON Schema keyword such as `enum` or `required`, or a Kibi check such as `inventory_missing`), the field as a Kibi schema path with list positions as `*` (for example `relationships.*.type`; a field name no Kibi schema defines is sent as `other`), and how many issues it had (1, 2, 3 or 4+). For a dry run, the code of the refusal (for example `incomplete_propositions`). When the Kibi engine failed to start (`engine_start_failed`), the same field carries a fixed reason instead: the failing error's own code (for example `swipl_not_found`), `already_listening`, `store_locked`, `journal_unreadable`, `prolog_module_load_failed`, `branch_attach_failed`, `invalid_branch`, `daemon_exited`, `diagnostic_unreadable` or `daemon_error`;
  - for an upsert, whether it was a dry run, how many relationships it carried (0, 1, 2-5 or 6+), and which attempt it was on the same entity within 10 minutes (1, 2, 3 or 4+) with how the previous attempt ended;
  - for a search, how many results it found (0, 1, 2-5, 6-10 or 11+), whether it abstained, whether it showed concept hints, and whether another search ran in the same workspace in the previous 2 minutes;
  - whether a Kibi skill (for example `kibi-usage`) was loaded in the same workspace in the last 30 minutes;
  - for an `error`, where in Kibi's own code it happened: the top stack frame inside a Kibi package as `package/module#function` (for example `kibi-cli/dist/commands/sync#syncCommand`), and a short fingerprint of the error class and the top three Kibi frames. Frames outside Kibi's packages, file paths, line numbers and messages are dropped.

  Retries, repeated searches and skill loads are recognised from one-way hashes of the workspace path and the entity's type and id, kept in `telemetry-recent.json` next to the queue for at most 30 minutes. The hashes never leave your machine.
- `kibi_hook`, once for each Kibi hook decision in Claude Code, Codex, Cursor, ZCode or OpenCode. It contains the hook event, the action Kibi took (for example `read_snippet` or `edit_silent`), the kind of path touched (`source`, `test`, `kb`), the Kibi operation a tool call ran, whether Kibi had already been used in the session, and how many requirements the touched file implements. When a tool call loads a Kibi skill, the action is `skill_loaded` and the event names the skill (one of Kibi's own skills, else `other`).

Every event also carries:

- the Kibi package and its version, and the host agent (for example `claude-code` or `cursor`). Hook events name the host whose hook ran. The MCP server takes it from the launcher's `KIBI_MCP_HOST` or the client name the MCP host sends. The CLI takes it from `KIBI_HOST`, else from the variables hosts set for the processes they start (`CLAUDECODE`, `CURSOR_AGENT`, `CODEX_SANDBOX`, `GEMINI_CLI`, `OPENCODE`, `AI_AGENT`). Those variables are inherited, so a shell started from an agent's terminal, or a harness that runs inside one, counts as that agent; the CLI cannot tell it apart from the agent's own commands. Set `KIBI_HOST` to name the host yourself. `kibi telemetry status` shows the host and channel this shell's events carry;
- whether it runs in a hosted cloud workspace (`CLAUDE_CODE_REMOTE`, GitHub Codespaces or Gitpod);
- the channel the run comes from: `release` for an installed Kibi package, `source` when Kibi runs from a checkout of its own repository (Kibi's development, its own hooks and test rounds built from source), or the value of `KIBI_TELEMETRY_CHANNEL` when a harness sets one (for example `agent-test`), so that test and development runs can be told apart from real usage;
- the operating system, CPU architecture, and JavaScript runtime with its major version;
- the event format version (`telemetry_version`, currently 2; events without it come from Kibi versions that counted refusals as errors and sent none of the signals above);
- a random install id, created on first use and stored only on your machine;
- a one-way hash of the host's session id, so events from one agent session can be grouped. Hooks take it from the host's hook input. The CLI and MCP server take it from `KIBI_SESSION_ID`, `CLAUDE_CODE_SESSION_ID` or `CODEX_THREAD_ID` when the host sets one; otherwise they use the session a Kibi hook reported for the same workspace in the last 30 minutes. Hooks keep that link in `telemetry-sessions.json` next to the queue, as hashes of the workspace path and the session id only. Without a host, events carry no session.

## What is never sent

Kibi never sends source code, file paths, file names, search queries, entity ids or titles, requirement text, KB content, error messages, repository or branch names, or anything else you typed. Events don't create PostHog person profiles, and GeoIP lookup is disabled.

The detailed diagnostic log that `KIBI_DIAGNOSTIC_MODE` writes to `.kb/usage.log` is separate. It stays in your workspace and is never sent.

## How it is sent

Events are appended to a queue file in your user state directory (`$XDG_STATE_HOME/kibi` or `~/.local/state/kibi`; `%LOCALAPPDATA%\kibi` on Windows). They are sent in batches:

- by the MCP server every minute and when it shuts down;
- by every host's Kibi hook once a batch is due, and right away at the end of a turn (Claude Code's `Stop`, Codex's and ZCode's `Stop`, Cursor's `stop`);
- by the CLI once a batch is due (20 events, or the oldest is five minutes old).

A send waits at most 1.5 seconds. If it fails, the events are kept for the next attempt, and they are dropped once they are older than seven days. Telemetry never changes a command's output or exit code.

`KIBI_TELEMETRY_DIR` moves the queue and settings. `KIBI_TELEMETRY_HOST` and `KIBI_TELEMETRY_KEY` send to another PostHog project, such as your own.
