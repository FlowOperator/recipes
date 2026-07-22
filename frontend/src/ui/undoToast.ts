/**
 * Shows an undo toast at the bottom of the screen.
 * Returns a promise that resolves to true if the action should proceed (no undo),
 * or false if the user tapped Undo.
 */
export function showUndoToast(message: string, durationMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    // Remove any existing toast
    document.querySelector('.undo-toast')?.remove();

    const toast = document.createElement('div');
    toast.className = 'undo-toast';
    toast.innerHTML = `
      <span class="undo-toast-msg">${message}</span>
      <button class="undo-toast-btn" type="button">Undo</button>
    `;
    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => toast.classList.add('visible'));

    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
        resolve(true); // proceed with deletion
      }
    }, durationMs);

    toast.querySelector('.undo-toast-btn')!.addEventListener('click', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
        resolve(false); // undo — don't delete
      }
    });
  });
}
