import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const TARGETS = [
  "linux-x64-gnu",
  "linux-arm64-gnu",
  "darwin-arm64",
  "darwin-x64",
] as const;

// These controls exercise real archives and validation boundaries. The small
// binary headers and tool responses deliberately do not claim native execution.
const CONTROL = String.raw`
import hashlib, importlib.util, io, json, os, platform, struct, subprocess, sys, tarfile, tempfile
from pathlib import Path
from unittest import mock
sys.dont_write_bytecode = True
ROOT = Path(sys.argv[1])
action = sys.argv[2]
argument = sys.argv[3] if len(sys.argv) > 3 else ''
spec = importlib.util.spec_from_file_location('spike', ROOT / 'scripts/swipl-spike.py')
spike = importlib.util.module_from_spec(spec)
spec.loader.exec_module(spike)
manifest = json.loads((ROOT / 'scripts/swipl-version.json').read_text())
os.environ.update({'GITHUB_SHA': 'a' * 40, 'GITHUB_RUN_ID': '12345'})
sha = lambda data: hashlib.sha256(data).hexdigest()
targets = {
    'linux-x64-gnu': ('linux', 'x86_64', 'linux-x86_64', 62),
    'linux-arm64-gnu': ('linux', 'aarch64', 'linux-aarch64', 183),
    'darwin-arm64': ('darwin', 'arm64', 'darwin64-arm64-cc', 0x0100000c),
    'darwin-x64': ('darwin', 'x86_64', 'darwin64-x86_64-cc', 0x01000007),
}
# Physical library entries from the accepted, pinned SWI 10.0.2 archive.
library_paths = {
    'semweb/rdf_db': 'ext/semweb/semweb/rdf_db.pl',
    'semweb/rdf_persistency': 'ext/semweb/semweb/rdf_persistency.pl',
    'semweb/sparql_client': 'ext/semweb/semweb/sparql_client.pl',
    'pcre': 'ext/pcre/pcre.pl', 'crypto': 'ext/ssl/crypto.pl',
    'sha': 'ext/clib/sha.pl', 'http/json': 'ext/json/http/json.pl',
    'http/json_convert': 'ext/json/http/json_convert.pl', 'chr': 'ext/chr/chr.pl',
    'clpfd': 'clp/clpfd.pl', 'thread': 'thread.pl', 'persistency': 'persistency.pl',
    'filesex': 'ext/clib/filesex.pl', 'readutil': 'readutil.pl', 'date': 'date.pl',
    'aggregate': 'aggregate.pl', 'solution_sequences': 'solution_sequences.pl',
    'prolog_coverage': 'prolog_coverage.pl',
}
assert tuple(spike.REQUIRED_LIBRARIES) == tuple(library_paths)

def header(target):
    data = bytearray(256)
    if target.startswith('linux'):
        data[:7] = b'\x7fELF\x02\x01\x01'
        struct.pack_into('<HHI', data, 16, 3, targets[target][3], 1)
        struct.pack_into('<H', data, 52, 64)
    else:
        struct.pack_into('<IIIIIIII', data, 0, 0xfeedfacf, targets[target][3], 0, 2, 0, 0, 0, 0)
    return bytes(data)

def prefix_fixture(base, target):
    prefix = base / 'prefix'
    (prefix / 'bin').mkdir(parents=True)
    binary = prefix / 'bin/swipl'
    binary.write_bytes(header(target))
    binary.chmod(0o755)
    (prefix / 'lib/vendor').mkdir(parents=True)
    for name in spike.REQUIRED_LIBRARIES:
        file = prefix / 'lib/swipl/library' / library_paths[name]
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text('% synthetic library presence fixture\n')
    (prefix / 'lib/swipl/library/date-alias.pl').symlink_to('date.pl')
    (prefix / 'licenses').mkdir()
    for name in ('SWI-Prolog-LICENSE', 'OpenSSL-LICENSE.txt', 'PCRE2-COPYING', 'zlib-LICENSE'):
        (prefix / 'licenses' / name).write_text('Synthetic license presence fixture\n')
    return prefix

def archive_fixture(base, target):
    prefix = prefix_fixture(base, target)
    work = base / 'producer'
    work.mkdir()
    with mock.patch.dict(os.environ, {'GITHUB_SHA': 'a' * 40, 'GITHUB_RUN_ID': '12345'}):
        archive = spike.write_archive(prefix, manifest, target, work)
    return prefix, archive, archive.with_name(archive.name + '.sha256')

def rejected(operation, kind=ValueError):
    try:
        operation()
    except kind as error:
        assert str(error), 'validation failure needs an explanation'
        return
    raise AssertionError('invalid artifact or runtime was accepted')

def rewrite_archive(archive, checksum, edit):
    with tarfile.open(archive, 'r:gz') as source:
        entries = [(member, source.extractfile(member).read() if member.isfile() else None) for member in source.getmembers()]
    entries = edit(entries)
    with tarfile.open(archive, 'w:gz') as output:
        for member, body in entries:
            if body is not None:
                member.size = len(body)
            output.addfile(member, io.BytesIO(body) if body is not None else None)
    checksum.write_text(sha(archive.read_bytes()) + '  ' + archive.name + '\n')

def entry_name(member):
    return member.name.removeprefix('./')

with tempfile.TemporaryDirectory(prefix='kibi-swipl-pipeline-') as temporary:
    base = Path(temporary)
    if action == 'roundtrip':
        target = argument
        assert spike.TARGETS[target] == targets[target][:2]
        assert spike.OPENSSL_TARGETS[target] == targets[target][2]
        prefix, archive, checksum = archive_fixture(base, target)
        assert archive.name == 'swipl-' + manifest['version'] + '-' + target + '.tar.gz'
        assert checksum.read_text() == sha(archive.read_bytes()) + '  ' + archive.name + '\n'
        extracted = spike.verify_archive(archive, checksum, manifest, target, base / 'consumer')
        assert extracted.is_relative_to(base / 'consumer')
        assert (extracted / 'bin/swipl').read_bytes() == header(target)
        assert (extracted / 'bin/swipl').stat().st_mode & 0o111
        assert (extracted / 'lib/swipl/library/date-alias.pl').is_symlink()
        assert (extracted / 'lib/swipl/library/date-alias.pl').read_bytes() == (extracted / 'lib/swipl/library/date.pl').read_bytes()
        metadata = json.loads((extracted / 'build-manifest.json').read_text())
        assert metadata['schema'] == 'kibi.swipl-build.v1'
        assert metadata['target'] == target
        assert metadata['swiplVersion'] == manifest['version']
        assert metadata['sourceArchiveSha256'] == manifest['sha256']
        assert metadata['dependencies'] == manifest['dependencies']
        assert metadata['sourcePatches'] == manifest['patches']
        assert metadata['sourceCommit'] == 'a' * 40
        assert str(metadata['workflowRunId']) == '12345'
        assert metadata['binary'] == {'path': 'bin/swipl', 'sha256': sha(header(target))}
        assert metadata['home'] == 'lib/swipl'
        assert metadata['requiredLibraries'] == list(spike.REQUIRED_LIBRARIES)
        rejected(lambda: spike.verify_archive(archive, checksum, manifest, target, base / 'consumer'))

    elif action == 'mutation':
        prefix, archive, checksum = archive_fixture(base, 'linux-x64-gnu')
        if argument == 'archive-sha':
            archive.write_bytes(archive.read_bytes() + b'changed bytes')
        elif argument == 'checksum-name':
            checksum.write_text(sha(archive.read_bytes()) + '  different.tar.gz\n')
        elif argument == 'checksum-path':
            checksum.write_text(sha(archive.read_bytes()) + '  ../' + archive.name + '\n')
        else:
            def edit(entries):
                result = []
                for member, body in entries:
                    name = entry_name(member)
                    if argument == 'binary-sha' and name == 'bin/swipl':
                        body += b'changed executable'
                    elif name == 'build-manifest.json':
                        data = json.loads(body)
                        if argument == 'target': data['target'] = 'linux-arm64-gnu'
                        elif argument == 'version': data['swiplVersion'] = '9.0.0'
                        elif argument == 'source-pin': data['sourceArchiveSha256'] = '0' * 64
                        elif argument == 'dependency-pin': data['dependencies']['openssl']['sha256'] = '0' * 64
                        elif argument == 'patch-pin': data['sourcePatches'][0]['sha256'] = '0' * 64
                        elif argument == 'binary-path': data['binary']['path'] = '../outside'
                        elif argument == 'home': data['home'] = '../outside'
                        elif argument == 'schema': data['schema'] = 'unknown'
                        elif argument == 'source-commit': data['sourceCommit'] = 'b' * 40
                        elif argument == 'workflow-run': data['workflowRunId'] = '54321'
                        elif argument == 'reserved-checks': data['checks'] = {'native-audit': 'passed'}
                        elif argument == 'reserved-status': data['status'] = 'passed'
                        elif argument == 'reserved-role': data['role'] = 'consumer'
                        elif argument == 'binary-extra': data['binary']['status'] = 'passed'
                        body = json.dumps(data).encode()
                    result.append((member, body))
                return result
            rewrite_archive(archive, checksum, edit)
        work = base / 'consumer'
        rejected(lambda: spike.verify_archive(archive, checksum, manifest, 'linux-x64-gnu', work))
        assert not (work / 'extracted/bin/swipl').exists()

    elif action == 'inventory':
        prefix, archive, checksum = archive_fixture(base, 'linux-x64-gnu')
        outside = base / 'outside'
        outside.write_text('unchanged')
        def edit(entries):
            if argument == 'missing-binary': return [(m, b) for m, b in entries if entry_name(m) != 'bin/swipl']
            if argument == 'missing-home': return [(m, b) for m, b in entries if not entry_name(m).startswith('lib/swipl')]
            if argument == 'missing-library': return [(m, b) for m, b in entries if entry_name(m) != 'lib/swipl/library/' + library_paths['crypto']]
            if argument == 'misplaced-library':
                for member, body in entries:
                    if entry_name(member) == 'lib/swipl/library/' + library_paths['crypto']: member.name = 'lib/swipl/library/unused/crypto.pl'
                return entries
            if argument == 'missing-license': return [(m, b) for m, b in entries if entry_name(m) != 'licenses/SWI-Prolog-LICENSE']
            if argument == 'duplicate': return entries + [next((m, b) for m, b in entries if entry_name(m) == 'bin/swipl')]
            if argument == 'duplicate-root': return entries + [next((m, b) for m, b in entries if entry_name(m) == '.')]
            if argument == 'privileged-root':
                next(m for m, b in entries if entry_name(m) == '.').mode |= 0o4000
                return entries
            member = tarfile.TarInfo('lib/invalid')
            body = None
            if argument == 'traversal': member.name = '../outside'; body = b'changed'
            elif argument == 'absolute': member.name = str(outside); body = b'changed'
            elif argument == 'escaping-link': member.type = tarfile.SYMTYPE; member.linkname = '../../outside'
            elif argument == 'dangling-link': member.type = tarfile.SYMTYPE; member.linkname = 'missing'
            elif argument == 'escaping-hardlink': member.type = tarfile.LNKTYPE; member.linkname = '../../outside'
            elif argument == 'fifo': member.type = tarfile.FIFOTYPE
            else: raise AssertionError(argument)
            return entries + [(member, body)]
        rewrite_archive(archive, checksum, edit)
        rejected(lambda: spike.verify_archive(archive, checksum, manifest, 'linux-x64-gnu', base / 'consumer'))
        assert outside.read_text() == 'unchanged'

    elif action == 'clean':
        target = argument if argument in targets else 'linux-x64-gnu'
        system, machine = targets[target][:2]
        actual_system = 'darwin' if system == 'darwin' else 'linux'
        with mock.patch.object(spike.sys, 'platform', actual_system), mock.patch.object(spike.platform, 'machine', return_value=machine), mock.patch.object(spike.shutil, 'which', return_value=None), mock.patch.dict(os.environ, {'GITHUB_ACTIONS': 'true'}):
            if argument in targets:
                spike.require_clean_runner(target)
                spike.require_clean_runner(target, native_build=True)
            elif argument == 'preinstalled':
                with mock.patch.object(spike.shutil, 'which', return_value='/usr/bin/swipl'):
                    rejected(lambda: spike.require_clean_runner(target))
            elif argument == 'wrong-cpu':
                with mock.patch.object(spike.platform, 'machine', return_value='aarch64'):
                    rejected(lambda: spike.require_clean_runner(target))
            elif argument == 'wrong-os':
                with mock.patch.object(spike.sys, 'platform', 'darwin'):
                    rejected(lambda: spike.require_clean_runner(target))
            elif argument == 'local-build':
                with mock.patch.dict(os.environ, {'GITHUB_ACTIONS': 'false'}):
                    rejected(lambda: spike.require_clean_runner(target, native_build=True))
        assert list(base.iterdir()) == []

    elif action == 'smoke':
        prefix = prefix_fixture(base, 'linux-x64-gnu')
        work = base / 'smoke'
        work.mkdir()
        report = {'checks': {}}
        calls = []
        def run(*command, cwd=None, env=None, capture=True):
            calls.append((command, dict(env or {})))
            assert command[0] == str(prefix / 'bin/swipl')
            assert env['SWI_HOME_DIR'] == str(prefix / 'lib/swipl')
            assert all(not key.startswith(('LD_', 'DYLD_')) for key in env)
            if '--version' in command: return 'SWI-Prolog version ' + manifest['version'] + ('0' if argument == 'near-version' else '')
            if argument == 'failure' and any("use_module(library('crypto'))" in part for part in command):
                raise subprocess.CalledProcessError(7, command)
            return ''
        polluted = {'LD_LIBRARY_PATH': '/outside', 'LD_PRELOAD': '/outside', 'DYLD_LIBRARY_PATH': '/outside', 'DYLD_FALLBACK_LIBRARY_PATH': '/outside', 'DYLD_INSERT_LIBRARIES': '/outside', 'SWI_HOME_DIR': '/outside'}
        with mock.patch.dict(os.environ, polluted), mock.patch.object(spike, 'run', side_effect=run):
            if argument == 'near-version':
                rejected(lambda: spike.smoke(prefix, manifest, 'linux-x64-gnu', work, report))
                assert report['checks']['version'] == 'failed'
                assert len(calls) == 1
            elif argument == 'failure':
                rejected(lambda: spike.smoke(prefix, manifest, 'linux-x64-gnu', work, report), subprocess.CalledProcessError)
                assert report['checks']['library:crypto'] == 'failed'
                assert json.loads((work / 'report.json').read_text())['checks']['library:crypto'] == 'failed'
                assert not any("use_module(library('sha'))" in part for command, env in calls for part in command)
            else:
                env = spike.smoke(prefix, manifest, 'linux-x64-gnu', work, report)
                assert env['SWI_HOME_DIR'] == str(prefix / 'lib/swipl')
                goals = [part for command, env in calls for part in command]
                for name in spike.REQUIRED_LIBRARIES:
                    assert any("use_module(library('" + name + "'))" in part for part in goals), name
                assert any('current_prolog_flag(bounded,false)' in part and 'gmp_version' in part for part in goals)
                assert any('1600000000.125' in part and '1600000000.875' in part for part in goals)
                expected = {'version', 'libbf-bigint', 'file-mtime-subsecond'} | {'library:' + name for name in spike.REQUIRED_LIBRARIES}
                assert set(report['checks']) == expected
                assert all(value == 'passed' for value in report['checks'].values())

    elif action == 'audit':
        target, condition = argument.split('|')
        prefix = prefix_fixture(base, target)
        binary = prefix / 'bin/swipl'
        vendor = prefix / 'lib/vendor' / ('libcrypto.so.3' if target.startswith('linux') else 'libcrypto.3.dylib')
        vendor.write_bytes(header(target))
        if condition == 'wrong-architecture':
            other = next(name for name, details in targets.items() if name != target and details[0] == targets[target][0])
            binary.write_bytes(header(other))
        if condition == 'foreign-format':
            foreign = prefix / 'lib/vendor/foreign-library'
            foreign.write_bytes(header('darwin-x64' if target.startswith('linux') else 'linux-x64-gnu'))
        calls = []
        def run(*command, cwd=None, env=None, capture=True):
            calls.append(command)
            if command[0] == 'readelf':
                if command[1] == '--version-info':
                    return 'GLIBC_2.29' if condition == 'new-glibc' else 'GLIBC_2.28'
                assert command[1] == '-d', command
                path = Path(command[-1])
                runpath = '$ORIGIN/' + os.path.relpath(prefix / 'lib/vendor', path.parent)
                if condition == 'absolute-runpath': runpath = '/outside'
                if condition == 'escaping-runpath': runpath = '$ORIGIN/../../outside'
                needed = 'libgmp.so.10' if condition == 'forbidden-direct' else 'libcrypto.so.3'
                if condition == 'wrong-loader': needed = 'ld-linux-aarch64.so.1' if target == 'linux-x64-gnu' else 'ld-linux-x86-64.so.2'
                return '(NEEDED) Shared library: [' + needed + ']\n' + ('' if condition == 'missing-runpath' else '(RUNPATH) Library runpath: [' + runpath + ']')
            if command[0] == 'ldd':
                assert env is not None and 'LD_LIBRARY_PATH' not in env
                if condition == 'unresolved': return 'libcrypto.so.3 => not found'
                loader = 'ld-linux-x86-64.so.2' if target == 'linux-x64-gnu' else 'ld-linux-aarch64.so.1'
                location = '/outside/libcrypto.so.3' if condition == 'escaped-vendor' else str(vendor)
                result = 'linux-vdso.so.1 (0x123)\nlibcrypto.so.3 => ' + location + ' (0x123)\nlibc.so.6 => /lib/libc.so.6 (0x123)\n/lib/' + loader + ' (0x123)'
                if condition == 'forbidden-transitive': result += '\nlibgmp.so.10 => /outside/libgmp.so.10 (0x123)'
                return result
            if command[0] == 'otool':
                path = Path(command[-1])
                if command[1] == '-l':
                    if condition == 'missing-minimum': return 'cmd LC_SEGMENT_64'
                    version = '12.1' if condition == 'new-minimum' else '12.0'
                    return 'cmd LC_BUILD_VERSION\nplatform 1\nminos ' + version + '\nsdk 15.0'
                assert command[1] == '-L', command
                dependency = '@loader_path/' + os.path.relpath(vendor, path.parent)
                if condition == 'brew-dependency': dependency = '/opt/homebrew/lib/libcrypto.3.dylib'
                if condition == 'escaping-loader': dependency = '@loader_path/../../outside'
                return str(path) + ':\n\t' + dependency + ' (compatibility version 1.0.0, current version 1.0.0)\n\t/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1.0.0)'
            assert command[:3] == ('codesign', '--verify', '--strict'), command
            if condition == 'invalid-signature': raise subprocess.CalledProcessError(1, command)
            return ''
        files = spike.native_files(prefix, target)
        assert binary in files and vendor in files
        if condition == 'foreign-format': assert foreign in files
        audit = lambda: spike.audit_linux(files, prefix, target) if target.startswith('linux') else spike.audit_macos(files, prefix, target)
        with mock.patch.dict(os.environ, {'LD_LIBRARY_PATH': '/outside'}), mock.patch.object(spike, 'run', side_effect=run):
            if condition == 'success':
                audit()
                if target.startswith('darwin'):
                    assert sum(command[0] == 'codesign' for command in calls) == len(files)
                else:
                    assert sum(command[0] == 'ldd' for command in calls) == len(files)
            else:
                rejected(audit, subprocess.CalledProcessError if condition == 'invalid-signature' else ValueError)
                if condition == 'wrong-architecture': assert calls == []

    elif action == 'boundary':
        system = 'darwin' if sys.platform == 'darwin' else 'linux'
        target = next(name for name, details in targets.items() if details[:2] == (system, platform.machine()))
        prefix, archive, checksum = archive_fixture(base, target)
        tools = base / 'tools'
        tools.mkdir()
        (tools / 'python3').symlink_to(sys.executable)
        (tools / 'dirname').symlink_to('/usr/bin/dirname')
        env = dict(os.environ, PATH=str(tools), GITHUB_ACTIONS='false', PYTHONDONTWRITEBYTECODE='1')
        work = base / 'consumer'
        if argument == 'local-build':
            argv = ['build-archive', '--target', target, '--workdir', str(work)]
        else:
            archive.write_bytes(archive.read_bytes() + b'corrupt')
            argv = ['smoke-archive', '--target', target, '--archive', str(archive), '--checksum', str(checksum), '--workdir', str(work)]
        result = subprocess.run(['/bin/bash', str(ROOT / 'scripts/swipl-spike.sh'), *argv], env=env, capture_output=True, text=True, timeout=5)
        assert result.returncode == 1, (result.returncode, result.stdout, result.stderr)
        assert 'SWI spike failed:' in result.stderr
        assert ('GitHub Actions' in result.stderr if argument == 'local-build' else 'SHA-256' in result.stderr or 'checksum' in result.stderr)
        if argument == 'local-build':
            assert not work.exists()
        else:
            assert not (work / 'extracted').exists()
            assert sorted(path.name for path in work.iterdir()) == ['report.json']
            failure = json.loads((work / 'report.json').read_text())
            assert failure['status'] == 'failed'
            assert failure['checks'] == {'artifact-validation': 'failed'}
    else:
        raise AssertionError(action)
print('control passed: ' + action + '/' + argument)
`;

function control(action: string, argument: string) {
  return spawnSync("python3", ["-c", CONTROL, ROOT, action, argument], {
    encoding: "utf8",
    timeout: 10_000,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          ([, value]) => typeof value === "string",
        ),
      ),
      PYTHONDONTWRITEBYTECODE: "1",
    },
  });
}

function expectControl(action: string, argument: string) {
  const result = control(action, argument);
  expect(result.stderr).toBe("");
  expect(result.status).toBe(0);
  expect(result.stdout).toContain(`control passed: ${action}/${argument}`);
}

describe("SWI build pipeline artifact boundaries", () => {
  test.each(TARGETS)("round-trips the pinned archive for %s", (target) => {
    expectControl("roundtrip", target);
  });

  test.each([
    "archive-sha",
    "checksum-name",
    "checksum-path",
    "binary-sha",
    "target",
    "version",
    "source-pin",
    "dependency-pin",
    "patch-pin",
    "binary-path",
    "home",
    "schema",
    "source-commit",
    "workflow-run",
    "reserved-checks",
    "reserved-status",
    "reserved-role",
    "binary-extra",
  ])("refuses %s corruption before payload execution", (mutation) => {
    expectControl("mutation", mutation);
  });

  test.each([
    "traversal",
    "absolute",
    "escaping-link",
    "dangling-link",
    "escaping-hardlink",
    "fifo",
    "duplicate",
    "duplicate-root",
    "privileged-root",
    "missing-binary",
    "missing-home",
    "missing-library",
    "misplaced-library",
    "missing-license",
  ])("refuses unsafe or incomplete inventory: %s", (inventory) => {
    expectControl("inventory", inventory);
  });

  test.each([
    ...TARGETS,
    "preinstalled",
    "wrong-cpu",
    "wrong-os",
    "local-build",
  ])("enforces the clean-runner contract: %s", (condition) => {
    expectControl("clean", condition);
  });

  test.each(["success", "failure", "near-version"])(
    "uses isolated absolute smoke execution and preserves %s",
    (outcome) => {
      expectControl("smoke", outcome);
    },
  );

  test.each(["local-build", "corrupt-checksum"])(
    "public wrapper refuses %s without building or extracting payloads",
    (condition) => {
      expectControl("boundary", condition);
    },
  );

  test.each(TARGETS)("audits every native file for %s", (target) => {
    expectControl("audit", `${target}|success`);
    expectControl("audit", `${target}|wrong-architecture`);
    expectControl("audit", `${target}|foreign-format`);
  });

  test.each([
    "new-glibc",
    "forbidden-direct",
    "forbidden-transitive",
    "wrong-loader",
    "missing-runpath",
    "absolute-runpath",
    "escaping-runpath",
    "escaped-vendor",
    "unresolved",
  ])("refuses the Linux audit violation: %s", (condition) => {
    expectControl("audit", `linux-x64-gnu|${condition}`);
  });

  test.each([
    "missing-minimum",
    "new-minimum",
    "brew-dependency",
    "escaping-loader",
    "invalid-signature",
  ])("refuses the macOS audit violation: %s", (condition) => {
    expectControl("audit", `darwin-arm64|${condition}`);
  });
});

type WorkflowStep = {
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, string>;
};
type WorkflowJob = {
  needs?: string | string[];
  "runs-on": string;
  container?: string;
  strategy: { matrix: { include: Array<Record<string, string>> } };
  steps: WorkflowStep[];
};
type PipelineWorkflow = {
  on: { push: { paths: string[] }; workflow_dispatch?: unknown };
  jobs: Record<string, WorkflowJob>;
};

function pipelineWorkflow() {
  return Bun.YAML.parse(
    readFileSync(join(ROOT, ".github/workflows/swipl-build.yml"), "utf8"),
  ) as PipelineWorkflow;
}

function matrixValue(template: string, row: Record<string, string>) {
  return template.replace(/\$\{\{\s*matrix\.(\w+)\s*\}\}/g, (_match, key) => {
    const value = row[key];
    expect(value).toBeDefined();
    return value ?? "";
  });
}

function pipelineJobs(workflow: PipelineWorkflow, command: string) {
  return Object.entries(workflow.jobs).filter(([, job]) =>
    job.steps.some((step) => step.run?.includes(` ${command} `)),
  );
}

describe("SWI build pipeline workflow contract", () => {
  test("builds and independently consumes exactly the four launch targets", () => {
    const workflow = pipelineWorkflow();
    for (const command of ["build-archive", "smoke-archive"]) {
      const jobs = pipelineJobs(workflow, command);
      const rows = jobs.flatMap(([, job]) => job.strategy.matrix.include);
      expect(rows.map((row) => row.target).sort()).toEqual([...TARGETS].sort());
      for (const [, job] of jobs) {
        for (const row of job.strategy.matrix.include) {
          const runner = matrixValue(job["runs-on"], row);
          if (row.target === "linux-x64-gnu") {
            expect(runner).toBe("ubuntu-24.04");
            expect(matrixValue(job.container ?? "", row)).toBe(
              "quay.io/pypa/manylinux_2_28_x86_64",
            );
          }
          if (row.target === "linux-arm64-gnu") {
            expect(runner).toBe("ubuntu-24.04-arm");
            expect(row.image).toBe("quay.io/pypa/manylinux_2_28_aarch64");
            expect(matrixValue(job.container ?? "", row)).toBe(row.image);
          }
          if (row.target === "darwin-x64")
            expect(runner).toBe("macos-15-intel");
          if (row.target === "darwin-arm64") expect(runner).toBe("macos-15");
        }
      }
    }
  });

  test("runs for pin, recipe, patch, workflow changes and manual dispatch", () => {
    const workflow = pipelineWorkflow();
    expect(Object.hasOwn(workflow.on, "workflow_dispatch")).toBe(true);
    for (const path of [
      ".github/workflows/swipl-build.yml",
      "scripts/swipl-version.json",
      "scripts/swipl-spike.py",
      "scripts/swipl-spike.sh",
      "scripts/patches/swipl-10.0.2-darwin-mtime.patch",
    ]) {
      expect(
        workflow.on.push.paths.some((pattern) =>
          new Bun.Glob(pattern).match(path),
        ),
      ).toBe(true);
    }
  });

  test("downloads each target's producer archive on a separate clean job", () => {
    const workflow = pipelineWorkflow();
    const artifacts = new Map<
      string,
      { job: string; runner: string; name: string }
    >();
    for (const [id, job] of pipelineJobs(workflow, "build-archive")) {
      const upload = job.steps.find(
        (step) =>
          step.uses?.startsWith("actions/upload-artifact@") &&
          step.with?.path.includes(".tar.gz"),
      );
      expect(upload?.with?.path).toContain(".tar.gz");
      expect(upload?.with?.path).toContain(".sha256");
      expect(upload?.if).not.toBe("always()");
      for (const row of job.strategy.matrix.include) {
        expect(matrixValue(upload?.with?.name ?? "", row)).toBe(
          `swipl-${row.target}`,
        );
        artifacts.set(row.target ?? "", {
          job: id,
          runner: matrixValue(job["runs-on"], row),
          name: matrixValue(upload?.with?.name ?? "", row),
        });
      }
    }
    for (const [id, job] of pipelineJobs(workflow, "smoke-archive")) {
      const downloadIndex = job.steps.findIndex((step) =>
        step.uses?.startsWith("actions/download-artifact@"),
      );
      expect(downloadIndex).toBeGreaterThan(0);
      expect(
        job.steps
          .slice(0, downloadIndex)
          .some((step) => step.run?.includes("command -v swipl")),
      ).toBe(true);
      const smoke = job.steps.find((step) =>
        step.run?.includes(" smoke-archive "),
      );
      expect(smoke?.run).toContain("--archive");
      expect(smoke?.run).toContain("--checksum");
      for (const row of job.strategy.matrix.include) {
        const producer = artifacts.get(row.target ?? "");
        expect(producer).toBeDefined();
        expect(id).not.toBe(producer?.job);
        expect(
          typeof job.needs === "string" ? [job.needs] : job.needs,
        ).toContain(producer?.job);
        expect(matrixValue(job["runs-on"], row)).toBe(producer?.runner);
        expect(
          matrixValue(job.steps[downloadIndex]?.with?.name ?? "", row),
        ).toBe(producer?.name);
      }
    }
  });
});
