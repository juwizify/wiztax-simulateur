# Audit comparatif Préco ↔ Leviers fiscaux

Date : 2026-06-04
Branche : `wip/ajustements`
Contexte : Phase D du refactor « source unique ». Inventaire des divergences entre
`LEVIERS_CATALOGUE` (preconisations.js) et l'onglet Leviers fiscaux (index.html),
réalisé par agent code-explorer avant la conception du catalogue unique.

---

## A) Divergences factuelles à arbitrer (⚠ FACTUEL) — par ordre d'impact

| # | Levier | Divergence | Source officielle à vérifier | Priorité |
|---|---|---|---|---|
| **1** | IR-PME | JS : taux 25 % uniforme (« boost 2024-2025 »). HTML : 18 % base + 25-50 % ESUS/JEI | BOI-IR-RICI-90, LF 2026 | **CRITIQUE** — impact moteur direct |
| **2** | IR-PME | JS : souscription directe **≠** fonds. HTML : « ou via FCPI agréé » | art. 199 terdecies-0 A CGI | CRITIQUE — contradiction nette |
| **3** | Loc'Avantages | JS : taux Loc1/2 = 15/35 % (intermédiation seule). HTML : 15-20 % et 35-40 % selon intermédiation | art. 199 tricies CGI | ÉLEVÉE — sous-estimation possible |
| **4** | Loc'Avantages | JS : cap 10 000 € sur dépenses. HTML : pas de plafond d'assiette spécifique | art. 199 tricies CGI | ÉLEVÉE |
| **5** | Déficit foncier | JS inclut PS 18,6 % dans formule économie. HTML mentionne TMI seul | BOI-RFPI-BASE-30 | MOYENNE — formule éducative |
| **6** | SOFICA | JS modélise 3 taux (30/36/48 %). HTML n'affiche que 30/36 % | art. 199 unvicies CGI | MOYENNE — HTML incomplet |
| **7** | FCPI JEI / FIP Corse | JS dit blocage 5-10 ans. HTML dit 7-10 ans | art. 199 terdecies-0 A CGI | FAIBLE — formulation |
| **8** | Girardin | Vocabulaire rendement : JS = ratio RI/invest (110 %), HTML = gain net (10 %) | n/a (rédactionnel) | FAIBLE — clarté |

## B) Textes faibles à réécrire (⚡)

1. **PER** info JS : « revenus pro » imprécis → « revenus professionnels nets N−1 (salaires, BNC, BIC, gérants), plafonné 37 680 €/déclarant »
2. **IR-PME** info JS : « taux boost 2024-2025 » → à supprimer une fois le taux 2026 arbitré
3. **Loc'Avantages** options JS : labels ne précisent pas « avec/sans intermédiation »
4. **Girardin PD** info JS : mélange de 2 métriques rendement
5. **Déficit foncier** info JS : formule économie sur-simplifiée
6. **HTML Girardin** « rendement fiscal 8 à 23 % » : ambigu
7. **HTML Loc'Avantages** « pas de plafond d'assiette spécifique » : ambigu

## C) Dispositifs présents dans une seule source

**Absents de l'onglet Leviers HTML (modélisés dans le catalogue) :**
- `dons7UD` (Coluche 75 %) — fusionné dans la card « Dons aux œuvres »
- `ehpad`, `emploiDom`, `gardeEnf`, `syndic` — non documentés dans l'onglet Leviers (uniquement tooltips formulaire)

**Absents du catalogue JS (présents dans l'onglet Leviers HTML) :**
- `Monuments Historiques` — non modélisé
- `Denormandie` — card HTML dédiée, mais le champ simulateur `id="pinel"` couvre Pinel+Denormandie en RI directe sans modélisation propre. **`preconisations.js:15-22` documente explicitement que le calcul Pinel/Denormandie est INCORRECT** (RI complète appliquée sur l'année au lieu d'étalement sur 6/9/12 ans)

## D) Architecture cible recommandée (par l'agent)

Le catalogue unique absorbe TOUT le contenu (mécanique fiscale + descriptif éditorial). L'onglet Leviers HTML est 100 % généré au load à partir du catalogue. Les dispositifs informatifs (MH, Denormandie si non modélisé) sont dans le catalogue avec `mode: 'informatif'`.

Schéma proposé pour chaque entrée du catalogue :

```js
{
  // Identité
  id, label, labelCourt, levier, cat, mode, inputKey, paramKey,
  nature, budget,

  // Mécanique fiscale
  taux?, params?, rendementDefaut?, rendementMin?, rendementMax?, rendementStep?,

  // Présentation (NOUVEAUX champs)
  tauxInfo,           // "50 %" / "18 %–30 % selon durée"
  plafondInfo,        // "10 700 €/an" / "50 000 € / 100 000 €"
  panierInfo,         // dérive de cat (peut être auto-généré)
  dureeDetention?,    // "5 ans minimum"
  reportInfo?,        // "4 ans" / "5 ans" / "10 ans foncier"
  refCGI,             // "Art. 199 terdecies-0 A CGI"
  refBofip?,          // "BOI-IR-RICI-90"
  descCeQueCest,      // bloc "Ce que c'est"
  descCalcul,         // bloc "Calcul"
  descConditions?,    // bloc optionnel
  descAnnexes?,       // ex. avantages IFI/succession pour GFI
  avertissement?,     // ex. "Investissement à fonds perdus" pour Girardin
}
```

---

## Ordre d'attaque D3 (par levier)

1. **IR-PME** — taux à trancher BOFiP (CRITIQUE)
2. **Loc'Avantages** — plafond + intermédiation (ÉLEVÉE)
3. **SOFICA** — taux 48 % manquant côté HTML (MOYENNE)
4. **Girardin PD / AG** — vocabulaire rendement + valeurs annexes
5. **Malraux** — plafond pluriannuel + RI max
6. **GFI** — durée détention + zones éligibles
7. **FCPI JEI / FIP Corse** — durée blocage 5 vs 7-10 ans
8. **Jeanbrun** — détails conditions (DPE A/B, travaux 30 %)
9. **Déficit foncier** — formule économie + plafond doublé LF 2026
10. **PER** — précision « revenus pro » + report 5 ans LF 2026
11. **Dons 7UD / 7UF** — structure (fusion ou séparation)
12. **Monuments Historiques** — modéliser ou marquer informatif
13. **Pinel / Denormandie** — corriger calcul étalé (preconisations.js:15-22)
14. **EHPAD / emploi domicile / garde enfants / cot. syndicales / frais scolarité** — créer des cards Leviers ou laisser hors onglet
