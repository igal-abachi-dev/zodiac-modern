import './styles.css';
import { greet } from './native-bridge';

const form = document.querySelector<HTMLFormElement>('#greet-form')!;
const input = document.querySelector<HTMLInputElement>('#greet-input')!;
const button = form.querySelector<HTMLButtonElement>('button')!;
const message = document.querySelector<HTMLElement>('#greet-msg')!;
const about = document.querySelector<HTMLElement>('#about')!;

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (button.disabled) return;
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  try {
    // Preserve the supplied value. Native code formats the response; markup stays text.
    message.textContent = await greet(input.value);
  } catch {
    message.textContent = 'Native greeting unavailable. Run with the test greeting capability enabled.';
  } finally {
    button.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
function showRoute(): void { about.hidden = location.hash !== '#/about'; }
window.addEventListener('hashchange', showRoute);
showRoute();
