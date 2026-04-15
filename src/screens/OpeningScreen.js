// OpeningScreen — cinématique narrative d'introduction (first-time only).
//
// 5 scènes poétiques avec typewriter effect qui posent l'univers.
// Affiché une seule fois au premier lancement (flag localStorage).
// Le joueur peut skip à tout moment.

const STORAGE_KEY = 'idle_autobattler_opening_done';

const SCENES = [
  {
    bg: 'linear-gradient(180deg, #0a0a2e 0%, #1a1a3e 100%)',
    text: 'Le monde connaissait la paix. Six biomes en harmonie, du murmure des forêts aux chants du temple sacré. Les Commandants veillaient, gardiens silencieux de l\'équilibre.',
    delay: 80,
  },
  {
    bg: 'linear-gradient(180deg, #2a0a0a 0%, #1a0505 100%)',
    text: 'Puis les portails se sont brisés. Des créatures d\'un autre plan ont déferlé, corrompant chaque territoire. La Forêt Ancestrale brûle. Les Grottes hurlent. Le Temple des Dieux agonise.',
    delay: 70,
  },
  {
    bg: 'linear-gradient(180deg, #0a1a2e 0%, #0a0a1e 100%)',
    text: 'Les Commandants sont tombés un à un. Seul reste un espoir : toi. Le dernier. Celui que les oracles n\'avaient pas prévu.',
    delay: 90,
  },
  {
    bg: 'linear-gradient(180deg, #1a1a0a 0%, #2a2a0a 100%)',
    text: 'Rassemble tes héros. Forge ton escouade. Traverse les six biomes corrompus. Et peut-être — peut-être — renverse le destin que les dieux ont abandonné.',
    delay: 75,
  },
  {
    bg: 'linear-gradient(180deg, #fbbf24 0%, #0a0a2e 30%)',
    text: 'Commandant, le monde attend. Quel genre de leader seras-tu ?',
    delay: 100,
    choices: [
      { label: 'Un protecteur', desc: 'La vie de mes héros passe avant tout.' },
      { label: 'Un conquérant', desc: 'Chaque biome tombera sous ma bannière.' },
      { label: 'Un stratège', desc: 'La patience est mon arme la plus tranchante.' },
    ],
  },
];

export class OpeningScreen {
  constructor(onComplete) {
    this.onComplete = onComplete;
    this._currentScene = 0;
    this._typing = false;
    this._typingTimer = null;
    this.el = null;
  }

  /** Retourne true si l'opening a déjà été vu. */
  static isDone() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return true; }
  }

  static markDone() {
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }

  show() {
    this.el = document.createElement('div');
    this.el.className = 'screen opening-screen';
    document.body.append(this.el);
    this._renderScene();
  }

  hide() {
    if (this._typingTimer) clearTimeout(this._typingTimer);
    if (this.el) this.el.remove();
  }

  _renderScene() {
    const scene = SCENES[this._currentScene];
    if (!scene) {
      this._finish();
      return;
    }

    this.el.style.background = scene.bg;
    this.el.innerHTML = `
      <div class="opening-content">
        <div class="opening-scene-num">${this._currentScene + 1} / ${SCENES.length}</div>
        <div class="opening-text" id="opening-text"></div>
        ${scene.choices ? `
          <div class="opening-choices" id="opening-choices" style="display:none;">
            ${scene.choices.map((c, i) => `
              <button class="opening-choice" data-idx="${i}">
                <span class="opening-choice-label">${c.label}</span>
                <span class="opening-choice-desc">${c.desc}</span>
              </button>
            `).join('')}
          </div>
        ` : ''}
        <div class="opening-controls">
          <button class="opening-skip" id="opening-skip">Passer l'intro</button>
          ${!scene.choices ? '<button class="opening-next" id="opening-next" style="display:none;">Continuer ▶</button>' : ''}
        </div>
      </div>
    `;

    // Skip button
    this.el.querySelector('#opening-skip')?.addEventListener('click', () => this._finish());

    // Next button (apparaît après le typewriter)
    const nextBtn = this.el.querySelector('#opening-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this._currentScene++;
        this._renderScene();
      });
    }

    // Choices (scène 5)
    this.el.querySelectorAll('.opening-choice')?.forEach(btn => {
      btn.addEventListener('click', () => {
        // Le choix n'affecte rien mécaniquement — c'est juste de l'immersion
        try {
          localStorage.setItem('idle_autobattler_commander_style', btn.querySelector('.opening-choice-label').textContent);
        } catch {}
        this._finish();
      });
    });

    // Typewriter effect
    this._typewrite(scene.text, scene.delay, () => {
      if (nextBtn) nextBtn.style.display = '';
      const choicesEl = this.el.querySelector('#opening-choices');
      if (choicesEl) {
        choicesEl.style.display = '';
        choicesEl.classList.add('opening-choices-visible');
      }
    });
  }

  _typewrite(text, delayMs, onDone) {
    const el = this.el.querySelector('#opening-text');
    if (!el) return;
    el.textContent = '';
    let i = 0;
    this._typing = true;

    const tick = () => {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        this._typingTimer = setTimeout(tick, delayMs);
      } else {
        this._typing = false;
        if (onDone) onDone();
      }
    };
    tick();

    // Click anywhere to skip typewriter (instant reveal)
    const skipType = () => {
      if (this._typing) {
        clearTimeout(this._typingTimer);
        el.textContent = text;
        this._typing = false;
        if (onDone) onDone();
      }
    };
    el.addEventListener('click', skipType, { once: true });
  }

  _finish() {
    OpeningScreen.markDone();
    this.hide();
    if (this.onComplete) this.onComplete();
  }
}
