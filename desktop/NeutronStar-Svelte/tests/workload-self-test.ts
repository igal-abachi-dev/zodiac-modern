import { selfTest } from '@neutronstar/test-support';
import { nativeWorkloadChecks } from '../packages/test-support/src/native-workloads';
void selfTest(() => nativeWorkloadChecks(import.meta.env.MODE === 'workload-diagnostic-test'));
