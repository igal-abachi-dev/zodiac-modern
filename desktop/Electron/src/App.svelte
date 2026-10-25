<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { useDialog } from '@ark-ui/svelte/dialog';
  import { useProgress } from '@ark-ui/svelte/progress';
  import { createWorkflow, statusText, sample } from './model';
  const model = createWorkflow((s) => (snapshot = s));
  let snapshot = $state.raw(model.state),
    readyError = $state(false),
    workbench = $state(location.hash === '#/workbench');
  function external<T extends object>(props: T): Omit<T, 'style'> {
    const { style: _, ...rest } = props as T & { style?: unknown };
    return rest;
  }
  const dialog = useDialog(() => ({
    id: 'about',
    ids: {
      trigger: 'about-trigger',
      content: 'about-content',
      title: 'about-title',
      description: 'about-description',
      closeTrigger: 'about-close',
    },
    modal: false,
    trapFocus: true,
    preventScroll: false,
    restoreFocus: true,
    closeOnEscape: true,
    closeOnInteractOutside: true,
    initialFocusEl: () => document.getElementById('about-close'),
    finalFocusEl: () => document.getElementById('about-trigger'),
  }));
  const progress = useProgress(() => ({ id: 'operation', value: snapshot.progress }));
  function route() {
    const was = workbench;
    workbench = location.hash === '#/workbench';
    void tick().then(() => {
      if (workbench) document.getElementById('workbench')?.scrollIntoView({ block: 'start' });
      else if (was) {
        window.scrollTo(0, 0);
        document.getElementById('open-workbench')?.focus({ preventScroll: true });
      }
    });
  }
  onMount(() => {
    let dead = false;
    window.addEventListener('hashchange', route);
    const close = () => model.dispose();
    window.addEventListener('pagehide', close);
    void Promise.all([
      document.fonts.load('400 14px Inter'),
      document.fonts.load('500 14px Inter'),
      document.fonts.load('600 24px Inter'),
      document.fonts.load('400 14px "Noto Sans Hebrew"', 'שלום'),
      ...Array.from(document.images, (i) => i.decode()),
    ])
      .then(() => document.fonts.ready)
      .then(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      )
      .then(() => {
        if (!dead) model.loaded();
      })
      .catch(() => {
        readyError = true;
      });
    return () => {
      dead = true;
      model.dispose();
      window.removeEventListener('pagehide', close);
      window.removeEventListener('hashchange', route);
    };
  });
</script>

<main class="shell" inert={dialog().open}>
  <header class="topbar">
    <div>
      <div class="brand">
        <div class="brand-icon"><img src="/icons/orbit.svg" alt="" /></div>
        <h1>NeutronStar GUI Bench</h1>
      </div>
      <p class="subtitle">A UI-only simulation for comparing desktop frontends.</p>
    </div>
    <button {...external(dialog().getTriggerProps())} class="secondary"
      ><img class="icon" src="/icons/info.svg" alt="" />About this test</button
    >
  </header>
  <div class="badge">
    <img src="/icons/shield-check.svg" alt="" />SIMULATION · NO FILES OR CRYPTOGRAPHY.
  </div>
  <div class="grid">
    <section class="card" aria-labelledby="decrypt-title">
      <h2 id="decrypt-title" class="card-title">
        <img class="icon" src="/icons/unlock-keyhole.svg" alt="" />Decrypt
      </h2>
      <p class="eyebrow">SYNTHETIC INPUT</p>
      <div class="fixture">
        <p>Synthetic sample: starlight.nsx</p>
        <p class="hint">No disk file is opened.</p>
      </div>
      <button
        id="decrypt"
        class="action"
        disabled={!snapshot.loaded || snapshot.status === 'running'}
        onclick={() => model.start('decrypt')}
        ><img class="icon" src="/icons/arrow-down-to-line.svg" alt="" />Simulate decryption</button
      >
    </section>
    <section class="card" aria-labelledby="encrypt-title">
      <h2 id="encrypt-title" class="card-title">
        <img class="icon" src="/icons/lock-keyhole.svg" alt="" />Encrypt
      </h2>
      <p class="eyebrow">SYNTHETIC INPUT</p>
      <div class="fixture"><p id="fixture-text" dir="auto">{sample}</p></div>
      <button
        id="encrypt"
        class="action primary"
        disabled={!snapshot.loaded || snapshot.status === 'running'}
        onclick={() => model.start('encrypt')}
        ><img class="icon" src="/icons/arrow-up-from-line.svg" alt="" />Simulate encryption</button
      >
    </section>
  </div>
  <section class="card status-card" aria-label="Simulation status">
    <div class="status-row">
      <p id="status" role="status" aria-live="polite" class="status-label">
        <span class="status-dot" aria-hidden="true"></span>{readyError
          ? 'Local assets failed to load.'
          : statusText(snapshot)}
      </p>
      <div class="status-controls">
        <button
          id="cancel"
          class="secondary"
          hidden={snapshot.status !== 'running'}
          onclick={() => model.cancel()}>Cancel</button
        ><button
          id="reset"
          class="secondary"
          disabled={!snapshot.loaded}
          onclick={() => model.reset()}>Reset</button
        >
      </div>
    </div>
    <div {...external(progress().getRootProps())} class="progress-root">
      <div
        {...external(progress().getTrackProps())}
        class="progress-track"
        aria-label="Simulation progress"
      >
        <span
          {...external(progress().getRangeProps())}
          class="progress-fill"
          data-value={snapshot.progress}
        ></span>
      </div>
      <div class="progress-caption">
        <span>Simulation progress</span><span id="percent">{snapshot.progress}%</span>
      </div>
    </div>
  </section>
  <footer class="footer">
    <button
      id="open-workbench"
      class="secondary"
      disabled={!snapshot.loaded || snapshot.status === 'running'}
      onclick={() => (location.hash = '/workbench')}>Open workbench</button
    >
    <p>Local interface. Synthetic data. Nothing is encrypted or decrypted.</p>
    <span>CONTROLLED RENDERER · LOCAL STATE</span>
  </footer>
</main>
{#if workbench}<section
    id="workbench"
    class="shell workbench-shell"
    aria-label="List and filter workbench"
    inert={dialog().open}
  >
    {#await import('./Workbench.svelte')}<p role="status">
        Loading workbench…
      </p>{:then module}{@const Workbench = module.default}<Workbench />{/await}
  </section>{/if}
<div class="dialog-layer" hidden={!dialog().open}>
  <section
    {...external(dialog().getContentProps())}
    class="dialog-content"
    role="dialog"
    aria-modal="true"
  >
    <h2 {...dialog().getTitleProps()}>About this test</h2>
    <p {...dialog().getDescriptionProps()}>
      Actions are UI-only simulations. No files, cryptography, Go CLI, network or native bridge are
      involved.
    </p>
    <button {...external(dialog().getCloseTriggerProps())} class="secondary">Close</button>
  </section>
</div>
