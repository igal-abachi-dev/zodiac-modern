import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { testEntry } from '../../scripts/vite-common.ts';
import { benchBuild } from '../../scripts/vite-common.ts';
export default defineConfig(({mode})=>({...benchBuild(mode),plugins:[testEntry(mode),svelte({compilerOptions:{css:'external'}})]}));
