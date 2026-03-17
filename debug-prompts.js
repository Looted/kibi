const { spawn } = require("child_process");
const path = require("path");

const serverPath = path.resolve(__dirname, "packages/mcp/bin/kibi-mcp");
const proc = spawn("bun", ["run", serverPath], {
  stdio: ["pipe", "pipe", "pipe"],
});

let responseData = "";
let errorData = "";

proc.stdout.on("data", (chunk) => {
  responseData += chunk.toString();
  console.log("STDOUT:", responseData);
});

proc.stderr.on("data", (chunk) => {
  errorData += chunk.toString();
  console.log("STDERR:", errorData);
});

proc.stdin.write(
  JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test", version: "1.0" },
    },
  }) + "\n",
);

setTimeout(() => {
  console.log("Sending prompts/list...");
  proc.stdin.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "prompts/list",
    }) + "\n",
  );
}, 500);

setTimeout(() => {
  console.log("Sending prompts/get...");
  proc.stdin.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "prompts/get",
      params: { name: "init-kibi" },
    }) + "\n",
  );
}, 1000);

setTimeout(() => {
  console.log("Full response data:", responseData);
  console.log("Full error data:", errorData);
  proc.kill();
}, 2000);
