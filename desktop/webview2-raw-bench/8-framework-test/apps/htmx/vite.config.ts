import { defineConfig } from 'vite';

import { testEntry } from '../../scripts/vite-common.ts';
import { benchBuild } from '../../scripts/vite-common.ts';
export default defineConfig(({mode})=>({...benchBuild(mode),plugins:[testEntry(mode),]}));
