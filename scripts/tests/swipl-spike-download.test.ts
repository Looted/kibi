import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const SPIKE = join(ROOT, "scripts", "swipl-spike.py");
const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true });
  }
});

// Serves `statuses` in order (then 200) from a local server and reports what
// download_archive did: the request count, the outcome, and leftover files.
function download(statuses: number[]) {
  const root = mkdtempSync(join(tmpdir(), "kibi-spike-download-"));
  fixtures.push(root);
  const program = `
import http.server, importlib.util, json, pathlib, sys, threading
sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location('spike', sys.argv[1])
spike = importlib.util.module_from_spec(spec)
spec.loader.exec_module(spike)
statuses = json.loads(sys.argv[3])
requests = []
class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        status = statuses[len(requests)] if len(requests) < len(statuses) else 200
        requests.append(status)
        body = b'archive-bytes' if status == 200 else b'error'
        self.send_response(status)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def log_message(self, *args):
        pass
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
archive = pathlib.Path(sys.argv[2]) / 'pkg-1.0.tar.gz'
outcome = 'ok'
try:
    spike.download_archive(f'http://127.0.0.1:{server.server_port}/pkg.tar.gz', archive, backoff=0)
except Exception as error:
    outcome = f'{type(error).__name__}:{getattr(error, "code", "")}'
server.shutdown()
print(json.dumps({
    'outcome': outcome,
    'requests': requests,
    'content': archive.read_text() if archive.exists() else None,
    'files': sorted(p.name for p in pathlib.Path(sys.argv[2]).iterdir()),
}))
`;
  const result = spawnSync(
    "python3",
    ["-c", program, SPIKE, root, JSON.stringify(statuses)],
    { encoding: "utf8" },
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "{}");
}

describe("swipl-spike source archive download", () => {
  test("retries transient server errors and keeps the completed archive", () => {
    const result = download([500, 503]);
    expect(result.outcome).toBe("ok");
    expect(result.requests).toEqual([500, 503, 200]);
    expect(result.content).toBe("archive-bytes");
    expect(result.files).toEqual(["pkg-1.0.tar.gz"]);
  });

  test("does not retry a client error", () => {
    const result = download([404]);
    expect(result.outcome).toBe("HTTPError:404");
    expect(result.requests).toEqual([404]);
    expect(result.files).toEqual([]);
  });

  test("gives up after the bounded attempts without leaving a partial file", () => {
    const result = download([500, 500, 500, 500, 500]);
    expect(result.outcome).toBe("HTTPError:500");
    expect(result.requests).toEqual([500, 500, 500, 500]);
    expect(result.files).toEqual([]);
  });
});
