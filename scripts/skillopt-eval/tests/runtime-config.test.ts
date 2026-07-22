import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexAuthError, prepareExistingLogin } from "../runtime/codex-auth";
import { buildCodexConfig, buildCodexExecArgv } from "../runtime/permissions";

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

async function directories() {
  const root = await mkdtemp(join(tmpdir(), "skillopt-auth-test-"));
  roots.push(root);
  const real = join(root, "real");
  const privateHome = join(root, "private");
  await Promise.all([mkdir(real), mkdir(privateHome)]);
  return { root, real, privateHome } as const;
}

const successfulLogin = async (argv: readonly [string, ...string[]]) => ({
  argv,
  stdout: "",
  stderr: "Logged in using ChatGPT\n",
  exitCode: 0,
  signal: null,
});

describe("Codex existing-login isolation", () => {
  test("copies only file credentials with restrictive permissions", async () => {
    // Given
    const paths = await directories();
    const chatGptAuth = JSON.stringify({
      auth_mode: "chatgpt",
      OPENAI_API_KEY: null,
      tokens: { access_token: "session-token" },
    });
    await writeFile(join(paths.real, "auth.json"), chatGptAuth, {
      mode: 0o644,
    });
    await writeFile(join(paths.real, "config.toml"), "ambient = true");

    // When
    const auth = await prepareExistingLogin({
      privateCodexHome: paths.privateHome,
      env: { PATH: process.env.PATH, CODEX_HOME: paths.real },
      run: successfulLogin,
    });

    // Then
    expect(auth.mode).toBe("file");
    expect(await readFile(join(paths.privateHome, "auth.json"), "utf8")).toBe(
      chatGptAuth,
    );
    expect(
      (await stat(join(paths.privateHome, "auth.json"))).mode & 0o777,
    ).toBe(0o600);
    expect(Bun.file(join(paths.privateHome, "config.toml")).size).toBe(0);
  });

  test("uses keyring without copying credentials", async () => {
    // Given
    const paths = await directories();

    // When
    const auth = await prepareExistingLogin({
      privateCodexHome: paths.privateHome,
      env: { PATH: process.env.PATH, CODEX_HOME: paths.real },
      run: successfulLogin,
    });

    // Then
    expect(auth.mode).toBe("keyring");
    expect(Bun.file(join(paths.privateHome, "auth.json")).size).toBe(0);
  });

  test("rejects API-key-backed auth files", async () => {
    // Given
    const paths = await directories();
    await writeFile(
      join(paths.real, "auth.json"),
      JSON.stringify({ auth_mode: "apikey", OPENAI_API_KEY: "secret" }),
    );

    // When
    const attempt = prepareExistingLogin({
      privateCodexHome: paths.privateHome,
      env: { PATH: process.env.PATH, CODEX_HOME: paths.real },
      run: successfulLogin,
    });

    // Then
    expect(attempt).rejects.toMatchObject({
      name: "CodexAuthError",
      kind: "auth_file",
    });
  });

  test("rejects API-key-backed keyring sessions", async () => {
    // Given
    const paths = await directories();

    // When
    const attempt = prepareExistingLogin({
      privateCodexHome: paths.privateHome,
      env: { PATH: process.env.PATH, CODEX_HOME: paths.real },
      run: async (argv) => ({
        argv,
        stdout: "",
        stderr: "Logged in using an API key\n",
        exitCode: 0,
        signal: null,
      }),
    });

    // Then
    expect(attempt).rejects.toMatchObject({
      name: "CodexAuthError",
      kind: "login",
    });
  });

  test("rejects API keys and alternate provider configuration", async () => {
    // Given
    const paths = await directories();

    // When
    const attempts = [
      { OPENAI_API_KEY: "secret" },
      { CODEX_API_KEY: "secret" },
      { ANTHROPIC_API_KEY: "secret" },
      { MISTRAL_API_KEY: "secret" },
      { OPENAI_BASE_URL: "https://provider.invalid" },
    ].map((env) =>
      prepareExistingLogin({
        privateCodexHome: paths.privateHome,
        env: { ...env, CODEX_HOME: paths.real },
        run: successfulLogin,
      }),
    );

    // Then
    for (const attempt of attempts) {
      expect(attempt).rejects.toBeInstanceOf(CodexAuthError);
    }
  });
});

describe("Codex evaluator-owned permissions", () => {
  test("builds exact noninteractive argv", () => {
    // Given
    const options = {
      codexCommand: "/bin/codex",
      workspace: "/run/work",
      outputSchema: "/run/schema.json",
      role: "target" as const,
    };

    // When
    const argv = buildCodexExecArgv(options);

    // Then
    expect(argv).toEqual([
      "/bin/codex",
      "--ask-for-approval",
      "never",
      "exec",
      "--json",
      "--ephemeral",
      "--skip-git-repo-check",
      "--ignore-rules",
      "--strict-config",
      "--model",
      "gpt-5.4-mini",
      "--cd",
      "/run/work",
      "--output-schema",
      "/run/schema.json",
      "-",
    ]);
  });

  test("denies every private path and requires the exact Kibi server", () => {
    // Given
    const paths = {
      workspace: "/run/work",
      runPrivateHome: "/run/home",
      realCodexHome: "/home/user/.codex",
      sourceWorktree: "/source",
      fixtureKb: "/run/work/.kb",
      privateScorer: "/run/scorer",
      privateEvidence: "/run/evidence",
      siblingRuns: "/run/sibling",
    } as const;

    // When
    const config = buildCodexConfig({
      role: "target",
      authMode: "file",
      paths,
      nodeCommand: "/bin/node",
      codexExecutable: "/opt/codex/bin/codex",
      kibiServer: "/source/packages/mcp/dist/server.js",
    });

    // Then
    expect(config).toContain('":root" = "deny"');
    expect(config).toContain('":tmpdir" = "deny"');
    expect(config).toContain('":slash_tmp" = "deny"');
    expect(config).toContain('"/usr/bin/bwrap" = "read"');
    expect(config).toContain('".kb" = "deny"');
    for (const deniedPath of [
      paths.runPrivateHome,
      paths.realCodexHome,
      paths.sourceWorktree,
      paths.fixtureKb,
      paths.privateScorer,
      paths.privateEvidence,
      paths.siblingRuns,
    ]) {
      expect(config).toContain(`${JSON.stringify(deniedPath)} = "deny"`);
    }
    expect(config).toContain(`${JSON.stringify(paths.workspace)} = true`);
    expect(config).toContain('command = "/bin/node"');
    expect(config).toContain('"/opt/codex/bin/codex" = "read"');
    expect(config).toContain('args = ["/source/packages/mcp/dist/server.js"]');
    expect(config).toContain("required = true");
    expect(config).toContain('default_tools_approval_mode = "auto"');
    expect(config).toContain("enabled = false");
    expect(config).toContain("allow_upstream_proxy = false");
    expect(config).toContain("allow_local_binding = false");
    expect(config).not.toContain("danger-full-access");
    expect(config).not.toContain("prompt");
  });
});
