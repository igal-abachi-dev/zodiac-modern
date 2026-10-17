for (const button of document.querySelectorAll('[data-window]')) {
  button.addEventListener('click', () => {
    window.chrome?.webview?.postMessage(`neutronstar.window.${button.dataset.window}.v1`);
  });
}
