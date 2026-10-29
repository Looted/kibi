# Usage telemetry

Kibi sends anonymous usage statistics so its maintainers can see which operations people run, how long they take and how they fail. It is on by default, tells you so the first time it runs, and is easy to turn off.

## Turning it off

Any one of these turns telemetry off:

- `kibi telemetry disable`, which saves the choice for your user account and deletes any events still waiting to be sent. `kibi telemetry enable` turns it back on, and `kibi telemetry status` shows the current state and why.
- `KIBI_TELEMETRY=0` in the environment.
- `DO_NOT_TRACK=1` in the environment.

Telemetry is also off in CI and under test runners, even after `kibi telemetry enable`. Kibi treats a run as CI when `CI`, `CONTINUOUS_INTEGRATION`, `GITHUB_ACTIONS`, `GITLAB_CI`, `BUILDKITE`, `CIRCLECI`, `TRAVIS`, `TF_BUILD`, `JENKINS_URL`, `TEAMCITY_VERSION`, `BITBUCKET_BUILD_NUMBER`, `CODEBUILD_BUILD_ID`, `DRONE`, `APPVEYOR`, `SEMAPHORE`, `BUILDKITE_BUILD_ID`, `CF_BUILD_ID` or `HEROKU_TEST_RUN_ID` is set, and as a test run when `NODE_ENV=test`, `JEST_WORKER_ID`, `VITEST`, `VITEST_WORKER_ID` or `NODE_TEST_CONTEXT` is set. Only an explicit `KIBI_TELEMETRY=1` sends from those environments.

## What is sent

Kibi sends two kinds of event to its PostHog project in the EU region:

- `kibi_operation`, once for each MCP tool call and each CLI command. It contains the interface (`mcp` or `cli`), the registered tool or command name (for example `kb_search` or `storage compact`), whether it succeeded, its duration, the CLI exit code, and for MCP errors a fixed category such as `tool_timeout` or `stale_snapshot`.
- `kibi_hook`, once for each Kibi Claude Code hook decision. It contains the hook event, the action Kibi took (for example `read_snippet` or `edit_silent`), the kind of path touched (`source`, `test`, `kb`), the Kibi operation a tool call ran, whether Kibi had already been used in the session, and how many requirements the touched file implements.

Every event also carries:

- the Kibi package and its version, and the host agent (for example `claude-code` or `cursor`);
- the operating system, CPU architecture, and JavaScript runtime with its major version;
- a random install id, created on first use and stored only on your machine;
- a one-way hash of the host's session id, so events from one agent session can be grouped.

## What is never sent

Kibi never sends source code, file paths, file names, search queries, entity ids or titles, requirement text, KB content, error messages, repository or branch names, or anything else you typed. Events don't create PostHog person profiles, and GeoIP lookup is disabled.

The detailed diagnostic log that `KIBI_DIAGNOSTIC_MODE` writes to `.kb/usage.log` is separate. It stays in your workspace and is never sent.

## How it is sent

Events are appended to a queue file in your user state directory (`$XDG_STATE_HOME/kibi` or `~/.local/state/kibi`; `%LOCALAPPDATA%\kibi` on Windows). They are sent in batches:

- by the MCP server every minute and when it shuts down;
- by the Claude Code Stop hook at the end of each turn;
- by the CLI once a batch is due (20 events, or the oldest is five minutes old).

A send waits at most 1.5 seconds. If it fails, the events are kept for the next attempt, and they are dropped once they are older than seven days. Telemetry never changes a command's output or exit code.

`KIBI_TELEMETRY_DIR` moves the queue and settings. `KIBI_TELEMETRY_HOST` and `KIBI_TELEMETRY_KEY` send to another PostHog project, such as your own.
