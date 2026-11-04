export type FsOp = "mkdir" | "read" | "write" | "unlink" | "rmdir" | "rename";

export function errno(code: string): Error {
  return Object.assign(new Error(`${code} happened`), { code });
}

export type LockFileSystem = {
  mkdirSync: (
    target: string,
    options?: { readonly recursive?: boolean },
  ) => void;
  readFileSync: (target: string) => string;
  writeFileSync: (
    target: string,
    data: string,
    options: { readonly encoding: "utf8"; readonly flag: "wx" },
  ) => void;
  unlinkSync: (target: string) => void;
  rmdirSync: (target: string) => void;
  renameSync: (from: string, to: string) => void;
};

/**
 * An in-memory filesystem for the lock modules. `fail(op, path, ...errors)`
 * queues outcomes for the next matching calls: an error value is thrown; a
 * function runs first and its result, when defined, is thrown.
 */
export function memoryFs() {
  const dirs = new Set<string>();
  const files = new Map<string, string>();
  const failures: { op: FsOp; path: string; error: unknown }[] = [];
  const calls: string[] = [];
  const failing = (op: FsOp, target: string, label = target) => {
    calls.push(`${op} ${label}`);
    const index = failures.findIndex(
      (failure) => failure.op === op && failure.path === target,
    );
    if (index === -1) return;
    const { error } = failures.splice(index, 1)[0] as { error: unknown };
    const thrown = typeof error === "function" ? error() : error;
    if (thrown !== undefined) throw thrown;
  };
  const fileSystem: LockFileSystem = {
    mkdirSync: (target, options) => {
      failing("mkdir", target);
      if (options?.recursive === true) {
        calls.push("  recursive");
        dirs.add(target);
        return;
      }
      if (dirs.has(target) || files.has(target)) throw errno("EEXIST");
      dirs.add(target);
    },
    readFileSync: (target) => {
      failing("read", target);
      if (dirs.has(target)) throw errno("EISDIR");
      const content = files.get(target);
      if (content === undefined) throw errno("ENOENT");
      return content;
    },
    writeFileSync: (target, data, options) => {
      failing("write", target);
      calls.push(`  ${JSON.stringify(options)}`);
      if (options.flag === "wx" && files.has(target)) throw errno("EEXIST");
      files.set(target, data);
    },
    unlinkSync: (target) => {
      failing("unlink", target);
      if (!files.delete(target)) throw errno("ENOENT");
    },
    rmdirSync: (target) => {
      failing("rmdir", target);
      if (!dirs.delete(target)) throw errno("ENOENT");
    },
    renameSync: (from, to) => {
      failing("rename", from, `${from} -> ${to}`);
      if (!dirs.has(from)) throw errno("ENOENT");
      if (dirs.has(to)) throw errno("EEXIST");
      dirs.delete(from);
      dirs.add(to);
      for (const [file, content] of [...files]) {
        if (!file.startsWith(`${from}/`)) continue;
        files.delete(file);
        files.set(`${to}${file.slice(from.length)}`, content);
      }
    },
  };
  return {
    fileSystem,
    dirs,
    files,
    calls,
    fail: (op: FsOp, target: string, ...errors: unknown[]) => {
      for (const error of errors) failures.push({ op, path: target, error });
    },
  };
}

export type Memory = ReturnType<typeof memoryFs>;

export function record(pid: number, token = "other") {
  return JSON.stringify({ pid, token, acquiredAt: 1 });
}

/** A clock that only moves when the lock sleeps. */
export function sleepingClock() {
  let clock = 1000;
  const sleeps: number[] = [];
  return {
    sleeps,
    now: () => clock,
    sleep: async (ms: number) => {
      sleeps.push(ms);
      clock += 40;
    },
  };
}

/** What a call threw, as plain data; "ok" when it returned. */
export async function failure(run: () => unknown) {
  try {
    await run();
    return "ok";
  } catch (error) {
    const typed = error as Error & {
      code?: string;
      errors?: unknown[];
      retryable?: boolean;
    };
    return {
      name: typed.name,
      message: typed.message,
      ...(typed.code !== undefined ? { code: typed.code } : {}),
      ...(typed.retryable !== undefined ? { retryable: typed.retryable } : {}),
      ...(typed.errors !== undefined ? { errors: typed.errors } : {}),
    };
  }
}
