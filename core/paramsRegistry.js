/**
 * REGISTRE UNIQUE DES PARAMÈTRES FISCAUX
 * ──────────────────────────────────────
 *
 * Source unique d'organisation pour l'onglet « Paramètres fiscaux ».
 *
 * Principe : ce fichier décrit COMMENT présenter les paramètres (titre,
 * regroupement, libellés, sources officielles). Les VALEURS, elles, vivent
 * exclusivement dans `PARAMS` (cf. js/params.js) et sont injectées via le
 * mécanisme de tokens `{{path|fmt}}` du module `paramInject.js`.
 *
 * Conséquence opérationnelle : aucun chiffre fiscal n'apparaît en dur dans
 * ce fichier. Tout libellé/valeur référence un chemin dans PARAMS via les
 * tokens. Modifier une valeur dans PARAMS suffit à mettre à jour
 * automatiquement le moteur ET l'onglet Paramètres fiscaux.
 *
 * Chaque groupe expose une source officielle (label + URL + référence légale)
 * et une date de dernière vérification. La date sert d'ancre pour la
 * traçabilité — quand un paramètre est revérifié, mettre à jour `lastVerified`.
 */

const PARAMS_GROUPS = [
  // ── BARÈME ────────────────────────────────────────────────────────
  {
    title: 'Barème progressif de l\'IR',
    rows: [
      { label: 'Jusqu\'à {{bareme.0.limite|eur}}',                                value: '{{bareme.0.taux|pct}}' },
      { label: '{{bareme.0.limite|eur}} à {{bareme.1.limite|eur}}',               value: '{{bareme.1.taux|pct}}' },
      { label: '{{bareme.1.limite|eur}} à {{bareme.2.limite|eur}}',               value: '{{bareme.2.taux|pct}}' },
      { label: '{{bareme.2.limite|eur}} à {{bareme.3.limite|eur}}',               value: '{{bareme.3.taux|pct}}' },
      { label: 'Au-delà de {{bareme.3.limite|eur}}',                              value: '{{bareme.4.taux|pct}}' },
    ],
    source: {
      label: 'BOI-IR-LIQ-20-10 (07/04/2026)',
      url:   'https://bofip.impots.gouv.fr/bofip/2491-PGP.html/identifiant=BOI-IR-LIQ-20-10-20260407',
      legal: 'art. 197 I-1 CGI · LF 2026 art. 4 (indexation +0,9 %)',
    },
    lastVerified: '2026-06-05',
  },

  // ── QUOTIENT FAMILIAL ─────────────────────────────────────────────
  {
    title: 'Quotient familial — plafonnement des demi-parts',
    rows: [
      { label: 'Plafond standard par demi-part supplémentaire',                  value: '{{qf.plafondDemiPart|eur}}' },
      { label: 'Plafond demi-part case L (vieux parent isolé)',                  value: '{{qf.plafondDemiPartL|eur}}' },
      { label: 'Plafond demi-part case G (veuve de guerre)',                     value: 'déplafonné' },
      { label: 'Parent isolé — plafond pour 1ʳᵉ part entière',                   value: '{{qf.parentIsole1er|eur}}' },
      { label: 'Parent isolé — plafond pour la demi-part 1er enfant',            value: '{{qf.parentIsoleDemi|eur}}' },
      { label: 'Veuf avec enfants — plafond part supplémentaire',                value: '{{qf.veufPartSupp|eur}}' },
    ],
    source: {
      label: 'BOI-IR-LIQ-20-20-20 (07/04/2026)',
      url:   'https://bofip.impots.gouv.fr/bofip/2494-PGP.html/identifiant=BOI-IR-LIQ-20-20-20-20260407',
      legal: 'art. 197 I-2 CGI · LF 2026 art. 4',
    },
    lastVerified: '2026-06-05',
  },

  // ── DÉCOTE ────────────────────────────────────────────────────────
  {
    title: 'Décote',
    rows: [
      { label: 'Plafond célibataire',                  value: '{{decote.plafondCelibataire|eur}}' },
      { label: 'Plafond couple',                       value: '{{decote.plafondCouple|eur}}' },
      { label: 'Seuil impôt célibataire',              value: '{{decote.seuilCelibataire|eur}}' },
      { label: 'Seuil impôt couple',                   value: '{{decote.seuilCouple|eur}}' },
      { label: 'Taux d\'absorption',                   value: '{{decote.taux|pct}}' },
    ],
    source: {
      label: 'BOI-IR-LIQ-20-20-30 (07/04/2026)',
      url:   'https://bofip.impots.gouv.fr/bofip/2495-PGP.html/identifiant=BOI-IR-LIQ-20-20-30-20260407',
      legal: 'art. 197 I-4 CGI · LF 2026 art. 4',
    },
    lastVerified: '2026-06-05',
  },

  // ── ABATTEMENTS ───────────────────────────────────────────────────
  {
    title: 'Abattements et exonérations',
    rows: [
      { label: 'Salaires + alloc. chômage — taux / min / max par déclarant',     value: '{{abat.sal.taux|pct}} · {{abat.sal.min|eur}} · {{abat.sal.max|eur}}' },
      { label: 'Pensions retraite + invalidité + alim. perçues — taux / min / max foyer', value: '{{abat.pen.taux|pct}} · {{abat.pen.min|eur}} · {{abat.pen.maxFoyer|eur}}' },
      { label: 'Heures sup. et RTT exonérées — plafond annuel par déclarant',    value: '{{plafonds.heuresSupExoPlafond|eur}}' },
      { label: 'Micro-BNC — taux / min',                                         value: '{{abat.bncMicro.taux|pct}} · {{abat.bncMicro.min|eur}}' },
      { label: 'Micro-foncier — taux / plafond recettes',                        value: '{{abat.microFoncier.taux|pct}} · {{abat.microFoncier.plafond|eur}}' },
      { label: 'Meublé classé micro-BIC — taux / plafond recettes',              value: '{{abat.meubleClasse.taux|pct}} · {{abat.meubleClasse.plafond|eur}}' },
      { label: 'Meublé non classé micro-BIC — taux / plafond recettes',          value: '{{abat.meubleNonClasse.taux|pct}} · {{abat.meubleNonClasse.plafond|eur}}' },
      { label: 'Autres meublés (LMNP année) — taux / plafond recettes',          value: '{{abat.autresMeubles.taux|pct}} · {{abat.autresMeubles.plafond|eur}}' },
      { label: 'Dividendes (si option barème 2OP)',                              value: '{{abat.dividendes|pct}}' },
      { label: 'AV > 8 ans — abattement annuel single / couple',                 value: '{{abat.avSingle|eur}} / {{abat.avCouple|eur}}' },
    ],
    source: {
      label: 'BOFiP ACTU-2026-00022 (indexation +0,9 %) · BOI-IR-BASE-40',
      url:   'https://bofip.impots.gouv.fr/bofip/14954-PGP.html/ACTU-2026-00022',
      legal: 'art. 83-3° CGI (salaires 14 555 €) · art. 158-5 CGI (pensions 4 439 €) · art. 32 CGI (micro-foncier) · art. 50-0 CGI (micro-BIC) · art. 81 quater CGI (heures sup exo) · art. 125-0 A CGI (AV)',
    },
    lastVerified: '2026-06-05',
  },

  // ── PRÉLÈVEMENTS SOCIAUX ──────────────────────────────────────────
  {
    title: 'Prélèvements sociaux',
    rows: [
      { label: 'Revenus mobiliers (dividendes, intérêts, PV mobilières)',        value: '{{ps.mobilier|pct}}' },
      { label: 'Foncier nu (location vide, art. 14 CGI)',                        value: '{{ps.foncierNu|pct}}' },
      { label: 'LMNP (meublé non pro, art. 35 CGI) — LFSS 2026 +1,4 pt',         value: '{{ps.lmnp|pct}}' },
      { label: 'AV > 8 ans, PV immobilières',                                    value: '{{ps.av|pct}}' },
      { label: 'PFU — part IR',                                                  value: '{{ps.pfuIr|pct}}' },
      { label: 'CSG déductible (revenu N+1)',                                    value: '{{ps.csgDeductible|pct}}' },
      { label: 'Composantes — CSG cas général (mobilier, LMNP)',                 value: '{{ps.csg.casGeneral|pct}}' },
      { label: 'Composantes — CSG fonciers (foncier nu, AV, PV immo)',           value: '{{ps.csg.fonciers|pct}}' },
      { label: 'Composantes — CRDS',                                             value: '{{ps.crds|pct}}' },
      { label: 'Composantes — Prélèvement de solidarité',                        value: '{{ps.solidarite|pct}}' },
    ],
    source: {
      label: 'service-public.gouv.fr/F2329',
      url:   'https://www.service-public.gouv.fr/particuliers/vosdroits/F2329',
      legal: 'art. L136-7 CSS · LFSS 2026 art. 12',
    },
    lastVerified: '2026-06-05',
  },

  // ── NICHES FISCALES ──────────────────────────────────────────────
  {
    title: 'Niches fiscales — plafond global art. 200-0 A',
    rows: [
      { label: 'Plafond général (poche 1)',                                      value: '{{niches.plafond|eur}}' },
      { label: 'Plafond majoré incluant Girardin/SOFICA (poche 1 + poche 2)',    value: '{{niches.plafondMajore|eur}}' },
      { label: 'Girardin plein droit — quote-part dans le plafond',              value: '{{niches.girardinPdQuotePart|pct}}' },
      { label: 'Girardin avec agrément — quote-part dans le plafond',            value: '{{niches.girardinAgQuotePart|pct}}' },
    ],
    source: {
      label: 'service-public.gouv.fr/F31179 · BOI-IR-LIQ-20-20-10',
      url:   'https://www.service-public.gouv.fr/particuliers/vosdroits/F31179',
      legal: 'art. 200-0 A CGI',
    },
    lastVerified: '2026-06-05',
  },

  // ── PER (épargne retraite) ────────────────────────────────────────
  {
    title: 'PER — plafond de déduction',
    rows: [
      { label: 'Taux (% des revenus pro N-1)',                                   value: '{{plafonds.perTaux|pct}}' },
      { label: 'Plancher (10 % × PASS 2025 = 47 100 €)',                         value: '{{plafonds.perPlancher|eur}}' },
      { label: 'Plafond max salarié (10 % × 8 × PASS 2025)',                     value: '{{plafonds.perMaxSalarie|eur}}' },
      { label: 'Pensions alimentaires — plafond par enfant majeur',              value: '{{plafonds.pensionAlimEnfantMax|eur}}' },
    ],
    source: {
      label: 'service-public.gouv.fr/F14709 · BOI-IR-BASE-20-50-20',
      url:   'https://www.service-public.gouv.fr/particuliers/vosdroits/F14709',
      legal: 'art. 163 quatervicies CGI · art. 156-II CGI · PASS 2025 = 47 100 €',
    },
    lastVerified: '2026-06-05',
  },

  // ── RÉDUCTIONS ET CRÉDITS ─────────────────────────────────────────
  {
    title: 'Réductions et crédits d\'impôt — paramètres',
    rows: [
      { label: 'Dons 7UD (Coluche) — taux 1ᵉʳ palier ≤ {{plafonds.dons75Plafond|eur}}', value: '{{plafonds.dons75Taux|pct}}' },
      { label: 'Dons 7UF (intérêt général) — taux',                              value: '{{plafonds.dons66Taux|pct}}' },
      { label: 'Dons — plafond de la base (% RNI)',                              value: '{{plafonds.donsPlafondRNI|pct}}' },
      { label: 'Cotisations syndicales 7AC — taux / plafond (% revenus)',       value: '{{plafonds.cotSyndicalesTaux|pct}} · {{plafonds.cotSyndicalesPlafondPct|pct}}' },
      { label: 'Frais scolarité — collège',                                      value: '{{plafonds.fraisScolCollege|eur}}' },
      { label: 'Frais scolarité — lycée',                                        value: '{{plafonds.fraisScolLycee|eur}}' },
      { label: 'Frais scolarité — supérieur',                                    value: '{{plafonds.fraisScolSup|eur}}' },
      { label: 'EHPAD ascendants 7CD — taux / plafond par personne',             value: '{{plafonds.ehpadTaux|pct}} · {{plafonds.ehpadPlafondParPers|eur}}' },
      { label: 'Emploi à domicile — taux',                                       value: '{{plafonds.emploiDomTaux|pct}}' },
      { label: 'Emploi à domicile — plafond de base',                            value: '{{plafonds.emploiDomMax|eur}}' },
      { label: 'Emploi à domicile — majoration par enfant à charge',             value: '{{plafonds.emploiDomMajEnfant|eur}}' },
      { label: 'Emploi à domicile — cap absolu avec majorations',                value: '{{plafonds.emploiDomMaxMajore|eur}}' },
      { label: 'Garde enfants < 6 ans — taux / plafond par enfant',              value: '{{plafonds.gardeEnfantsTaux|pct}} · {{plafonds.gardeEnfantsMax|eur}}' },
    ],
    source: {
      label: 'service-public.gouv.fr (F12 emploi dom · F8 garde enfants · A18836 dons 7UD 2 000 €)',
      url:   'https://www.service-public.gouv.fr/particuliers/vosdroits/F12',
      legal: 'art. 200 (dons) · LF 2026 art. 28 (7UD plafond 1 000 → 2 000 €) · art. 199 quater C/F · art. 199 quindecies (EHPAD) · art. 199 sexdecies (domicile) · art. 200 quater B (garde enfants) CGI',
    },
    lastVerified: '2026-06-05',
  },

  // ── DÉFICIT FONCIER + JEANBRUN ────────────────────────────────────
  {
    title: 'Foncier — déficit imputable et amortissement Jeanbrun',
    rows: [
      { label: 'Déficit foncier — plafond imputable sur revenu global',          value: '{{plafonds.deficitFoncierMax|eur}}/an' },
      { label: 'Jeanbrun — loyer intermédiaire (plafond annuel)',                value: '{{plafonds.jeanbrunPlafondInter|eur}}' },
      { label: 'Jeanbrun — loyer social (plafond annuel)',                       value: '{{plafonds.jeanbrunPlafondSocial|eur}}' },
      { label: 'Jeanbrun — loyer très social (plafond annuel)',                  value: '{{plafonds.jeanbrunPlafondTresSoc|eur}}' },
    ],
    source: {
      label: 'BOFiP RFPI · loi 2026-103 du 19/02/2026',
      url:   'https://bofip.impots.gouv.fr/bofip/4142-PGP.html/identifiant=BOI-RFPI-BASE-30-20',
      legal: 'art. 156-I-3° CGI (déficit foncier classique) · LF 2026 art. 47 (Jeanbrun, en vigueur 21/02/2026) · art. 31-I-1° i/j CGI (codification charges déductibles amortissement)',
    },
    lastVerified: '2026-06-05',
  },

  // ── CEHR ──────────────────────────────────────────────────────────
  {
    title: 'CEHR — Contribution exceptionnelle sur les hauts revenus',
    rows: [
      { label: 'Célibataire — tranche {{cehr.taux1|pct}} ({{cehr.seuilCelibataire1|eur}} → {{cehr.seuilCelibataire2|eur}})', value: '{{cehr.taux1|pct}}' },
      { label: 'Célibataire — tranche {{cehr.taux2|pct}} (au-delà de {{cehr.seuilCelibataire2|eur}})',                       value: '{{cehr.taux2|pct}}' },
      { label: 'Couple — tranche {{cehr.taux1|pct}} ({{cehr.seuilCouple1|eur}} → {{cehr.seuilCouple2|eur}})',                value: '{{cehr.taux1|pct}}' },
      { label: 'Couple — tranche {{cehr.taux2|pct}} (au-delà de {{cehr.seuilCouple2|eur}})',                                 value: '{{cehr.taux2|pct}}' },
      { label: 'Assiette',                                                                                                   value: 'Revenu fiscal de référence' },
    ],
    source: {
      label: 'service-public.gouv.fr/F31130 · BOI-IR-CHR',
      url:   'https://www.service-public.gouv.fr/particuliers/vosdroits/F31130',
      legal: 'art. 223 sexies CGI · prorogée LF 2026',
      note:  'À noter : CDHR (Contribution Différentielle Hauts Revenus) instituée par LF 2026 art. 23 vise un taux minimum de 20 % ; non modélisée dans ce simulateur.',
    },
    lastVerified: '2026-06-05',
  },

  // ── CADRE TEMPOREL (card informative, pas une table de valeurs) ───
  {
    title: 'Cadre temporel de ce simulateur',
    body: `
      <p>Mode <strong>projection</strong> : ce simulateur estime l'impôt sur les
      <strong>revenus 2025</strong> qui seront déclarés en mai-juin 2026.</p>
      <p>Les paramètres utilisés sont ceux de la <strong>Loi de Finances 2026</strong>
      (barème publié le 07/04/2026, indexation +0,9 % vs revenus 2024) ainsi que
      la <strong>LFSS 2026 art. 12</strong> pour les prélèvements sociaux
      (CSG portée de 9,2 % à 10,6 % sur le « cas général » des revenus du
      patrimoine — mobilier et LMNP).</p>
      <p>⚠ Évolutions LF 2026 déjà prises en compte : suppression FIP classique
      métropolitain (01/01/2026) et FCPI classique (21/02/2026), création
      FCPI JEI (30 %), maintien FIP Corse/Outre-mer (30 %), maintien IR-PME
      (25 %), hausse PS mobilier/LMNP à 18,6 %, foncier nu maintenu à 17,2 %.</p>
    `,
  },
];

// Compat Node + exposition globale browser.
if (typeof module !== 'undefined') module.exports = { PARAMS_GROUPS };
