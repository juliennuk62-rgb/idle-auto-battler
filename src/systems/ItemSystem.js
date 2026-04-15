// ItemSystem — gère l'inventaire, le loot roll, la forge, l'équipement.
// Singleton pur JS. Émet des events pour que l'UI réagisse.

import { BALANCE } from '../data/balance.js';
import { generateItem, sellValue, RARITY_INDEX, deduplicateInventory, RARITIES } from '../data/items.js';
import { ITEMS_EXTENDED } from '../data/items-extended.js';

const STORAGE_KEY = 'idle_autobattler_inventory';

export class ItemSystemImpl {
  constructor() {
    this.inventory = []; // Item instances
    this.maxSize = BALANCE.loot.inventory_size;
    this.equipmentLocked = false; // Libre par défaut, verrouillé pendant le combat actif.
    this._listeners = [];
    this._load();
  }

  // ─── Events ─────────────────────────────────────────────────────────────

  on(type, cb) { this._listeners.push({ type, cb }); }
  off(type, cb) { this._listeners = this._listeners.filter(l => !(l.type === type && l.cb === cb)); }
  _emit(type, data) {
    for (const l of this._listeners) {
      if (l.type === type) try { l.cb(data); } catch(e) {}
    }
  }

  // ─── Loot roll ──────────────────────────────────────────────────────────

  /**
   * Roll pour un drop. Retourne un Item ou null.
   * @param {string} biomeId
   * @param {number} wave
   * @param {boolean} isBoss
   * @returns {Object|null} item instance
   */
  rollLoot(biomeId, wave, isBoss) {
    const cfg = BALANCE.loot;
    const dropRate = isBoss
      ? cfg.boss_drop_rate
      : Math.min(0.8, cfg.base_drop_rate + wave * cfg.drop_rate_per_wave);

    if (Math.random() > dropRate) return null;

    // Boss kill → 40% chance de drop un item UNIQUE de ITEMS_EXTENDED
    // (les items mythiques/légendaires scénarisés avec effets spéciaux).
    if (isBoss && Math.random() < 0.4) {
      const uniqueItem = this._rollBossUniqueItem();
      if (uniqueItem) {
        this._addToInventory(uniqueItem);
        return uniqueItem;
      }
    }

    const item = generateItem(biomeId, wave);
    this._addToInventory(item);

    // Boss double drop
    if (isBoss && Math.random() < cfg.boss_double_drop) {
      const bonus = generateItem(biomeId, wave);
      this._addToInventory(bonus);
      this._emit('loot_drop', bonus);
    }

    return item;
  }

  /**
   * Pioche un item unique de ITEMS_EXTENDED pour un boss kill.
   * Distribution : 60% epic, 30% legendary, 10% mythic.
   * Chaque item est cloné avec un uid unique (on peut drop le même item plusieurs fois).
   */
  _rollBossUniqueItem() {
    if (!ITEMS_EXTENDED || ITEMS_EXTENDED.length === 0) return null;

    // Détermine la rareté du drop
    const roll = Math.random();
    let targetRarity;
    if (roll < 0.10)      targetRarity = 'mythic';
    else if (roll < 0.40) targetRarity = 'legendary';
    else                   targetRarity = 'epic';

    // Filtre les items de cette rareté
    let pool = ITEMS_EXTENDED.filter(i => i.rarity === targetRarity);
    if (pool.length === 0) pool = ITEMS_EXTENDED; // fallback tout le pool

    // Pioche au hasard
    const template = pool[Math.floor(Math.random() * pool.length)];
    const rarityInfo = RARITIES.find(r => r.id === template.rarity) || RARITIES[RARITIES.length - 1];

    // Clone avec uid unique + format compatible inventaire
    return {
      uid: `i_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      templateId: template.id,
      name: template.name,
      type: template.slot === 'trinket' ? 'accessory' : (template.slot || 'weapon'),
      set: null, // items uniques n'appartiennent à aucun set
      icon: { weapon: '⚔', armor: '🛡', accessory: '💎' }[template.slot === 'trinket' ? 'accessory' : template.slot] || '✦',
      tier: template.level || 1,
      rarity: template.rarity,
      rarityColor: rarityInfo.color,
      rarityName: rarityInfo.name,
      stats: { ...template.stats },
      enchants: [], // les items uniques ont des effets intégrés, pas d'enchants
      effect: template.effect || null,
      flavor: template.flavor || null,
      equippedOn: null,
      isUnique: true, // flag pour distinguer des items procéduraux
    };
  }

  /**
   * Ajoute un item à l'inventaire (utilisé par les coffres, etc.).
   */
  addItem(item) {
    this._addToInventory(item);
  }

  _addToInventory(item) {
    if (this.inventory.length >= this.maxSize) {
      // Auto-sell le moins cher
      const cheapest = [...this.inventory]
        .filter(i => !i.equippedOn)
        .sort((a, b) => sellValue(a) - sellValue(b))[0];
      if (cheapest) {
        this.sell(cheapest.uid);
        this._emit('auto_sold', cheapest);
      }
    }
    this.inventory.push(item);
    this._emit('loot_drop', item);
    this._save();
  }

  // ─── Equip / Unequip ───────────────────────────────────────────────────

  /**
   * Équipe un item sur un fighter. Retourne l'ancien item du slot (ou null).
   */
  equip(itemUid, fighterId) {
    if (this.equipmentLocked) return null; // locked pendant le combat
    const item = this.inventory.find(i => i.uid === itemUid);
    if (!item) return null;

    // Déséquipe l'ancien item du même slot sur ce fighter
    const oldItem = this.inventory.find(
      i => i.equippedOn === fighterId && i.type === item.type
    );
    if (oldItem) oldItem.equippedOn = null;

    // Déséquipe cet item d'un autre fighter s'il était porté
    item.equippedOn = fighterId;

    this._emit('equipment_changed', { fighterId, item, oldItem });
    this._save();
    return oldItem;
  }

  unequip(itemUid) {
    if (this.equipmentLocked) return;
    const item = this.inventory.find(i => i.uid === itemUid);
    if (!item) return;
    const fighterId = item.equippedOn;
    item.equippedOn = null;
    this._emit('equipment_changed', { fighterId, item: null, oldItem: item });
    this._save();
  }

  /**
   * Retourne les items équipés par un fighter [weapon, armor, accessory].
   */
  getEquipped(fighterId) {
    return {
      weapon:    this.inventory.find(i => i.equippedOn === fighterId && i.type === 'weapon') || null,
      armor:     this.inventory.find(i => i.equippedOn === fighterId && i.type === 'armor') || null,
      accessory: this.inventory.find(i => i.equippedOn === fighterId && i.type === 'accessory') || null,
    };
  }

  // ─── Sell ───────────────────────────────────────────────────────────────

  sell(itemUid) {
    const idx = this.inventory.findIndex(i => i.uid === itemUid);
    if (idx === -1) return 0;
    const item = this.inventory[idx];
    if (item.equippedOn) return 0; // can't sell equipped
    const gold = sellValue(item);
    this.inventory.splice(idx, 1);
    this._emit('item_sold', { item, gold });
    this._save();
    return gold;
  }

  // ─── Forge ──────────────────────────────────────────────────────────────

  /**
   * Forge 3 items de même rareté en 1 de rareté supérieure.
   * Retourne le nouvel item ou null si invalide.
   */
  forge(itemUids) {
    if (!Array.isArray(itemUids) || itemUids.length !== 3) return null;
    const items = itemUids.map(uid => this.inventory.find(i => i.uid === uid));
    if (items.some(i => !i)) return null;
    if (items.some(i => i.equippedOn)) return null; // can't forge equipped

    // Même rareté ?
    const rarity = items[0].rarity;
    if (!items.every(i => i.rarity === rarity)) return null;

    // Rareté suivante ?
    const rarityIdx = RARITY_INDEX[rarity] ?? 0;
    if (rarityIdx >= 4) return null; // déjà legendary

    // Coût en or
    const forgeCost = BALANCE.loot.forge_costs[rarityIdx] ?? 0;

    // Supprime les 3 items
    for (const item of items) {
      const idx = this.inventory.indexOf(item);
      if (idx !== -1) this.inventory.splice(idx, 1);
    }

    // Génère un nouvel item de rareté supérieure (biome du premier item)
    const newItem = generateItem(items[0].set || 'forest', 1);
    // Force la rareté au tier supérieur
    const nextRarities = ['uncommon', 'rare', 'epic', 'legendary'];
    const targetRarity = nextRarities[rarityIdx];
    const { RARITIES } = require_rarities();
    const nextR = RARITIES.find(r => r.id === targetRarity);
    if (nextR) {
      newItem.rarity = nextR.id;
      newItem.rarityColor = nextR.color;
      newItem.rarityName = nextR.name;
      // Recalculate stats with new rarity
      const template = ITEM_TEMPLATES_BY_ID[newItem.templateId];
      if (template) {
        newItem.stats = {
          atk: Math.round((template.baseStat.atk || 0) * nextR.statMult),
          hp:  Math.round((template.baseStat.hp || 0)  * nextR.statMult),
        };
      }
    }

    this.inventory.push(newItem);
    this._emit('item_forged', { consumed: items, result: newItem });
    this._save();
    return { item: newItem, cost: forgeCost };
  }

  // ─── Queries ────────────────────────────────────────────────────────────

  getUnequipped() {
    return this.inventory.filter(i => !i.equippedOn);
  }

  getAll() {
    return [...this.inventory];
  }

  // ─── Persistence ───────────────────────────────────────────────────────

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.inventory));
    } catch(e) {}
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.inventory = JSON.parse(raw);
        deduplicateInventory(this.inventory);
        // Migration u1-u4 → slot_1-slot_5
        const ID_MIGRATION = { u1: 'slot_1', u2: 'slot_2', u3: 'slot_3', u4: 'slot_4', u5: 'slot_5' };
        let migrated = false;
        for (const item of this.inventory) {
          if (item.equippedOn && ID_MIGRATION[item.equippedOn]) {
            item.equippedOn = ID_MIGRATION[item.equippedOn];
            migrated = true;
          }
        }
        if (migrated) this._save();
      }
    } catch(e) {
      this.inventory = [];
    }
  }

  serialize() { return [...this.inventory]; }
  restore(data) {
    if (Array.isArray(data)) {
      this.inventory = data;
      deduplicateInventory(this.inventory);
    }
    this._save();
  }

  reset() {
    this.inventory = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch(e) {}
  }
}

// Hack pour accéder aux RARITIES et templates sans import circulaire dans forge
function require_rarities() {
  return { RARITIES: [
    { id: 'common',    color: '#9ca3af', statMult: 1.0 },
    { id: 'uncommon',  color: '#22c55e', statMult: 1.5 },
    { id: 'rare',      color: '#3b82f6', statMult: 2.0 },
    { id: 'epic',      color: '#a855f7', statMult: 3.0 },
    { id: 'legendary', color: '#f97316', statMult: 5.0 },
  ]};
}

// Index des templates par id pour recalcul forge
import { ITEM_TEMPLATES } from '../data/items.js';
const ITEM_TEMPLATES_BY_ID = Object.fromEntries(ITEM_TEMPLATES.map(t => [t.id, t]));

export const ItemSystem = new ItemSystemImpl();
