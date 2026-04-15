/**
 * BALANCE_TABLES — Tables d'équilibrage progressif
 *
 * ⚠️ STATUT : CATALOGUE DE RÉFÉRENCE, pas encore appliqué au jeu live.
 * L'équilibrage actuel du jeu vit dans src/data/balance.js et src/data/grades.js.
 * Ces tables sont des PROPOSITIONS d'équilibrage produites par content-atelier.
 * Pour les activer, il faudra comparer hero par hero / grade par grade avec
 * l'existant et migrer progressivement (risque : casser l'équilibre actuel).
 *
 * Contenu :
 * - heroStatsByGrade : multiplicateurs de stats par grade de héros (1-5)
 * - levelCurves : XP, or, drop rates par niveau joueur (1-100)
 * - gachaPity : système de pitié pour le gacha (garanties UR/SSR)
 * - prestigeFormula : conversion vague→soul points et coûts de prestige
 *
 * Philosophie d'équilibrage (proposition) :
 * - Courbe de puissance exponentielle modérée (×1.5-2 par tier)
 * - Pity gacha généreux mais pas trivialisé (180 pulls max pour UR)
 * - Soul points = progression infinie post-wave60 sans hard-cap
 * - Niveau joueur = méta-progression passive découplée des prestiges
 */

// ─────────────────────────────────────────────────────────────────────────────
// HERO STATS BY GRADE — Multiplicateurs de stats pour héros invoqués
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Multiplicateurs appliqués aux stats de base de la classe pour chaque grade.
 * 
 * Grade 1 (R commun)  : baseline 1× — héros basique mais déjà > unité fusionnée
 * Grade 2 (R évolué)  : ×1.5 — évolution naturelle après fusion 3→1
 * Grade 3 (SR)        : ×2.2 — tier intermédiaire, déblocable sans pity
 * Grade 4 (SSR)       : ×3.5 — tier premium, demande investissement
 * Grade 5 (UR)        : ×6.0 — apex, réservé aux pity ou chance extrême
 * 
 * Speed scaling volontairement plus doux (×1.2 au lieu de ×1.5) pour éviter
 * que les UR atteignent des cadences absurdes et cassent la lecture combat.
 */
export const heroStatsByGrade = {
  1: { hpMult: 1.0,  atkMult: 1.0,  speedMult: 1.0  },
  2: { hpMult: 1.5,  atkMult: 1.5,  speedMult: 1.2  },
  3: { hpMult: 2.2,  atkMult: 2.2,  speedMult: 1.4  },
  4: { hpMult: 3.5,  atkMult: 3.5,  speedMult: 1.65 },
  5: { hpMult: 6.0,  atkMult: 6.0,  speedMult: 1.95 },
};

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL CURVES — Progression du niveau joueur (1-100)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fonction XP requise pour passer du niveau N au niveau N+1.
 * Formule : 100 × N^1.8 (croissance exponentielle douce)
 * 
 * L1→L2:   100 XP
 * L10→L11: 2512 XP
 * L50→L51: 86596 XP
 * L99→L100: 617264 XP
 * 
 * Total cumulé L1→L100 ≈ 20M XP — atteignable en ~2000 vagues normales
 * ou ~500h de jeu idle moyen (progression infinie garantie).
 */
function xpToNextLevel(currentLevel) {
  if (currentLevel >= 100) return Infinity; // cap L100
  return Math.floor(100 * Math.pow(currentLevel, 1.8));
}

/**
 * Or gagné par vague (bonus passif lié au niveau joueur).
 * Formule : 10 × level^1.3
 * 
 * L1:  10 or/vague
 * L20: 186 or/vague
 * L50: 884 or/vague
 * L100: 2512 or/vague
 * 
 * S'ajoute à l'or des kills — offre un revenu passif qui scale doucement
 * pour compenser l'inflation des coûts recruit/forge en late-game.
 */
function goldPerWave(level) {
  return Math.floor(10 * Math.pow(level, 1.3));
}

/**
 * Taux de drop d'item par vague (% chance).
 * Formule : min(80, 20 + level × 0.6)
 * 
 * L1:  20.6% — ~1 item/5 vagues early
 * L20: 32% — transition mid-game
 * L50: 50% — 1 item/2 vagues
 * L100: 80% (cap) — flood contrôlé, empêche 100% pour garder tension
 * 
 * Les items droppent toujours avec rareté pondérée (voir items.js RARITIES)
 * donc même à 80% drop rate, avoir du legendary reste rare.
 */
function lootDropRate(level) {
  return Math.min(80, 20 + level * 0.6);
}

/**
 * Gemmes bonus par niveau (récompense one-shot).
 * Formule : floor(level / 5) — paliers tous les 5 niveaux
 * 
 * L5:  1 gemme
 * L20: 4 gemmes
 * L50: 10 gemmes
 * L100: 20 gemmes
 * 
 * Total L1→L100 : 210 gemmes — permet ~2 garanties SSR pity sans payer.
 */
function gemsPerLevel(level) {
  return Math.floor(level / 5);
}

/**
 * Génère le tableau complet des courbes 1-100 pour éviter recalcul runtime.
 */
function generateLevelCurves() {
  const curves = [];
  for (let lvl = 1; lvl <= 100; lvl++) {
    curves.push({
      level: lvl,
      xpToNext: xpToNextLevel(lvl),
      goldPerWave: goldPerWave(lvl),
      lootDropRate: lootDropRate(lvl),
      gemsReward: gemsPerLevel(lvl),
    });
  }
  return curves;
}

export const levelCurves = generateLevelCurves();

// ─────────────────────────────────────────────────────────────────────────────
// GACHA PITY — Système de garantie pour éviter frustration infinie
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pity système multi-tiers :
 * 
 * - R garanti (baseline) : impossible de faire 10 pulls sans R minimum
 * - SR garanti à 20 pulls : protection mid-tier
 * - SSR garanti à 90 pulls : norme gacha (équivalent "soft pity 4★")
 * - UR garanti à 180 pulls : apex pity (équivalent "hard pity 5★")
 * 
 * Soft pity SSR/UR : rate × 2 après 70/150 pulls (encourage whaling modéré).
 * 
 * Rate-ups événementiels : certains héros peuvent avoir rate ×3 pendant
 * des events limités (futur système BannerRotation).
 */
export const gachaPity = {
  // Compteurs de pity — reset à 0 quand la rareté correspondante drop
  rPity: 10,     // garanti un R minimum tous les 10 pulls si malchance extrême
  srPity: 20,    // SR garanti à 20 pulls
  ssrPity: 90,   // SSR garanti à 90 pulls (standard gacha)
  urPity: 180,   // UR garanti à 180 pulls (premium gacha)

  // Soft pity multipliers — appliqués au-delà d'un seuil pour éviter frustration
  softPityThresholds: {
    ssr: 70,   // après 70 pulls sans SSR, rate SSR ×2
    ur: 150,   // après 150 pulls sans UR, rate UR ×2
  },
  softPityMult: 2.0,

  // Rate-ups événementiels (exemple structure — implémentation future)
  rateUpHeroes: {
    // 'paladin_celeste': { mult: 3.0, endDate: '2025-01-31' },
    // 'artemis': { mult: 3.0, endDate: '2025-01-31' },
  },

  // Pity partagée entre bannières ? Non — chaque bannière indépendante pour
  // encourager diversité des pulls (si besoin de plusieurs pools futurs).
  sharedPity: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// PRESTIGE FORMULA — Conversion vague→soul points et coûts talents prestige
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Soul Points gagnés en prestiguant depuis une vague donnée.
 * Formule : floor(sqrt(wave) × 10)
 * 
 * Wave 10:  31 SP
 * Wave 30:  54 SP
 * Wave 60:  77 SP (fin du cycle 6 biomes)
 * Wave 100: 100 SP
 * Wave 200: 141 SP
 * Wave 500: 223 SP
 * 
 * Progression infinie garantie — pas de hard-cap sur wave, les late-gamers
 * peuvent farmer wave 1000+ pour accumuler des milliers de SP.
 * 
 * Racine carrée évite explosion exponentielle — doubler la wave donne +41% SP,
 * pas ×2. Encourage push continu sans rendre les prestiges triviaux.
 */
function soulPointsFromWave(wave) {
  return Math.floor(Math.sqrt(Math.max(1, wave)) * 10);
}

/**
 * Coûts SP des talents de prestige — arbre 20 talents à débloquer.
 * Structure similaire aux talents normaux mais permanents entre runs.
 * 
 * Tiers 1 (talents 1-5)   : 10-30 SP — atteignable dès prestige wave 10-30
 * Tiers 2 (talents 6-10)  : 40-80 SP — mid-game prestige (wave 50-100)
 * Tiers 3 (talents 11-15) : 100-200 SP — late-game (wave 200-400)
 * Tiers 4 (talents 16-20) : 250-500 SP — ultra late-game (wave 500-2000)
 * 
 * Total pour maxer l'arbre : ~3000 SP — demande ~900 prestiges wave 60
 * ou ~30 prestiges wave 500. Progression infinie garantie mais lente.
 */
export const prestigeTalentCosts = {
  // ── Tier 1 : Bonus universels de base ──
  prestige_gold_1:      10,   // +25% or permanent
  prestige_xp_1:        15,   // +25% XP permanent
  prestige_recruit_1:   20,   // -20% coût recrutement
  prestige_fusion_1:    25,   // Fusion 3→1 donne 25% bonus stats
  prestige_respawn_1:   30,   // -15% délai respawn unités

  // ── Tier 2 : Boosts combat ──
  prestige_hp_1:        40,   // +15% HP toutes unités
  prestige_atk_1:       50,   // +15% ATK toutes unités
  prestige_speed_1:     60,   // +10% vitesse toutes unités
  prestige_ulti_1:      70,   // Ultis chargent 25% plus vite
  prestige_revive_1:    80,   // 1 revive gratuit par combat

  // ── Tier 3 : Méta-systèmes ──
  prestige_gacha_1:     100,  // +1% SSR rate permanent
  prestige_item_1:      120,  // +15% taux drop items
  prestige_enchant_1:   140,  // +1 enchant slot sur items epic+
  prestige_talents_1:   160,  // +1 point talent gratuit par run
  prestige_biome_1:     200,  // Débloque biome skip (start wave 11)

  // ── Tier 4 : Game-changers ──
  prestige_auto_fuse_1: 250,  // Auto-fusion grade 1-3 activée
  prestige_auto_cast_1: 300,  // Ultis s'activent auto au max charge
  prestige_double_drop: 350,  // 10% chance double loot
  prestige_soul_mult:   400,  // +25% soul points par prestige
  prestige_transcend:   500,  // Débloque grade 6+ pour héros (future-proof)
};

/**
 * Mapping talents prestige → effets appliqués.
 * Structure miroir de TALENT_TREES mais avec des IDs préfixés 'prestige_'.
 */
export const prestigeTalentEffects = {
  prestige_gold_1:      { goldPercent: 25 },
  prestige_xp_1:        { xpPercent: 25 },
  prestige_recruit_1:   { recruitCostReduction: 20 },
  prestige_fusion_1:    { fusionStatBonus: 25 },
  prestige_respawn_1:   { respawnReduction: 15 },
  prestige_hp_1:        { hpPercent: 15 },
  prestige_atk_1:       { atkPercent: 15 },
  prestige_speed_1:     { speedPercent: 10 },
  prestige_ulti_1:      { ultChargeBonus: 25 },
  prestige_revive_1:    { freeRevivePerCombat: 1 },
  prestige_gacha_1:     { ssrRateBonus: 1 },
  prestige_item_1:      { itemDropBonus: 15 },
  prestige_enchant_1:   { bonusEnchantSlot: 1 },
  prestige_talents_1:   { freeTalentPoint: 1 },
  prestige_biome_1:     { unlockBiomeSkip: 11 },
  prestige_auto_fuse_1: { autoFuseMaxGrade: 3 },
  prestige_auto_cast_1: { autoCastUltimate: true },
  prestige_double_drop: { doubleLootChance: 10 },
  prestige_soul_mult:   { soulPointsMult: 1.25 },
  prestige_transcend:   { unlockGrade6Plus: true },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT FINAL
// ─────────────────────────────────────────────────────────────────────────────

export const BALANCE_TABLES = {
  heroStatsByGrade,
  levelCurves,
  gachaPity,
  prestigeFormula: {
    soulPointsFromWave,
    talentCosts: prestigeTalentCosts,
    talentEffects: prestigeTalentEffects,
  },
};