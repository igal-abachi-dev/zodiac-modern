import { mount, unmount } from 'svelte';
import View from './WorkloadView.svelte';
import { mountHarness } from '../packages/test-support/src/workloads';
mountHarness((target, model) => { const app = mount(View, { target, props: { model } }); return () => { void unmount(app); }; });
