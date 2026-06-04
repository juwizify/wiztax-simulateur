# Audit des liens officiels — D3.8

**Date** : 2026-06-04
**Périmètre** : toutes les URLs collées dans `LEVIERS_CATALOGUE` (`links[]`) de `js/preconisations.js`.

## Méthode

Vérification systématique via WebFetch sur 45+ URLs candidates (Légifrance, BOFiP,
service-public.fr, impots.gouv.fr). Critères :
- **✓ valide** : statut 200 + contenu correspond bien au dispositif annoncé.
- **⚠ hors sujet** : 200 mais contenu sans rapport (souvent dû à une dérive d'ID).
- **✗ 404** : URL morte.

## Conclusions

### URLs en production retirées (étaient fausses)

| Dispositif | URL collée en D3.2/D3.3 | Statut audit | Action |
|---|---|---|---|
| SOFICA | `LEGIARTI000041467091` | 404 | Retirée |
| SOFICA | `bofip/3666-PGP.html` | Hors sujet (invest Outre-mer) | Retirée |
| SOFICA | `service-public.fr/.../F31290` | Hors sujet (logement social) | Retirée |
| FIP Corse | `LEGIARTI000041464766` | Hors sujet (art. 1657 arrondis) | Retirée |
| FIP Corse | `bofip/2049-PGP.html` | Hors sujet (recouvrement) | Retirée |
| FIP Corse | `service-public.fr/.../F12888` | 404 | Retirée |
| GFI | `LEGIARTI000045203167` | 404 | Retirée |
| GFI | `bofip/2105-PGP.html` | Hors sujet (taxes BIC) | Retirée |
| GFI | `service-public.fr/.../F22806` | 404 | Retirée |
| IR-PME (×5 entrées) | `bofip/4374-PGP.html/identifiant=...` | Path non standard | Normalisée à `/bofip/4374-PGP.html` |
| IR-PME JEI/FCPI-JEI | `LEGIARTI000051213424` | Non vérifiée | Retirée |
| IR-PME JEIR | `LEGIARTI000053543758` | Non vérifiée | Retirée |
| IR-PME JEII | `JORFTEXT000051200000` | Non vérifiée | Retirée |

### URLs confirmées et conservées

| Levier | URL | Audit |
|---|---|---|
| IR-PME (toutes variantes) | `entreprendre.service-public.gouv.fr/vosdroits/F37091` | ✓ |
| IR-PME (toutes variantes) | `bofip.impots.gouv.fr/bofip/4374-PGP.html` | ✓ (un peu daté mais correct) |
| IR-PME standard / ESUS / MH | `legifrance.gouv.fr/codes/article_lc/LEGIARTI000051213428` | ✓ (Art. 199 terdecies-0 A) |
| PER | `service-public.gouv.fr/particuliers/vosdroits/F34982` | ✓ |
| Dons 7UD + 7UF | `service-public.gouv.fr/particuliers/vosdroits/F426` | ✓ |
| Emploi à domicile | `service-public.gouv.fr/particuliers/vosdroits/F12` | ✓ |
| Garde d'enfants < 6 ans | `service-public.gouv.fr/particuliers/vosdroits/F8` | ✓ |

### Leviers SANS `links[]` (URLs non trouvées fiables)

Pour les leviers ci-dessous, aucune URL n'a pu être validée à la fois en
statut HTTP et en pertinence du contenu. **Décision : pas de `links[]`** plutôt
que des liens trompeurs.

- SOFICA — refCGI/refBofip en texte seul.
- FIP Corse — refCGI/refBofip en texte seul.
- GFI — refCGI/refBofip en texte seul.
- Déficit foncier
- Jeanbrun (loi récente, articles JORF instables)
- EHPAD
- Cotisations syndicales
- Girardin PD / AG
- Loi Malraux
- Loc'Avantages
- Pinel (non listé au catalogue, juste dans le Simulateur)

## Constat structurel

Les identifiants `LEGIARTI<num>` Légifrance sont des **versions d'article** : ils
changent à chaque modification législative. Idem pour les `<num>-PGP.html` BOFiP
qui semblent aussi être versionnés. Toutes les URLs collées en D3.2/D3.3 sans
vérification correspondaient à des versions historiques (post-LF 2024 ou plus
anciennes) périmées par la LF 2026.

**Règle pour le futur** : ne jamais coller une URL fiscale officielle sans
WebFetch préalable confirmant 200 + contenu pertinent.

## Pistes pour aller plus loin

- service-public.gouv.fr fournit des fiches stables par `F<num>`, redirigées
  depuis l'ancien `service-public.fr`. C'est la source la plus fiable.
- Pour Légifrance, préférer le format `code/section_lc/LEGITEXT000006069577/`
  (CGI section) qui pointe sur le code, ou la recherche `/search/code?...`.
- Pour BOFiP, les permaliens `BOI-IR-...` sont théoriquement stables : à
  retester quand on disposera du bon mapping `<num>-PGP.html` ↔ `BOI-IR-...`.
- Possible amélioration future : créer un script `tools/check-links.js` qui
  WebFetch chaque URL de `LEVIERS_CATALOGUE` et alerte sur 404 ou redirection.
