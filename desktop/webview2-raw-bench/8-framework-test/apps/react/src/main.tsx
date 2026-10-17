import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { useDialog } from '@ark-ui/react/dialog';
import { useProgress } from '@ark-ui/react/progress';
import { bench } from '@neutronstar/bench-contract';
import { statusText, fixture } from '@neutronstar/bench-domain';
import { cssProps, dialogOptions, assetsReady } from '@neutronstar/design';
function App() {
  const s = useStore(bench.state);
  const d = useDialog(dialogOptions);
  const p = useProgress({ id: 'operation', value: s.progress });
  useEffect(() => {
    void assetsReady().then(() => bench.loaded());
    return () => bench.dispose();
  }, []);
  return (
    <>
      <main className="shell" inert={d.open}>
        <header className="topbar">
          <div>
            <div className="brand">
              <div className="brand-icon">
                <img src="/icons/orbit.svg" alt="" />
              </div>
              <h1>NeutronStar GUI Bench</h1>
            </div>
            <p className="subtitle">
              A UI-only simulation for comparing desktop frontends.
            </p>
          </div>
          <button {...cssProps(d.getTriggerProps())} className="secondary">
            <img className="icon" src="/icons/info.svg" alt="" />
            About this test
          </button>
        </header>
        <div className="badge">
          <img src="/icons/shield-check.svg" alt="" />
          SIMULATION · NO FILES OR CRYPTOGRAPHY.
        </div>
        <div className="grid">
          <section className="card" aria-labelledby="decrypt-title">
            <h2 className="card-title" id="decrypt-title">
              <img className="icon" src="/icons/unlock-keyhole.svg" alt="" />
              Decrypt
            </h2>
            <p className="eyebrow">SYNTHETIC INPUT</p>
            <div className="fixture">
              <p>Synthetic sample: starlight.nsx</p>
              <p className="hint">No disk file is opened.</p>
            </div>
            <button
              type="button"
              id="decrypt"
              className="action"
              disabled={!s.loaded || s.status === 'running'}
              onClick={() => bench.start('decrypt')}
            >
              <img
                className="icon"
                src="/icons/arrow-down-to-line.svg"
                alt=""
              />
              Simulate decryption
            </button>
          </section>
          <section className="card" aria-labelledby="encrypt-title">
            <h2 className="card-title" id="encrypt-title">
              <img className="icon" src="/icons/lock-keyhole.svg" alt="" />
              Encrypt
            </h2>
            <p className="eyebrow">SYNTHETIC INPUT</p>
            <div className="fixture">
              <p id="fixture-text" dir="auto">{fixture.text}</p>
            </div>
            <button
              type="button"
              id="encrypt"
              className="action primary"
              disabled={!s.loaded || s.status === 'running'}
              onClick={() => bench.start('encrypt')}
            >
              <img
                className="icon"
                src="/icons/arrow-up-from-line.svg"
                alt=""
              />
              Simulate encryption
            </button>
          </section>
        </div>
        <section className="card status-card" aria-label="Simulation status">
          <div className="status-row">
            <p
              id="status"
              className="status-label"
              role="status"
              aria-live="polite"
              data-status={s.status}
            >
              <span className="status-dot" aria-hidden="true" />
              {statusText(s)}
            </p>
            <div className="status-controls">
              <button
                id="cancel"
                type="button"
                className="secondary"
                hidden={s.status !== 'running'}
                onClick={() => bench.cancel()}
              >
                Cancel
              </button>
              <button
                id="reset"
                type="button"
                className="secondary"
                disabled={!s.loaded}
                onClick={() => bench.reset()}
              >
                Reset
              </button>
            </div>
          </div>
          <div {...cssProps(p.getRootProps())} className="progress-root">
            <div
              {...cssProps(p.getTrackProps())}
              className="progress-track"
              aria-label="Simulation progress"
            >
              <span
                {...cssProps(p.getRangeProps())}
                className="progress-fill"
                data-value={s.progress}
              />
            </div>
            <div className="progress-caption">
              <span>Simulation progress</span>
              <span id="percent">{s.progress}%</span>
            </div>
          </div>
        </section>
        <footer className="footer">
          <p>
            Local interface. Synthetic data. Nothing is encrypted or decrypted.
          </p>
          <span>CONTROLLED RENDERER · SHARED STATE</span>
        </footer>
      </main>
      <div className="dialog-layer" hidden={!d.open}>
        <section
          {...cssProps(d.getContentProps())}
          className="dialog-content"
          aria-modal="true"
        >
          <h2 {...d.getTitleProps()}>About this test</h2>
          <p {...d.getDescriptionProps()}>
            Actions are UI-only simulations. No files, cryptography, Go CLI,
            network or native bridge are involved.
          </p>
          <button {...cssProps(d.getCloseTriggerProps())} className="secondary">
            Close
          </button>
        </section>
      </div>
    </>
  );
}
createRoot(document.getElementById('app')!).render(<App />);
window.addEventListener('pagehide', () => bench.dispose(), { once: true });
