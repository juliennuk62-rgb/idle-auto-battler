// GuideModal — modal d'aide contextuelle, ouvrable depuis n'importe quel écran.
// Affiche le guide correspondant à l'écran actif.

import { GUIDES } from '../data/guideContent.js';

export class GuideModal {
  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'guide-overlay';
    this.el.style.display = 'none';
    document.body.appendChild(this.el);

    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
  }

  open(guideId) {
    const guide = GUIDES[guideId] || GUIDES.menu;

    let sectionsHtml = '';
    for (const s of guide.sections) {
      // Convertir **bold** en <strong>
      const text = s.text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      sectionsHtml += `
        <div class="guide-section">
          <div class="guide-section-title">${s.heading}</div>
          <div class="guide-section-text">${text}</div>
        </div>
      `;
    }

    this.el.innerHTML = `
      <div class="guide-modal">
        <div class="guide-header">
          <span class="guide-icon">?</span>
          <span class="guide-title">${guide.title}</span>
          <button class="guide-close" id="guide-close">✕</button>
        </div>
        <div class="guide-body">
          ${sectionsHtml}
        </div>
      </div>
    `;

    this.el.querySelector('#guide-close').addEventListener('click', () => this.close());
    this.el.style.display = 'flex';
  }

  close() {
    this.el.style.display = 'none';
  }

  destroy() {
    this.el.remove();
  }
}

// Singleton global — un seul modal partagé par tous les écrans.
let _instance = null;

export function getGuideModal() {
  if (!_instance) _instance = new GuideModal();
  return _instance;
}

/**
 * Crée un bouton "?" d'aide et l'attache à un conteneur DOM.
 * @param {HTMLElement} container — l'élément parent
 * @param {string} guideId — id du guide à ouvrir
 */
export function attachGuideButton(container, guideId) {
  if (!container) return null;
  // Vide le conteneur pour éviter les doublons lors des re-renders
  container.innerHTML = '';
  const btn = document.createElement('button');
  btn.className = 'guide-help-btn';
  btn.textContent = '?';
  btn.title = 'Aide';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    getGuideModal().open(guideId);
  });
  container.appendChild(btn);
  return btn;
}
