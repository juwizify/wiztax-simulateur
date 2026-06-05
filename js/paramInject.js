/**
 * INJECTION DES PARAMÈTRES FISCAUX DANS LE DOM
 * ─────────────────────────────────────────────
 *
 * Principe : une seule source de vérité = `PARAMS` (cf. js/params.js).
 * Tout texte affiché (label, tooltip, paragraphe d'explication) qui
 * mentionne une valeur fiscale doit la référencer par un token de la
 * forme `{{path|fmt}}`, jamais en dur.
 *
 * Syntaxe des tokens
 * ──────────────────
 *   {{ps.foncierNu|pct}}            → "17,2 %"
 *   {{plafonds.deficitFoncierMax|eur}} → "10 700 €"
 *   {{bareme.0.limite|eur}}         → "11 600 €"   (index numérique pour tableaux)
 *   {{abat.dividendes|pct}}         → "40 %"
 *   {{plafonds.perTaux|pct:0}}      → "10 %"       (forcer décimales)
 *   {{niches.plafond|num}}          → "10 000"
 *
 * Formats supportés (cf. params.js) :
 *   pct  → formatPct (multiplie ×100, ajoute %)
 *   eur  → formatEur (ajoute €)
 *   num  → formatNum (juste séparateur milliers)
 *
 * Lieux où les tokens sont résolus :
 *   - textContent de tout élément descendant de <body>
 *   - attribut data-tip (tooltips i.tip)
 *   - innerHTML de <span data-param-html> (cas avancé avec balisage)
 *
 * Résolution une seule fois au DOMContentLoaded. Si PARAMS change à
 * chaud (debug REPL), réinvoquer manuellement `injectParams(document.body)`.
 */

(function () {
  // Résout un chemin pointé sur PARAMS — supporte "ps.foncierNu" et "bareme.0.limite".
  function resolvePath(path) {
    return path.split('.').reduce((acc, key) => {
      if (acc == null) return undefined;
      // index numérique pour les tableaux (bareme.0.limite)
      const k = /^\d+$/.test(key) ? Number(key) : key;
      return acc[k];
    }, PARAMS);
  }

  // Applique le format à une valeur. fmt peut contenir un argument après `:`.
  function applyFormat(value, fmt) {
    if (value === undefined || value === null) {
      console.warn('[paramInject] valeur undefined pour format', fmt);
      return '?';
    }
    const [fmtName, fmtArg] = fmt.split(':');
    switch (fmtName) {
      case 'pct': {
        const opts = fmtArg != null ? { decimals: Number(fmtArg) } : {};
        return formatPct(value, opts);
      }
      case 'eur': return formatEur(value);
      case 'num': return formatNum(value);
      default:
        console.warn('[paramInject] format inconnu :', fmtName);
        return String(value);
    }
  }

  // Substitution {{path|fmt}} dans une chaîne.
  const TOKEN_RE = /\{\{([a-zA-Z0-9_.]+)\|([a-zA-Z0-9_:]+)\}\}/g;
  function resolveTokens(str) {
    if (typeof str !== 'string' || str.indexOf('{{') === -1) return str;
    return str.replace(TOKEN_RE, (_match, path, fmt) => {
      const v = resolvePath(path);
      return applyFormat(v, fmt);
    });
  }

  // Parcours tous les nœuds texte d'un sous-arbre + les data-tip / data-param-html.
  function injectParams(root) {
    if (!root) return;

    // 1. Attributs data-tip (tooltips)
    root.querySelectorAll('[data-tip]').forEach(el => {
      const t = el.getAttribute('data-tip');
      if (t && t.indexOf('{{') !== -1) {
        el.setAttribute('data-tip', resolveTokens(t));
      }
    });

    // 2. Nœuds texte (utilise TreeWalker pour ne pas casser le DOM)
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) =>
        node.nodeValue && node.nodeValue.indexOf('{{') !== -1
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT,
    });
    const toReplace = [];
    let n;
    while ((n = walker.nextNode())) toReplace.push(n);
    toReplace.forEach(node => {
      node.nodeValue = resolveTokens(node.nodeValue);
    });

    // 3. data-param-html : remplacement HTML complet (rare, cas balisé)
    root.querySelectorAll('[data-param-html]').forEach(el => {
      const path = el.getAttribute('data-param-html');
      const fmt  = el.getAttribute('data-fmt') || 'num';
      const v = resolvePath(path);
      el.innerHTML = applyFormat(v, fmt);
    });
  }

  // Exposition globale pour debug + auto-run au DOM ready.
  window.injectParams = injectParams;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => injectParams(document.body));
  } else {
    injectParams(document.body);
  }
})();
