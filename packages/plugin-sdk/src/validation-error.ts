/** The error every plugin-protocol validator throws, with a stable code. */
// implements REQ-capability-plugin-protocol-v1
export class PluginValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PluginValidationError";
    this.code = code;
  }
}
