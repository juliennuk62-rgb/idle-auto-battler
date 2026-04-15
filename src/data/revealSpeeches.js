// revealSpeeches.js — phrase signature de chaque héros, affichée lors de l'invocation.
// Chaque héros a une phrase unique qui ancre son identité.
// Les IDs matchent heroes.js exactement.

export const REVEAL_SPEECHES = {
  // ── MYTHIQUES ──
  titan_originel:   'Je suis le premier. Et le dernier.',
  chrono_mage:      'Le temps est un cercle. Et je suis son centre.',

  // ── WARRIORS ──
  garde_royal:      'Mon bouclier est votre rempart. Ma vie, votre garantie.',
  centurion:        'Mille batailles. Aucune défaite. Pas aujourd\'hui.',
  chevalier_noir:   'Dans l\'obscurité, je suis l\'obscurité elle-même.',
  paladin_celeste:  'La lumière ne recule jamais devant les ténèbres.',
  dieu_guerre:      'Les mortels prient. Les dieux agissent.',

  // ── ARCHERS ──
  chasseur:         'Ma proie ne m\'échappe jamais. Jamais.',
  eclaireur:        'Je vois tout. Y compris ce que vous cachez.',
  ranger_elite:     'Une flèche. Un silence. C\'est tout.',
  tireur_elite:     'Entre mes yeux et ma cible, le monde s\'efface.',
  artemis:          'La lune guide mon arc. Les étoiles comptent mes victoires.',

  // ── MAGES ──
  apprenti_mystique: 'Le savoir brûle plus fort que le feu lui-même.',
  pyromancien:       'Les flammes ne me brûlent pas. Elles m\'obéissent.',
  archimage:         'Chaque élément est un mot. Je parle couramment.',
  seigneur_elements: 'Le feu et la glace dansent sur mes doigts.',
  merlin:            'Le temps est un livre. J\'en ai lu la dernière page.',

  // ── HEALERS ──
  acolyte_sacre:     'Chaque blessure est un appel. J\'y réponds toujours.',
  druide:            'La forêt guérit. Je suis son instrument.',
  grande_pretresse:  'La mort n\'est qu\'une porte. Je tiens la clé.',
  oracle:            'Je vois demain. Et demain, vous vaincrez.',
  divinite:          'Je suis le dernier souffle avant le miracle.',
};

/**
 * Retourne la phrase de reveal d'un héros.
 * @param {string} heroId — l'ID du héros (ex: 'paladin_celeste')
 * @returns {string} la phrase, ou '' si aucune.
 */
export function getRevealSpeech(heroId) {
  return REVEAL_SPEECHES[heroId] || '';
}
