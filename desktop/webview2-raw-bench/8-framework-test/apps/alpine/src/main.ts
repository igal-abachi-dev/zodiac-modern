import Alpine from '@alpinejs/csp';
import screen from './screen.html?raw';
import { bench } from '@neutronstar/bench-contract';
import { statusText, fixture } from '@neutronstar/bench-domain';
import { assetsReady } from '@neutronstar/design';
import { createControls, bindings } from './controls';
document.getElementById('app')!.innerHTML = screen;
Alpine.data('benchui', () => {
  const bind = bindings();
  let unlisten = () => {};
  let controls: ReturnType<typeof createControls>;
  return {
    snapshot: bench.state.get(),
    fixtureText: fixture.text,
    open: false,
    get busy() {
      return !this.snapshot.loaded || this.snapshot.status === 'running';
    },
    get notLoaded() {
      return !this.snapshot.loaded;
    },
    get notRunning() {
      return this.snapshot.status !== 'running';
    },
    get message() {
      return statusText(this.snapshot);
    },
    get percent() {
      return this.snapshot.progress + '%';
    },
    encrypt() {
      bench.start('encrypt');
    },
    decrypt() {
      bench.start('decrypt');
    },
    cancel() {
      bench.cancel();
    },
    reset() {
      bench.reset();
    },
    init() {
      const update = () => {
        const d = controls.d,
          p = controls.p;
        this.open = d.open;
        bind.clear();
        bind.set('about-trigger', d.getTriggerProps());
        bind.set('about-content', {
          ...d.getContentProps(),
          'aria-modal': 'true',
        });
        bind.set('about-title', d.getTitleProps());
        bind.set('about-description', d.getDescriptionProps());
        bind.set('about-close', d.getCloseTriggerProps());
        bind.set('progress-root', p.getRootProps());
        bind.set('progress-track', {
          ...p.getTrackProps(),
          'aria-label': 'Simulation progress',
        });
        bind.set('progress-fill', p.getRangeProps());
        document.getElementById('about-layer')!.hidden = !d.open;
      };
      controls = createControls(update);
      controls.start();
      unlisten = bench.state.subscribe((s) => {
        this.snapshot = s;
        controls.value(s.progress);
        document.getElementById('status')!.dataset.status = s.status;
        update();
      });
      void assetsReady().then(() => bench.loaded());
    },
    destroy() {
      unlisten();
      bind.clear();
      controls.dispose();
      bench.dispose();
    },
  };
});
Alpine.start();
window.addEventListener(
  'pagehide',
  () => {
    Alpine.destroyTree(document.getElementById('app')!);
    bench.dispose();
  },
  { once: true },
);
