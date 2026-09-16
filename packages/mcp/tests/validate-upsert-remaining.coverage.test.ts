// implements REQ-002
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as runtime from "kibi-runtime";
import { handleKbValidateUpsert } from "../src/tools/validate-upsert.js";

const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  process.exitCode = 0;
});

describe("handleKbValidateUpsert remaining missing structured content", () => {
  test("throws when validateUpsert returns no structured content", async () => {
    spies.push(
      spyOn(runtime.validateUpsertSpec, "execute").mockResolvedValue({
        content: [],
      } as never),
    );
    await expect(
      handleKbValidateUpsert({
        type: "req",
        id: "REQ-1",
        properties: { title: "One", status: "open" },
      }),
    ).rejects.toThrow(/no structured content/);
  });
});
