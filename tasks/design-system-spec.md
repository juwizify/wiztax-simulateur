# Design System WizTax — Spec unifiée

Date : 2026-06-04
Branche : `wip/ajustements`
Contexte : Phase E. 258 classes CSS recensées dans `styles.css`, mais
seulement **4 familles principales** sont actuellement divergentes entre
les onglets (audit visuel terminé via preview MCP, screenshots à l'appui).

## Principe directeur

**Un seul ensemble de composants partagés, consommé par toutes les pages.**
Quand une page a besoin d'un visuel — Card, Badge, Table — elle réutilise
le composant central. Si un composant manque, on l'ajoute à la banque
(en haut du fichier `css/styles.css`), jamais en local dans une page.

L'accent (`#3340FA`) est réservé aux **signaux interactifs** (tabs actifs,
focus, hover des liens). Il ne sert plus de décoration de masse (plus de
liserés colorés sur les cards, plus de h2 en accent).

## Design tokens — `:root` (existants à conserver + ajustements)

```css
:root {
  /* Surfaces (existant) */
  --surface:                #F5F6FA;
  --surface-container-low:  #EDEEF5;
  --surface-container:      #E5E6EF;
  --surface-container-high: #DADBE8;  /* utilisé pour border 1px des cards */
  --surface-lowest:         #FFFFFF;

  /* Text (existant) */
  --on-surface:          #141720;
  --on-surface-variant:  #3E404F;
  --outline:             #6B6C7E;
  --outline-variant:     #BBBCD0;

  /* Accent — réservé aux signaux interactifs (tab actif, focus, hover) */
  --accent:  #3340FA;
  --primary: #0716E5;

  /* Sémantique */
  --warning: #872100;
  --error:   #BA1A1A;
  --success: #166534;    /* NOUVEAU — pour badges "ok" et lignes positives */

  /* Couleurs sémantiques niches (NOUVEAU — sortir les hardcodés) */
  --niche-hors-fg: #7B1200;  --niche-hors-bg: #FFE8E4;  --niche-hors-br: #F5C4B8;
  --niche-10k-fg: #475569;   --niche-10k-bg: #F1F5F9;   --niche-10k-br: #CBD5E1;
  --niche-18k-fg: #6B5000;   --niche-18k-bg: #FFF8E0;   --niche-18k-br: #E8D58A;

  /* Tokens (existant + ajustements) */
  --shadow-arch:   0px 8px 24px rgba(20,23,32,.08), 0px 1px 4px rgba(20,23,32,.04);  /* legacy lourd, à retirer */
  --radius-card:   8px;        /* (était 20px, refondu en commit 63e9d46) */
  --radius-input:  8px;        /* (était 10px, légèrement assoupli) */
  --radius-sm:     4px;        /* pour badges, micro-éléments */

  /* Espacement (NOUVEAU — sortir les magic numbers) */
  --gap-xs:  4px;
  --gap-sm:  8px;
  --gap-md:  12px;
  --gap-lg:  16px;
  --gap-xl:  24px;
  --gap-2xl: 40px;

  /* Typographie (existant) */
  --font-headline: 'Manrope', system-ui, sans-serif;
  --font-body:     'Inter', system-ui, sans-serif;
}
```

## Banque de composants — états cible

### 1. `.card` — composant générique de bloc visuel

Cible UNIQUE qui remplace `.section-card`, `.calc-section`, `.param-card`,
`.levier-card` et `.results-panel`. Pas de liseré coloré, fine bordure 1px,
header sobre.

```css
.card {
  background: var(--surface-lowest);
  border: 1px solid var(--surface-container-high);
  border-radius: var(--radius-card);
  margin-bottom: var(--gap-lg);
  overflow: hidden;
}
.card-header {
  padding: 12px 20px;
  border-bottom: 1px solid var(--surface-container-high);
  font-family: var(--font-headline);
  font-size: .72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--on-surface-variant);
  background: transparent;
}
.card-body { padding: 12px 20px; }
```

Migration : en E2, on alias `.section-card` → `.card` et on aligne les
4 autres (`.calc-section`, `.param-card`, `.levier-card`, `.results-panel`)
sur la même base. Au choix : refactor HTML (renommer toutes les classes
en `.card`) ou créer des alias CSS (`.section-card, .calc-section { /* hérite */ }`).
Préférence : alias CSS pour préserver l'historique HTML, **+ commentaire
qui décourage la création de nouveaux noms**.

### 2. `.badge` — composant générique de tag colorée

Cible UNIQUE qui remplace `.lbadge-*`, `.niche-marker .niche-*`,
`.preco-cat-badge .preco-cat-*`.

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-family: var(--font-body);
  font-size: .7rem;
  font-weight: 500;
  letter-spacing: .2px;
  border: 1px solid transparent;
  white-space: nowrap;
}
.badge--niche-hors { color: var(--niche-hors-fg); background: var(--niche-hors-bg); border-color: var(--niche-hors-br); }
.badge--niche-10k  { color: var(--niche-10k-fg);  background: var(--niche-10k-bg);  border-color: var(--niche-10k-br); }
.badge--niche-18k  { color: var(--niche-18k-fg);  background: var(--niche-18k-bg);  border-color: var(--niche-18k-br); }
.badge--neutral    { color: var(--on-surface-variant); background: var(--surface-container-low); border-color: var(--surface-container-high); }
.badge--success    { color: var(--success); background: rgba(22,101,52,.08); border-color: rgba(22,101,52,.2); }
.badge--warning    { color: var(--warning); background: rgba(135,33,0,.08); border-color: rgba(135,33,0,.2); }
```

Migration : en E4, alias les anciens noms vers `.badge` + modifiers, ou
refactor HTML pour utiliser `.badge.badge--niche-hors` partout.

### 3. `.data-table` — composant générique de tableau de données

Cible : remplace `.calc-table`, `.param-table`, `.preco-compare-table`
(restera) pour le formatage commun (alignement nombres, hover, séparateurs).

```css
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: .85rem;
}
.data-table th {
  text-align: left;
  font-weight: 600;
  color: var(--on-surface-variant);
  padding: 8px 12px;
  border-bottom: 1px solid var(--surface-container-high);
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .5px;
}
.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--surface-container);
}
.data-table td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}
```

Migration : en E2/E3, harmoniser au passage si on touche aux tableaux.
Optionnel sur Phase E (peut attendre).

### 4. Composants déjà conformes (à laisser tels quels)

- `.tabs-nav` + `.tab-btn` — refonte déjà alignée (commit ba8765b + suivants)
- `.mode-toggle` + `.mode-btn` — refonte alignée (commit fff69d6)
- `.form-grid` + `.form-row` + `.form-subsection` — refonte alignée (commit 63e9d46)
- `.dev-toolbar` — particulier (mode dev), pas à harmoniser

### 5. Composants spécifiques métier (à documenter, pas à factoriser)

- `.preco-*` (~30 classes) : composant tableau Préco avec lignes ajoutables,
  jauges, badges nature. Trop spécialisé pour être un composant générique.
  → Conserver tel quel, commenter en en-tête de section dans styles.css
- `.tip` (tooltip i) : composant utilisé partout, déjà conforme
- `.niche-cell` : helper layout, OK

## Plan d'exécution Phase E

| # | Sujet | Fichiers | Effort |
|---|---|---|---|
| **E1** (en cours) | Spec présente | `tasks/design-system-spec.md` | 30 min |
| **E2** | Unifier section-cards (.calc-section, .param-card, .levier-card, .leviers-section-title) sur le même style sobre que .section-card. Retirer les liserés colorés en haut. | `css/styles.css` | 1 h |
| **E3** | Refondre .results-panel : retirer liseré bleu, h2 sobre, lignes propres | `css/styles.css` | 30 min |
| **E4** | Harmoniser badges : créer `.badge` + modifiers, alias les anciens noms (lbadge-*, niche-marker, preco-cat-badge) | `css/styles.css` | 1 h |
| **E5** | Ajouter section "Banque de composants" en en-tête de styles.css + mention dans CLAUDE.md | `css/styles.css`, `CLAUDE.md` | 20 min |

Pas de modification HTML obligatoire (les alias CSS conservent les noms
existants). Tests Node ne sont pas affectés (logique pure JS).
À chaque commit : screenshot via preview MCP pour vérifier qu'aucun
écran ne casse.

## Note sur les composants spéciaux Leviers fiscaux

L'onglet Leviers a aujourd'hui des couleurs **thématiques par section**
(vert pour Épargne retraite, violet pour Immo, etc.) appliquées sur les
liserés et titres de section. C'est de la **décoration**, pas de la
sémantique : ces couleurs ne portent aucune info utile à l'utilisateur.

Décision : on les retire complètement en E2. Si un jour on veut
réintroduire de la couleur thématique (ex: catégorie d'investissement),
ce sera via un composant `.section-tag` documenté, pas en hardcodant
des couleurs dans `.levier-card`.
