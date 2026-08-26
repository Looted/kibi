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

import type { Icon } from "@modelcontextprotocol/sdk/types.js";

const KIBI_LOGO_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 308 309"><rect width="308" height="309" rx="64" fill="#1D1E23"/><ellipse cx="113.3" cy="150.9" rx="51.3" ry="51.5" fill="#A2D3F4"/><path d="M228.1 197.8L227.6 165.5H156.5L95.4 165.3V135.1H156.5L227.5 135.1V101.2H252.2V197.8Z" fill="#A2D3F4"/></svg>`;

const KIBI_ICON_SRC = `data:image/svg+xml;base64,${Buffer.from(
  KIBI_LOGO_MARK_SVG,
  "utf8",
).toString("base64")}`;

export const KIBI_ICONS: Icon[] = [
  {
    src: KIBI_ICON_SRC,
    mimeType: "image/svg+xml",
    sizes: ["any"],
    theme: "dark",
  },
];
