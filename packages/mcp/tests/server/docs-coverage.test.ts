/**
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, mock, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  DOC_RESOURCES,
  PROMPTS,
  setupDocsAndPrompts,
} from "../../src/server/docs.js";

describe("server docs coverage", () => {
  test("setupDocsAndPrompts registers all prompts from PROMPTS", () => {
    const promptCalls: unknown[] = [];
    const resourceCalls: unknown[] = [];

    const mockServer = {
      prompt: mock(
        (
          name: string,
          description: string,
          resolver: () => Promise<{ messages: unknown[] }>,
        ) => {
          promptCalls.push({ name, description, resolver });
        },
      ),
      resource: mock(
        (
          name: string,
          uri: string,
          opts: { description: string; mimeType: string },
          resolver: () => Promise<{ contents: unknown[] }>,
        ) => {
          resourceCalls.push({ name, uri, opts, resolver });
        },
      ),
    } as unknown as McpServer;

    setupDocsAndPrompts(mockServer);

    // Verify all prompts were registered
    expect(promptCalls.length).toBe(PROMPTS.length);

    for (const prompt of PROMPTS) {
      const call = promptCalls.find(
        (c) => (c as { name: string }).name === prompt.name,
      );
      expect(call).toBeDefined();
      expect((call as { description: string }).description).toBe(
        prompt.description,
      );
    }
  });

  test("setupDocsAndPrompts registers all resources from DOC_RESOURCES", () => {
    const resourceCalls: unknown[] = [];

    const mockServer = {
      prompt: mock(() => {}),
      resource: mock(
        (
          name: string,
          uri: string,
          opts: { description: string; mimeType: string },
          resolver: () => Promise<{ contents: unknown[] }>,
        ) => {
          resourceCalls.push({ name, uri, opts, resolver });
        },
      ),
    } as unknown as McpServer;

    setupDocsAndPrompts(mockServer);

    // Verify all resources were registered
    expect(resourceCalls.length).toBe(DOC_RESOURCES.length);

    for (const resource of DOC_RESOURCES) {
      const call = resourceCalls.find(
        (c) => (c as { uri: string }).uri === resource.uri,
      );
      expect(call).toBeDefined();
      expect((call as { name: string }).name).toBe(resource.name);
      expect(
        (call as { opts: { description: string; mimeType: string } }).opts
          .mimeType,
      ).toBe(resource.mimeType);
    }
  });

  test("setupDocsAndPrompts prompt resolver returns correct message shape", async () => {
    let capturedResolver: (() => Promise<{ messages: unknown[] }>) | undefined;

    const mockServer = {
      prompt: mock(
        (
          _name: string,
          _description: string,
          resolver: () => Promise<{ messages: unknown[] }>,
        ) => {
          capturedResolver = resolver;
        },
      ),
      resource: mock(() => {}),
    } as unknown as McpServer;

    setupDocsAndPrompts(mockServer);

    expect(capturedResolver).toBeDefined();
    if (!capturedResolver) {
      throw new Error("Expected prompt resolver to be captured");
    }
    const result = await capturedResolver();

    expect(result).toHaveProperty("messages");
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages.length).toBeGreaterThan(0);

    const firstMessage = result.messages[0] as {
      role: string;
      content: { type: string; text: string };
    };
    expect(firstMessage.role).toBe("user");
    expect(firstMessage.content).toHaveProperty("type");
    expect(firstMessage.content).toHaveProperty("text");
    expect(typeof firstMessage.content.text).toBe("string");
  });

  test("setupDocsAndPrompts resource resolver returns correct content shape", async () => {
    let capturedResolver: (() => Promise<{ contents: unknown[] }>) | undefined;

    const mockServer = {
      prompt: mock(() => {}),
      resource: mock(
        (
          _name: string,
          _uri: string,
          _opts: unknown,
          resolver: () => Promise<{ contents: unknown[] }>,
        ) => {
          capturedResolver = resolver;
        },
      ),
    } as unknown as McpServer;

    setupDocsAndPrompts(mockServer);

    expect(capturedResolver).toBeDefined();
    if (!capturedResolver) {
      throw new Error("Expected resource resolver to be captured");
    }
    const result = await capturedResolver();

    expect(result).toHaveProperty("contents");
    expect(Array.isArray(result.contents)).toBe(true);
    expect(result.contents.length).toBeGreaterThan(0);

    const firstContent = result.contents[0] as {
      uri: string;
      mimeType: string;
      text: string;
    };
    expect(typeof firstContent.uri).toBe("string");
    expect(typeof firstContent.mimeType).toBe("string");
    expect(typeof firstContent.text).toBe("string");
  });

  test("kibi://docs/tools resource includes skill tool references", async () => {
    const resourceResolvers: Array<{
      uri: string;
      resolver: () => Promise<{ contents: unknown[] }>;
    }> = [];

    const mockServer = {
      prompt: mock(() => {}),
      resource: mock(
        (
          _name: string,
          uri: string,
          _opts: unknown,
          resolver: () => Promise<{ contents: unknown[] }>,
        ) => {
          resourceResolvers.push({ uri, resolver });
        },
      ),
    } as unknown as McpServer;

    setupDocsAndPrompts(mockServer);

    const toolsResource = resourceResolvers.find(
      (r) => r.uri === "kibi://docs/tools",
    );
    expect(toolsResource).toBeDefined();

    if (!toolsResource) {
      throw new Error("Expected tools resource to be registered");
    }

    const result = await toolsResource.resolver();
    expect(result.contents.length).toBeGreaterThan(0);

    const text = String((result.contents[0] as { text: string }).text);
    expect(text).toContain("kb_skills_list");
    expect(text).toContain("kb_skills_load");
    expect(text).toContain("kb_skills_read");
  });

  test("setupDocsAndPrompts registers prompts before resources", () => {
    const callOrder: string[] = [];

    const mockServer = {
      prompt: mock((name: string) => {
        callOrder.push(`prompt:${name}`);
      }),
      resource: mock((name: string) => {
        callOrder.push(`resource:${name}`);
      }),
    } as unknown as McpServer;

    setupDocsAndPrompts(mockServer);

    // All prompts come before all resources (loop order)
    const promptIndices = callOrder
      .map((c, i) => (c.startsWith("prompt:") ? i : -1))
      .filter((i) => i >= 0);
    const resourceIndices = callOrder
      .map((c, i) => (c.startsWith("resource:") ? i : -1))
      .filter((i) => i >= 0);

    expect(promptIndices.length).toBe(PROMPTS.length);
    expect(resourceIndices.length).toBe(DOC_RESOURCES.length);

    const lastPromptIndex = Math.max(...promptIndices);
    const firstResourceIndex = Math.min(...resourceIndices);
    expect(lastPromptIndex).toBeLessThan(firstResourceIndex);
  });

  test("setupDocsAndPrompts with empty server does not throw", () => {
    const mockServer = {
      prompt: mock(() => {}),
      resource: mock(() => {}),
    } as unknown as McpServer;

    expect(() => setupDocsAndPrompts(mockServer)).not.toThrow();
  });

  test("PROMPTS has expected prompt names", () => {
    const expectedNames = [
      "init-kibi",
      "kibi_overview",
      "kibi_workflow",
      "kibi_constraints",
    ];
    const actualNames = PROMPTS.map((p) => p.name);
    expect(actualNames).toEqual(expectedNames);
    expect(actualNames).not.toContain("brief-kibi");
  });

  test("DOC_RESOURCES has expected resource URIs", () => {
    const expectedUris = [
      "kibi://docs/overview",
      "kibi://docs/tools",
      "kibi://docs/errors",
      "kibi://docs/examples",
    ];
    const actualUris = DOC_RESOURCES.map((r) => r.uri);
    expect(actualUris).toEqual(expectedUris);
  });

  test("DOC_RESOURCES all have required fields", () => {
    for (const resource of DOC_RESOURCES) {
      expect(typeof resource.uri).toBe("string");
      expect(typeof resource.name).toBe("string");
      expect(typeof resource.description).toBe("string");
      expect(resource.mimeType).toBe("text/markdown");
      expect(typeof resource.text).toBe("string");
    }
  });
});
