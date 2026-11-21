// Shadow Vault — input: keyboard (WASD / arrows, Shift to sneak) and mouse
// (click to throw a noise-maker coin). Exposes one plain state object.
export class Input {
  constructor(canvas, onClick) {
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.sneak = false;
    this.onClick = onClick; // (canvasX, canvasY) => void
    this._keys = new Set();
    window.addEventListener('keydown', (e) => this._onKey(e, true));
    window.addEventListener('keyup', (e) => this._onKey(e, false));
    window.addEventListener('blur', () => this._keys.clear());
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.onClick((e.clientX - rect.left) * scaleX, (e.clientY - rect.top) * scaleY);
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _onKey(e, down) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
      e.preventDefault();
    }
    if (down) this._keys.add(k);
    else this._keys.delete(k);
    this._sync();
  }

  _sync() {
    const k = this._keys;
    this.up = k.has('w') || k.has('arrowup');
    this.down = k.has('s') || k.has('arrowdown');
    this.left = k.has('a') || k.has('arrowleft');
    this.right = k.has('d') || k.has('arrowright');
    this.sneak = k.has('shift');
  }
}
