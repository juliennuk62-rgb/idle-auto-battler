// bosses-extended.js — 12 boss uniques avec mécaniques spéciales (content-atelier, avril 2026).
//
// ⚠️ STATUT : CATALOGUE DE RÉFÉRENCE, pas encore branché au système de combat.
// Les boss existants (monsters.js) utilisent un générateur procédural avec scaling.
// Pour activer ces boss "scénarisés", il faudra :
//   1. Extension de CombatSystem pour supporter les mechanics (periodic, hp_threshold, turn)
//   2. UI de dialogue boss (intro/defeat)
//   3. Décider si on remplace ou alterne avec les boss actuels
//
// Structure : 2 boss par biome × 6 biomes = 12 boss uniques.

export const BOSSES_EXTENDED = [
  {
    id: 'treant_corrompu',
    name: 'Tréant Corrompu',
    biome: 'forest',
    triggerWave: 5,
    hp: 800,
    atk: 15,
    mechanics: [
      {
        id: 'racines_empoisonnees',
        name: 'Racines Empoisonnées',
        trigger: 'periodic',
        effect: 'aoe',
        description: 'Toutes les 10 secondes, des racines surgissent du sol et infligent 30% ATK en zone tout en ralentissant les cibles de 40% pendant 3 secondes.'
      },
      {
        id: 'regeneration_sylvestre',
        name: 'Régénération Sylvestre',
        trigger: 'hp_threshold',
        effect: 'buff',
        description: 'À 50% HP, le Tréant puise dans la forêt et régénère 5% HP par seconde pendant 8 secondes tout en gagnant 30% de réduction de dégâts.'
      }
    ],
    dialogueIntro: 'La forêt elle-même se dresse contre vous... Je suis la nature déchaînée !',
    dialogueDefeat: 'Mes racines... se dessèchent... La forêt pleure sa défaite...'
  },
  {
    id: 'alpha_feral',
    name: 'Alpha Feral',
    biome: 'forest',
    triggerWave: 10,
    hp: 1200,
    atk: 22,
    mechanics: [
      {
        id: 'hurlement_meute',
        name: 'Hurlement de Meute',
        trigger: 'turn',
        effect: 'summon',
        description: 'Au début du combat et tous les 20 secondes, hurle pour invoquer 3 loups enragés (30% HP boss, 50% ATK boss) qui attaquent prioritairement les soigneurs.'
      },
      {
        id: 'frenesie_sanguinaire',
        name: 'Frénésie Sanguinaire',
        trigger: 'hp_threshold',
        effect: 'buff',
        description: 'Sous 30% HP, entre en frénésie : +50% vitesse d\'attaque, +40% ATK, ignores 25% des armures mais prend 20% de dégâts supplémentaires.'
      }
    ],
    dialogueIntro: 'Aucun chasseur n\'a survécu à ma meute. Vous serez les prochains à tomber.',
    dialogueDefeat: 'La meute... continue... sans... moi...'
  },
  {
    id: 'golem_cristallin',
    name: 'Golem Cristallin',
    biome: 'caves',
    triggerWave: 15,
    hp: 2000,
    atk: 18,
    mechanics: [
      {
        id: 'armure_reflechissante',
        name: 'Armure Réfléchissante',
        trigger: 'periodic',
        effect: 'buff',
        description: 'Tous les 15 secondes, active un bouclier cristallin pendant 5 secondes qui renvoie 40% des dégâts reçus à l\'attaquant tout en réduisant les dégâts subis de 60%.'
      },
      {
        id: 'ecroulement_caverne',
        name: 'Écroulement de Caverne',
        trigger: 'hp_threshold',
        effect: 'aoe',
        description: 'À 40% HP, frappe violemment le sol créant un effondrement massif : 200% ATK en zone, étourdit toutes les unités 2 secondes, détruit le terrain environnant.'
      }
    ],
    dialogueIntro: 'Ces cristaux ont mille ans. Votre existence n\'est qu\'un battement de cœur.',
    dialogueDefeat: 'Les cristaux... se brisent... L\'éternité... n\'existe pas...'
  },
  {
    id: 'reine_arachnide',
    name: 'Reine Arachnide',
    biome: 'caves',
    triggerWave: 20,
    hp: 1600,
    atk: 28,
    mechanics: [
      {
        id: 'ponte_venimeuse',
        name: 'Ponte Venimeuse',
        trigger: 'periodic',
        effect: 'summon',
        description: 'Toutes les 12 secondes, pond 4 œufs qui éclosent après 3 secondes en araignées venimeuses (20% HP boss) appliquant poison -15% HP sur 4 secondes.'
      },
      {
        id: 'toile_paralysante',
        name: 'Toile Paralysante',
        trigger: 'turn',
        effect: 'aoe',
        description: 'Au début du combat, tisse une toile géante réduisant la vitesse de déplacement de 50% et la vitesse d\'attaque de 30% pour toutes les unités ennemies.'
      },
      {
        id: 'mue_mortelle',
        name: 'Mue Mortelle',
        trigger: 'hp_threshold',
        effect: 'phase_change',
        description: 'À 50% HP, mue instantanément : soigne 30% HP max, gagne +60% ATK, +40% vitesse, immunité aux ralentissements, perd carapace réfléchissante.'
      }
    ],
    dialogueIntro: 'Ma progéniture infeste ces grottes depuis des siècles. Rejoignez-les dans l\'obscurité.',
    dialogueDefeat: 'La... colonie... survivra... sans... reine...'
  },
  {
    id: 'sphinx_gardien',
    name: 'Sphinx Gardien',
    biome: 'ruins',
    triggerWave: 25,
    hp: 2800,
    atk: 32,
    mechanics: [
      {
        id: 'enigme_mortelle',
        name: 'Énigme Mortelle',
        trigger: 'periodic',
        effect: 'aoe',
        description: 'Toutes les 18 secondes, pose une énigme : frappe toutes les unités pour 150% ATK, marque la cible la plus faible qui explose après 5s infligeant 300% ATK en zone.'
      },
      {
        id: 'jugement_ancien',
        name: 'Jugement Ancien',
        trigger: 'hp_threshold',
        effect: 'buff',
        description: 'À 60% HP, invoque le jugement des dieux : tous ses dégâts deviennent purs (ignorent armure), +25% vitesse, regagne 3% HP par seconde pendant 10 secondes.'
      }
    ],
    dialogueIntro: 'Seuls les dignes franchissent ce seuil. Prouvez votre valeur ou périssez dans l\'oubli.',
    dialogueDefeat: 'Vous... avez résolu... l\'énigme ultime... Les portes... s\'ouvrent...'
  },
  {
    id: 'anubis_vengeur',
    name: 'Anubis Vengeur',
    biome: 'ruins',
    triggerWave: 30,
    hp: 3200,
    atk: 38,
    mechanics: [
      {
        id: 'invocation_momies',
        name: 'Invocation de Momies',
        trigger: 'turn',
        effect: 'summon',
        description: 'Toutes les 15 secondes, invoque 2 momies royales (40% HP boss, 60% ATK boss) immunisées aux contrôles qui explosent à mort infligeant 100% ATK en zone.'
      },
      {
        id: 'malediction_pharaon',
        name: 'Malédiction du Pharaon',
        trigger: 'periodic',
        effect: 'aoe',
        description: 'Tous les 20 secondes, maudit l\'équipe entière : -30% soins reçus, -20% ATK, marque persiste 8 secondes, cumulable jusqu\'à 3 stacks augmentant durée et puissance.'
      },
      {
        id: 'forme_chacal',
        name: 'Forme Chacal',
        trigger: 'hp_threshold',
        effect: 'phase_change',
        description: 'À 35% HP, se transforme en chacal spectral : +80% vitesse déplacement, +50% vitesse attaque, téléportation sur cible la plus faible toutes les 4 secondes, -20% défense.'
      }
    ],
    dialogueIntro: 'Profanateurs de tombes ! Anubis pèsera vos âmes et les trouvera indignes !',
    dialogueDefeat: 'Impossible... Ma vigilance... éternelle... s\'éteint... Les morts... ne pardonnent... jamais...'
  },
  {
    id: 'seigneur_flammes',
    name: 'Seigneur des Flammes',
    biome: 'hell',
    triggerWave: 35,
    hp: 4000,
    atk: 45,
    mechanics: [
      {
        id: 'brasier_infernal',
        name: 'Brasier Infernal',
        trigger: 'periodic',
        effect: 'aoe',
        description: 'Toutes les 10 secondes, embrase le champ de bataille : 80% ATK en zone immédiat, puis brûlure -8% HP/s pendant 6 secondes, empile avec applications précédentes.'
      },
      {
        id: 'rage_explosive',
        name: 'Rage Explosive',
        trigger: 'hp_threshold',
        effect: 'aoe',
        description: 'À 50% et 25% HP, explose violemment : 400% ATK en zone massive, projette toutes les unités, applique brûlure intensifiée -12% HP/s 8 secondes, +100% ATK temporaire.'
      },
      {
        id: 'portail_magma',
        name: 'Portail de Magma',
        trigger: 'turn',
        effect: 'summon',
        description: 'Au début du combat, ouvre un portail permanent invoquant 1 élémentaire de feu (25% HP boss) toutes les 8 secondes, maximum 4 simultanés, appliquent brûlure.'
      }
    ],
    dialogueIntro: 'Ces flammes ont consumé mille royaumes. Votre chair ne sera que cendre de plus.',
    dialogueDefeat: 'Le feu... s\'éteint... Mais l\'enfer... brûle... toujours...'
  },
  {
    id: 'archidemon_torture',
    name: 'Archidémon Tortionnaire',
    biome: 'hell',
    triggerWave: 40,
    hp: 4500,
    atk: 50,
    mechanics: [
      {
        id: 'chaines_damnation',
        name: 'Chaînes de Damnation',
        trigger: 'periodic',
        effect: 'aoe',
        description: 'Toutes les 14 secondes, enchaîne 2 unités aléatoires : immobilisation 4 secondes, -50% ATK, transfère 20% des dégâts reçus au démon comme soin, applique saignement -6% HP/s.'
      },
      {
        id: 'pacte_infernal',
        name: 'Pacte Infernal',
        trigger: 'hp_threshold',
        effect: 'buff',
        description: 'À 40% HP, sacrifie 30% HP actuel pour gagner bouclier absorbant 80% dégâts pendant 10 secondes, +150% ATK, drain de vie 40% sur toutes attaques.'
      },
      {
        id: 'legion_damnee',
        name: 'Légion Damnée',
        trigger: 'turn',
        effect: 'summon',
        description: 'Toutes les 20 secondes, invoque 3 âmes damnées (15% HP boss) qui attaquent à distance, explosent à mort en zone, ressuscitent une fois à 50% HP.'
      },
      {
        id: 'apotheose_torture',
        name: 'Apothéose de Torture',
        trigger: 'hp_threshold',
        effect: 'phase_change',
        description: 'Sous 15% HP, transcende : immunité tous contrôles, +200% ATK, frappe toutes unités simultanément, chaque attaque applique saignement -10% HP/s cumulable infiniment, aura -5% HP/s.'
      }
    ],
    dialogueIntro: 'Vos cris alimenteront mon pouvoir pour l\'éternité. La torture vient de commencer.',
    dialogueDefeat: 'Impossible... Un mortel... ne peut... Mon règne... de souffrance... prend... fin...'
  },
  {
    id: 'wendigo_hivernal',
    name: 'Wendigo Hivernal',
    biome: 'snow',
    triggerWave: 45,
    hp: 5200,
    atk: 55,
    mechanics: [
      {
        id: 'blizzard_eternel',
        name: 'Blizzard Éternel',
        trigger: 'turn',
        effect: 'aoe',
        description: 'Aura passive permanente : toutes unités ennemies -40% vitesse déplacement, -25% vitesse attaque, -3% HP/s gel progressif, effets s\'intensifient +5% toutes les 10 secondes combat.'
      },
      {
        id: 'festin_cannibale',
        name: 'Festin Cannibale',
        trigger: 'periodic',
        effect: 'buff',
        description: 'Toutes les 12 secondes, dévore un cadavre au sol (allié ou ennemi) : soigne 25% HP max, +30% ATK permanent empilable, augmente taille sprite 10%.'
      },
      {
        id: 'hurlement_glace',
        name: 'Hurlement de Glace',
        trigger: 'hp_threshold',
        effect: 'aoe',
        description: 'À 60% et 30% HP, hurle gelant instantanément toutes unités 3 secondes, inflige 250% ATK, applique marque gel -50% vitesse 8 secondes après dégel, invoque 2 esprits gelés.'
      }
    ],
    dialogueIntro: 'La faim éternelle consume mon âme. Votre chair apaisera ma malédiction un instant.',
    dialogueDefeat: 'Enfin... la faim... cesse... Le froid... m\'appelle... Merci...'
  },
  {
    id: 'liche_arctique',
    name: 'Liche Arctique',
    biome: 'snow',
    triggerWave: 50,
    hp: 4800,
    atk: 60,
    mechanics: [
      {
        id: 'necromancie_glaciale',
        name: 'Nécromancie Glaciale',
        trigger: 'periodic',
        effect: 'summon',
        description: 'Toutes les 10 secondes, relève tous cadavres présents en morts-vivants gelés (30% HP original) immunisés au gel, explosent en glace à mort infligeant 120% ATK zone.'
      },
      {
        id: 'phylactere_glace',
        name: 'Phylactère de Glace',
        trigger: 'turn',
        effect: 'buff',
        description: 'Au début du combat, crée 3 phylactères indestructibles autour du champ : tant qu\'un existe, la Liche ressuscite à 50% HP quand tuée, délai 5 secondes.'
      },
      {
        id: 'tempete_ames',
        name: 'Tempête d\'Âmes',
        trigger: 'hp_threshold',
        effect: 'aoe',
        description: 'À 40% HP, déchaîne les âmes prisonnières : 180% ATK zone toutes 2 secondes pendant 8 secondes, chaque hit draine 15% HP comme soin, applique peur -40% ATK 4 secondes.'
      },
      {
        id: 'transcendance_mort',
        name: 'Transcendance de Mort',
        trigger: 'hp_threshold',
        effect: 'phase_change',
        description: 'À 20% HP après toutes résurrections, forme finale : immunité physique, 100% dégâts magiques purs, téléportation aléatoire toutes 3 secondes, projectiles âmes guidés multiples, drain vie 60%.'
      }
    ],
    dialogueIntro: 'La mort n\'a plus d\'emprise sur moi. Je suis l\'éternité glacée incarnée.',
    dialogueDefeat: 'Mon phylactère... brisé... Après tant... de siècles... Le repos... enfin...'
  },
  {
    id: 'gardien_originel',
    name: 'Gardien Originel',
    biome: 'temple',
    triggerWave: 55,
    hp: 6500,
    atk: 68,
    mechanics: [
      {
        id: 'bouclier_sacre',
        name: 'Bouclier Sacré',
        trigger: 'periodic',
        effect: 'buff',
        description: 'Toutes les 15 secondes, active bouclier absorbant 1000 dégâts, renvoie 60% dégâts à attaquant, immunité contrôles, +40% résistances toutes sources, persiste jusqu\'à destruction.'
      },
      {
        id: 'jugement_divin',
        name: 'Jugement Divin',
        trigger: 'periodic',
        effect: 'aoe',
        description: 'Toutes les 18 secondes, invoque rayon sacré : 300% ATK zone ciblée télégraphiée 2s avant, vaporise unités sous 20% HP instantanément, applique marque divine -30% soins reçus 10 secondes.'
      },
      {
        id: 'benediction_ancestrale',
        name: 'Bénédiction Ancestrale',
        trigger: 'hp_threshold',
        effect: 'buff',
        description: 'À 50% HP, reçoit bénédiction ancienne : régénération 8% HP/s pendant 12 secondes, +80% ATK, toutes attaques deviennent zone 3 mètres, immunité débuffs, aura soin alliés +5% HP/s.'
      }
    ],
    dialogueIntro: 'Je protège ce sanctuaire depuis l\'aube des temps. Nul impur ne passera.',
    dialogueDefeat: 'Mon devoir... accompli... Le temple... trouvera... nouveau gardien... Allez... en paix...'
  },
  {
    id: 'dragon_primordial',
    name: 'Dragon Primordial',
    biome: 'temple',
    triggerWave: 60,
    hp: 8000,
    atk: 80,
    mechanics: [
      {
        id: 'souffle_elements',
        name: 'Souffle des Éléments',
        trigger: 'periodic',
        effect: 'aoe',
        description: 'Toutes les 8 secondes, alterne souffles : FEU (150% ATK zone conique, brûlure -10% HP/s 5s), GLACE (120% ATK zone, gel 2s, -60% vitesse 6s), FOUDRE (200% ATK ligne, chaîne 3 cibles).'
      },
      {
        id: 'vol_devastateur',
        name: 'Vol Dévastateur',
        trigger: 'periodic',
        effect: 'aoe',
        description: 'Toutes les 20 secondes, s\'envole devenant intangible 4 secondes, plonge créant onde choc : 400% ATK zone massive, projette toutes unités, détruit terrain, étourdit 3 secondes, applique saignement -8% HP/s.'
      },
      {
        id: 'ecailles_titanesques',
        name: 'Écailles Titanesques',
        trigger: 'turn',
        effect: 'buff',
        description: 'Passive permanente : ignore premiers 30% dégâts de chaque attaque, renvoie 25% dégâts subis à attaquant, régénération 2% HP/s constante, immunité contrôles durée <2 secondes.'
      },
      {
        id: 'rage_primordiale',
        name: 'Rage Primordiale',
        trigger: 'hp_threshold',
        effect: 'phase_change',
        description: 'À 30% HP, entre rage ancestrale : +150% ATK, +100% vitesse attaque, tous souffles simultanés toutes directions, invoque 4 dragonneaux (20% HP boss) régénérant 5% HP boss/s tant qu\'en vie.'
      },
      {
        id: 'apocalypse_draconique',
        name: 'Apocalypse Draconique',
        trigger: 'hp_threshold',
        effect: 'aoe',
        description: 'À 10% HP, ultime désespoir : canalise 5 secondes puis libère apocalypse élémentaire : 1000% ATK zone complète, détruit tout terrain, applique tous éléments simultanément, tue dragon après.'
      }
    ],
    dialogueIntro: 'Je suis la fureur des cieux, le feu originel, la tempête incarnée. Prosternez-vous ou périssez.',
    dialogueDefeat: 'Incroyable... Des mortels... ont vaincu... un dragon primordial... L\'ère... des anciens... s\'achève... Vous... êtes... dignes... héritiers...'
  }
];