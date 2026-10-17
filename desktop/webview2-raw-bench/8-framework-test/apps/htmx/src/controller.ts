import { bench } from '@neutronstar/bench-contract';
import { statusText, fixture } from '@neutronstar/bench-domain';
import { assetsReady } from '@neutronstar/design';
import { createControls, bindings } from './controls';
export function mount() {
  document.getElementById('fixture-text')!.textContent = fixture.text;
  const get = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const bind = bindings();
  let disposed = false;
  const controls = createControls(render);
  function render() {
    if (disposed) return;
    const s = bench.state.get();
    const d = controls.d;
    const p = controls.p;
    bind.clear();
    bind.set('about-trigger', d.getTriggerProps());
    bind.set('about-content', d.getContentProps());
    bind.set('about-title', d.getTitleProps());
    bind.set('about-description', d.getDescriptionProps());
    bind.set('about-close', d.getCloseTriggerProps());
    bind.set('progress-root', p.getRootProps());
    bind.set('progress-track', {
      ...p.getTrackProps(),
      'aria-label': 'Simulation progress',
    });
    bind.set('progress-fill', p.getRangeProps());
    get('background').inert = d.open;
    get('about-layer').hidden = !d.open;
    get('about-content').setAttribute('aria-modal', 'true');
    get('message').textContent = statusText(s);
    get('status').dataset.status = s.status;
    get<HTMLButtonElement>('encrypt').disabled =
      !s.loaded || s.status === 'running';
    get<HTMLButtonElement>('decrypt').disabled =
      !s.loaded || s.status === 'running';
    get<HTMLButtonElement>('reset').disabled = !s.loaded;
    get('cancel').hidden = s.status !== 'running';
    get('percent').textContent = s.progress + '%';
    get('progress-fill').dataset.value = String(s.progress);
  }
  const events = new AbortController();
  for (const op of ['encrypt', 'decrypt'] as const)
    get(op).addEventListener('click', () => bench.start(op), {
      signal: events.signal,
    });
  get('cancel').addEventListener('click', () => bench.cancel(), {
    signal: events.signal,
  });
  get('reset').addEventListener('click', () => bench.reset(), {
    signal: events.signal,
  });
  controls.start();
  const unlisten = bench.state.subscribe((s) => {
    controls.value(s.progress);
    render();
  });
  void assetsReady().then(() => bench.loaded());
  const dispose = () => {
    disposed = true;
    events.abort();
    unlisten();
    bind.clear();
    controls.dispose();
    bench.dispose();
  };
  window.addEventListener('pagehide', dispose, { once: true });
  return dispose;
}
