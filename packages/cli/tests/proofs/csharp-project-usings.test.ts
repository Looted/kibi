// executable_for TEST-kibi-tree-sitter-references
import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { csharpProjectUsings } from "../../src/operations/proof/source-code-readers.js";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function project(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(tmpdir(), "kibi-cs-usings-"));
  roots.push(root);
  execFileSync("git", ["init", "-q"], { cwd: root });
  for (const [file, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  }
  execFileSync("git", ["add", "-A"], { cwd: root });
  return root;
}

describe("C# project-wide usings", () => {
  it("lists global usings from any file, <Using> items and the SDK's implicit usings", () => {
    const root = project({
      "src/GlobalUsings.cs":
        "global using System.Net.Http;\nglobal using static System.Math;\nglobal using J = global::System.Text.Json;\nusing Local.Only;\n",
      "src/App.csproj":
        '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><ImplicitUsings>enable</ImplicitUsings></PropertyGroup><ItemGroup><Using Include="Serilog" /></ItemGroup></Project>',
    });
    const usings = csharpProjectUsings(root);
    for (const name of [
      "System.Net.Http",
      "System.Math",
      "System.Text.Json",
      "Serilog",
      "System.Linq",
      "Microsoft.AspNetCore.Builder",
    ])
      expect(usings).toContain(name);
    expect(usings).not.toContain("Local.Only");
  });

  it("adds nothing for a project without global or implicit usings, or outside git", () => {
    const root = project({
      "a.cs": "using System;\nclass A {}\n",
      "a.csproj": '<Project Sdk="Microsoft.NET.Sdk"></Project>',
    });
    expect(csharpProjectUsings(root)).toEqual([]);
    const bare = fs.mkdtempSync(path.join(tmpdir(), "kibi-cs-nogit-"));
    roots.push(bare);
    expect(csharpProjectUsings(bare)).toEqual([]);
  });

  it("skips a tracked file that is gone from the work tree", () => {
    const root = project({
      "Gone.cs": "global using System.Net.Http;\n",
      "Kept.cs": "global using Serilog;\n",
    });
    fs.rmSync(path.join(root, "Gone.cs"));
    expect(csharpProjectUsings(root)).toEqual(["Serilog"]);
  });

  it("keeps the base SDK set without the web additions", () => {
    const root = project({
      "a.csproj":
        '<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><ImplicitUsings>true</ImplicitUsings></PropertyGroup></Project>',
    });
    const usings = csharpProjectUsings(root);
    expect(usings).toContain("System.Threading.Tasks");
    expect(usings).not.toContain("Microsoft.AspNetCore.Builder");
  });
});
