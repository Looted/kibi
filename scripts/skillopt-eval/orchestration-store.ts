import {
  appendFile,
  mkdir,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";
import { JsonValueSchema, contractHash } from "./contracts/common";
import {
  LedgerEntrySchema,
  type RunState,
  RunStateSchema,
} from "./contracts/workflow";

// implements REQ-skillopt-codex-optimization
export class RunStore {
  private held = false;

  constructor(
    readonly root: string,
    readonly runId: string,
  ) {}

  async acquire(): Promise<void> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    try {
      const handle = await open(join(this.root, "run.lock"), "wx", 0o600);
      await handle.close();
      await writeFile(join(this.root, "run.lock"), `${process.pid}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
      this.held = true;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        throw new Error("run_already_locked");
      }
      throw error;
    }
  }

  async release(): Promise<void> {
    if (!this.held) return;
    this.held = false;
    await unlink(join(this.root, "run.lock")).catch(() => undefined);
  }

  async readState(): Promise<RunState | undefined> {
    try {
      return RunStateSchema.parse(
        JSON.parse(await readFile(join(this.root, "state.json"), "utf8")),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return undefined;
      }
      throw error;
    }
  }

  async writeState(state: RunState): Promise<void> {
    const parsed = RunStateSchema.parse(state);
    await this.atomicWrite("state.json", `${JSON.stringify(parsed)}\n`);
  }

  async appendLedger(input: {
    category: "development" | "bundle";
    episodeId: string;
    amount: number;
  }): Promise<string> {
    let previousEntryHash: string | null = null;
    let sequence = 0;
    try {
      const lines = (await readFile(join(this.root, "ledger.jsonl"), "utf8"))
        .split("\n")
        .filter(Boolean);
      const previous = lines.at(-1);
      if (previous !== undefined) {
        const parsed = LedgerEntrySchema.parse(JSON.parse(previous));
        sequence = parsed.sequence + 1;
        previousEntryHash = parsed.entryHash;
      }
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      ) {
        throw error;
      }
    }
    const body = {
      schemaVersion: "1.0.0" as const,
      artifactType: "ledger-entry" as const,
      runId: this.runId,
      sequence,
      previousEntryHash,
      occurredAt: new Date().toISOString(),
      episodeId: input.episodeId,
      category: input.category,
      model: "none" as const,
      usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 },
      priceEquivalentEstimate: {
        currency: "USD" as const,
        amount: input.amount,
        pricingHash: "0".repeat(64),
        kind: "price-equivalent-estimate-not-invoice" as const,
      },
    };
    const entry = LedgerEntrySchema.parse({
      ...body,
      entryHash: contractHash(JsonValueSchema.parse(body)),
    });
    await appendFile(
      join(this.root, "ledger.jsonl"),
      `${JSON.stringify(entry)}\n`,
      "utf8",
    );
    return entry.entryHash;
  }

  private async atomicWrite(name: string, content: string): Promise<void> {
    const temp = join(this.root, `.${name}.${process.pid}.tmp`);
    await writeFile(temp, content, { encoding: "utf8", mode: 0o600 });
    await rename(temp, join(this.root, name));
  }
}
