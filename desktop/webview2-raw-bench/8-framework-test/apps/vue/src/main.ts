import { createApp } from 'vue';
import App from './App.vue';
import { bench } from '@neutronstar/bench-contract';
createApp(App).mount('#app');
window.addEventListener('pagehide', () => bench.dispose(), { once: true });
