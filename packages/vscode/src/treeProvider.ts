import * as vscode from "vscode";

export interface KibiTreeItem {
  label: string;
  iconPath?: string;
  contextValue?: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  children?: KibiTreeItem[];
}

export class KibiTreeDataProvider
  implements vscode.TreeDataProvider<KibiTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    KibiTreeItem | undefined | null
  > = new vscode.EventEmitter<KibiTreeItem | undefined | null>();
  readonly onDidChangeTreeData: vscode.Event<KibiTreeItem | undefined | null> =
    this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: KibiTreeItem): vscode.TreeItem {
    const treeItem = new vscode.TreeItem(
      element.label,
      element.collapsibleState,
    );

    if (element.iconPath) {
      treeItem.iconPath = new vscode.ThemeIcon(element.iconPath);
    }

    if (element.contextValue) {
      treeItem.contextValue = element.contextValue;
    }

    return treeItem;
  }

  getChildren(element?: KibiTreeItem): Promise<KibiTreeItem[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage("No workspace folder open");
      return Promise.resolve([]);
    }

    if (element) {
      return Promise.resolve(
        element.children || [this.createPlaceholderItem()],
      );
    }

    return Promise.resolve(this.getRootItems());
  }

  private getRootItems(): KibiTreeItem[] {
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
      collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
      children: [this.createPlaceholderItem()],
    }));
  }

  private createPlaceholderItem(): KibiTreeItem {
    return {
      label: "Click to load...",
      iconPath: "info",
      contextValue: "kibi-placeholder",
      collapsibleState: vscode.TreeItemCollapsibleState.None,
    };
  }
}
