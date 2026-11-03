import { describe, expect, test } from "bun:test";
import { notifyStartup } from "../src/startup-notifier";

describe("notifyStartup", () => {
  test("a rejected log write stays silent", async () => {
    const bodies: unknown[] = [];
    notifyStartup(
      {
        app: {
          log: async ({ body }: { body: unknown }) => {
            bodies.push(body);
            throw new Error("log down");
          },
        },
      } as never,
      { suppressToast: true },
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bodies).toEqual([
      {
        service: "kibi-opencode",
        level: "info",
        message: "kibi-opencode started",
      },
    ]);
  });
});
