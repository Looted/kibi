import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { persistRefreshedLogin, withCodexAuthLease } from "./codex-auth";
import type {
  CodexCellDependencies,
  PreparedLogin,
  TargetHost,
  TargetHostSession,
} from "./codex-cell-types";
import { buildCodexConfig, buildCodexExecArgv } from "./permissions";

/** The historical Codex target host: auth lease, private CODEX_HOME, exec. */
// implements REQ-skillopt-codex-optimization
export function codexTargetHost(
  dependencies: Pick<CodexCellDependencies, "prepareLogin">,
): TargetHost {
  const logins = new WeakMap<TargetHostSession, PreparedLogin>();
  return {
    id: "codex",
    withLease: withCodexAuthLease,
    openSession: async ({ workspace, env }) => {
      const login = await dependencies.prepareLogin({
        privateCodexHome: workspace.codexHome,
        sandboxHome: workspace.sandboxHome,
        env,
      });
      const session: TargetHostSession = {
        env: login.env,
        privateRoots: [login.realCodexHome],
        finalize: () =>
          persistRefreshedLogin({
            mode: login.mode,
            realCodexHome: login.realCodexHome,
            privateCodexHome: workspace.codexHome,
          }),
      };
      logins.set(session, login);
      return session;
    },
    prepareLaunch: async ({
      options,
      workspace,
      broker,
      outputSchemaPath,
      session,
    }) => {
      const login = logins.get(session);
      if (login === undefined) throw new Error("codex_session_unknown");
      await writeFile(
        join(workspace.codexHome, "config.toml"),
        buildCodexConfig({
          role: "target",
          authMode: login.mode,
          paths: {
            workspace: workspace.target,
            runPrivateHome: workspace.codexHome,
            realCodexHome: login.realCodexHome,
            sourceWorktree: options.sourceWorktree,
            fixtureKb: join(workspace.target, ".kb"),
            privateScorer: workspace.privateScorer,
            privateEvidence: workspace.privateEvidence,
            siblingRuns: workspace.siblingRun,
          },
          bwrapExecutable: options.bwrapExecutable,
          codexExecutable: options.codexExecutable,
          mcpServer: broker,
        }),
        { mode: 0o600 },
      );
      return {
        argv: buildCodexExecArgv({
          codexCommand: options.codexExecutable,
          workspace: workspace.target,
          outputSchema: outputSchemaPath,
          role: "target",
        }),
      };
    },
  };
}
