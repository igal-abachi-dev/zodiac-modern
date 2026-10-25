<script lang="ts">
  import { onMount, tick } from 'svelte';
  import App from './App.svelte';
  let workbenchOpen = $state(location.hash === '#/workbench');
  let aboutOpen = $state(false);
  function route() {
    const wasOpen = workbenchOpen;
    workbenchOpen = location.hash === '#/workbench';
    void tick().then(() => {
      if (workbenchOpen) document.getElementById('workbench')?.scrollIntoView({ block: 'start' });
      else if (wasOpen) { window.scrollTo({ top: 0 }); document.getElementById('open-workbench')?.focus({ preventScroll: true }); }
    });
  }
  onMount(() => {
    route();
    window.addEventListener('hashchange', route);
    return () => window.removeEventListener('hashchange', route);
  });
</script>

<App onAboutChange={open => { aboutOpen = open; }} />
{#if workbenchOpen}
  <section id="workbench" class="shell workbench-shell" aria-label="List and filter workbench" inert={aboutOpen}>
    {#await import('./Workbench.svelte')}
      <p role="status">Loading workbench...</p>
    {:then module}
      {@const Workbench = module.default}
      <Workbench />
    {/await}
  </section>
{/if}
