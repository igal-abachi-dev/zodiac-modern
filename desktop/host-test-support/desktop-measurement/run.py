"""Desktop cross-toolkit orchestration: serial, frozen, resumable. A failed attempt stops the run; nothing is replaced."""
from pathlib import Path
import argparse, hashlib, json, random, subprocess, sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]            # desktop/
HERE = Path(__file__).resolve().parent
COLLECTOR = ROOT / 'host-test-support/.cache/desktop-measurement-bin/DesktopMeasurement.dll'
# id: (published folder, executable relative to ROOT, arguments, UIA adapter, takes --profile)
VARIANTS = {
 'tauri':         ('Tauri-v2-Svelte5/src-tauri/target/x86_64-pc-windows-msvc/release', 'Tauri-v2-Svelte5/src-tauri/target/x86_64-pc-windows-msvc/release/neutronstar-tauri-svelte5.exe', [], 'webview', True),
 'electron':      ('Electron/out/NeutronStar-Electron-win32-x64', 'Electron/out/NeutronStar-Electron-win32-x64/NeutronStar-Electron.exe', [], 'webview', True),
 'avalonia':      ('Avalonia/out/win-x64', 'Avalonia/out/win-x64/NeutronStar-Avalonia.exe', [], 'native', False),
 'winui-mvvm':    ('WinUI3-cs-native-mvvm/out/win-x64', 'WinUI3-cs-native-mvvm/out/win-x64/NeutronStar-WinUI-Mvvm.exe', [], 'native', False),
 'winui-reactor': ('WinUI3-cs-native-reactor/out/win-x64', 'WinUI3-cs-native-reactor/out/win-x64/NeutronStar-WinUI-Reactor.exe', [], 'native', False),
 'flutter':       ('Flutter/build/windows/x64/runner/Release', 'Flutter/build/windows/x64/runner/Release/neutronstar_flutter.exe', [], 'native', False),
 'qt':            ('Qt/out/win-x64', 'Qt/out/win-x64/neutronstar_qt.exe', [], 'native', False),
 'slint':         ('slint-rust/out/win-x64', 'slint-rust/out/win-x64/neutronstar-slint.exe', [], 'native', False),
 'rnw':           ('react-native-windows/out/win-x64', 'react-native-windows/out/win-x64/NeutronStar.exe', [], 'native', False),
 'wx':            ('wxWidgets/out/win-x64', 'wxWidgets/out/win-x64/neutronstar_wx.exe', [], 'native', False),
 'imgui-dx12':    ('Dear-ImGui-dx11-12/out/win-x64', 'Dear-ImGui-dx11-12/out/win-x64/neutronstar_imgui.exe', ['--renderer', 'dx12'], 'none', False),
 'imgui-dx11':    ('Dear-ImGui-dx11-12/out/win-x64', 'Dear-ImGui-dx11-12/out/win-x64/neutronstar_imgui.exe', ['--renderer', 'dx11'], 'none', False),
}
IDLE_STATES = ['visible', 'unfocused', 'occluded', 'minimized', 'restored']
def read(p): return json.loads(Path(p).read_text(encoding='utf-8-sig'))
def write(p, data):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + '.tmp'); tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf8'); tmp.replace(p)
def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for block in iter(lambda: f.read(1 << 20), b''): h.update(block)
    return h.hexdigest()

def frozen_files(variants):
    files = set(HERE.glob('*.cs')) | set(HERE.glob('*.py')) | {HERE / 'DesktopMeasurement.csproj', HERE / 'packages.lock.json'}
    files |= set(COLLECTOR.parent.glob('*'))
    for v in variants:
        if v == 'tauri':                      # the release folder also holds the Cargo build tree; the EXE embeds all assets
            files.add(ROOT / VARIANTS[v][1]); continue
        files |= {p for p in (ROOT / VARIANTS[v][0]).rglob('*') if p.is_file()}
    return sorted(p for p in files if p.is_file())
def snapshot(files, hashed=True):
    return {str(p.relative_to(ROOT)): {'sha256': sha(p) if hashed else None, 'bytes': p.stat().st_size, 'mtimeNs': p.stat().st_mtime_ns} for p in files}

def lanes(variants):
    out = []
    for v in variants:
        if VARIANTS[v][4]: out += [(v, 'fresh'), (v, 'retained')]
        else: out.append((v, 'default'))
    return out

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('phase', choices=['calibrate', 'reference', 'targets', 'pilot', 'startup', 'pilot-work', 'idle', 'interact', 'summarize'])
    parser.add_argument('--folder', required=True)
    parser.add_argument('--variants', nargs='+', choices=list(VARIANTS))
    parser.add_argument('--repeats', type=int, default=30)
    parser.add_argument('--rounds', type=int, default=10)
    parser.add_argument('--warmups', type=int, default=1)
    parser.add_argument('--idle-seconds', type=int, default=6)
    args = parser.parse_args()
    folder = Path(args.folder).resolve(); folder.mkdir(parents=True, exist_ok=True)
    variants = args.variants or list(VARIANTS)
    if args.phase == 'summarize':
        subprocess.run([sys.executable, str(HERE / 'analyze.py'), str(folder)], check=True); return
    files = frozen_files(variants)
    files += sorted(p for p in (folder / 'references').glob('*') if p.is_file())
    current = snapshot(files, hashed=False)
    freeze_path = folder / 'freeze.json'
    if args.phase in ('startup', 'pilot', 'pilot-work', 'idle', 'interact'):   # measured phases need the full hash freeze
        if freeze_path.exists():
            old = read(freeze_path)['files']
            if {k: (v['bytes'], v['mtimeNs']) for k, v in old.items() if k in current} != {k: (v['bytes'], v['mtimeNs']) for k, v in current.items()}:
                raise RuntimeError('Frozen artifacts changed; use a new cohort folder')
        else:
            write(freeze_path, {'createdUtc': datetime.now(timezone.utc).isoformat(), 'files': snapshot(files), 'variants': {k: v[:4] for k, v in VARIANTS.items() if k in variants},
                                'protocol': {'clientDips': [960, 640], 'frameSource': 'DXGI Desktop Duplication LastPresentTime', 'grid': [64, 40], 'startupRounds': args.rounds, 'warmups': args.warmups}})

    def attempt(variant, lane, scenario, tag, **extra):
        out = folder / 'runs' / tag; result_path = out / 'result.json'
        if result_path.exists():
            old = read(result_path)
            if old.get('status') != 'passed': raise RuntimeError('Rejected attempt retained: ' + tag)
            return old
        out.mkdir(parents=True, exist_ok=True)
        _, exe, extra_args, adapter, takes_profile = VARIANTS[variant]
        arguments = list(extra_args)
        if takes_profile:
            profile = folder / 'profiles' / (f'{variant}-retained' if lane == 'retained' else tag)
            arguments += ['--profile', str(profile)]
        config = {'variant': variant, 'runner': str(ROOT / exe), 'arguments': arguments, 'adapter': adapter, 'scenario': scenario, 'output': str(out),
                  'reference': str(folder / 'references' / f'{variant}.json'), 'targets': str(folder / 'references' / 'imgui-targets.json'), **extra}
        write(out / 'config.json', config)
        # Output goes to a file, never a pipe: an app launched by the collector inherits pipe handles and would keep a
        # pipe open after the collector dies, hanging this orchestrator. On timeout the whole process tree is killed.
        log = (out / 'collector.log').open('w', encoding='utf8')
        proc = subprocess.Popen(['dotnet', str(COLLECTOR), str(out / 'config.json')], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
        try:
            returncode = proc.wait(timeout=240)
        except subprocess.TimeoutExpired:
            subprocess.run(['taskkill', '/T', '/F', '/PID', str(proc.pid)], capture_output=True)
            returncode = -9; write(out / 'timeout.json', {'error': 'collector exceeded 240 s; process tree killed by orchestrator'})
        finally: log.close()
        class done: pass
        done.returncode = returncode
        if not result_path.exists(): write(result_path, {'status': 'failed', 'error': 'no final report', 'exitCode': done.returncode})
        result = read(result_path); print(f'{tag}: {result.get("status")}', flush=True)
        if done.returncode or result.get('status') != 'passed': raise RuntimeError(f'Rejected attempt: {tag} {result.get("error") or result.get("cleanupFailure")}')
        return result

    if args.phase == 'calibrate':
        attempt(variants[0], 'default', 'calibrate', 'calibrate-0', repeats=args.repeats)
        attempt(variants[0], 'default', 'calibrate', 'calibrate-1', repeats=args.repeats)
    elif args.phase == 'reference':
        for v in variants:
            # Two recordings of the same ready state estimate the visual noise floor; the second replaces nothing.
            for n in range(2):
                out_ref = folder / 'references' / (f'{v}.json' if n == 0 else f'{v}.repeat.json')
                attempt(v, 'fresh', 'reference', f'reference-{n}-{v}', reference=str(out_ref))
    elif args.phase == 'targets':
        # Read-only probe build records ImGui widget positions once; both renderers share the same layout.
        import shutil
        out = folder / 'runs' / 'targets-imgui'
        if out.exists(): raise RuntimeError('targets already recorded; use a new cohort folder')
        out.mkdir(parents=True)
        probe_dir = out / 'probe-app'; probe_dir.mkdir()
        shutil.copy2(ROOT / 'Dear-ImGui-dx11-12/out/clang-cl-ninja-x64/neutronstar_imgui_probe.exe', probe_dir)
        shutil.copytree(ROOT / 'Dear-ImGui-dx11-12/out/win-x64/assets', probe_dir / 'assets')
        probe = probe_dir / 'neutronstar_imgui_probe.exe'
        config = {'variant': 'imgui-dx12', 'runner': str(probe), 'arguments': ['--renderer', 'dx12'], 'adapter': 'none', 'scenario': 'targets', 'output': str(out), 'reference': str(folder / 'references' / 'imgui-targets.json')}
        write(out / 'config.json', config)
        log = (out / 'collector.log').open('w', encoding='utf8')
        proc = subprocess.Popen(['dotnet', str(COLLECTOR), str(out / 'config.json')], cwd=ROOT, stdout=log, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
        try: rc = proc.wait(timeout=180)
        except subprocess.TimeoutExpired:
            subprocess.run(['taskkill', '/T', '/F', '/PID', str(proc.pid)], capture_output=True); rc = -9
        finally: log.close()
        if rc: raise RuntimeError('targets failed; see ' + str(out))
    elif args.phase == 'pilot-work':
        for v in variants:
            attempt(v, 'fresh', 'idle', f'pilot-idle-{v}', idleSeconds=args.idle_seconds, idleOrder=IDLE_STATES)
            attempt(v, 'fresh', 'interact', f'pilot-interact-{v}')
        write(folder / 'pilot-work-complete.json', {'status': 'awaiting evidence review', 'variants': variants})
    elif args.phase in ('idle', 'interact'):
        if not (folder / 'pilot-accepted.json').exists(): raise RuntimeError('Reviewed pilot acceptance required')
        rng = random.Random(14112027 if args.phase == 'idle' else 14112028)
        for n in range(args.warmups + args.rounds):
            order = list(variants); rng.shuffle(order)
            kind = 'warmup' if n < args.warmups else 'measured'
            for v in order:
                tag = f'{args.phase}-{kind}-{n:02d}-{v}'
                if args.phase == 'idle':
                    rot = n % len(IDLE_STATES); attempt(v, 'fresh', 'idle', tag, idleSeconds=args.idle_seconds, idleOrder=IDLE_STATES[rot:] + IDLE_STATES[:rot])
                else: attempt(v, 'fresh', 'interact', tag)
    elif args.phase in ('pilot', 'startup'):
        if args.phase == 'startup' and not (folder / 'pilot-accepted.json').exists(): raise RuntimeError('Reviewed pilot acceptance required')
        rng = random.Random(14112026)
        if args.phase == 'pilot':
            for v in variants:
                for lane in (['fresh', 'retained'] if VARIANTS[v][4] else ['default']):
                    for n in range(2): attempt(v, lane, 'startup', f'pilot-{v}-{lane}-{n + 1}')
            write(folder / 'pilot-complete.json', {'status': 'awaiting evidence review', 'variants': variants})
        else:
            for n in range(args.warmups + args.rounds):
                order = lanes(variants); rng.shuffle(order)
                for v, lane in order:
                    attempt(v, lane, 'startup', f'{"warmup" if n < args.warmups else "measured"}-{n:02d}-{v}-{lane}')
    if args.phase in ('startup', 'pilot', 'pilot-work', 'idle', 'interact') and snapshot(files, hashed=False) != current: raise RuntimeError('Frozen artifacts changed during the phase')
    write(folder / 'progress.json', {'phase': args.phase, 'status': 'phase complete', 'utc': datetime.now(timezone.utc).isoformat()})
if __name__ == '__main__': main()
