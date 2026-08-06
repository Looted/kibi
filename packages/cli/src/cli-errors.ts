// implements REQ-kibi-operation-interface-parity
export class InputError extends Error {
  // implements REQ-kibi-operation-interface-parity
  readonly exitCode = 2;

  constructor(
    readonly code: string,
    readonly detail: string,
  ) {
    super(detail);
    this.name = "InputError";
  }
}

// implements REQ-kibi-operation-interface-parity
export class OperationError extends Error {
  // implements REQ-kibi-operation-interface-parity
  readonly exitCode = 1;

  constructor(
    readonly code: string,
    readonly detail: string,
  ) {
    super(detail);
    this.name = "OperationError";
  }
}
