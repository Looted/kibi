export const EXTERNAL_PROVISIONING_COMMAND =
  "sudo /usr/libexec/kibi-skillopt-installer install --bundle <signed-bundle> --version kibi-skillopt-trust-v1" as const;

export const EXTERNAL_TRUST_PATHS = [
  "/usr/libexec/kibi-skillopt-verifier-launch",
  "/etc/kibi-skillopt/verifier-bundle.lock",
  "/etc/kibi-skillopt/authorizations/predicate-roots.jcs",
] as const;

export type ExternalTrustProbe = Readonly<{
  isReadable(path: string): Promise<boolean>;
}>;

export type ExternalTrustReceipt = Readonly<{
  code: "EXTERNAL_PREREQUISITE_READY";
  launcher: (typeof EXTERNAL_TRUST_PATHS)[0];
  rootAuthorization: (typeof EXTERNAL_TRUST_PATHS)[2];
}>;

export class ExternalPrerequisiteMissingError extends Error {
  readonly name = "ExternalPrerequisiteMissingError";
  readonly code = "EXTERNAL_PREREQUISITE_MISSING" as const;
  readonly installerCommand = EXTERNAL_PROVISIONING_COMMAND;

  constructor(readonly missing: readonly string[]) {
    super(`${EXTERNAL_PROVISIONING_COMMAND}; missing=${missing.join(",")}`);
  }
}

export async function requireExternalTrustPlane(
  probe: ExternalTrustProbe,
): Promise<ExternalTrustReceipt> {
  const availability = await Promise.all(
    EXTERNAL_TRUST_PATHS.map(async (path) => ({
      path,
      readable: await probe.isReadable(path),
    })),
  );
  const missing = availability.flatMap(({ path, readable }) =>
    readable ? [] : [path],
  );
  if (missing.length > 0) throw new ExternalPrerequisiteMissingError(missing);
  return {
    code: "EXTERNAL_PREREQUISITE_READY",
    launcher: EXTERNAL_TRUST_PATHS[0],
    rootAuthorization: EXTERNAL_TRUST_PATHS[2],
  };
}
