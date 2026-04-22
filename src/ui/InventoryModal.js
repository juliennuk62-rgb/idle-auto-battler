// InventoryModal — refonte premium avec filtres, tri, batch actions, comparateur.
//
// Layout :
//   ┌───────────────────────────────────────────────────────┐
//   │ ÉQUIPE — chaque allié + ses 3 slots (arme/armure/acc) │
//   ├───────────────────────────────────────────────────────┤
//   │ TOOLBAR — compteur + search + filtres + tri           │
//   ├─────────────────────────────┬─────────────────────────┤
//   │ SAC À DOS (grille aérée)    │ DÉTAILS + FORGE         │
//   │                             │ (comparateur si ciblage)│
//   ├─────────────────────────────┴─────────────────────────┤
//   │ BATCH ACTIONS (vendre par rareté, tout désequiper)    │
//   └───────────────────────────────────────────────────────┘
//
// Clic item dans le sac → sélectionné → clic sur un slot allié → équipé.
// Clic item équipé sur un allié → sélectionné → double-clic → déséquipé.

import { Modal } from './Modal.js';
import { ItemSystem } from '../systems/ItemSystem.js';
import { renderItemIcon } from '../data/item-icons.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { sellValue, RARITY_INDEX, RARITIES, SETS } from '../data/items.js';
import { gradeName } from '../data/grades.js';
import { BALANCE } from '../data/balance.js';

const SLOT_LABELS = { weapon: '⚔ Arme', armor: '🛡 Armure', accessory: '💍 Acc.' };
const SLOT_TYPES = ['weapon', 'armor', 'accessory'];
const SET_IDS = Object.keys(SETS);

// Tris disponibles — chacun a une fonction de comparaison.
const SORT_OPTIONS = [
  { key: 'rarity_desc', label: 'Rareté ↓',   fn: (a, b) => (RARITY_INDEX[b.rarity] ?? 0) - (RARITY_INDEX[a.rarity] ?? 0) },
  { key: 'rarity_asc',  label: 'Rareté ↑',   fn: (a, b) => (RARITY_INDEX[a.rarity] ?? 0) - (RARITY_INDEX[b.rarity] ?? 0) },
  { key: 'atk_desc',    label: 'ATK ↓',      fn: (a, b) => (b.stats?.atk || 0) - (a.stats?.atk || 0) },
  { key: 'hp_desc',     label: 'HP ↓',       fn: (a, b) => (b.stats?.hp || 0) - (a.stats?.hp || 0) },
  { key: 'value_desc',  label: 'Valeur ↓',   fn: (a, b) => sellValue(b) - sellValue(a) },
  { key: 'name_asc',    label: 'Nom A→Z',    fn: (a, b) => (a.name || '').localeCompare(b.name || '', 'fr') },
];

export class InventoryModal {
  constructor(options = {}) {
    this.game = options.game;
    this.modal = new Modal({
      title: 'INVENTAIRE',
      hotkey: 'I',
      width: 1000,
      onOpen: () => this._refresh(),
    });
    this._selectedItem = null;        // item uid sélectionné dans le sac
    this._filterType = null;          // 'weapon' | 'armor' | 'accessory' | null (target d'un slot cliqué)
    this._filterFighter = null;       // fighter id ciblé par le slot cliqué
    this._selectedForForge = [];

    // Filtres premium (persistés pendant la session du modal)
    this._filter = {
      rarities: new Set(),            // IDs : common, uncommon, ... (vide = tous)
      sets: new Set(),                // IDs : forest, caves, ... (vide = tous ; "_none" = items sans set/uniques)
      equipped: 'all',                // 'all' | 'equipped' | 'free'
      search: '',                     // texte
    };
    this._sortKey = 'rarity_desc';    // key dans SORT_OPTIONS
  }

  _getFighters() {
    // En combat → vrais fighters avec sprites
    const scene = this.game?.scene?.getScene('CombatScene');
    if (scene?.combat?.teamA?.length) return scene.combat.teamA;

    // Hors combat (menu) → stubs pour les 5 slots d'équipe
    if (!this._menuFighters) {
      this._menuFighters = [
        { id: 'slot_1', name: 'Guerrier 1', class: 'warrior', level: 1, grade: 1, _recomputeStats: () => {} },
        { id: 'slot_2', name: 'Guerrier 2', class: 'warrior', level: 1, grade: 1, _recomputeStats: () => {} },
        { id: 'slot_3', name: 'Archer',     class: 'archer',  level: 1, grade: 1, _recomputeStats: () => {} },
        { id: 'slot_4', name: 'Mage',       class: 'mage',    level: 1, grade: 1, _recomputeStats: () => {} },
        { id: 'slot_5', name: 'Healer',     class: 'healer',  level: 1, grade: 1, _recomputeStats: () => {} },
      ];
    }
    return this._menuFighters;
  }

  // ─── Filtres & tri ────────────────────────────────────────────────────

  /** Applique tous les filtres actuels + le tri, retourne la liste visible. */
  _getVisibleItems() {
    const all = ItemSystem.getAll();
    const q = this._filter.search.trim().toLowerCase();
    const filtered = all.filter(item => {
      // Équipé / Libre
      if (this._filter.equipped === 'equipped' && !item.equippedOn) return false;
      if (this._filter.equipped === 'free' && item.equippedOn) return false;

      // Filtre type (cliquée depuis un slot allié) — prioritaire
      if (this._filterType && item.type !== this._filterType) return false;

      // Rareté
      if (this._filter.rarities.size > 0 && !this._filter.rarities.has(item.rarity)) return false;

      // Set
      if (this._filter.sets.size > 0) {
        const key = item.set || '_none';
        if (!this._filter.sets.has(key)) return false;
      }

      // Recherche textuelle
      if (q && !(item.name || '').toLowerCase().includes(q)) return false;

      return true;
    });

    const sort = SORT_OPTIONS.find(s => s.key === this._sortKey) || SORT_OPTIONS[0];
    return filtered.sort(sort.fn);
  }

  // ─── Render principal ─────────────────────────────────────────────────

  _refresh() {
    const fighters = this._getFighters();
    const allItems = ItemSystem.getAll();
    const visible = this._getVisibleItems();
    const locked = ItemSystem.equipmentLocked;
    const maxSize = BALANCE.loot.inventory_size;
    const usedSlots = allItems.length;
    const fillPct = Math.min(100, Math.round((usedSlots / maxSize) * 100));
    this._selectedItem = null;

    const html = `
      ${locked ? '<div class="inv-locked-banner">🔒 Équipement verrouillé pendant le combat — attendez le changement de biome</div>' : ''}

      <div class="inv-section-title">ÉQUIPE</div>
      <div class="inv-team-row">
        ${fighters.map(f => this._renderAllySlots(f)).join('')}
      </div>

      ${this._renderToolbar(usedSlots, maxSize, fillPct, visible.length)}

      <div class="inv-main-grid">
        <div class="inv-main-left">
          <div class="inventory-grid" id="inv-grid">
            ${visible.length === 0
              ? `<div class="inv-empty-state">${allItems.length === 0 ? 'Inventaire vide — tuez des monstres !' : 'Aucun item ne correspond aux filtres.'}</div>`
              : visible.map(item => this._renderItem(item)).join('')}
          </div>

          ${this._renderBatchActions(allItems)}
        </div>
        <div class="inv-main-right">
          <div class="inv-section-title">DÉTAILS</div>
          <div id="inv-detail" class="inv-detail">
            <div class="inv-detail-hint">Cliquez sur un item</div>
          </div>
          <div class="inv-section-title" style="margin-top:12px;">FORGE</div>
          <div id="inv-forge" class="inv-forge-default">
            Clic droit × 3 items même rareté
          </div>
        </div>
      </div>
    `;
    this.modal.setContent(html);
    this._bindAll();
  }

  // ─── Toolbar : compteur + search + filtres + tri ──────────────────────

  _renderToolbar(used, max, pct, visible) {
    const f = this._filter;
    return `
      <div class="inv-toolbar">
        <div class="inv-counter">
          <div class="inv-counter-label">${used} / ${max} items</div>
          <div class="inv-counter-bar">
            <div class="inv-counter-bar-fill" style="width:${pct}%;background:${pct >= 90 ? 'var(--damage)' : pct >= 70 ? 'var(--gold)' : 'var(--heal)'};"></div>
          </div>
          <div class="inv-counter-visible">${visible} visibles</div>
        </div>

        <div class="inv-search-wrap">
          <span class="inv-search-icon">🔍</span>
          <input type="text" class="inv-search" id="inv-search" placeholder="Rechercher..." value="${this._escape(f.search)}" />
          ${f.search ? '<button class="inv-search-clear" id="inv-search-clear" title="Effacer">✕</button>' : ''}
        </div>

        <div class="inv-toolbar-row">
          <div class="inv-filter-group">
            <span class="inv-filter-label">Rareté</span>
            ${RARITIES.map(r => `
              <button class="inv-filter-chip ${f.rarities.has(r.id) ? 'active' : ''}"
                      data-filter-rarity="${r.id}"
                      style="${f.rarities.has(r.id) ? `background:${r.color}20;border-color:${r.color};color:${r.color}` : ''}">
                ${r.name}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="inv-toolbar-row">
          <div class="inv-filter-group">
            <span class="inv-filter-label">Équipé</span>
            <button class="inv-filter-chip ${f.equipped === 'all' ? 'active' : ''}" data-filter-eq="all">Tous</button>
            <button class="inv-filter-chip ${f.equipped === 'free' ? 'active' : ''}" data-filter-eq="free">Libres</button>
            <button class="inv-filter-chip ${f.equipped === 'equipped' ? 'active' : ''}" data-filter-eq="equipped">Équipés</button>
          </div>

          <div class="inv-filter-group">
            <span class="inv-filter-label">Set</span>
            ${SET_IDS.map(id => `
              <button class="inv-filter-chip ${f.sets.has(id) ? 'active' : ''}" data-filter-set="${id}">${SETS[id].name.replace(/^Set /, '')}</button>
            `).join('')}
            <button class="inv-filter-chip ${f.sets.has('_none') ? 'active' : ''}" data-filter-set="_none">Uniques</button>
          </div>

          <div class="inv-filter-group inv-sort-group">
            <span class="inv-filter-label">Tri</span>
            <select class="inv-sort-select" id="inv-sort">
              ${SORT_OPTIONS.map(s => `<option value="${s.key}" ${this._sortKey === s.key ? 'selected' : ''}>${s.label}</option>`).join('')}
            </select>
          </div>

          ${this._hasActiveFilters() ? '<button class="inv-filter-reset" id="inv-filter-reset" title="Tout réinitialiser">↺ Reset</button>' : ''}
        </div>

        ${this._filterType
          ? `<div class="inv-filter-badge">
              🎯 Ciblage : ${SLOT_LABELS[this._filterType]}
              <button class="inv-filter-clear" id="clear-filter-target">✕</button>
            </div>`
          : ''}
      </div>
    `;
  }

  _hasActiveFilters() {
    return this._filter.rarities.size > 0
      || this._filter.sets.size > 0
      || this._filter.equipped !== 'all'
      || this._filter.search.trim().length > 0
      || this._sortKey !== 'rarity_desc';
  }

  // ─── Batch actions ────────────────────────────────────────────────────

  _renderBatchActions(allItems) {
    // Compte les items vendables par rareté (non équipés, non uniques)
    const sellable = allItems.filter(i => !i.equippedOn && !i.isUnique);
    const byRarity = {};
    for (const r of RARITIES) byRarity[r.id] = sellable.filter(i => i.rarity === r.id);

    // On ne propose QUE common/uncommon/rare pour protéger les épiques+
    const safeRarities = ['common', 'uncommon', 'rare'];
    const hasAny = safeRarities.some(r => byRarity[r].length > 0);
    if (!hasAny) return '';

    return `
      <div class="inv-batch-actions">
        <span class="inv-batch-label">Vendre tous :</span>
        ${safeRarities.map(rid => {
          const r = RARITIES.find(x => x.id === rid);
          const items = byRarity[rid];
          if (items.length === 0) return '';
          const totalGold = items.reduce((s, i) => s + sellValue(i), 0);
          return `
            <button class="inv-batch-btn" data-batch-sell="${rid}" style="border-color:${r.color};color:${r.color};">
              ${r.name} (${items.length}) · +${totalGold}◆
            </button>
          `;
        }).filter(Boolean).join('')}
      </div>
    `;
  }

  // ─── Render allié avec ses 3 slots ────────────────────────────────────

  _renderAllySlots(fighter) {
    const equipped = ItemSystem.getEquipped(fighter.id);
    const gName = gradeName(fighter.class, fighter.grade) || fighter.name;
    const SPRITE_URLS = { warrior: 'assets/sprites/allies/warrior.png', archer: 'assets/sprites/allies/archer.png', mage: 'assets/sprites/allies/mage.png', healer: 'assets/sprites/allies/healer.png' };
    const spriteUrl = SPRITE_URLS[fighter.class] || SPRITE_URLS.warrior;

    return `
      <div class="inv-ally-card ${this._filterFighter === fighter.id ? 'targeted' : ''}">
        <div class="inv-ally-header">
          <div class="inv-ally-sprite" style="background:url('${spriteUrl}') center/contain no-repeat;"></div>
          <div>
            <div class="inv-ally-name">${gName}</div>
            <div class="inv-ally-level">L${fighter.level}</div>
          </div>
        </div>
        <div class="inv-ally-slots">
          ${SLOT_TYPES.map(slot => {
            const item = equipped[slot];
            if (item) {
              return `<div class="inv-ally-slot filled locked" data-unequip="${item.uid}" data-fighter="${fighter.id}" data-slot="${slot}"
                           style="border-color:${item.rarityColor};" title="${this._escape(item.name)} (${item.rarityName}) — clic pour détails, double-clic pour retirer">
                ${renderItemIcon(item)}
                <span class="slot-badge-on">ON</span>
              </div>`;
            }
            return `<div class="inv-ally-slot empty" data-equip-slot="${slot}" data-fighter="${fighter.id}" title="${SLOT_LABELS[slot]} — vide">
              <span class="slot-ghost">${slot === 'weapon' ? '⚔' : slot === 'armor' ? '🛡' : '💍'}</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ─── Render item dans le sac ──────────────────────────────────────────

  _renderItem(item) {
    const typeLabels = { weapon: 'ARME', armor: 'ARMURE', accessory: 'ACCES.' };
    const typeLabel = typeLabels[item.type] || '?';
    const shortName = item.name.length > 12 ? item.name.slice(0, 11) + '.' : item.name;
    const isEquipped = !!item.equippedOn;
    return `<div class="inv-item ${isEquipped ? 'equipped' : ''}" data-uid="${item.uid}" data-type="${item.type}"
                 style="border-color:${item.rarityColor};"
                 title="${this._escape(item.name)} (${item.rarityName} · ${typeLabel})${isEquipped ? ' — ÉQUIPÉ' : ''}">
      ${isEquipped ? '<div class="inv-item-equipped-badge">ON</div>' : ''}
      ${item.tier ? `<div class="inv-item-tier">T${item.tier}</div>` : ''}
      <div class="inv-item-icon">${renderItemIcon(item)}</div>
      <div class="inv-item-name">${this._escape(shortName)}</div>
      <div class="inv-item-rarity" style="background:${item.rarityColor};"></div>
    </div>`;
  }

  // ─── Bind events ──────────────────────────────────────────────────────

  _bindAll() {
    const body = this.modal.body;

    // Click item dans le sac
    body.querySelectorAll('#inv-grid .inv-item').forEach(el => {
      const uid = el.dataset.uid;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this._selectItem(uid);
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._toggleForgeSelect(uid);
      });
    });

    // Click sur slot vide allié
    body.querySelectorAll('[data-equip-slot]').forEach(slot => {
      slot.addEventListener('click', () => {
        if (ItemSystem.equipmentLocked) return;
        const slotType = slot.dataset.equipSlot;
        const fighterId = slot.dataset.fighter;
        if (this._selectedItem) {
          const item = ItemSystem.getAll().find(i => i.uid === this._selectedItem);
          if (item && item.type === slotType) {
            ItemSystem.equip(item.uid, fighterId);
            const fighter = this._getFighters().find(f => f.id === fighterId);
            if (fighter) fighter._recomputeStats();
            this._selectedItem = null;
            this._filterType = null;
            this._filterFighter = null;
            this._refresh();
            return;
          }
        }
        this._filterType = slotType;
        this._filterFighter = fighterId;
        this._selectedItem = null;
        this._refresh();
      });
    });

    // Clear filter ciblage
    body.querySelector('#clear-filter-target')?.addEventListener('click', () => {
      this._filterType = null;
      this._filterFighter = null;
      this._refresh();
    });

    // Click/dblclick sur slot rempli
    body.querySelectorAll('[data-unequip]').forEach(slot => {
      slot.addEventListener('dblclick', () => {
        if (ItemSystem.equipmentLocked) return;
        const fId = slot.dataset.fighter;
        ItemSystem.unequip(slot.dataset.unequip);
        const fighter = this._getFighters().find(f => f.id === fId);
        if (fighter) fighter._recomputeStats();
        this._refresh();
      });
      slot.addEventListener('click', () => {
        this._showDetail(slot.dataset.unequip);
      });
    });

    // ── Filtres ──
    body.querySelectorAll('[data-filter-rarity]').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = btn.dataset.filterRarity;
        if (this._filter.rarities.has(r)) this._filter.rarities.delete(r);
        else this._filter.rarities.add(r);
        this._refresh();
      });
    });
    body.querySelectorAll('[data-filter-eq]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._filter.equipped = btn.dataset.filterEq;
        this._refresh();
      });
    });
    body.querySelectorAll('[data-filter-set]').forEach(btn => {
      btn.addEventListener('click', () => {
        const s = btn.dataset.filterSet;
        if (this._filter.sets.has(s)) this._filter.sets.delete(s);
        else this._filter.sets.add(s);
        this._refresh();
      });
    });

    // Recherche
    const searchInput = body.querySelector('#inv-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this._filter.search = e.target.value;
        // Debounce léger pour ne pas re-render à chaque keystroke
        clearTimeout(this._searchDebounce);
        this._searchDebounce = setTimeout(() => this._refresh(), 200);
      });
      // Restaure le focus + position curseur après re-render
      if (this._searchFocused) {
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
      }
      searchInput.addEventListener('focus', () => { this._searchFocused = true; });
      searchInput.addEventListener('blur', () => { this._searchFocused = false; });
    }
    body.querySelector('#inv-search-clear')?.addEventListener('click', () => {
      this._filter.search = '';
      this._refresh();
    });

    // Tri
    body.querySelector('#inv-sort')?.addEventListener('change', (e) => {
      this._sortKey = e.target.value;
      this._refresh();
    });

    // Reset filtres
    body.querySelector('#inv-filter-reset')?.addEventListener('click', () => {
      this._filter.rarities.clear();
      this._filter.sets.clear();
      this._filter.equipped = 'all';
      this._filter.search = '';
      this._sortKey = 'rarity_desc';
      this._refresh();
    });

    // Batch sell
    body.querySelectorAll('[data-batch-sell]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rarity = btn.dataset.batchSell;
        this._batchSell(rarity);
      });
    });
  }

  _batchSell(rarity) {
    const toSell = ItemSystem.getAll().filter(i => !i.equippedOn && !i.isUnique && i.rarity === rarity);
    if (toSell.length === 0) return;
    const totalGold = toSell.reduce((s, i) => s + sellValue(i), 0);
    const confirmed = confirm(`Vendre ${toSell.length} items ${RARITIES.find(r => r.id === rarity)?.name} ?\nGain : ${totalGold} or.`);
    if (!confirmed) return;
    for (const item of toSell) {
      const g = ItemSystem.sell(item.uid);
      if (g > 0) ResourceSystem.addGold(g);
    }
    this._refresh();
  }

  _selectItem(uid) {
    const item = ItemSystem.getAll().find(i => i.uid === uid);
    if (!item) return;

    // Si on a un filtre de ciblage actif, équiper direct
    if (this._filterType && this._filterFighter && item.type === this._filterType && !ItemSystem.equipmentLocked && !item.equippedOn) {
      ItemSystem.equip(item.uid, this._filterFighter);
      const fighter = this._getFighters().find(f => f.id === this._filterFighter);
      if (fighter) fighter._recomputeStats();
      this._filterType = null;
      this._filterFighter = null;
      this._selectedItem = null;
      this._refresh();
      return;
    }

    this._selectedItem = uid;
    this.modal.body.querySelectorAll('.inv-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.uid === uid);
    });
    this.modal.body.querySelectorAll('[data-equip-slot]').forEach(slot => {
      const compatible = slot.dataset.equipSlot === item.type;
      slot.classList.toggle('compatible', compatible && !ItemSystem.equipmentLocked);
    });
    this._showDetail(uid);
  }

  _showDetail(uid) {
    const item = ItemSystem.getAll().find(i => i.uid === uid);
    if (!item) return;
    const detail = this.modal.body.querySelector('#inv-detail');
    if (!detail) return;

    const sv = sellValue(item);
    const typeLabels = { weapon: 'Arme', armor: 'Armure', accessory: 'Accessoire' };
    const typeColors = { weapon: '#ef4444', armor: '#3b82f6', accessory: '#22c55e' };
    const enchantHtml = (item.enchants || []).map(e =>
      `<div class="inv-detail-enchant">· ${this._escape(e.label)}</div>`
    ).join('');

    // Comparateur : si un fighter est ciblé, comparer avec son item équipé du même type
    const compareHtml = this._renderComparator(item);

    detail.innerHTML = `
      <div class="inv-detail-header" style="border-color:${item.rarityColor};">
        <div class="inv-detail-icon">${renderItemIcon(item)}</div>
        <div class="inv-detail-title">
          <div class="inv-detail-name" style="color:${item.rarityColor};">${this._escape(item.name)}</div>
          <div class="inv-detail-meta">
            <span style="color:${item.rarityColor};">${item.rarityName}</span>
            <span style="color:${typeColors[item.type] || '#888'};">${typeLabels[item.type] || item.type}</span>
            ${item.tier ? `<span class="inv-detail-tier">T${item.tier}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="inv-detail-stats">
        ${item.stats?.atk ? `<div class="inv-detail-stat">ATK <strong>+${item.stats.atk}</strong></div>` : ''}
        ${item.stats?.hp ? `<div class="inv-detail-stat">HP <strong>+${item.stats.hp}</strong></div>` : ''}
      </div>
      ${enchantHtml ? `<div class="inv-detail-enchants">${enchantHtml}</div>` : ''}
      ${item.set ? `<div class="inv-detail-set">✦ Set : ${this._escape(SETS[item.set]?.name || item.set)}</div>` : ''}
      ${item.isUnique ? '<div class="inv-detail-unique">⭐ Item unique</div>' : ''}
      ${compareHtml}
      ${item.equippedOn ? `
        <div class="inv-detail-equipped-note">Équipé — double-clic sur le slot pour retirer.</div>
      ` : `
        <div class="inv-detail-actions">
          <button class="action-btn admin-btn" id="inv-sell" data-uid="${item.uid}">Vendre (${sv}◆)</button>
        </div>
      `}
    `;

    detail.querySelector('#inv-sell')?.addEventListener('click', () => {
      const gold = ItemSystem.sell(uid);
      if (gold > 0) ResourceSystem.addGold(gold);
      this._selectedItem = null;
      this._refresh();
    });
  }

  /** Comparateur : si un fighter est ciblé, compare l'item sélectionné avec l'item équipé. */
  _renderComparator(item) {
    if (!this._filterFighter || !this._filterType) return '';
    if (item.type !== this._filterType) return '';
    if (item.equippedOn) return ''; // comparer seulement si on veut équiper un NOUVEAU item

    const equipped = ItemSystem.getEquipped(this._filterFighter)[item.type];
    if (!equipped) {
      return `<div class="inv-detail-compare inv-compare-empty">💡 Aucun ${item.type} équipé — ce sera votre premier.</div>`;
    }

    const diffAtk = (item.stats?.atk || 0) - (equipped.stats?.atk || 0);
    const diffHp = (item.stats?.hp || 0) - (equipped.stats?.hp || 0);
    const fmt = (v) => v > 0 ? `<span class="compare-up">+${v}</span>` : v < 0 ? `<span class="compare-down">${v}</span>` : `<span class="compare-same">±0</span>`;

    return `
      <div class="inv-detail-compare">
        <div class="inv-compare-header">vs équipé : <span style="color:${equipped.rarityColor};">${this._escape(equipped.name)}</span></div>
        <div class="inv-compare-row">
          ${item.stats?.atk !== undefined || equipped.stats?.atk !== undefined ? `<span>ATK ${fmt(diffAtk)}</span>` : ''}
          ${item.stats?.hp !== undefined || equipped.stats?.hp !== undefined ? `<span>HP ${fmt(diffHp)}</span>` : ''}
        </div>
      </div>
    `;
  }

  _toggleForgeSelect(uid) {
    const idx = this._selectedForForge.indexOf(uid);
    if (idx !== -1) {
      this._selectedForForge.splice(idx, 1);
    } else if (this._selectedForForge.length < 3) {
      this._selectedForForge.push(uid);
    }
    this.modal.body.querySelectorAll('.inv-item').forEach(el => {
      el.classList.toggle('forge-selected', this._selectedForForge.includes(el.dataset.uid));
    });

    const forgeDiv = this.modal.body.querySelector('#inv-forge');
    if (this._selectedForForge.length === 3) {
      const items = this._selectedForForge.map(u => ItemSystem.getAll().find(i => i.uid === u));
      const sameRarity = items.every(i => i && i.rarity === items[0]?.rarity);
      const rarityIdx = RARITY_INDEX[items[0]?.rarity] ?? 0;
      const cost = BALANCE.loot.forge_costs[rarityIdx] ?? 0;

      if (sameRarity && rarityIdx < 4) {
        const gold = ResourceSystem.gold;
        const canAfford = gold >= cost;
        forgeDiv.innerHTML = `
          <div class="forge-gold-indicator ${canAfford ? '' : 'forge-gold-insufficient'}">
            <span>Votre or : <strong>${gold.toLocaleString('fr-FR')}◆</strong></span>
            <span class="forge-gold-sep">—</span>
            <span>Coût : <strong>${cost.toLocaleString('fr-FR')}◆</strong></span>
            ${!canAfford ? `<span class="forge-gold-missing">(manque ${(cost - gold).toLocaleString('fr-FR')}◆)</span>` : ''}
          </div>
          <button class="action-btn" id="forge-btn" style="width:100%;" ${canAfford ? '' : 'disabled'}>
            <span class="action-btn-icon">⚡</span>
            <div class="action-btn-text">
              <span class="action-btn-label">Forger (${cost}◆)</span>
              <span class="action-btn-sub">3×${items[0].rarityName} → 1 ${['Peu commun','Rare','Épique','Légendaire'][rarityIdx]}</span>
            </div>
          </button>
        `;
        forgeDiv.querySelector('#forge-btn')?.addEventListener('click', () => {
          if (ResourceSystem.gold < cost) return;
          ResourceSystem.spendGold(cost);
          const result = ItemSystem.forge(this._selectedForForge);
          this._selectedForForge = [];
          this._refresh();
          if (result?.item) this._showForgeReveal(result.item);
        });
      } else {
        forgeDiv.innerHTML = `<div class="inv-forge-warning">Même rareté requise</div>`;
      }
    } else {
      forgeDiv.innerHTML = `<div class="inv-forge-default">${this._selectedForForge.length}/3 (clic droit)</div>`;
    }
  }

  /**
   * Animation de reveal du nouvel item forgé.
   */
  _showForgeReveal(item) {
    if (!this.modal?.body) return;
    const overlay = document.createElement('div');
    overlay.className = 'forge-reveal-overlay';
    overlay.innerHTML = `
      <div class="forge-reveal-card" style="border-color:${item.rarityColor};box-shadow:0 0 40px ${item.rarityColor};">
        <div class="forge-reveal-label" style="color:${item.rarityColor};">✨ FORGE RÉUSSIE ✨</div>
        <div class="forge-reveal-icon" style="color:${item.rarityColor};">${item.icon || '✦'}</div>
        <div class="forge-reveal-name">${this._escape(item.name)}</div>
        <div class="forge-reveal-rarity" style="color:${item.rarityColor};">${item.rarityName}</div>
        <div class="forge-reveal-stats">
          ${Object.entries(item.stats || {}).map(([k, v]) => `<span>+${v} ${k.toUpperCase()}</span>`).join(' · ')}
        </div>
      </div>
    `;
    this.modal.body.appendChild(overlay);
    const close = () => {
      if (overlay.parentNode) overlay.remove();
    };
    overlay.addEventListener('click', close, { once: true });
    setTimeout(close, 2500);
  }

  _escape(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  destroy() {
    if (this.modal) this.modal.destroy();
  }
}
