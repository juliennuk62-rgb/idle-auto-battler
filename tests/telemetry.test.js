// Tests unitaires de TelemetrySystem.
// Pas de dépendance externe : assert maison, runner pour browser + Node.
//
// Usage :
//   - Browser : ouvrir tests/test-harness.html
//   - Node    : node tests/telemetry.test.js (requiert --experimental-vm-modules
//               ou un serveur HTTP vu qu'on utilise des ES modules ; le plus
//               simple reste le harness browser via le serveur de dev du projet).

import { TelemetrySystemImpl } from '../src/systems/TelemetrySystem.js';

// ---------------------------------------------------------------------------
// Mini framework de tests
// ---------------------------------------------------------------------------

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label || 'assertEqual'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertClose(actual, expected, epsilon, label) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${label || 'assertClose'}: expected ~${expected}, got ${actual}`);
  }
}

// Stub minimal de localStorage pour environnements Node sans DOM.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('un combat simulé produit les events dans le bon ordre', () => {
  const t = new TelemetrySystemImpl({ enabled: true, storageKey: 'test_key_order' });
  t.reset();

  const team = [{ id: 'w1', class: 'warrior', grade: 1, level: 1 }];
  const enemies = [{ id: 'm1', class: 'monster', grade: 1, level: 1 }];

  t.startCombat(1, team, enemies);
  t.recordEvent('attack_performed', { attackerId: 'w1', targetId: 'm1', damage: 10, damageBlocked: 0, critical: false });
  t.recordEvent('attack_performed', { attackerId: 'w1', targetId: 'm1', damage: 10, damageBlocked: 0, critical: false });
  t.recordEvent('unit_died', { unitId: 'm1', side: 'enemy', killedBy: 'w1' });
  t.endCombat({ outcome: 'victory', gold: 5, xp: 0 });

  const recent = t.getRecentCombats(10);
  assertEqual(recent.length, 1, 'un combat dans le buffer');
  const events = recent[0].events;
  const types = events.map((e) => e.type);
  assertEqual(types[0], 'combat_started', 'premier event = combat_started');
  assertEqual(types[1], 'attack_performed', 'deuxième event = attack_performed');
  assertEqual(types[2], 'attack_performed', 'troisième event = attack_performed');
  assertEqual(types[3], 'unit_died', 'quatrième event = unit_died');
  assertEqual(types[4], 'wave_ended', 'cinquième event = wave_ended');

  // Chaque event doit avoir un `t` numérique ≥ 0
  for (const e of events) {
    assert(typeof e.t === 'number' && e.t >= 0, `event.t numérique ≥ 0 (type=${e.type})`);
  }
});

test('DPS agrégé correct sur un cas connu (100 dmg sur 2 s → 50 DPS)', () => {
  const t = new TelemetrySystemImpl({ enabled: true, storageKey: 'test_key_dps' });
  t.reset();

  t.startCombat(1, [{ id: 'w1', class: 'warrior' }], [{ id: 'm1', class: 'monster' }]);
  // On pousse startedAt 2 s en arrière pour simuler 2 s de combat écoulées.
  t.currentCombat.startedAt = Date.now() - 2000;
  t.recordEvent('attack_performed', { attackerId: 'w1', targetId: 'm1', damage: 100 });

  const stats = t.getCurrentCombatStats();
  assert(stats !== null, 'stats non null');
  assertClose(stats.dpsByUnit.w1, 50, 2, 'DPS ~50 sur 100 dmg / 2s');
});

test('buffer circulaire écrase au-delà de la taille limite', () => {
  const t = new TelemetrySystemImpl({ enabled: true, bufferSize: 100, storageKey: 'test_key_buf' });
  t.reset();

  for (let i = 0; i < 105; i++) {
    t.startCombat(i, [{ id: 'w1', class: 'warrior' }], [{ id: 'm1', class: 'monster' }]);
    t.endCombat({ outcome: 'victory', gold: 1, xp: 0 });
  }

  const recent = t.getRecentCombats(200);
  assertEqual(recent.length, 100, 'buffer plafonné à 100');
  // Les 5 premiers (waveId 0..4) ont été écrasés, le premier restant = waveId 5.
  assertEqual(recent[0].waveId, 5, 'premier combat restant a waveId=5');
  assertEqual(recent[99].waveId, 104, 'dernier combat a waveId=104');
});

test('les agrégats cumulés sont corrects après plusieurs combats', () => {
  const t = new TelemetrySystemImpl({ enabled: true, storageKey: 'test_key_agg' });
  t.reset();

  // Combat 1 : w1 fait 50 dmg à m1, tue m1.
  t.startCombat(1, [{ id: 'w1', class: 'warrior' }], [{ id: 'm1', class: 'monster' }]);
  t.recordEvent('attack_performed', { attackerId: 'w1', targetId: 'm1', damage: 50 });
  t.recordEvent('unit_died', { unitId: 'm1', side: 'enemy', killedBy: 'w1' });
  t.endCombat({ outcome: 'victory', gold: 10, xp: 0 });

  // Combat 2 : w1 fait 30 dmg, m2 fait 20 dmg à w1.
  t.startCombat(2, [{ id: 'w1', class: 'warrior' }], [{ id: 'm2', class: 'monster' }]);
  t.recordEvent('attack_performed', { attackerId: 'w1', targetId: 'm2', damage: 30 });
  t.recordEvent('attack_performed', { attackerId: 'm2', targetId: 'w1', damage: 20 });
  t.endCombat({ outcome: 'victory', gold: 5, xp: 0 });

  const agg = t.getAggregates();
  assertEqual(agg.combatsPlayed, 2, 'combatsPlayed = 2');
  assertEqual(agg.maxWave, 2, 'maxWave = 2');
  assertEqual(agg.totalGold, 15, 'totalGold = 15');
  assertEqual(agg.damageDealtByClass.warrior, 80, 'warrior a infligé 80 dmg');
  assertEqual(agg.damageDealtByClass.monster, 20, 'monster a infligé 20 dmg');
  assertEqual(agg.damageTakenByClass.warrior, 20, 'warrior a subi 20 dmg');
  assertEqual(agg.damageTakenByClass.monster, 80, 'monster a subi 80 dmg');
  // w1 a participé à 2 combats, 0 mort.
  assertEqual(agg.unitStats.w1.combats, 2, 'w1 a 2 combats');
  assertEqual(agg.unitStats.w1.deaths, 0, 'w1 jamais mort');
  assertEqual(agg.unitStats.w1.survivals, 2, 'w1 a survécu 2 fois');
  assertClose(agg.survivalRateByUnit.w1, 1.0, 0.001, 'survivalRate w1 = 1.0');
});

test('telemetry_enabled=false rend toutes les méthodes no-op', () => {
  const t = new TelemetrySystemImpl({ enabled: false, storageKey: 'test_key_disabled' });

  t.startCombat(1, [{ id: 'w1', class: 'warrior' }], [{ id: 'm1', class: 'monster' }]);
  t.recordEvent('attack_performed', { attackerId: 'w1', targetId: 'm1', damage: 10 });
  t.endCombat({ outcome: 'victory', gold: 5, xp: 0 });

  assertEqual(t.getRecentCombats(10).length, 0, 'aucun combat enregistré');
  assertEqual(t.getCurrentCombatStats(), null, 'getCurrentCombatStats → null');
  assertEqual(t.getAggregates(), null, 'getAggregates → null');
  assert(t.exportJSON().includes('"enabled": false'), 'exportJSON indique enabled=false');
});

test('reset() wipe tout proprement', () => {
  const t = new TelemetrySystemImpl({ enabled: true, storageKey: 'test_key_reset' });
  t.startCombat(1, [{ id: 'w1', class: 'warrior' }], [{ id: 'm1', class: 'monster' }]);
  t.recordEvent('attack_performed', { attackerId: 'w1', targetId: 'm1', damage: 42 });
  t.endCombat({ outcome: 'victory', gold: 7, xp: 0 });

  assertEqual(t.getAggregates().combatsPlayed, 1, 'avant reset : 1 combat');
  t.reset();
  assertEqual(t.getAggregates().combatsPlayed, 0, 'après reset : 0 combat');
  assertEqual(t.getRecentCombats(10).length, 0, 'après reset : buffer vide');
});

test('onPrestige() par défaut préserve les agrégats', () => {
  const t = new TelemetrySystemImpl({ enabled: true, storageKey: 'test_key_prestige' });
  t.reset();
  t.startCombat(1, [{ id: 'w1', class: 'warrior' }], [{ id: 'm1', class: 'monster' }]);
  t.recordEvent('attack_performed', { attackerId: 'w1', targetId: 'm1', damage: 42 });
  t.endCombat({ outcome: 'victory', gold: 7, xp: 0 });

  t.onPrestige(); // false par défaut → on garde les agrégats
  assertEqual(t.getAggregates().combatsPlayed, 1, 'prestige sans reset : agrégats préservés');
  assertEqual(t.currentCombat, null, 'combat courant nettoyé');

  t.onPrestige(true); // reset explicite
  assertEqual(t.getAggregates().combatsPlayed, 0, 'prestige avec reset : agrégats wipe');
});

// ---------------------------------------------------------------------------
// Runner — exporté pour le harness HTML, auto-exécuté en Node.
// ---------------------------------------------------------------------------

export function runAll() {
  const results = [];
  for (const t of tests) {
    try {
      t.fn();
      results.push({ name: t.name, ok: true });
    } catch (e) {
      results.push({ name: t.name, ok: false, error: e.message });
    }
  }
  return results;
}

// Auto-run si exécuté en Node directement (pas en import browser).
if (typeof window === 'undefined' && typeof process !== 'undefined' && import.meta.url === `file://${process.argv[1]}`) {
  const r = runAll();
  const passed = r.filter((x) => x.ok).length;
  const failed = r.filter((x) => !x.ok).length;
  for (const res of r) {
    console.log(`${res.ok ? '✓' : '✗'} ${res.name}${res.error ? ' — ' + res.error : ''}`);
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}
