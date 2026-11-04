// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, test } from "bun:test";
import * as jsonCommand from "../src/cli-json-command.js";
import { registerFoundationCommands } from "../src/cli-register-foundation.js";
import * as hooksInstall from "../src/commands/hooks-install.js";
import * as init from "../src/commands/init.js";
import * as migrate from "../src/commands/migrate.js";
import * as query from "../src/commands/query.js";
import * as search from "../src/commands/search.js";
import * as status from "../src/commands/status.js";
import * as sync from "../src/commands/sync.js";
import {
  goldenSurface,
  plainCalls,
  programWith,
  stubExports,
} from "./helpers/command-surface.js";

const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  process.exitCode = 0;
});

function stub(
  module: Record<string, unknown>,
  name: string,
  result: unknown = undefined,
) {
  const stubbed = stubExports(module, [name], result);
  restores.push(stubbed.restore);
  return stubbed.spies[name] as Parameters<typeof plainCalls>[0];
}

const run = (...args: string[]) =>
  programWith(registerFoundationCommands).parseAsync(args, { from: "user" });

describe("registerFoundationCommands", () => {
  test("registers the documented command surface", () => {
    const { actual, expected } = goldenSurface(
      "foundation",
      registerFoundationCommands,
    );
    expect(actual).toStrictEqual(expected);
  });

  test("init, migrate and sync pass their options and set the exit code", async () => {
    const initSpy = stub(init, "initCommand", { exitCode: 4 });
    await run("init", "--no-hooks", "--github");
    expect(plainCalls(initSpy)).toStrictEqual([
      [{ hooks: false, github: true }],
    ]);
    expect(process.exitCode).toBe(4);

    const migrateSpy = stub(migrate, "migrateCommand", { exitCode: 5 });
    await run(
      "migrate",
      "--approved-action",
      " one, ,two ",
      "--approved-action",
      "three",
    );
    expect(plainCalls(migrateSpy)).toStrictEqual([
      [{ format: "table", approvedAction: ["one", "two", "three"] }],
    ]);
    expect(process.exitCode).toBe(5);

    const syncSpy = stub(sync, "syncCommand", { exitCode: 6 });
    await run("sync", "--rebuild");
    expect(plainCalls(syncSpy)).toStrictEqual([[{ rebuild: true }]]);
    expect(process.exitCode).toBe(6);
  });

  test("hooks install passes its options and sets the exit code", async () => {
    const hooksSpy = stub(hooksInstall, "hooksInstallCommand", {
      exitCode: 3,
    });
    await run("hooks", "install", "--quiet");
    expect(plainCalls(hooksSpy)).toStrictEqual([[{ quiet: true }]]);
    expect(process.exitCode).toBe(3);
  });

  test("query runs the human path or the JSON route", async () => {
    const querySpy = stub(query, "queryCommand", { exitCode: 7 });
    const json = stub(jsonCommand, "runJsonInvocation");
    await run("query", "req", "--tag", "x");
    expect(process.exitCode).toBe(7);
    process.exitCode = 0;
    await run("kb-query", "req", "--input", "-");
    expect(process.exitCode).toBe(0);
    expect(plainCalls(querySpy)).toStrictEqual([
      ["req", { tag: "x", format: "json", limit: "100", offset: "0" }],
    ]);
    expect(plainCalls(json)).toStrictEqual([
      [
        {
          operationName: "kb_query",
          inputPath: "-",
          command: "<command query>",
          positionals: [{ name: "type", value: "req" }],
        },
      ],
    ]);
  });

  test("search and status run the human path or the JSON route", async () => {
    const searchSpy = stub(search, "searchCommand");
    const statusSpy = stub(status, "statusCommand");
    const json = stub(jsonCommand, "runJsonInvocation");
    await run("search", "auth");
    await run("search", "auth", "--input", "in.json");
    await run("status");
    await run("status", "--input", "-");
    expect(plainCalls(searchSpy)).toStrictEqual([
      ["auth", { format: "table", limit: "20", offset: "0" }],
    ]);
    expect(plainCalls(statusSpy)).toStrictEqual([[{ format: "table" }]]);
    expect(plainCalls(json)).toStrictEqual([
      [
        {
          operationName: "kb_search",
          inputPath: "in.json",
          command: "<command search>",
          positionals: [{ name: "query", value: "auth" }],
        },
      ],
      [
        {
          operationName: "kb_status",
          inputPath: "-",
          command: "<command status>",
        },
      ],
    ]);
  });
});
