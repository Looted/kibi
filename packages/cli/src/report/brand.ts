export const KIBI_BRAND = {
  carbon: "#1d1e23",
  deepCarbon: "#111318",
  panel: "#191c22",
  ice: "#a2d3f4",
  signal: "#3e8ed6",
  snow: "#f4f8fb",
  mist: "#aab8c2",
  rail: "#34434f",
  success: "#63c99a",
  warning: "#f2b84b",
  danger: "#f07178",
} as const;

const LOGO_BODY = `<path d="M59.404.549C67.203-.471 80.162.244 88.461.241L214.826.236c25.341.008 47.41-2.912 68.552 14.059 27.643 22.19 24.272 52.604 24.294 84.26l.018 64.193-.024 54.799c-.007 8.528-.012 17.016-.161 25.541-.615 35.135-23.842 61.426-59.175 65.042-7.642.798-22.16.371-30.477.363l-124.873.01c-25.407.012-47.147 3.039-68.583-13.469C-2.666 273.424.136 245.011.11 213.402L.086 154.306l.018-58.709C.113 81.49-.628 66.856 1.728 52.965 6.79 23.114 30.142 3.886 59.404.549Z" fill="${KIBI_BRAND.carbon}"/><circle cx="113.326" cy="150.863" r="51.425" fill="${KIBI_BRAND.ice}"/><path d="m228.053 197.783-.441-32.266-132.178-.235v-30.186l132.102-.007v-33.888h24.671l-.001 96.581" fill="${KIBI_BRAND.ice}"/>`;

const WORDMARK_BODY = `<circle cx="337.16" cy="31" r="20" fill="${KIBI_BRAND.signal}"/><path d="m381.865 49.212-.172-12.524-51.506-.091V24.88l51.476-.003V11.723h9.614v37.489" fill="${KIBI_BRAND.signal}"/><path d="M0 155.33V22.13h19.62v80.46h.9l63.9-40.14H46.8L88.56 155.33H64.98l-32.4-45.18-12.96 12.06v33.12H0Zm110.34 0v-15.84h21.68v-61.2h-31.68V62.45h51.3v77.04h19.7v15.84h-61Zm84.04 0V22.13H214l.08 47.87h1.08c6-5 5-4 9-6 4.972-2.487 12.16-3.71 19-3.71 10.92 0 19.62 4.08 26.1 12.24 6.48 8.16 9.72 20.28 9.72 36.36s-3.24 28.2-9.72 36.36c-6.48 8.16-15.18 12.24-26.1 12.24-6.84 0-15.233-.63-20-3.49-5-3-4-2-8-7h-1.08l-.08 8.33h-19.62Zm40.68-13.86c7.44 0 13.17-2.28 17.19-6.84 4.02-4.56 6.03-10.62 6.03-18.18v-15.12c0-7.56-2.01-13.62-6.03-18.18-4.02-4.56-9.75-6.84-17.19-6.84-2.88 0-5.58.36-8.1 1.08-2.52.72-4.74 1.8-6.66 3.24-1.92 1.44-3.45 3.21-4.59 5.31-1.14 2.1-1.71 4.59-1.71 7.47v30.96c0 2.88.57 5.37 1.71 7.47 1.14 2.1 2.67 3.87 4.59 5.31 1.92 1.44 4.14 2.52 6.66 3.24 2.52.72 5.22 1.08 8.1 1.08Zm71.28 13.86v-15.84h21.68v-61.2h-31.68V62.45h51.3v77.04h19.7v15.84h-61Z" fill="${KIBI_BRAND.ice}"/><circle cx="141.66" cy="31.5" r="12.5" fill="${KIBI_BRAND.ice}"/>`;

function xml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// implements REQ-kibi-branded-health-report
export function renderKibiLogo(className = ""): string {
  return `<svg${className ? ` class="${xml(className)}"` : ""} viewBox="0 0 308 309" role="img" aria-label="Kibi logo">${LOGO_BODY}</svg>`;
}

// implements REQ-kibi-branded-health-report
export function renderKibiWordmark(className = ""): string {
  return `<svg${className ? ` class="${xml(className)}"` : ""} viewBox="-2 10 395 148" role="img" aria-label="Kibi">${WORDMARK_BODY}</svg>`;
}

// implements REQ-kibi-branded-health-report
export function renderKibiBadge(message: string, statusColor: string): string {
  const label = `Kibi requirement health: ${message}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${xml(label)}" width="178" height="20" viewBox="0 0 178 20">
  <title>${xml(label)}</title>
  <defs><clipPath id="kibi-badge"><rect width="178" height="20" rx="4"/></clipPath></defs>
  <g clip-path="url(#kibi-badge)">
    <rect width="28" height="20" fill="${KIBI_BRAND.carbon}"/>
    <rect x="28" width="150" height="20" fill="${xml(statusColor)}"/>
    <path d="M28 0v20" stroke="${KIBI_BRAND.signal}" stroke-width="2"/>
  </g>
  <svg x="6" y="2" width="16" height="16" viewBox="0 0 308 309" aria-hidden="true">${LOGO_BODY}</svg>
  <text x="103" y="14" fill="${KIBI_BRAND.deepCarbon}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="10" font-weight="700">${xml(message)}</text>
</svg>`;
}
