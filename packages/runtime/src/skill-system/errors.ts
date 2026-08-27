export class SkillNotFoundError extends Error {
  constructor(id: string) {
    super(`Skill not found: ${id}`);
    this.name = "SkillNotFoundError";
  }
}
export class SkillResourceNotFoundError extends Error {
  constructor(id: string, resourcePath: string) {
    super(`Skill resource not found: ${id}/${resourcePath}`);
    this.name = "SkillResourceNotFoundError";
  }
}
export class SkillResourceOutOfBoundsError extends Error {
  constructor(id: string, resourcePath: string) {
    super(`Skill resource escapes bundle root: ${id}/${resourcePath}`);
    this.name = "SkillResourceOutOfBoundsError";
  }
}
export class SkillValidationError extends Error {
  readonly field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "SkillValidationError";
    this.field = field;
  }
}
export class SkillOversizeError extends Error {
  readonly maxBytes: number;
  readonly actualBytes: number;
  constructor(pathLike: string, maxBytes: number, actualBytes: number) {
    super(
      `Skill file exceeds ${maxBytes} bytes: ${pathLike} (${actualBytes} bytes)`,
    );
    this.name = "SkillOversizeError";
    this.maxBytes = maxBytes;
    this.actualBytes = actualBytes;
  }
}
