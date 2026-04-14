#!/usr/bin/env node
/**
 * check-key.js — diagnostic sécurisé de la clé API Anthropic.
 *
 * Affiche UNIQUEMENT des métadonnées sûres :
 *   - longueur
 *   - 8 premiers chars (public — format standard Anthropic)
 *   - 4 derniers chars
 *   - présence de caractères parasites
 *   - test d'authentification avec un appel minimal
 *
 * Ne logge JAMAIS la clé complète.
 *
 * Usage : node scripts/check-key.js
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT       = path.resolve(__dirname, '..');

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return null;
  const raw = fs.readFileSync(envPath, 'utf8');
  const hasBOM = raw.charCodeAt(0) === 0xFEFF;
  const content = hasBOM ? raw.slice(1) : raw;
  const parsed = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[key] = value;
    // ⚠️ CHANGÉ : .env écrase la variable d'environnement (permet de corriger
    // une clé bloquée en variable système sans avoir à la désactiver)
    process.env[key] = value;
  }
  return { hasBOM, size: raw.length, parsed };
}

console.log('\n═══════════ Diagnostic clé API ═══════════\n');

// Capture la valeur de la variable d'environnement AVANT de charger .env,
// pour voir d'où vient la clé.
const envVarBefore = process.env.ANTHROPIC_API_KEY;

const envInfo = loadDotEnv();
if (envInfo === null) {
  console.log('📄 .env         : NON TROUVÉ à la racine du projet');
} else {
  console.log(`📄 .env         : trouvé (${envInfo.size} octets)`);
  console.log(`📄 BOM UTF-8    : ${envInfo.hasBOM ? '⚠️  OUI (peut poser problème)' : '✅ non'}`);
}

const dotenvKey = envInfo?.parsed?.ANTHROPIC_API_KEY;

// Diagnostic d'origine
if (envVarBefore && dotenvKey && envVarBefore !== dotenvKey) {
  console.log('⚠️  La variable d\'environnement système ANTHROPIC_API_KEY est DIFFÉRENTE');
  console.log('   de celle du fichier .env. Le script utilise maintenant CELLE DU .env.');
  console.log(`   .env       : sk-ant-api03-${dotenvKey.slice(13, 15)}…`);
  console.log(`   env système: sk-ant-api03-${envVarBefore.slice(13, 15)}…`);
  console.log('   💡 Pour nettoyer la variable système, voir la fin du diagnostic.');
} else if (envVarBefore && !dotenvKey) {
  console.log('ℹ️  Pas de .env — clé chargée depuis variable d\'environnement système');
} else if (!envVarBefore && dotenvKey) {
  console.log('ℹ️  Clé chargée depuis .env (aucune variable d\'environnement système)');
}

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.log('\n❌ ANTHROPIC_API_KEY : non chargée');
  console.log('   Vérifie que ton .env contient exactement :');
  console.log('     ANTHROPIC_API_KEY=sk-ant-api03-...');
  process.exit(1);
}

// ── Analyse des métadonnées (rien de sensible) ──
console.log(`\n🔑 Clé chargée  : oui`);
console.log(`   Longueur      : ${key.length} caractères`);
console.log(`   Prefix (public): ${key.slice(0, 15)}…   ← attendu : sk-ant-api03-XX`);
console.log(`   Suffix         : …${key.slice(-4)}`);

const expectedLen = 108; // longueur typique d'une clé Anthropic sk-ant-api03-
if (key.length < 50) {
  console.log(`   ⚠️  Longueur suspecte (${key.length} chars, attendu ~${expectedLen}) — clé probablement tronquée`);
} else if (!key.startsWith('sk-ant-')) {
  console.log(`   ⚠️  Ne commence pas par "sk-ant-" — format incorrect`);
}

// Détection de caractères parasites
const weirdChars = [...key].filter(c => {
  const code = c.charCodeAt(0);
  // ASCII imprimable : 33-126, plus tiret et _ déjà dedans
  return code < 33 || code > 126;
});
if (weirdChars.length > 0) {
  console.log(`   ⚠️  ${weirdChars.length} caractère(s) non-ASCII détecté(s) dans la clé (retour à la ligne, BOM, etc.)`);
  console.log(`       Codes: ${weirdChars.map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(', ')}`);
} else {
  console.log(`   ✅ Pas de caractère parasite`);
}

// ── Test d'authentification ──
console.log('\n🌐 Test d\'authentification auprès d\'Anthropic…');
try {
  const client = new Anthropic({ apiKey: key });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 16,
    messages: [{ role: 'user', content: 'ping' }],
  });
  console.log('   ✅ AUTHENTIFICATION RÉUSSIE');
  console.log(`   Modèle de test : ${response.model}`);
  console.log(`   Tokens utilisés : ${response.usage.input_tokens} in + ${response.usage.output_tokens} out`);
  console.log('\n🎉 Ta clé fonctionne. Tu peux lancer : npm run agent "ta tâche"\n');
} catch (err) {
  console.log(`   ❌ ÉCHEC : ${err.status || '?'} ${err.message}`);
  if (err.status === 401) {
    console.log('\n💡 Causes possibles d\'un 401 :');
    console.log('   1. Clé révoquée → génère-en une nouvelle sur console.anthropic.com');
    console.log('   2. Clé tronquée → recolle la valeur complète dans .env');
    console.log('   3. Compte sans crédit → ajoute du crédit sur la console');
    console.log('   4. Organisation restricted → vérifie les permissions de la clé');
  } else if (err.status === 429) {
    console.log('\n💡 Rate limit atteint — attends 1 min et réessaye');
  }
  process.exit(1);
}
