import { mount } from 'svelte';
import App from './App.svelte';
import { bench } from '@neutronstar/bench-contract';
mount(App, { target: document.getElementById('app')! });
window.addEventListener('pagehide', () => bench.dispose(), { once: true });
