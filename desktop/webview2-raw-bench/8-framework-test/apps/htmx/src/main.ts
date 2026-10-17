import htmx from 'htmx.org';
import screen from './screen.html?url';
import { mount } from './controller';
htmx.config.allowEval = false;
htmx.config.allowScriptTags = false;
htmx.config.includeIndicatorStyles = false;
htmx.config.historyEnabled = false;
htmx.config.historyCacheSize = 0;
htmx.config.attributesToSettle = ['class'];
const app = document.getElementById('app')!;
app.setAttribute('hx-get', screen);
app.setAttribute('hx-trigger', 'load');
app.setAttribute('hx-swap', 'innerHTML');
app.addEventListener(
  'htmx:afterSwap',
  () => {
    mount();
  },
  { once: true },
);
htmx.process(app);
