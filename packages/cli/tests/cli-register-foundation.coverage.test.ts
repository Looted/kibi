// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import { Command } from "commander";
import { registerFoundationCommands } from "../src/cli-register-foundation.js";
import * as jsonCommand from "../src/cli-json-command.js";
import * as initCommand from "../src/commands/init.js";
import * as migrateCommand from "../src/commands/migrate.js";
import * as queryCommand from "../src/commands/query.js";
import * as searchCommand from "../src/commands/search.js";
import * as statusCommand from "../src/commands/status.js";
import * as syncCommand from "../src/commands/sync.js";

afterEach(() => {
  mock.restore();
  process.exitCode = 0;
});

describe("registerFoundationCommands action bodies", () => {
  test("invokes command implementations and JSON input routes", async () => {
    const init = spyOn(initCommand, "initCommand").mockResolvedValue({} as never);
    const migrate = spyOn(migrateCommand, "migrateCommand").mockResolvedValue(
      {} as never,
    );
    const sync = spyOn(syncCommand, "syncCommand").mockResolvedValue({} as never);
    const query = spyOn(queryCommand, "queryCommand").mockResolvedValue({} as never);
    const search = spyOn(searchCommand, "searchCommand").mockResolvedValue(
      undefined as never,
    );
    const status = spyOn(statusCommand, "statusCommand").mockResolvedValue(
      undefined as never,
    );
    const json = spyOn(jsonCommand, "runJsonInvocation").mockResolvedValue(
      undefined,
    );

    const program = new Command();
    program.exitOverride();
    registerFoundationCommands(program);

    await program.parseAsync(["init", "--no-hooks"], { from: "user" });
    expect(init).toHaveBeenCalled();

    await program.parseAsync(
      [
        "migrate",
        "--dry-run",
        "--approved-action",
        "one,two",
        "--approved-action",
        "three",
      ],
      { from: "user" },
    );
    expect(migrate).toHaveBeenCalled();
    const migrateOpts = migrate.mock.calls[0]?.[0] as { approvedAction?: string[] };
    expect(migrateOpts.approvedAction).toEqual(["one", "two", "three"]);

    await program.parseAsync(["sync", "--validate-only"], { from: "user" });
    expect(sync).toHaveBeenCalled();

    await program.parseAsync(["query", "req", "--limit", "5"], { from: "user" });
    expect(query).toHaveBeenCalled();

    await program.parseAsync(["query", "req", "--input", "-"], { from: "user" });
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ operationName: "kb_query", inputPath: "-" }),
    );

    await program.parseAsync(["search", "checkout"], { from: "user" });
    expect(search).toHaveBeenCalled();

    await program.parseAsync(["search", "checkout", "--input", "-"], {
      from: "user",
    });
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ operationName: "kb_search", inputPath: "-" }),
    );

    await program.parseAsync(["status"], { from: "user" });
    expect(status).toHaveBeenCalled();

    await program.parseAsync(["status", "--input", "-"], { from: "user" });
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ operationName: "kb_status", inputPath: "-" }),
    );
  });
});
