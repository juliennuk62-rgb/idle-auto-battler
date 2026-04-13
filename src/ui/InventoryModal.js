// InventoryModal — refonte complète.
//
// Layout :
//   ┌──────────────────────────────────────────────────────┐
//   │ ÉQUIPE — chaque allié + ses 3 slots (arme/armure/acc)│
//   ├──────────────────────────────┬───────────────────────┤
//   │ SAC À DOS — items non équipés│ DÉTAILS + FORGE       │
//   └──────────────────────────────┴───────────────────────┘
//
// Clic item dans le sac → sélectionné → clic sur un slot allié → équipé.
// Clic item équipé sur un allié → déséquipé (retourne au sac).

import { Modal } from './Modal.js';
import { ItemSystem } from '../systems/ItemSystem.js';
import { ResourceSystem } from '../systems/ResourceSystem.js';
import { sellValue, RARITY_INDEX } from '../data/items.js';
import { gradeName } from '../data/grades.js';
import { BALANCE } from '../data/balance.js';

const SLOT_LABELS = { weapon: '⚔ Arme', armor: '🛡 Armure', accessory: '💍 Acc.' };
const SLOT_TYPES = ['weapon', 'armor', 'accessory'];

export class InventoryModal {
  constructor(options = {}) {
    this.game = options.game;
    this.modal = new Modal({
      title: 'INVENTAIRE',
      hotkey: 'I',
      width: 900,
      onOpen: () => this._refresh(),
    });
    this._selectedItem = null;    // item uid sélectionné dans le sac
    this._filterType = null;      // 'weapon' | 'armor' | 'accessory' | null
    this._filterFighter = null;   // fighter id ciblé par le slot cliqué
    this._selectedForForge = [];
  }

  _getFighters() {
    // En combat → vrais fighters avec sprites
    const scene = this.game?.scene?.getScene('CombatScene');
    if (scene?.combat?.teamA?.length) return scene.combat.teamA;

    // Hors combat (menu) → stubs pour les 4 slots d'équipe
    // Permet d'équiper/déséquiper depuis le menu
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

  _refresh() {
    const fighters = this._getFighters();
    const allItems = ItemSystem.getAll();
    const unequipped = allItems.filter(i => !i.equippedOn);
    const locked = ItemSystem.equipmentLocked;
    this._selectedItem = null;

    const html = `
      ${locked ? '<div class="inv-locked-banner">🔒 Équipement verrouillé pendant le combat — attendez le changement de biome</div>' : ''}

      <div class="inv-section-title">ÉQUIPE</div>
      <div class="inv-team-row">
        ${fighters.map(f => this._renderAllySlots(f)).join('')}
      </div>

      <div style="display:flex;gap:16px;margin-top:14px;">
        <div style="flex:1;">
          <div class="inv-section-title">
            SAC À DOS (${unequipped.length} items)
            ${this._filterType
              ? `<span class="inv-filter-badge">Filtre: ${SLOT_LABELS[this._filterType]} <button class="inv-filter-clear" id="clear-filter">✕</button></span>`
              : ''}
          </div>
          <div class="inventory-grid" id="inv-grid">
            ${unequipped.length === 0
              ? '<div style="color:var(--text-tertiary);padding:16px;text-align:center;grid-column:1/-1;">Vide — tuez des monstres !</div>'
              : unequipped.map(item => {
                  // Filtre par type si un slot allié a été cliqué.
                  const hidden = this._filterType && item.type !== this._filterType;
                  return hidden ? '' : this._renderItem(item);
                }).join('') || '<div style="color:var(--text-tertiary);padding:16px;text-align:center;grid-column:1/-1;">Aucun item de ce type</div>'}
          </div>
        </div>
        <div style="width:220px;">
          <div class="inv-section-title">DÉTAILS</div>
          <div id="inv-detail" class="inv-detail">
            <div style="color:var(--text-tertiary);font-size:12px;">Cliquez sur un item</div>
          </div>
          <div class="inv-section-title" style="margin-top:12px;">FORGE</div>
          <div id="inv-forge" style="font-size:11px;color:var(--text-tertiary);">
            Clic droit × 3 items même rareté
          </div>
        </div>
      </div>
    `;
    this.modal.setContent(html);
    this._bindAll();
  }

  // ── Render allié avec ses 3 slots ─────────────────────────────────────

  _renderAllySlots(fighter) {
    const equipped = ItemSystem.getEquipped(fighter.id);
    const gName = gradeName(fighter.class, fighter.grade) || fighter.name;
    const SPRITE_URLS = { warrior: 'assets/sprites/allies/warrior.png', archer: 'assets/sprites/allies/archer.png', mage: 'assets/sprites/allies/mage.png', healer: 'assets/sprites/allies/healer.png' };
    const spriteUrl = SPRITE_URLS[fighter.class] || SPRITE_URLS.warrior;

    return `
      <div class="inv-ally-card">
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
                           style="border-color:${item.rarityColor};" title="${item.name} (${item.rarityName}) — double-clic pour retirer">
                <span>${item.icon}</span>
                <span class="slot-lock">🔒</span>
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

  // ── Render item dans le sac ───────────────────────────────────────────

  _renderItem(item) {
    const typeLabels = { weapon: 'ARME', armor: 'ARMURE', accessory: 'ACCES.' };
    const typeColors = { weapon: '#ef4444', armor: '#3b82f6', accessory: '#a855f7' };
    const typeLabel = typeLabels[item.type] || '?';
    const typeColor = typeColors[item.type] || '#888';
    const shortName = item.name.length > 12 ? item.name.slice(0, 11) + '.' : item.name;
    return `<div class="inv-item" data-uid="${item.uid}" data-type="${item.type}"
                 style="border-color:${item.rarityColor};"
                 title="${item.name} (${item.rarityName} · ${typeLabel})">
      <div class="inv-item-type-badge" style="background:${typeColor}">${typeLabel}</div>
      <span class="inv-item-icon">${item.icon}</span>
      <div class="inv-item-name">${shortName}</div>
      <div class="inv-item-rarity" style="background:${item.rarityColor};"></div>
    </div>`;
  }

  // ── Bind events ───────────────────────────────────────────────────────

  _bindAll() {
    const body = this.modal.body;

    // Click item dans le sac — binding INDIVIDUEL par item (pas de délégation)
    // pour éviter le décalage entre item affiché et item sélectionné.
    body.querySelectorAll('#inv-grid .inv-item').forEach(el => {
      const uid = el.dataset.uid;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this._selectItem(uid);
      });
    });

    // Click sur un slot vide d'un allié →
    //   Si un item est sélectionné et compatible : l'équiper.
    //   Sinon : filtrer le sac par le type de ce slot.
    body.querySelectorAll('[data-equip-slot]').forEach(slot => {
      slot.addEventListener('click', () => {
        if (ItemSystem.equipmentLocked) return;
        const slotType = slot.dataset.equipSlot;
        const fighterId = slot.dataset.fighter;

        // Si un item est sélectionné et du bon type → équiper directement.
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

        // Sinon → filtre le sac par type pour montrer les items compatibles.
        this._filterType = slotType;
        this._filterFighter = fighterId;
        this._selectedItem = null;
        this._refresh();
      });
    });

    // Bouton clear filter.
    body.querySelector('#clear-filter')?.addEventListener('click', () => {
      this._filterType = null;
      this._filterFighter = null;
      this._refresh();
    });

    // Double-clic sur un slot rempli → déséquiper (protection contre retrait accidentel).
    body.querySelectorAll('[data-unequip]').forEach(slot => {
      slot.addEventListener('dblclick', () => {
        if (ItemSystem.equipmentLocked) return;
        const fId = slot.dataset.fighter;
        ItemSystem.unequip(slot.dataset.unequip);
        const fighter = this._getFighters().find(f => f.id === fId);
        if (fighter) fighter._recomputeStats();
        this._refresh();
      });
      // Simple clic → juste afficher les détails de l'item.
      slot.addEventListener('click', () => {
        this._showDetail(slot.dataset.unequip);
      });
    });

    // Clic droit pour forge — binding individuel aussi.
    body.querySelectorAll('#inv-grid .inv-item').forEach(el => {
      const uid = el.dataset.uid;
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._toggleForgeSelect(uid);
      });
    });
  }

  _selectItem(uid) {
    const item = ItemSystem.getAll().find(i => i.uid === uid);
    if (!item) return;

    // Si on a un filtre actif (= on a cliqué un slot d'allié), équiper direct.
    if (this._filterType && this._filterFighter && item.type === this._filterType && !ItemSystem.equipmentLocked) {
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
    // Highlight dans la grille.
    this.modal.body.querySelectorAll('.inv-item').forEach(el => {
      el.classList.toggle('selected', el.dataset.uid === uid);
    });
    // Highlight les slots compatibles sur les alliés.
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
    const typeColors = { weapon: '#ef4444', armor: '#3b82f6', accessory: '#a855f7' };
    const enchantHtml = (item.enchants || []).map(e =>
      `<div style="color:var(--heal);font-size:11px;">· ${e.label}</div>`
    ).join('');

    detail.innerHTML = `
      <div style="font-size:16px;margin-bottom:4px;">${item.icon} <strong style="color:${item.rarityColor}">${item.name}</strong></div>
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
        <span style="font-size:11px;color:${item.rarityColor}">${item.rarityName}</span>
        <span style="font-size:9px;font-weight:900;padding:1px 6px;color:#fff;background:${typeColors[item.type] || '#888'}">${typeLabels[item.type] || item.type}</span>
      </div>
      ${item.stats.atk ? `<div style="font-size:12px;">ATK +${item.stats.atk}</div>` : ''}
      ${item.stats.hp ? `<div style="font-size:12px;">HP +${item.stats.hp}</div>` : ''}
      ${enchantHtml}
      ${item.set ? `<div style="font-size:11px;color:var(--gold);margin-top:4px;">Set: ${item.set}</div>` : ''}
      <div style="margin-top:8px;">
        <button class="action-btn admin-btn" id="inv-sell" data-uid="${item.uid}" style="width:100%;">Vendre (${sv}◆)</button>
      </div>
    `;

    detail.querySelector('#inv-sell')?.addEventListener('click', () => {
      const gold = ItemSystem.sell(uid);
      if (gold > 0) ResourceSystem.addGold(gold);
      this._selectedItem = null;
      this._refresh();
    });
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
        forgeDiv.innerHTML = `
          <button class="action-btn" id="forge-btn" style="width:100%;">
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
          ItemSystem.forge(this._selectedForForge);
          this._selectedForForge = [];
          this._refresh();
        });
      } else {
        forgeDiv.innerHTML = `<div style="color:var(--damage);">Même rareté requise</div>`;
      }
    } else {
      forgeDiv.innerHTML = `<div style="font-size:11px;color:var(--text-tertiary);">${this._selectedForForge.length}/3 (clic droit)</div>`;
    }
  }

  destroy() {
    if (this.modal) this.modal.destroy();
  }
}
