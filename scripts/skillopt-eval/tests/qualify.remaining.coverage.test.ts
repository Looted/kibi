// implements REQ-skillopt-cursor-compat
import { describe, expect, test } from "bun:test";
import { runCursorQualification } from "../cursor/qualify";

describe("runCursorQualification remaining auth parse and safeRun branches", () => {
  test("treats malformed status JSON as unauthenticated", async () => {
    const receipt = await runCursorQualification({
      cursorExecutable: "/bin/cursor-agent",
      cwd: process.cwd(),
      env: {},
      run: async ({ argv }) => {
        const command = argv.slice(1).join(" ");
        if (command === "--version") {
          return {
            argv,
            stdout: "2026.08.11-test\n",
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        }
        if (command.startsWith("status")) {
          return {
            argv,
            stdout: "{not-json",
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        }
        if (command === "models") {
          return {
            argv,
            stdout: "model-a\n",
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        }
        return {
          argv,
          stdout: "kibi: ready\n",
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      },
    });
    expect(receipt.reasons).toContain("cursor_not_authenticated");
    expect(
      receipt.checks.find((check) => check.name === "authenticated")?.status,
    ).toBe("no-go");
  });

  test("accepts nested account email without loggedIn flags", async () => {
    const receipt = await runCursorQualification({
      cursorExecutable: "/bin/cursor-agent",
      cwd: process.cwd(),
      env: {},
      run: async ({ argv }) => {
        const command = argv.slice(1).join(" ");
        if (command === "--version") {
          return {
            argv,
            stdout: "2026.08.11-test\n",
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        }
        if (command.startsWith("status")) {
          return {
            argv,
            stdout: JSON.stringify({
              account: { email: "operator@example.test" },
            }),
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        }
        if (command === "models") {
          return {
            argv,
            stdout: "model-a\n",
            stderr: "",
            exitCode: 0,
            signal: null,
          };
        }
        return {
          argv,
          stdout: "kibi: ready\n",
          stderr: "",
          exitCode: 0,
          signal: null,
        };
      },
    });
    expect(receipt.verdict).toBe("pass");
    expect(JSON.stringify(receipt)).not.toContain("operator@example.test");
  });

  test("maps thrown runner failures into a closed no-go check", async () => {
    const receipt = await runCursorQualification({
      cursorExecutable: "/bin/cursor-agent",
      cwd: process.cwd(),
      env: {},
      run: async ({ argv }) => {
        if (argv[1] === "--version") throw new Error("spawn exploded");
        throw "bare-failure";
      },
    });
    expect(receipt.verdict).toBe("no-go");
    expect(receipt.reasons).toEqual(
      expect.arrayContaining([
        "cursor_version_unavailable",
        "cursor_not_authenticated",
        "cursor_models_unavailable",
        "cursor_kibi_mcp_not_ready",
      ]),
    );
    expect(receipt.checks[0]?.detail).toBe("exit -1");
  });
});
