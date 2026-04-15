// SoundSystem — sons 8-bit procéduraux via ZzFX (zéro fichier audio).
//
// ZzFX génère des sons en temps réel via l'API Web Audio.
// Chaque son = un array de paramètres numériques (volume, fréquence, durée, etc.)
// Pèse ~1 KB, aucun téléchargement.
//
// Catalogue de sons personnalisés pour chaque event du jeu :
//   SoundSystem.play('hit')       → bip sec
//   SoundSystem.play('crit')      → impact lourd
//   SoundSystem.play('kill')      → explosion
//   SoundSystem.play('bossSpawn') → grondement
//   SoundSystem.play('levelUp')   → jingle ascendant
//   SoundSystem.play('pullR')     → bip discret
//   SoundSystem.play('pullSSR')   → fanfare
//   SoundSystem.play('pullUR')    → fanfare épique
//   SoundSystem.play('loot')      → tintement
//   SoundSystem.play('gold')      → pièce
//   SoundSystem.play('click')     → click UI
//   SoundSystem.play('error')     → buzz
//   SoundSystem.play('heal')      → chime doux

// ── ZzFX micro (1 KB) — Crédit : Frank Force, MIT License ──────────────────
// https://github.com/KilledByAPixel/ZzFX
const zzfx=(...z)=>{let Z=zzfxG(...z);zzfxP(Z);return Z};
const zzfxP=(...z)=>{let Z=zzfxX.createBufferSource();Z.buffer=zzfxB(...z);Z.connect(zzfxX.destination);Z.start();return Z};
const zzfxG=(e=1,t=.05,n=220,r=0,o=0,a=.1,i=0,s=1,u=0,f=0,c=0,l=0,h=0,d=0,p=0,m=0,g=0,b=1,w=0,v=0)=>{let x=2*Math.PI,y=u*=500*x/44100/44100,M=n*=(1+2*t*Math.random()-t)*x/44100,S=[],k=0,A=0,j=0,_=1,E=0,F=0,R=0;e=99+44100*r;r=o*44100;o=a*44100;a=g*44100;f=f*500*x/44100/44100;let P=p*x/44100,T=m*44100,B=b*44100,C=(1-w)*44100;for(r=r+e+o+a+T|0;j<r;S[j++]=R){++F>T&&(n+=u+=f,M+=n,_&&++_>B&&(n=M=b=_=0),v&&++E>C&&(u=n=y,E=0,_=_||1));I=i*(1+1e8*(Math.sin(j)+1)%2);n+=I;let q=j/e,z=j<e?q:j<e+r?1-(q=(j-e)/r)*(2-q):j<r-a?(j<r-a-o?1:1-(j-r+a+o)/o):0;R=((j%((100*(1-d+1e-8)|0))==0?2*Math.random()-1:Math.sin(j*P))*z*e/1e4*l+n)*z*e/1e4;R=(h?1-d+d*Math.sin(2e3*j*x/44100):1)*R;if(c)R=R/2+(c>1?Math.sin(R*c*x):Math.cos(R*c*x))/2;R=R*(e=e*(1+m*Math.sin(j*m*x/44100)))}return S};
const zzfxB=(...z)=>{let Z=zzfxX.createBuffer(z.length,z[0].length,44100);z.map((b,i)=>Z.getChannelData(i).set(b));return Z};
let zzfxX;

// ── Catalogue de sons du jeu ───────────────────────────────────────────────
// Chaque entrée = array de paramètres ZzFX.
// Généré/ajusté via https://killedbyapixel.github.io/ZzFX/
const SOUNDS = {
  // ── Combat ──
  hit:        [.3,.05,300,.01,.01,.05,1,1.5,0,0,0,0,0,0,0,0,0,.5,0],
  crit:       [.6,.05,200,.01,.02,.1,2,2,0,0,0,0,0,0,0,.1,0,.5,.01],
  kill:       [.5,.05,100,.01,.05,.2,4,1,0,0,0,0,0,0,0,.2,.1,.3,.05],
  bossSpawn:  [.8,.1,50,.05,.3,.3,0,1,0,0,0,0,0,0,0,0,.1,.5,.1],
  bossDeath:  [1,.1,80,.02,.4,.5,4,2,0,0,-50,.05,.1,0,0,.3,.15,.5,.05],

  // ── Progression ──
  levelUp:    [.5,.05,500,.01,.1,.2,0,1.5,0,0,100,.05,.05,0,0,0,0,.7,.05],
  heal:       [.3,.05,600,.02,.05,.15,0,1,0,0,50,.05,0,0,0,0,0,.8,0],
  gold:       [.2,.05,1200,.01,.01,.02,0,1,0,0,0,0,0,0,0,0,0,.3,0],
  xp:         [.15,.05,800,.01,.02,.05,0,1.2,0,0,200,.05,0,0,0,0,0,.4,0],

  // ── Gacha ──
  pullR:      [.2,.05,400,.01,.01,.05,0,1,0,0,0,0,0,0,0,0,0,.3,0],
  pullSR:     [.4,.05,500,.01,.05,.1,0,1.5,0,0,100,.03,0,0,0,0,0,.5,.02],
  pullSSR:    [.7,.05,600,.01,.1,.2,0,1.5,0,0,200,.05,.05,0,0,0,.05,.7,.03],
  pullUR:     [1,.05,400,.02,.2,.4,0,2,0,0,300,.05,.1,0,0,.1,.1,1,.05],
  pullMYTHIC: [1,.1,300,.05,.5,.6,0,2.5,0,0,400,.08,.15,0,0,.2,.15,1,.08],
  pityBreak:  [.9,.05,350,.02,.3,.5,0,2,0,0,350,.06,.1,0,0,.15,.1,.9,.06],

  // ── UI ──
  click:      [.1,.05,1200,.01,0,.02,0,1,0,0,0,0,0,0,0,0,0,.2,0],
  error:      [.3,.05,200,.01,.01,.1,3,1,0,0,0,0,0,0,0,0,0,.4,0],
  menuOpen:   [.15,.05,800,.01,.01,.05,0,1.2,0,0,50,.02,0,0,0,0,0,.3,0],
  equip:      [.25,.05,1000,.01,.02,.05,0,1,0,0,100,.03,0,0,0,0,0,.4,0],

  // ── Loot ──
  lootCommon: [.15,.05,900,.01,.01,.03,0,1,0,0,0,0,0,0,0,0,0,.2,0],
  lootRare:   [.3,.05,700,.01,.03,.08,0,1.3,0,0,50,.03,0,0,0,0,0,.4,.01],
  lootEpic:   [.5,.05,500,.01,.05,.15,0,1.5,0,0,150,.04,.05,0,0,0,.03,.6,.02],
  lootMythic: [.8,.05,400,.02,.1,.3,0,2,0,0,250,.06,.1,0,0,.1,.08,.8,.04],

  // ── Events spéciaux ──
  achievement:[.5,.05,600,.01,.1,.15,0,1.5,0,0,150,.05,.05,0,0,0,.03,.6,.03],
  wave:       [.2,.05,400,.01,.02,.08,0,1.2,0,0,0,0,0,0,0,0,0,.4,.01],
  prestige:   [.8,.1,300,.03,.3,.4,0,2,0,0,200,.06,.1,0,0,.1,.1,.8,.05],
};

class SoundSystemImpl {
  constructor() {
    this._enabled = true;
    this._volume = 0.5;   // volume global (0-1)
    this._initialized = false;
  }

  /**
   * Initialise le contexte audio (doit être appelé après une interaction user).
   * Web Audio API exige un geste utilisateur pour démarrer.
   */
  init() {
    if (this._initialized) return;
    try {
      zzfxX = new (window.AudioContext || window.webkitAudioContext)();
      // Chrome/Safari démarrent souvent en "suspended" — force le resume
      if (zzfxX.state === 'suspended') {
        zzfxX.resume().catch(() => {});
      }
      this._initialized = true;
    } catch (e) {
      console.warn('[SoundSystem] Web Audio non disponible :', e.message);
      this._enabled = false;
    }
  }

  /**
   * Joue un son par son nom. No-op si désactivé ou si le son n'existe pas.
   * Auto-init si pas encore initialisé (rattrape le cas où le premier clic
   * n'a pas été capté par main.js).
   *
   * @param {string} name — clé dans SOUNDS (ex: 'hit', 'pullUR', 'gold')
   * @param {number} [volumeOverride] — volume spécifique (0-1), sinon utilise _volume global
   */
  play(name, volumeOverride) {
    if (!this._enabled) return;

    // Auto-init au premier play (rattrape le cas où le listener click de main.js
    // n'a pas encore fire, mais un système appelle play() quand même)
    if (!this._initialized) {
      this.init();
      if (!this._initialized) return; // init a échoué → abandon
    }

    // Resume si suspendu (peut arriver après un onglet inactif)
    if (zzfxX && zzfxX.state === 'suspended') {
      zzfxX.resume().catch(() => {});
    }

    const params = SOUNDS[name];
    if (!params) return;

    // Clone pour ne pas muter l'original + applique le volume
    const p = [...params];
    p[0] = (p[0] || 0.5) * (volumeOverride ?? this._volume);

    try {
      zzfx(...p);
    } catch (e) {
      // Silencieusement ignorer les erreurs audio (contexte suspendu, etc.)
    }
  }

  /** Active/désactive les sons. */
  toggle() {
    this._enabled = !this._enabled;
    return this._enabled;
  }

  /** Retourne true si les sons sont activés. */
  isEnabled() { return this._enabled; }

  /** Change le volume global (0-1). */
  setVolume(v) { this._volume = Math.max(0, Math.min(1, v)); }
  getVolume() { return this._volume; }
}

export const SoundSystem = new SoundSystemImpl();
