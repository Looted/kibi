import { expect, test } from "bun:test";

interface MockTreeItem {
  label: string;
  iconPath?: string;
  contextValue?: string;
  collapsibleState: number;
  children?: MockTreeItem[];
}

class MockTreeDataProvider {
  constructor(private workspaceRoot: string) {}

  async getChildren(element?: MockTreeItem): Promise<MockTreeItem[]> {
    if (!this.workspaceRoot) {
      return [];
    }

    if (element) {
      return element.children || [this.createPlaceholderItem()];
    }

    return this.getRootItems();
  }

  private getRootItems(): MockTreeItem[] {
    const entityTypes = [
      { name: "Requirements", icon: "list-ordered", count: 0 },
      { name: "Scenarios", icon: "file-text", count: 0 },
      { name: "Tests", icon: "check", count: 0 },
      { name: "ADRs", icon: "book", count: 0 },
      { name: "Flags", icon: "flag", count: 0 },
      { name: "Events", icon: "calendar", count: 0 },
      { name: "Symbols", icon: "symbol-class", count: 0 },
    ];

    return entityTypes.map((type) => ({
      label: `${type.name} (${type.count})`,
      iconPath: type.icon,
      contextValue: `kibi-${type.name.toLowerCase()}`,
      collapsibleState: 2,
      children: [this.createPlaceholderItem()],
    }));
  }

  private createPlaceholderItem(): MockTreeItem {
    return {
      label: "Click to load...",
      iconPath: "info",
      contextValue: "kibi-placeholder",
      collapsibleState: 0,
    };
  }
}

test("TreeDataProvider creates root items", async () => {
  const provider = new MockTreeDataProvider("/fake/workspace");
  const rootItems = await provider.getChildren();

  expect(rootItems).toHaveLength(7);
  expect(rootItems[0].label).toContain("Requirements");
  expect(rootItems[1].label).toContain("Scenarios");
  expect(rootItems[2].label).toContain("Tests");
  expect(rootItems[3].label).toContain("ADRs");
  expect(rootItems[4].label).toContain("Flags");
  expect(rootItems[5].label).toContain("Events");
  expect(rootItems[6].label).toContain("Symbols");
});

test("TreeDataProvider creates placeholder children", async () => {
  const provider = new MockTreeDataProvider("/fake/workspace");
  const rootItems = await provider.getChildren();
  const firstItem = rootItems[0];

  const children = await provider.getChildren(firstItem);
  expect(children).toHaveLength(1);
  expect(children[0].label).toBe("Click to load...");
  expect(children[0].contextValue).toBe("kibi-placeholder");
});

test("TreeDataProvider handles empty workspace", async () => {
  const provider = new MockTreeDataProvider("");
  const rootItems = await provider.getChildren();

  expect(rootItems).toHaveLength(0);
});
