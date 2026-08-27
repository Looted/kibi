/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { afterEach, describe, expect, mock, test } from "bun:test";

const setupDocsAndPrompts = mock((_server: unknown) => {});
const registerAllTools = mock((_server: unknown) => {});
const setupTransportHandlers = mock(
  (_server: unknown, _transport: unknown) => {},
);
const connectTransport = mock(
  async (_server: unknown, _transport: unknown) => {},
);
const realDocs = { ...(await import("../../src/server/docs.js")) };
const realTools = { ...(await import("../../src/server/tools.js")) };
const realTransport = { ...(await import("../../src/server/transport.js")) };

describe("server entrypoint", () => {
  afterEach(async () => {
    await mock.module("../../src/server/docs.js", () => realDocs);
    await mock.module("../../src/server/tools.js", () => realTools);
    await mock.module("../../src/server/transport.js", () => realTransport);
  });

  test("startServer wires docs, tools, and transport in order", async () => {
    await mock.module("../../src/server/docs.js", () => ({
      setupDocsAndPrompts,
    }));
    await mock.module("../../src/server/tools.js", () => ({
      registerAllTools,
    }));
    await mock.module("../../src/server/transport.js", () => ({
      setupTransportHandlers,
      connectTransport,
    }));

    const mod = (await import(
      `../../src/server.js?entry-${Date.now()}`
    )) as typeof import("../../src/server.js");

    await mod.startServer();

    expect(setupDocsAndPrompts).toHaveBeenCalledTimes(1);
    expect(registerAllTools).toHaveBeenCalledTimes(1);
    expect(setupTransportHandlers).toHaveBeenCalledTimes(1);
    expect(connectTransport).toHaveBeenCalledTimes(1);

    const serverArg = setupTransportHandlers.mock.calls[0][0];
    const registeredServer = registerAllTools.mock.calls[0][0];
    expect(registeredServer).toBe(serverArg);
    const transportedServer = connectTransport.mock.calls[0][0];
    expect(transportedServer).toBe(serverArg);
  });
});
