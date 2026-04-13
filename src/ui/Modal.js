// Modal — composant overlay générique. Backdrop flou, panel centré, close
// via X / Échap / click backdrop. Transition fade+scale en CSS.
// Le combat continue par défaut (on ne pause pas — c'est un idle).

export class Modal {
  /**
   * @param {Object} options
   * @param {string} options.title
   * @param {string|HTMLElement} [options.content]
   * @param {number} [options.width=900]
   * @param {string} [options.hotkey]       - touche pour toggle (ex: 'S')
   * @param {Function} [options.onClose]
   * @param {Function} [options.onOpen]
   */
  constructor(options) {
    this.options = options;
    this.isOpen = false;
    this._create();
    this._bindKeys();
  }

  _create() {
    // Backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop';
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) this.close();
    });

    // Panel
    this.panel = document.createElement('div');
    this.panel.className = 'modal-panel';
    this.panel.style.maxWidth = `${this.options.width ?? 900}px`;

    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `
      <span class="modal-title">${this.options.title || ''}</span>
      <button class="modal-close" title="Fermer (Échap)">×</button>
    `;
    header.querySelector('.modal-close').addEventListener('click', () => this.close());

    // Body
    this.body = document.createElement('div');
    this.body.className = 'modal-body';
    if (typeof this.options.content === 'string') {
      this.body.innerHTML = this.options.content;
    } else if (this.options.content instanceof HTMLElement) {
      this.body.append(this.options.content);
    }

    this.panel.append(header, this.body);
    this.backdrop.append(this.panel);
  }

  _bindKeys() {
    this._keyHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.close();
      }
      if (
        this.options.hotkey &&
        e.key.toLowerCase() === this.options.hotkey.toLowerCase() &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.metaKey
      ) {
        // Ne pas toggle si un input est focus (le joueur tape du texte)
        if (document.activeElement?.tagName === 'INPUT') return;
        e.preventDefault();
        this.toggle();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    document.body.append(this.backdrop);
    // Force reflow pour que la transition CSS joue depuis l'état initial.
    void this.backdrop.offsetWidth;
    this.backdrop.classList.add('open');
    if (this.options.onOpen) this.options.onOpen();
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.backdrop.classList.remove('open');
    // Retire du DOM après la transition
    setTimeout(() => {
      if (!this.isOpen && this.backdrop.parentNode) {
        this.backdrop.remove();
      }
    }, 300);
    if (this.options.onClose) this.options.onClose();
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  setContent(html) {
    if (typeof html === 'string') {
      this.body.innerHTML = html;
    } else if (html instanceof HTMLElement) {
      this.body.innerHTML = '';
      this.body.append(html);
    }
  }

  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
    if (this.backdrop.parentNode) this.backdrop.remove();
  }
}
