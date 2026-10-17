import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { testEntry } from '../../scripts/vite-common.ts';
import { benchBuild } from '../../scripts/vite-common.ts';
export default defineConfig(({mode})=>({...benchBuild(mode),plugins:[testEntry(mode),vue()]}));
