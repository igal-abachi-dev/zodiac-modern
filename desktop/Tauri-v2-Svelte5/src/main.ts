import { mount } from 'svelte';
import Root from './Root.svelte';
import { bench } from '$lib/state';
mount(Root, { target: document.getElementById('app')! });
window.addEventListener('pagehide', () => bench.dispose(), { once: true });
