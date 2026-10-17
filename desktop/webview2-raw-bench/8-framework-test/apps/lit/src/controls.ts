import { VanillaMachine, normalizeProps, spreadProps } from '@zag-js/vanilla';
import * as dialog from '@zag-js/dialog';
import * as progress from '@zag-js/progress';
import { cssProps, dialogOptions } from '@neutronstar/design';
export function createControls(changed: () => void) {
  const dm = new VanillaMachine(dialog.machine, dialogOptions);
  const pm = new VanillaMachine(progress.machine, {
    id: 'operation',
    ids: { root: 'progress-root', track: 'progress-track' },
    value: 0,
  });
  let ds = () => {};
  let ps = () => {};
  return {
    get d() {
      return dialog.connect(dm.service, normalizeProps);
    },
    get p() {
      return progress.connect(pm.service, normalizeProps);
    },
    start() {
      ds = dm.subscribe(changed);
      ps = pm.subscribe(changed);
      dm.start();
      pm.start();
    },
    value(value: number) {
      pm.updateProps({
        id: 'operation',
        ids: { root: 'progress-root', track: 'progress-track' },
        value,
      });
    },
    dispose() {
      ds();
      ps();
      dm.stop();
      pm.stop();
    },
  };
}
export function bindings() {
  let cleanups: Array<() => void> = [];
  return {
    clear() {
      cleanups.forEach((f) => f());
      cleanups = [];
    },
    set(id: string, props: Record<string, unknown>) {
      const el = document.getElementById(id);
      if (!el) throw new Error('Missing control ' + id);
      cleanups.push(spreadProps(el, cssProps(props)));
    },
  };
}
