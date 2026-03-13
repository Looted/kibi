export type Plugin = { name: string; setup?: () => void };

/* implements REQ-opencode-kibi-plugin-v1 */
export default function kibiOpencodePlugin(): Plugin {
  return {
    name: "kibi-opencode",
    setup: () => {
      // noop stub - real logic added in follow-up tasks
    },
  };
}

export { default as kibiOpencodePlugin } from "./index.js";
