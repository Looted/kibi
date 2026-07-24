import { type HostProbe, LAUNCHER } from "./preflight-contracts";
import type { CheckState, LoadedLocks } from "./preflight-host-model";

export function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function check(
  state: CheckState,
  name: string,
  valid: boolean,
  expected: unknown,
  observed: unknown,
): void {
  if (valid) state.passed.push(name);
  else state.reasons.push({ check: name, expected, observed });
}

export function evaluateHost(
  state: CheckState,
  locks: LoadedLocks,
  host: HostProbe,
): void {
  check(state, "platform", host.platform === "linux", "linux", host.platform);
  check(
    state,
    "launcher",
    locks.provider.launcher === LAUNCHER,
    LAUNCHER,
    locks.provider.launcher,
  );
  check(
    state,
    "service-identities",
    sameJson(host.identities, locks.provider.identities),
    locks.provider.identities,
    host.identities,
  );
  check(
    state,
    "systemd-socket-activation",
    host.systemdSocketActivation,
    true,
    host.systemdSocketActivation,
  );
  check(
    state,
    "peer-credentials",
    host.peerUidMatches,
    true,
    host.peerUidMatches,
  );
  check(state, "pidfd", host.pidfd, true, host.pidfd);
  check(
    state,
    "namespaces",
    Object.values(host.namespaces).every(Boolean),
    "all enabled",
    host.namespaces,
  );
  check(state, "yama", host.yamaPtraceScope === 3, 3, host.yamaPtraceScope);
  check(state, "dumpability", host.dumpable === false, false, host.dumpable);
  check(
    state,
    "proc-isolation",
    host.protectedProc && !host.procReadable,
    "protected and unreadable",
    { protected: host.protectedProc, readable: host.procReadable },
  );
  check(
    state,
    "service-key-isolation",
    !host.serviceKeysReadable,
    false,
    host.serviceKeysReadable,
  );
  check(
    state,
    "subordinate-uids",
    host.subordinateUids,
    true,
    host.subordinateUids,
  );
  check(
    state,
    "fd-inventory",
    sameJson(host.fdInventory, locks.provider.fdInventory),
    locks.provider.fdInventory,
    host.fdInventory,
  );
  check(
    state,
    "memfd-sealing",
    host.authorizationSealed && host.snapshotSealed,
    "authorization and snapshot sealed",
    { authorization: host.authorizationSealed, snapshot: host.snapshotSealed },
  );
  check(
    state,
    "pinned-ca",
    host.pinnedCaDigest === locks.verifier.pinnedCa.digest,
    locks.verifier.pinnedCa.digest,
    host.pinnedCaDigest,
  );
  check(
    state,
    "tool-digests",
    sameJson(host.toolDigests, locks.sandbox.tools),
    locks.sandbox.tools,
    host.toolDigests,
  );
  check(
    state,
    "privilege-drop",
    host.privilegeDropped,
    true,
    host.privilegeDropped,
  );
  check(state, "veth", host.veth, true, host.veth);
  check(
    state,
    "nft-default-drop",
    host.nftDefaultDrop,
    true,
    host.nftDefaultDrop,
  );
}
