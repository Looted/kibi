#!/usr/bin/env python3
"""Repackage the pinned upstream SWI-Prolog Windows installer as the
kibi-swipl-win32-x64 payload.

Unlike the POSIX bundles (built from source by swipl-spike.py), the win32
payload is the upstream NSIS installer, pinned by SHA-256 in
scripts/swipl-version.json under "prebuilt". The installer is extracted with
7-Zip, trimmed, audited (PE32+ machine field, DLL import closure), smoke-tested
relocated, and packed as a POSIX tar.gz with regular-file modes so the release
pipeline's checks behave the same as for the POSIX targets.

Native work (download, extract, audit, smoke) runs only on a clean
GitHub Actions windows runner. verify-config runs anywhere.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import platform
import re
import shutil
import struct
import subprocess
import sys
import tarfile
from pathlib import Path

# Reuse the spike pipeline's helpers (pins, download, version parsing).
_SPIKE_PATH = Path(__file__).with_name("swipl-spike.py")
_spec = importlib.util.spec_from_file_location("swipl_spike", _SPIKE_PATH)
spike = importlib.util.module_from_spec(_spec)
assert _spec.loader is not None
_spec.loader.exec_module(spike)

TARGET = "win32-x64"
BINARY_REL = "lib/swipl/bin/swipl.exe"
HOME_REL = "lib/swipl"
ARCHIVE_NAME = f"swipl-{{version}}-{TARGET}.tar.gz"
PE_MACHINE_AMD64 = 0x8664

# Windows system DLLs a bundled binary may import. Everything else must be a
# DLL shipped inside the payload's bin/ directory.
SYSTEM_DLLS = frozenset({
    "advapi32.dll", "bcrypt.dll", "cfgmgr32.dll", "crypt32.dll", "dnsapi.dll",
    "dwrite.dll", "gdi32.dll", "hid.dll", "imm32.dll", "iphlpapi.dll",
    "kernel32.dll", "msvcrt.dll", "mswsock.dll", "ole32.dll", "oleaut32.dll",
    "powrprof.dll", "psapi.dll", "rpcrt4.dll", "sechost.dll", "setupapi.dll",
    "shcore.dll", "shell32.dll", "ucrtbase.dll", "user32.dll", "userenv.dll",
    "usp10.dll", "version.dll", "winmm.dll", "winnlsres.dll", "ws2_32.dll",
    "wsock32.dll", "wtsapi32.dll",
})
SYSTEM_DLL_PREFIXES = ("api-ms-", "ext-ms-")

# Licence members inside the already-pinned dependency source archives. Each
# dependency lists candidate members because upstream renames the file between
# releases (pcre2 10.47 ships LICENCE.md, older releases LICENCE; zlib 1.3.2
# ships LICENSE, the repo also carries LICENSE.md); the first present wins.
DEP_LICENSE_MEMBERS = {
    "openssl": (("openssl-{version}/LICENSE.txt",), "openssl-LICENSE.txt"),
    "pcre2": (
        ("pcre2-{version}/LICENCE.md", "pcre2-{version}/LICENCE"),
        "pcre2-LICENCE.txt",
    ),
    "zlib": (("zlib-{version}/LICENSE", "zlib-{version}/LICENSE.md"), "zlib-LICENSE"),
}


def load_pins(manifest_path: Path) -> dict:
    manifest = json.loads(manifest_path.read_text())
    prebuilt = manifest.get("prebuilt", {}).get(TARGET)
    if not isinstance(prebuilt, dict):
        raise ValueError(f"SWI pin manifest lacks prebuilt.{TARGET}")
    validate_prebuilt(manifest, prebuilt)
    return manifest


def _check_sha256(value: object, label: str) -> str:
    if not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{64}", value):
        raise ValueError(f"Invalid SHA-256 pin for {label}")
    return value


def validate_prebuilt(manifest: dict, prebuilt: dict) -> None:
    installer = prebuilt.get("installer")
    if not isinstance(installer, dict):
        raise ValueError(f"prebuilt.{TARGET}.installer is missing")
    url = installer.get("url")
    if not isinstance(url, str) or not url.startswith("https://"):
        raise ValueError(f"prebuilt.{TARGET}.installer.url must be an https URL")
    _check_sha256(installer.get("sha256"), f"prebuilt.{TARGET}.installer")
    license_sources = prebuilt.get("licenseSources", {})
    if not isinstance(license_sources, dict):
        raise ValueError(f"prebuilt.{TARGET}.licenseSources must be an object")
    for name, entry in license_sources.items():
        if not isinstance(entry, dict):
            raise ValueError(f"prebuilt.{TARGET}.licenseSources.{name} must be an object")
        url = entry.get("url")
        if not isinstance(url, str) or not url.startswith("https://"):
            raise ValueError(f"prebuilt.{TARGET}.licenseSources.{name}.url must be an https URL")
        _check_sha256(entry.get("sha256"), f"prebuilt.{TARGET}.licenseSources.{name}")
        for key in ("member", "name"):
            if not isinstance(entry.get(key), str) or not entry[key]:
                raise ValueError(f"prebuilt.{TARGET}.licenseSources.{name}.{key} must be a non-empty string")
    trim = prebuilt.get("trim")
    if not isinstance(trim, dict):
        raise ValueError(f"prebuilt.{TARGET}.trim is missing")
    for key in ("dirs", "files"):
        entries = trim.get(key)
        if not isinstance(entries, list) or not all(isinstance(e, str) for e in entries):
            raise ValueError(f"prebuilt.{TARGET}.trim.{key} must be a list of relative paths")
        for entry in entries:
            if entry.startswith("/") or ".." in Path(entry).parts or entry == "":
                raise ValueError(f"unsafe trim path: {entry!r}")


def require_windows_actions_runner() -> None:
    if os.getenv("GITHUB_ACTIONS") != "true":
        raise ValueError("SWI win32 repackaging is allowed only in GitHub Actions")
    if sys.platform != "win32":
        raise ValueError(f"Runner is {sys.platform}, expected win32")
    if platform.machine() != "AMD64":
        raise ValueError(f"Runner machine is {platform.machine()}, expected AMD64")
    if shutil.which("swipl"):
        raise ValueError("A system swipl is already on PATH; a clean runner is required")


def find_7z() -> str:
    found = shutil.which("7z")
    if found:
        return found
    for candidate in (r"C:\Program Files\7-Zip\7z.exe", r"C:\Program Files (x86)\7-Zip\7z.exe"):
        if Path(candidate).is_file():
            return candidate
    raise ValueError("7z not found on PATH or in Program Files")


# --- PE parsing -----------------------------------------------------------

def pe_machine(data: bytes) -> int:
    if len(data) < 0x40 or data[:2] != b"MZ":
        raise ValueError("not a PE file (missing MZ)")
    e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
    if data[e_lfanew : e_lfanew + 4] != b"PE\0\0":
        raise ValueError("missing PE signature")
    return struct.unpack_from("<H", data, e_lfanew + 4)[0]


def _pe_sections(data: bytes) -> tuple[int, list[tuple[int, int, int, int]]]:
    e_lfanew = struct.unpack_from("<I", data, 0x3C)[0]
    num_sections = struct.unpack_from("<H", data, e_lfanew + 6)[0]
    opt_size = struct.unpack_from("<H", data, e_lfanew + 20)[0]
    opt = e_lfanew + 24
    magic = struct.unpack_from("<H", data, opt)[0]
    if magic == 0x20B:  # PE32+
        data_dir = opt + 112
    elif magic == 0x10B:  # PE32
        data_dir = opt + 96
    else:
        raise ValueError(f"unknown optional-header magic {magic:#x}")
    import_rva = struct.unpack_from("<I", data, data_dir + 8)[0]
    sections = []
    sec = opt + opt_size
    for _ in range(num_sections):
        vsize, vaddr, rawsize, rawptr = struct.unpack_from("<IIII", data, sec + 8)
        sections.append((vaddr, vsize, rawptr, rawsize))
        sec += 40
    return import_rva, sections


def _rva_to_offset(rva: int, sections: list[tuple[int, int, int, int]]) -> int | None:
    for vaddr, vsize, rawptr, rawsize in sections:
        if vaddr <= rva < vaddr + max(vsize, rawsize):
            return rawptr + (rva - vaddr)
    return None


def pe_imports(data: bytes) -> list[str]:
    import_rva, sections = _pe_sections(data)
    if import_rva == 0:
        return []
    off = _rva_to_offset(import_rva, sections)
    if off is None:
        raise ValueError("import table RVA is outside every section")
    names: list[str] = []
    while True:
        desc = data[off : off + 20]
        if len(desc) < 20:
            break
        name_rva = struct.unpack_from("<I", desc, 12)[0]
        if name_rva == 0:
            break
        name_off = _rva_to_offset(name_rva, sections)
        if name_off is None:
            raise ValueError("import name RVA is outside every section")
        end = data.index(b"\0", name_off)
        names.append(data[name_off:end].decode("ascii"))
        off += 20
    return names


def audit_payload(prefix: Path) -> list[str]:
    """Every .exe/.dll must be PE32+ x86-64 and import only payload DLLs or
    Windows system DLLs. Returns the list of problems (empty means clean)."""
    problems: list[str] = []
    bin_dir = prefix / "bin"
    bundled = {p.name.lower() for p in bin_dir.iterdir() if p.suffix.lower() == ".dll"}
    for pe_file in sorted(prefix.rglob("*")):
        if pe_file.suffix.lower() not in (".exe", ".dll") or not pe_file.is_file():
            continue
        data = pe_file.read_bytes()
        rel = pe_file.relative_to(prefix)
        try:
            machine = pe_machine(data)
        except ValueError as error:
            problems.append(f"{rel}: {error}")
            continue
        if machine != PE_MACHINE_AMD64:
            problems.append(f"{rel}: PE machine {machine:#x} is not x86-64")
            continue
        try:
            imports = pe_imports(data)
        except ValueError as error:
            problems.append(f"{rel}: {error}")
            continue
        for dll in imports:
            lower = dll.lower()
            if lower in bundled or lower in SYSTEM_DLLS or lower.startswith(SYSTEM_DLL_PREFIXES):
                continue
            problems.append(f"{rel}: imports {dll}, which is neither bundled nor a system DLL")
    return problems


def extract_installer(installer: Path, dest: Path) -> Path:
    seven = find_7z()
    subprocess.run([seven, "x", str(installer), f"-o{dest}", "-y"], check=True, capture_output=True)
    return dest


def apply_trim(root: Path, trim: dict) -> None:
    for entry in trim["dirs"]:
        target = root / entry
        if not target.is_dir():
            raise ValueError(f"trim dir does not exist (upstream layout changed?): {entry}")
        shutil.rmtree(target)
    for entry in trim["files"]:
        target = root / entry
        if not target.is_file():
            raise ValueError(f"trim file does not exist (upstream layout changed?): {entry}")
        target.unlink()


def collect_licenses(extracted: Path, manifest: dict, prebuilt: dict, work: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(extracted / "LICENSE", out_dir / "swi-prolog-LICENSE.txt")
    for dep, (member_tpls, out_name) in DEP_LICENSE_MEMBERS.items():
        entry = manifest["dependencies"][dep]
        archive = work / f"licenses-{dep}{Path(entry['url']).suffix}"
        spike.download_archive(entry["url"], archive, entry["sha256"])
        with tarfile.open(archive) as tar:
            names = set(tar.getnames())
            member = next(
                (
                    tpl.format(version=entry["version"])
                    for tpl in member_tpls
                    if tpl.format(version=entry["version"]) in names
                ),
                None,
            )
            if member is None:
                raise ValueError(
                    f"{archive.name} has none of the pinned license members "
                    f"{[tpl.format(version=entry['version']) for tpl in member_tpls]}"
                )
            extracted_file = tar.extractfile(member)
            if extracted_file is None:
                raise ValueError(f"{archive.name} has no member {member}")
            (out_dir / out_name).write_bytes(extracted_file.read())
    for name, entry in prebuilt["licenseSources"].items():
        archive = work / f"licenses-{name}{Path(entry['url']).suffix}"
        spike.download_archive(entry["url"], archive, entry["sha256"])
        with tarfile.open(archive) as tar:
            extracted_file = tar.extractfile(entry["member"])
            if extracted_file is None:
                raise ValueError(f"{archive.name} has no member {entry['member']}")
            (out_dir / entry["name"]).write_bytes(extracted_file.read())


def smoke_payload(prefix: Path, manifest: dict, work: Path, report: dict) -> None:
    binary = prefix / BINARY_REL
    home = prefix / HOME_REL
    if not binary.is_file() or not home.is_dir():
        raise ValueError(f"Incomplete win32 prefix: {binary} / {home}")
    env = dict(os.environ)
    env["SWI_HOME_DIR"] = str(home)
    version_output = spike.run(str(binary), "--version", env=env)
    version = re.match(r"SWI-Prolog version (\d+\.\d+\.\d+)", version_output)
    if not version or version.group(1) != manifest["version"]:
        raise ValueError(f"Relocated binary version differs from pin: {version_output}")
    report["checks"]["version"] = "passed"
    spike.checked(report, work, env,
        "gmp-bigint", str(binary), "--on-error=halt", "-q", "-g",
        "current_prolog_flag(bounded,false), X is 2**200, X > 10**60, halt(0)",
        "-t", "halt(1)")
    for name in spike.REQUIRED_LIBRARIES:
        spike.checked(report, work, env,
            f"library:{name}", str(binary), "--on-error=halt", "-q", "-g",
            f"use_module(library('{name}')), halt(0)", "-t", "halt(1)")


def build_manifest(extracted: Path, manifest: dict, prebuilt: dict) -> dict:
    # `extracted` is the SWI home (lib/swipl inside the package), so the binary
    # is at bin/swipl.exe relative to it; the manifest records the package-
    # relative BINARY_REL.
    binary = extracted / "bin" / "swipl.exe"
    if not binary.is_file() or binary.is_symlink():
        raise ValueError(f"Repacked prefix must contain a regular {BINARY_REL}")
    return {
        "schema": "kibi.swipl-build.v1",
        "target": TARGET,
        "swiplVersion": manifest["version"],
        "prebuilt": {"url": prebuilt["installer"]["url"], "sha256": prebuilt["installer"]["sha256"]},
        "sourceCommit": os.getenv("GITHUB_SHA"),
        "workflowRunId": os.getenv("GITHUB_RUN_ID"),
        "binary": {"path": BINARY_REL, "sha256": hashlib.sha256(binary.read_bytes()).hexdigest()},
        "home": HOME_REL,
        "requiredLibraries": list(spike.REQUIRED_LIBRARIES),
    }


def write_archive(prefix: Path, manifest: dict, work: Path) -> Path:
    archive = work / ARCHIVE_NAME.format(version=manifest["version"])
    with tarfile.open(archive, "w:gz") as tar:
        for path in sorted(prefix.rglob("*")):
            arcname = path.relative_to(prefix)
            if path.is_file():
                info = tar.gettarinfo(str(path), arcname=str(arcname))
                info.mode = 0o755 if path.suffix.lower() in (".exe", ".dll") else 0o644
                info.mtime = 0
                with path.open("rb") as fh:
                    tar.addfile(info, fh)
            elif path.is_dir():
                info = tar.gettarinfo(str(path), arcname=str(arcname))
                info.mode = 0o755
                info.mtime = 0
                tar.addfile(info)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    archive.with_name(archive.name + ".sha256").write_bytes(f"{digest}  {archive.name}\n".encode("ascii"))
    return archive


def cmd_build_archive(args: argparse.Namespace) -> None:
    if args.target != TARGET:
        raise ValueError(f"Unsupported repack target: {args.target} (only {TARGET})")
    require_windows_actions_runner()
    manifest = load_pins(Path(args.manifest))
    prebuilt = manifest["prebuilt"][TARGET]
    work = Path(args.workdir).resolve()
    work.mkdir(parents=True, exist_ok=True)
    report: dict = {"target": TARGET, "checks": {}}
    installer = work / Path(prebuilt["installer"]["url"]).name
    spike.download_archive(prebuilt["installer"]["url"], installer, prebuilt["installer"]["sha256"])
    extracted = extract_installer(installer, work / "extracted")
    apply_trim(extracted, prebuilt["trim"])
    prefix = work / "prefix"
    if prefix.exists():
        shutil.rmtree(prefix)
    (prefix / "lib").mkdir(parents=True)
    shutil.move(str(extracted), prefix / HOME_REL)
    collect_licenses(prefix / HOME_REL, manifest, prebuilt, work, prefix / "licenses")
    problems = audit_payload(prefix / HOME_REL)
    if problems:
        raise ValueError("PE audit failed:\n" + "\n".join(problems))
    report["checks"]["pe-audit"] = "passed"
    (prefix / "build-manifest.json").write_text(json.dumps(build_manifest(prefix / HOME_REL, manifest, prebuilt), indent=2) + "\n")
    # Smoke the relocated layout exactly as the package will sit on disk.
    smoke_payload(prefix, manifest, work, report)
    relocated = work / "relocated"
    if relocated.exists():
        shutil.rmtree(relocated)
    shutil.copytree(prefix, relocated, symlinks=False)
    smoke_payload(relocated, manifest, work, report)
    report["checks"]["relocated-smoke"] = "passed"
    archive = write_archive(prefix, manifest, work)
    report["archive"] = archive.name
    report["packedBytes"] = archive.stat().st_size
    (work / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def verify_archive_files(archive: Path, checksum: Path, manifest: dict) -> None:
    """Pure file checks (safe anywhere): name, sidecar format, archive hash."""
    expected_name = ARCHIVE_NAME.format(version=manifest["version"])
    if archive.name != expected_name:
        raise ValueError(f"Archive name does not match target/version: {archive.name}")
    declared = checksum.read_text(encoding="ascii")
    if not re.fullmatch(r"[0-9a-f]{64}  " + re.escape(expected_name) + r"\n?", declared):
        raise ValueError("Invalid archive SHA-256 sidecar")
    if hashlib.sha256(archive.read_bytes()).hexdigest() != declared[:64]:
        raise ValueError("Archive SHA-256 mismatch")


def cmd_smoke_archive(args: argparse.Namespace) -> None:
    if args.target != TARGET:
        raise ValueError(f"Unsupported repack target: {args.target} (only {TARGET})")
    manifest = load_pins(Path(args.manifest))
    verify_archive_files(Path(args.archive), Path(args.checksum), manifest)
    require_windows_actions_runner()
    work = Path(args.workdir).resolve()
    work.mkdir(parents=True, exist_ok=True)
    prefix = work / "prefix"
    with tarfile.open(args.archive) as tar:
        for member in tar.getmembers():
            if member.issym() or member.islnk() or not member.isfile() and not member.isdir():
                raise ValueError(f"archive member is not a regular file or directory: {member.name}")
            if member.name.startswith("/") or ".." in Path(member.name).parts:
                raise ValueError(f"unsafe archive member: {member.name}")
        tar.extractall(prefix, filter="data")
    problems = audit_payload(prefix / HOME_REL)
    if problems:
        raise ValueError("PE audit failed:\n" + "\n".join(problems))
    report: dict = {"target": TARGET, "checks": {"pe-audit": "passed"}}
    smoke_payload(prefix, manifest, work, report)
    report["checks"]["smoke"] = "passed"
    (work / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


def cmd_verify_config(args: argparse.Namespace) -> None:
    manifest = load_pins(Path(args.manifest))
    prebuilt = manifest["prebuilt"][TARGET]
    print(json.dumps({
        "target": TARGET,
        "version": manifest["version"],
        "installer": prebuilt["installer"]["url"],
        "trimDirs": len(prebuilt["trim"]["dirs"]),
        "trimFiles": len(prebuilt["trim"]["files"]),
        "requiredLibraries": list(spike.REQUIRED_LIBRARIES),
    }))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("verify-config", "build-archive", "smoke-archive"))
    parser.add_argument("--target", default=os.getenv("KIBI_SWIPL_REPACK_TARGET", TARGET))
    parser.add_argument("--manifest", default=os.getenv("KIBI_SWIPL_SPIKE_MANIFEST", str(Path(__file__).with_name("swipl-version.json"))))
    parser.add_argument("--workdir", default=None)
    parser.add_argument("--archive", default=None)
    parser.add_argument("--checksum", default=None)
    args = parser.parse_args()
    try:
        if args.command == "verify-config":
            cmd_verify_config(args)
        elif args.command == "build-archive":
            if not args.workdir:
                raise ValueError("build-archive needs --workdir")
            cmd_build_archive(args)
        else:
            if not (args.workdir and args.archive and args.checksum):
                raise ValueError("smoke-archive needs --workdir, --archive and --checksum")
            cmd_smoke_archive(args)
    except (ValueError, subprocess.CalledProcessError) as error:
        print(f"SWI win32 repack failed: {error}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
