import { createApp } from 'vue';
import View from './WorkloadView.vue';
import { mountHarness } from '../../../packages/test-support/src/workloads';
mountHarness((target, model) => { const app = createApp(View, { model }); app.mount(target); return () => app.unmount(); });
