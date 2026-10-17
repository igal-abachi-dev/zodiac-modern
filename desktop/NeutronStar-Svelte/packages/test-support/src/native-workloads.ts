import type { WorkloadAPI } from './workloads';
import type {} from './diagnostics';
const pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
async function until(check: () => boolean) {
  const began = performance.now();
  while (!check()) {
    if (performance.now() - began > 7000) throw new Error('Supplemental native workload timed out');
    await pause(20);
  }
}
export async function nativeWorkloadChecks(expectDiagnostics = false) {
  await until(() => !!window.neutronstarWorkload);
  const api: WorkloadAPI = window.neutronstarWorkload!;
  const rows = () => Array.from(document.querySelectorAll<HTMLLIElement>('#workload-rows > li'));
  const expect = (condition: unknown, name: string) => { if (!condition) throw new Error(name); };
  await until(() => rows().length === 1000);
  const first = rows()[0];
  api.reverse();
  await until(() => rows()[999]?.dataset.id === '0');
  expect(rows()[999] === first, 'Keyed reversal identity');
  api.splice();
  await until(() => rows()[0]?.dataset.id === '1000');
  expect(rows().length === 1000, 'Splice row count');
  const input = () => document.querySelector<HTMLInputElement>('#workload-query')!;
  const fill = (value: string) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input(), value);
    input().dispatchEvent(new Event('input', { bubbles: true }));
  };
  api.burst(30, 600);
  fill('row-1000');
  await until(() => rows().length === 1 && api.snapshot().tick > 0);
  await until(() => /: [1-9]\d*$/.test(rows()[0]?.textContent || ''));
  fill('שלום'); await until(() => rows().length === 1000);
  fill('مرحبًا'); await until(() => rows().length === 1000);
  fill('no-match'); await until(() => rows().length === 0);
  api.stop();
  for (let i = 0; i < 5; i++) {
    api.burst(30, 600); api.remount();
    await until(() => rows().length === 1000);
  }
  await pause(150);
  expect(api.snapshot().tick === 0, 'Old workload timer isolated');
  expect(document.querySelectorAll('#workload-query').length === 1, 'Single workload input');
  api.replace(10000); await until(() => rows().length === 10000);
  api.replace(1000); await until(() => rows().length === 1000);
  expect(localStorage.length === 0 && sessionStorage.length === 0, 'No workload storage');
  api.dispose();
  expect(!document.querySelector('#workload-harness'), 'Workload teardown');
  if (expectDiagnostics) expect(!!window.neutronstarDiagnostics, 'Native diagnostic collector present');
  if (window.neutronstarDiagnostics) {
    const diagnostics = window.neutronstarDiagnostics;
    expect(diagnostics.snapshot().observerStatus.paint === 'observing', 'Native paint observer support');
    await until(() => diagnostics.snapshot().provisional.fcpMs !== null);
    const stopped = diagnostics.stop();
    expect(stopped.stopReason === 'explicit' && stopped.stoppedAt !== null, 'Native diagnostic stop');
    expect(stopped.entries.length <= 512 && stopped.entries.every(e =>
      Number.isFinite(e.startTime) && Number.isFinite(e.duration)), 'Bounded native diagnostic entries');
    await pause(50);
    expect(JSON.stringify(diagnostics.snapshot().entries) === JSON.stringify(stopped.entries), 'Native observer disconnect');
  }
}
