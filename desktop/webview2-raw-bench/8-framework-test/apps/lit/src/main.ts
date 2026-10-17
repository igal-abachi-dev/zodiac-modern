import { LitElement, html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { spreadProps } from '@zag-js/vanilla';
import { bench } from '@neutronstar/bench-contract';
import { statusText, fixture } from '@neutronstar/bench-domain';
import { assetsReady, cssProps } from '@neutronstar/design';
import { createControls } from './controls';
class BenchApp extends LitElement {
  private controls = createControls(() => this.requestUpdate());
  private unlisten = () => {};
  private disposers = new Map<Element, () => void>();
  protected createRenderRoot() {
    return this;
  }
  connectedCallback() {
    super.connectedCallback();
    this.controls.start();
    this.unlisten = bench.state.subscribe((s) => {
      this.controls.value(s.progress);
      this.requestUpdate();
    });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.unlisten();
    this.controls.dispose();
    this.disposers.forEach((f) => f());
    this.disposers.clear();
  }
  protected firstUpdated() {
    void assetsReady().then(() => bench.loaded());
  }
  private bind(props: Record<string, unknown>) {
    let last: Element | undefined;
    return ref((el) => {
      if (last) {
        this.disposers.get(last)?.();
        this.disposers.delete(last);
      }
      last = el;
      if (el) this.disposers.set(el, spreadProps(el, cssProps(props)));
    });
  }
  protected render() {
    const s = bench.state.get(),
      d = this.controls.d,
      p = this.controls.p;
    return html`<main class="shell" id="background" ?inert="${d.open}">
        <header class="topbar">
          <div>
            <div class="brand">
              <div class="brand-icon">
                <img src="./icons/orbit.svg" alt="" />
              </div>
              <h1>NeutronStar GUI Bench</h1>
            </div>
            <p class="subtitle">
              A UI-only simulation for comparing desktop frontends.
            </p>
          </div>
          <button
            id="about-trigger"
            ${this.bind(d.getTriggerProps())}
            class="secondary"
          >
            <img class="icon" src="./icons/info.svg" alt="" />About this test
          </button>
        </header>
        <div class="badge">
          <img src="./icons/shield-check.svg" alt="" />SIMULATION · NO FILES OR
          CRYPTOGRAPHY.
        </div>
        <div class="grid">
          <section class="card" aria-labelledby="decrypt-title">
            <h2 class="card-title" id="decrypt-title">
              <img
                class="icon"
                src="./icons/unlock-keyhole.svg"
                alt=""
              />Decrypt
            </h2>
            <p class="eyebrow">SYNTHETIC INPUT</p>
            <div class="fixture">
              <p>Synthetic sample: starlight.nsx</p>
              <p class="hint">No disk file is opened.</p>
            </div>
            <button
              type="button"
              id="decrypt"
              ?disabled="${!s.loaded || s.status === 'running'}"
              @click="${() => bench.start('decrypt')}"
              class="action"
            >
              <img
                class="icon"
                src="./icons/arrow-down-to-line.svg"
                alt=""
              />Simulate decryption
            </button>
          </section>
          <section class="card" aria-labelledby="encrypt-title">
            <h2 class="card-title" id="encrypt-title">
              <img class="icon" src="./icons/lock-keyhole.svg" alt="" />Encrypt
            </h2>
            <p class="eyebrow">SYNTHETIC INPUT</p>
            <div class="fixture">
              <p id="fixture-text" dir="auto">${fixture.text}</p>
            </div>
            <button
              type="button"
              id="encrypt"
              ?disabled="${!s.loaded || s.status === 'running'}"
              @click="${() => bench.start('encrypt')}"
              class="action primary"
            >
              <img
                class="icon"
                src="./icons/arrow-up-from-line.svg"
                alt=""
              />Simulate encryption
            </button>
          </section>
        </div>
        <section class="card status-card" aria-label="Simulation status">
          <div class="status-row">
            <p
              id="status"
              data-status="${s.status}"
              class="status-label"
              role="status"
              aria-live="polite"
            >
              <span class="status-dot" aria-hidden="true"></span
              ><span id="message">${statusText(s)}</span>
            </p>
            <div class="status-controls">
              <button
                id="cancel"
                ?hidden="${s.status !== 'running'}"
                @click="${() => bench.cancel()}"
                type="button"
                class="secondary"
              >
                Cancel</button
              ><button
                id="reset"
                ?disabled="${!s.loaded}"
                @click="${() => bench.reset()}"
                type="button"
                class="secondary"
              >
                Reset
              </button>
            </div>
          </div>
          <div
            id="progress-root"
            ${this.bind(p.getRootProps())}
            class="progress-root"
          >
            <div
              id="progress-track"
              ${this.bind({ ...p.getTrackProps(), 'aria-label': 'Simulation progress' })}
              class="progress-track"
              aria-label="Simulation progress"
            >
              <span
                id="progress-fill"
                ${this.bind(p.getRangeProps())}
                class="progress-fill"
                data-value="${s.progress}"
              ></span>
            </div>
            <div class="progress-caption">
              <span>Simulation progress</span
              ><span id="percent">${s.progress}%</span>
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
      <div class="dialog-layer" id="about-layer" ?hidden="${!d.open}">
        <section
          id="about-content"
          ${this.bind({ ...d.getContentProps(), 'aria-modal': 'true' })}
          class="dialog-content"
          aria-modal="true"
        >
          <h2 id="about-title" ${this.bind(d.getTitleProps())}>
            About this test
          </h2>
          <p id="about-description" ${this.bind(d.getDescriptionProps())}>
            Actions are UI-only simulations. No files, cryptography, Go CLI,
            network or native bridge are involved.
          </p>
          <button
            id="about-close"
            ${this.bind(d.getCloseTriggerProps())}
            class="secondary"
          >
            Close
          </button>
        </section>
      </div>`;
  }
}
customElements.define('bench-app', BenchApp);
document.getElementById('app')!.append(document.createElement('bench-app'));
window.addEventListener(
  'pagehide',
  () => {
    document.querySelector('bench-app')?.remove();
    bench.dispose();
  },
  { once: true },
);
