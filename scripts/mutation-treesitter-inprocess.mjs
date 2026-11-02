// Mutation sandbox only: run kibi-plugin-treesitter's analysis worker in the
// test process. Stryker activates mutants and records coverage through a
// preload in the main thread, which worker threads never see, so every
// reader mutant would read as "no coverage". This rewrites the sandbox's
// dist so the pool's workers are in-process shims over one shared port.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.argv[2] ?? "packages/plugin-treesitter", "dist");
const patch = (file, from, to) => {
  const path = join(dist, file);
  const text = readFileSync(path, "utf8");
  if (!text.includes(from)) throw new Error(`${file}: missing ${from}`);
  writeFileSync(path, text.replace(from, to));
};

writeFileSync(
  join(dist, "in-process-worker.js"),
  `import { EventEmitter } from "node:events";
const routes = new Map();
let next = 0;
const port = new EventEmitter();
port.postMessage = (reply) => {
  const route = routes.get(reply.id);
  if (route === undefined) return;
  routes.delete(reply.id);
  queueMicrotask(() => route.worker.emit("message", { ...reply, id: route.id }));
};
globalThis.__kibiInProcessPort = port;
let loaded;
export class InProcessWorker extends EventEmitter {
  constructor(url) {
    super();
    loaded ??= import(url.href);
  }
  postMessage(message) {
    const uid = \`inproc-\${next++}\`;
    routes.set(uid, { worker: this, id: message.id });
    void loaded.then(() => port.emit("message", { ...message, id: uid }));
  }
  ref() {}
  unref() {}
  terminate() {
    queueMicrotask(() => this.emit("exit", 0));
    return Promise.resolve(0);
  }
}
`,
);
patch(
  "extractor.js",
  'import { Worker } from "node:worker_threads";',
  'import { InProcessWorker as Worker } from "./in-process-worker.js";',
);
patch(
  "analysis-worker.js",
  'import { parentPort } from "node:worker_threads";',
  "const parentPort = globalThis.__kibiInProcessPort;",
);
