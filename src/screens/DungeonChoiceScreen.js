// DungeonChoiceScreen — écran entre les étages du donjon.
// Affiche 3 cartes de choix + résumé du run + buffs actifs.
// Au premier étage : juste un bouton "ENTRER".

import { DungeonSystem } from '../systems/DungeonSystem.js';

export class DungeonChoiceScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen dungeon-screen';
  }

  show() {
    this._render();
    document.body.append(this.el);
  }

  hide() {
    this.el.remove();
  }

  _render() {
    const floor = DungeonSystem.getCurrentFloor();
    const totalFloors = DungeonSystem.totalFloors;
    const buffs = DungeonSystem.getActiveBuffs().filter(b => !b._oneShot);
    const isFirstEntry = floor === 0;
    const isComplete = floor >= totalFloors;

    // Si le run est terminé (victoire ou défaite), afficher le résultat.
    if (!DungeonSystem.isRunActive() && !isFirstEntry) {
      // Le run a été terminé par endRun() (défaite ou victoire).
      this._renderResult({
        victory: isComplete,
        floorsCleared: floor,
        totalFloors,
        goldEarned: DungeonSystem.goldEarned || 0,
        buffsUsed: buffs.length,
      });
      return;
    }
    if (isComplete) {
      const result = DungeonSystem.endRun(true);
      this._renderResult(result);
      return;
    }

    // Cartes de choix (sauf premier étage).
    const cards = isFirstEntry ? [] : DungeonSystem.drawCards();

    this.el.innerHTML = `
      <div class="dungeon-panel">
        <div class="dungeon-title">${isFirstEntry ? 'DONJON' : `ÉTAGE ${floor}/${totalFloors} — TERMINÉ`}</div>
        <div class="dungeon-subtitle">${isFirstEntry ? 'Prêt à entrer ?' : 'Choisissez votre récompense'}</div>

        ${buffs.length > 0 ? `
          <div class="dungeon-buffs">
            ${buffs.map(b => `<span class="dungeon-buff" style="border-color:${b.catColor}" title="${b.desc}">${b.icon} ${b.name}</span>`).join('')}
          </div>
        ` : ''}

        ${cards.length > 0 ? `
          <div class="dungeon-cards">
            ${cards.map((c, i) => `
              <div class="dungeon-card" data-card-idx="${i}" style="border-color:${c.catColor}; animation-delay:${i * 150}ms">
                <div class="dungeon-card-category" style="background:${c.catColor}">${c.category.toUpperCase()}</div>
                <div class="dungeon-card-icon">${c.icon}</div>
                <div class="dungeon-card-name">${c.name}</div>
                <div class="dungeon-card-desc">${c.desc}</div>
              </div>
            `).join('')}
          </div>
        ` : `
          <button class="prep-ready-btn dungeon-enter-btn" id="dungeon-enter">
            ${isFirstEntry ? 'ENTRER DANS LE DONJON' : 'ÉTAGE SUIVANT'}
          </button>
        `}

        <div class="dungeon-floor-preview">
          Prochain : Étage ${floor + 1}/${totalFloors}
          ${floor + 1 === 10 ? ' — MINI-BOSS' : ''}
          ${floor + 1 === 20 ? ' — BOSS FINAL' : ''}
        </div>
      </div>
    `;

    // Bind enter button.
    this.el.querySelector('#dungeon-enter')?.addEventListener('click', () => {
      this._startNextFloor();
    });

    // Bind card clicks.
    this._cards = cards;
    this.el.querySelectorAll('[data-card-idx]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.cardIdx);
        const card = this._cards[idx];
        if (card) {
          DungeonSystem.applyCard(card);
          this._startNextFloor();
        }
      });
    });
  }

  _startNextFloor() {
    const floorData = DungeonSystem.nextFloor();
    this.onNavigate('combat', {
      mode: 'dungeon',
      floor: floorData.floor,
      dungeonFloorData: floorData,
    });
  }

  _renderResult(result) {
    this.el.innerHTML = `
      <div class="dungeon-panel">
        <div class="dungeon-title" style="color:${result.victory ? 'var(--heal)' : 'var(--damage)'}">
          ${result.victory ? 'DONJON TERMINÉ !' : 'RUN TERMINÉ'}
        </div>
        <div class="dungeon-subtitle">
          ${result.floorsCleared}/${result.totalFloors} étages
        </div>
        <div class="prep-recap" style="margin:20px 0;">
          <div class="prep-recap-row"><span>Or gagné</span><span style="color:var(--gold)">+${result.goldEarned}◆</span></div>
          <div class="prep-recap-row"><span>Buffs utilisés</span><span>${result.buffsUsed}</span></div>
          ${result.victory ? '<div class="prep-recap-row"><span>Bonus completion</span><span style="color:var(--heal)">+500◆</span></div>' : ''}
        </div>
        <button class="prep-ready-btn" id="dungeon-exit">RETOUR À LA CARTE</button>
      </div>
    `;
    this.el.querySelector('#dungeon-exit')?.addEventListener('click', () => {
      this.onNavigate('map');
    });
  }
}
