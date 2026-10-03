"""Authored neutral facial identities, using CC0 MakeHuman anatomical targets.

These shape choices change the underlying face before the rig and accessories
are fitted. They are not expressions, and do not force smiles or frowns.
"""
FACES = {
 'chen': {'head/head-square': .32, 'chin/chin-width-incr': .22, 'nose/nose-width1-incr': .12},
 'lin': {'head/head-oval': .48, 'head/head-scale-horiz-decr': .18, 'chin/chin-height-incr': .18, 'nose/nose-scale-horiz-decr': .10},
 'zhou': {'head/head-rectangular': .28, 'chin/chin-prominent-incr': .14, 'nose/nose-scale-vert-incr': .14},
 'aunt': {'head/head-round': .46, 'head/head-fat-incr': .28, 'chin/chin-width-incr': .16, 'nose/nose-width2-incr': .12},
 'mom': {'head/head-round': .25, 'head/head-age-incr': .30, 'chin/chin-height-decr': .16, 'nose/nose-point-down': .12, 'cheek/cheek-volume-incr': .20, 'eyes/eye-bag-incr': .15},
 'dad': {'head/head-rectangular': .36, 'head/head-age-incr': .24, 'chin/chin-width-incr': .20, 'nose/nose-scale-vert-incr': .18, 'eyes/eye-bag-incr': .20},
 'senior': {'head/head-square': .40, 'chin/chin-bones-incr': .18, 'nose/nose-scale-depth-incr': .18},
 'yue': {'head/head-invertedtriangular': .32, 'head/head-scale-vert-decr': .14, 'chin/chin-width-decr': .22, 'cheek/cheek-volume-incr': .16, 'mouth/mouth-scale-horiz-incr': .12},
 'kai': {'head/head-round': .32, 'head/head-scale-horiz-incr': .12, 'chin/chin-height-decr': .10, 'nose/nose-width1-incr': .18},
 'fang': {'head/head-diamond': .34, 'chin/chin-height-incr': .18, 'cheek/cheek-bones-incr': .18, 'nose/nose-scale-vert-incr': .10},
 'qiao': {'head/head-rectangular': .42, 'chin/chin-prominent-incr': .22, 'nose/nose-greek-incr': .12},
 'cheng': {'head/head-oval': .26, 'chin/chin-width-decr': .18, 'nose/nose-scale-depth-decr': .14, 'mouth/mouth-scale-horiz-incr': .14},
 'he': {'head/head-square': .25, 'head/head-age-incr': .25, 'cheek/cheek-volume-decr': .16, 'nose/nose-scale-vert-incr': .18},
 'ning': {'head/head-round': .36, 'head/head-scale-vert-decr': .08, 'chin/chin-prominent-decr': .18, 'nose/nose-width2-incr': .10},
 'rui': {'head/head-triangular': .22, 'head/head-scale-horiz-decr': .12, 'chin/chin-prominent-incr': .18, 'nose/nose-point-down': .10},
 'player': {'head/head-oval': .24, 'chin/chin-width-incr': .10, 'nose/nose-scale-depth-incr': .12},
}

def fit_identity(base, actor_id, target_root, target_service):
 for target, weight in FACES[actor_id].items():
  category, name = target.split('/')
  # Left / right cheek and eye controls are symmetric anatomical edits.
  names = ['l-' + name, 'r-' + name] if category in ('eyes', 'cheek') else [name]
  for filename in names:
   path = target_root / category / (filename + '.target.gz')
   target_service.load_target(base, str(path), weight=weight)
