// implements REQ-opencode-kibi-plugin-v1
export type Cancel = () => void;

export function debounce(fn: () => void, ms = 2500): Cancel {
  let t: NodeJS.Timeout | null = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}
