// BestiaryScreen — le Codex du monde. 5 onglets : Héros / Monstres / Boss / Items / Monde.
// Chaque entrée a 2 états : mystère (silhouette + "???") ou découvert (fiche complète).

import { HEROES, HERO_RARITIES } from '../data/heroes.js';
import { MONSTER_POOLS } from '../data/monsters.js';
import { BOSSES_EXTENDED } from '../data/bosses-extended.js';
import { ITEM_TEMPLATES, RARITIES } from '../data/items.js';
import { ITEMS_EXTENDED } from '../data/items-extended.js';
import { HERO_BIOS, BIOME_LORE, WORLD_TIMELINE, LEGENDS } from '../data/lore.js';
import { BestiarySystem } from '../systems/BestiarySystem.js';
import { renderItemIcon } from '../data/item-icons.js';
import { escapeHtml } from '../utils/escape.js';

const BIOME_NAMES = {
  forest: 'Forêt', caves: 'Grottes', ruins: 'Ruines',
  hell: 'Enfer', snow: 'Neige', temple: 'Temple',
};

export class BestiaryScreen {
  constructor(onNavigate) {
    this.onNavigate = onNavigate;
    this._activeTab = 'heroes';
    this._create();
  }

  _create() {
    this.el = document.createElement('div');
    this.el.className = 'screen bestiary-screen';
    this._render();
  }

  _render() {
    // Calcule les totaux
    const totalHeroes = HEROES.length;
    const monsterNames = this._allMonsterNames();
    const totalMonsters = monsterNames.length;
    const totalBosses = BOSSES_EXTENDED.length;
    const totalItems = ITEM_TEMPLATES.length + ITEMS_EXTENDED.length;
    const totalBiomes = Object.keys(BIOME_NAMES).length;

    const counts = {
      heroes: BestiarySystem.getCount('heroes'),
      monsters: BestiarySystem.getCount('monsters'),
      bosses: BestiarySystem.getCount('bosses'),
      items: BestiarySystem.getCount('items'),
      biomes: BestiarySystem.getCount('biomes'),
    };

    this.el.innerHTML = `
      <div class="bestiary-container">
        <div class="bestiary-header">
          <button class="map-back-btn" id="bestiary-back">← Menu</button>
          <div class="bestiary-title">📖 CODEX DU MONDE</div>
          <div class="bestiary-total">${counts.heroes + counts.monsters + counts.bosses + counts.items + counts.biomes} / ${totalHeroes + totalMonsters + totalBosses + totalItems + totalBiomes}</div>
        </div>

        <div class="bestiary-tabs">
          ${this._tab('heroes',   '🦹 Héros',    counts.heroes,   totalHeroes)}
          ${this._tab('monsters', '👹 Monstres', counts.monsters, totalMonsters)}
          ${this._tab('bosses',   '💀 Boss',     counts.bosses,   totalBosses)}
          ${this._tab('items',    '⚔ Items',     counts.items,    totalItems)}
          ${this._tab('world',    '🌍 Monde',    counts.biomes,   totalBiomes)}
        </div>

        <div class="bestiary-content" id="bestiary-content">
          ${this._renderTab(this._activeTab)}
        </div>
      </div>
    `;

    // Events
    this.el.querySelector('#bestiary-back').addEventListener('click', () => this.onNavigate('menu'));
    this.el.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._activeTab = btn.dataset.tab;
        this._render();
      });
    });
  }

  _tab(id, label, count, total) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return `
      <button class="bestiary-tab ${this._activeTab === id ? 'active' : ''}" data-tab="${id}">
        <span class="bestiary-tab-label">${label}</span>
        <span class="bestiary-tab-count">${count}/${total}</span>
        <div class="bestiary-tab-progress"><div class="bestiary-tab-progress-bar" style="width:${pct}%"></div></div>
      </button>
    `;
  }

  _renderTab(tab) {
    switch (tab) {
      case 'heroes':   return this._renderHeroes();
      case 'monsters': return this._renderMonsters();
      case 'bosses':   return this._renderBosses();
      case 'items':    return this._renderItems();
      case 'world':    return this._renderWorld();
      default: return '';
    }
  }

  // ─── HÉROS ─────────────────────────────────────────────────────────

  _renderHeroes() {
    const byRarity = { MYTHIC: [], UR: [], SSR: [], SR: [], R: [] };
    for (const h of HEROES) {
      if (byRarity[h.rarity]) byRarity[h.rarity].push(h);
    }
    const sections = [];
    for (const rarity of ['MYTHIC', 'UR', 'SSR', 'SR', 'R']) {
      if (byRarity[rarity].length === 0) continue;
      const info = HERO_RARITIES[rarity];
      sections.push(`
        <div class="bestiary-section">
          <div class="bestiary-section-title" style="color:${info.color}">
            ${info.name} (${byRarity[rarity].length})
          </div>
          <div class="bestiary-grid">
            ${byRarity[rarity].map(h => this._renderHeroCard(h)).join('')}
          </div>
        </div>
      `);
    }
    return sections.join('');
  }

  _renderHeroCard(hero) {
    const discovered = BestiarySystem.isHeroDiscovered(hero.id);
    const info = HERO_RARITIES[hero.rarity];
    const bio = HERO_BIOS[hero.id];

    if (!discovered) {
      return `
        <div class="bestiary-card locked">
          <div class="bestiary-card-silhouette">❓</div>
          <div class="bestiary-card-name">???</div>
          <div class="bestiary-card-sub" style="color:${info.color}">${info.name}</div>
        </div>
      `;
    }

    return `
      <div class="bestiary-card" style="border-color:${info.color}">
        <div class="bestiary-card-badge" style="background:${info.color}">${info.name}</div>
        <div class="bestiary-card-name">${escapeHtml(hero.name)}</div>
        ${bio ? `<div class="bestiary-card-title"><em>${escapeHtml(bio.title)}</em></div>` : ''}
        <div class="bestiary-card-class">${escapeHtml(hero.class)}</div>
        ${bio?.origin ? `<div class="bestiary-card-lore">${escapeHtml(bio.origin)}</div>` : ''}
        ${bio?.quote ? `<div class="bestiary-card-quote">« ${escapeHtml(bio.quote)} »</div>` : ''}
        ${hero.passifs?.length > 0 ? `
          <div class="bestiary-card-section-label">Passifs</div>
          <div class="bestiary-card-passifs">
            ${hero.passifs.map(p => `<div class="bestiary-card-passif"><strong>${escapeHtml(p.name)}</strong> — ${escapeHtml(p.desc)}</div>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // ─── MONSTRES ──────────────────────────────────────────────────────

  _allMonsterNames() {
    const names = new Set();
    for (const biome of Object.values(MONSTER_POOLS)) {
      for (const m of biome.normal || []) {
        names.add(typeof m === 'string' ? m : m.name);
      }
    }
    return [...names];
  }

  _renderMonsters() {
    const biomes = Object.entries(MONSTER_POOLS);
    return biomes.map(([biomeId, pool]) => {
      const monsters = (pool.normal || []).map(m => typeof m === 'string' ? { name: m } : m);
      return `
        <div class="bestiary-section">
          <div class="bestiary-section-title">${BIOME_NAMES[biomeId] || biomeId} (${monsters.length})</div>
          <div class="bestiary-grid">
            ${monsters.map(m => this._renderMonsterCard(m, biomeId)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  _renderMonsterCard(monster, biomeId) {
    const discovered = BestiarySystem.isMonsterDiscovered(monster.name);
    if (!discovered) {
      return `
        <div class="bestiary-card locked">
          <div class="bestiary-card-silhouette">👹</div>
          <div class="bestiary-card-name">???</div>
          <div class="bestiary-card-sub">${BIOME_NAMES[biomeId]}</div>
        </div>
      `;
    }
    return `
      <div class="bestiary-card bestiary-card-monster">
        <div class="bestiary-card-icon">👹</div>
        <div class="bestiary-card-name">${escapeHtml(monster.name)}</div>
        <div class="bestiary-card-sub">Biome : ${BIOME_NAMES[biomeId]}</div>
        <div class="bestiary-card-lore">Créature ennemie rencontrée dans les vagues procédurales.</div>
      </div>
    `;
  }

  // ─── BOSS ──────────────────────────────────────────────────────────

  _renderBosses() {
    const byBiome = {};
    for (const b of BOSSES_EXTENDED) {
      if (!byBiome[b.biome]) byBiome[b.biome] = [];
      byBiome[b.biome].push(b);
    }

    return Object.entries(byBiome).map(([biomeId, bosses]) => `
      <div class="bestiary-section">
        <div class="bestiary-section-title">${BIOME_NAMES[biomeId] || biomeId} — ${bosses.length} boss</div>
        <div class="bestiary-grid">
          ${bosses.map(b => this._renderBossCard(b)).join('')}
        </div>
      </div>
    `).join('');
  }

  _renderBossCard(boss) {
    const discovered = BestiarySystem.isBossDiscovered(boss.id);
    if (!discovered) {
      return `
        <div class="bestiary-card locked bestiary-card-boss-locked">
          <div class="bestiary-card-silhouette">💀</div>
          <div class="bestiary-card-name">???</div>
          <div class="bestiary-card-sub">Vague ${boss.triggerWave}</div>
        </div>
      `;
    }
    return `
      <div class="bestiary-card bestiary-card-boss">
        <div class="bestiary-card-icon">💀</div>
        <div class="bestiary-card-name">${escapeHtml(boss.name)}</div>
        <div class="bestiary-card-sub">Vague ${boss.triggerWave} — ${boss.hp} HP</div>
        <div class="bestiary-card-quote">« ${escapeHtml(boss.dialogueIntro || '')} »</div>
        ${boss.mechanics?.length > 0 ? `
          <div class="bestiary-card-section-label">Mécaniques</div>
          <div class="bestiary-card-passifs">
            ${boss.mechanics.map(m => `<div class="bestiary-card-passif"><strong>${escapeHtml(m.name)}</strong> — ${escapeHtml(m.description || '')}</div>`).join('')}
          </div>
        ` : ''}
        ${boss.dialogueDefeat ? `<div class="bestiary-card-quote bestiary-card-quote-defeat">Défait : « ${escapeHtml(boss.dialogueDefeat)} »</div>` : ''}
      </div>
    `;
  }

  // ─── ITEMS ─────────────────────────────────────────────────────────

  _renderItems() {
    // Groupe par rareté
    const byRarity = {};
    for (const t of ITEM_TEMPLATES) {
      if (!byRarity.common) byRarity.common = [];
      byRarity.common.push({ ...t, rarity: 'common', isTemplate: true });
    }
    for (const i of ITEMS_EXTENDED) {
      const r = i.rarity;
      if (!byRarity[r]) byRarity[r] = [];
      byRarity[r].push({ ...i, templateId: i.id, name: i.name, rarity: r });
    }

    const order = ['mythic', 'legendary', 'epic', 'rare', 'uncommon', 'common'];
    return order.filter(r => byRarity[r]?.length).map(r => {
      const rarityInfo = RARITIES.find(x => x.id === r);
      return `
        <div class="bestiary-section">
          <div class="bestiary-section-title" style="color:${rarityInfo?.color || '#ccc'}">
            ${rarityInfo?.name || r} (${byRarity[r].length})
          </div>
          <div class="bestiary-grid">
            ${byRarity[r].map(item => this._renderItemCard(item, rarityInfo)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  _renderItemCard(item, rarityInfo) {
    // Les templates communs sont considérés comme "connus" par défaut (vu en combat)
    // mais les items uniques (ITEMS_EXTENDED) nécessitent d'être droppés
    const discovered = item.isTemplate ? true : BestiarySystem.isItemDiscovered(item.templateId);

    if (!discovered) {
      return `
        <div class="bestiary-card locked">
          <div class="bestiary-card-silhouette">❓</div>
          <div class="bestiary-card-name">???</div>
          <div class="bestiary-card-sub" style="color:${rarityInfo?.color}">${rarityInfo?.name || ''}</div>
        </div>
      `;
    }

    // Pour les templates on a un icon SVG
    const iconItem = {
      templateId: item.templateId || item.id,
      type: item.slot === 'trinket' ? 'accessory' : (item.type || item.slot || 'weapon'),
      rarity: item.rarity,
      rarityColor: rarityInfo?.color || '#ccc',
    };

    return `
      <div class="bestiary-card bestiary-card-item" style="border-color:${rarityInfo?.color}">
        <div class="bestiary-card-item-icon">${renderItemIcon(iconItem)}</div>
        <div class="bestiary-card-name">${escapeHtml(item.name)}</div>
        <div class="bestiary-card-sub" style="color:${rarityInfo?.color}">${rarityInfo?.name || ''}</div>
        ${item.effect ? `<div class="bestiary-card-lore">${escapeHtml(item.effect)}</div>` : ''}
        ${item.flavor ? `<div class="bestiary-card-quote">« ${escapeHtml(item.flavor)} »</div>` : ''}
        ${item.stats ? `<div class="bestiary-card-stats">
          ${Object.entries(item.stats).map(([k, v]) => `<span>+${v} ${k.toUpperCase()}</span>`).join(' · ')}
        </div>` : ''}
      </div>
    `;
  }

  // ─── MONDE (biomes + timeline + légendes) ──────────────────────────

  _renderWorld() {
    return `
      <div class="bestiary-section">
        <div class="bestiary-section-title">🗺 Biomes (${Object.keys(BIOME_LORE).length})</div>
        <div class="bestiary-grid">
          ${Object.entries(BIOME_LORE).map(([id, b]) => this._renderBiomeCard(id, b)).join('')}
        </div>
      </div>
      <div class="bestiary-section">
        <div class="bestiary-section-title">📜 Chronologie du Monde</div>
        <div class="bestiary-timeline">
          ${WORLD_TIMELINE.map(e => `
            <div class="bestiary-timeline-event">
              <div class="bestiary-timeline-year">An ${e.year}</div>
              <div class="bestiary-timeline-content">
                <div class="bestiary-timeline-title">${escapeHtml(e.title)}</div>
                <div class="bestiary-timeline-desc">${escapeHtml(e.desc)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="bestiary-section">
        <div class="bestiary-section-title">⭐ Légendes (${LEGENDS.length})</div>
        <div class="bestiary-grid">
          ${LEGENDS.map(l => `
            <div class="bestiary-card">
              <div class="bestiary-card-icon">⭐</div>
              <div class="bestiary-card-name">${escapeHtml(l.title)}</div>
              <div class="bestiary-card-lore">${escapeHtml(l.text)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  _renderBiomeCard(id, biome) {
    const discovered = BestiarySystem.isBiomeDiscovered(id);
    if (!discovered) {
      return `
        <div class="bestiary-card locked">
          <div class="bestiary-card-silhouette">🗺</div>
          <div class="bestiary-card-name">Biome inconnu</div>
          <div class="bestiary-card-sub">Explorez pour découvrir</div>
        </div>
      `;
    }
    return `
      <div class="bestiary-card">
        <div class="bestiary-card-icon">🗺</div>
        <div class="bestiary-card-name">${escapeHtml(biome.name)}</div>
        <div class="bestiary-card-lore">${escapeHtml(biome.history)}</div>
        <div class="bestiary-card-section-label">Événement marquant</div>
        <div class="bestiary-card-quote">${escapeHtml(biome.famousEvent)}</div>
      </div>
    `;
  }

  show() { document.body.append(this.el); }
  hide() { if (this.el) this.el.remove(); }
}
