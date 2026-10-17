import { render } from 'solid-js/web';
import { onMount, onCleanup } from 'solid-js';
import { useStore } from '@nanostores/solid';
import { useDialog } from '@ark-ui/solid/dialog';
import { useProgress } from '@ark-ui/solid/progress';
import { bench } from '@neutronstar/bench-contract';
import { statusText, fixture } from '@neutronstar/bench-domain';
import { cssProps, dialogOptions, assetsReady } from '@neutronstar/design';
function App() {
  const s = useStore(bench.state);
  const d = useDialog(() => dialogOptions);
  const p = useProgress(() => ({ id: 'operation', value: s().progress }));
  onMount(() => {
    void assetsReady().then(() => bench.loaded());
  });
  onCleanup(() => bench.dispose());
  return (
    <>
      <main class="shell" inert={d().open}>
        <header class="topbar">
          <div>
            <div class="brand">
              <div class="brand-icon">
                <img src="/icons/orbit.svg" alt="" />
              </div>
              <h1>NeutronStar GUI Bench</h1>
            </div>
            <p class="subtitle">
              A UI-only simulation for comparing desktop frontends.
            </p>
          </div>
          <button {...cssProps(d().getTriggerProps())} class="secondary">
            <img class="icon" src="/icons/info.svg" alt="" />
            About this test
          </button>
        </header>
        <div class="badge">
          <img src="/icons/shield-check.svg" alt="" />
          SIMULATION · NO FILES OR CRYPTOGRAPHY.
        </div>
        <div class="grid">
          <section class="card" aria-labelledby="decrypt-title">
            <h2 class="card-title" id="decrypt-title">
              <img class="icon" src="/icons/unlock-keyhole.svg" alt="" />
              Decrypt
            </h2>
            <p class="eyebrow">SYNTHETIC INPUT</p>
            <div class="fixture">
              <p>Synthetic sample: starlight.nsx</p>
              <p class="hint">No disk file is opened.</p>
            </div>
            <button
              type="button"
              id="decrypt"
              class="action"
              disabled={!s().loaded || s().status === 'running'}
              onClick={() => bench.start('decrypt')}
            >
              <img class="icon" src="/icons/arrow-down-to-line.svg" alt="" />
              Simulate decryption
            </button>
          </section>
          <section class="card" aria-labelledby="encrypt-title">
            <h2 class="card-title" id="encrypt-title">
              <img class="icon" src="/icons/lock-keyhole.svg" alt="" />
              Encrypt
            </h2>
            <p class="eyebrow">SYNTHETIC INPUT</p>
            <div class="fixture">
              <p id="fixture-text" dir="auto">{fixture.text}</p>
            </div>
            <button
              type="button"
              id="encrypt"
              class="action primary"
              disabled={!s().loaded || s().status === 'running'}
              onClick={() => bench.start('encrypt')}
            >
              <img class="icon" src="/icons/arrow-up-from-line.svg" alt="" />
              Simulate encryption
            </button>
          </section>
        </div>
        <section class="card status-card" aria-label="Simulation status">
          <div class="status-row">
            <p
              id="status"
              class="status-label"
              role="status"
              aria-live="polite"
              data-status={s().status}
            >
              <span class="status-dot" aria-hidden="true" />
              {statusText(s())}
            </p>
            <div class="status-controls">
              <button
                id="cancel"
                type="button"
                class="secondary"
                hidden={s().status !== 'running'}
                onClick={() => bench.cancel()}
              >
                Cancel
              </button>
              <button
                id="reset"
                type="button"
                class="secondary"
                disabled={!s().loaded}
                onClick={() => bench.reset()}
              >
                Reset
              </button>
            </div>
          </div>
          <div {...cssProps(p().getRootProps())} class="progress-root">
            <div
              {...cssProps(p().getTrackProps())}
              class="progress-track"
              aria-label="Simulation progress"
            >
              <span
                {...cssProps(p().getRangeProps())}
                class="progress-fill"
                data-value={s().progress}
              />
            </div>
            <div class="progress-caption">
              <span>Simulation progress</span>
              <span id="percent">{s().progress}%</span>
            </div>
          </div>
        </section>
        <footer class="footer">
          <p>
            Local interface. Synthetic data. Nothing is encrypted or decrypted.
          </p>
          <span>CONTROLLED RENDERER · SHARED STATE</span>
        </footer>
      </main>
      <div class="dialog-layer" hidden={!d().open}>
        <section
          {...cssProps(d().getContentProps())}
          class="dialog-content"
          aria-modal="true"
        >
          <h2 {...d().getTitleProps()}>About this test</h2>
          <p {...d().getDescriptionProps()}>
            Actions are UI-only simulations. No files, cryptography, Go CLI,
            network or native bridge are involved.
          </p>
          <button {...cssProps(d().getCloseTriggerProps())} class="secondary">
            Close
          </button>
        </section>
      </div>
    </>
  );
}
render(() => <App />, document.getElementById('app')!);
window.addEventListener('pagehide', () => bench.dispose(), { once: true });
