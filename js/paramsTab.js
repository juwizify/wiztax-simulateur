/**
 * GÉNÉRATEUR DE L'ONGLET « PARAMÈTRES FISCAUX »
 * ──────────────────────────────────────────────
 *
 * Lit `PARAMS_GROUPS` (cf. paramsRegistry.js) et génère le DOM de l'onglet.
 * Les valeurs des cellules sont des chaînes contenant des tokens
 * `{{path|fmt}}` ; elles seront résolues par `injectParams()` (chargé après
 * ce module) qui lit `PARAMS`.
 *
 * Conséquence : pour ajouter / modifier un paramètre, on touche UN seul
 * endroit (params.js pour la valeur, paramsRegistry.js pour l'affichage et
 * la source). Aucune réplication ailleurs dans le code.
 */

(function () {
  function renderParamsTab(container) {
    if (!container) return;
    container.innerHTML = ''; // idempotent

    PARAMS_GROUPS.forEach(group => {
      const card = document.createElement('div');
      card.className = 'param-card';

      let html = `<h2>${escapeHtml(group.title)}</h2>`;

      // Deux variantes de corps :
      //   - rows[]  → tableau .param-table de paires label/valeur (cas standard)
      //   - body    → bloc texte libre (paragraphes), HTML autorisé puisque
      //               c'est nous qui le contrôlons via le registry
      if (Array.isArray(group.rows)) {
        html += '<table class="param-table">';
        group.rows.forEach(r => {
          html += `<tr><td class="pt-label">${r.label}</td><td class="pt-val">${r.value}</td></tr>`;
        });
        if (group.source) html += renderSourceRow(group, /*asTableRow*/ true);
        html += '</table>';
      } else if (group.body) {
        html += `<div class="param-card-body">${group.body}</div>`;
        if (group.source) html += `<div class="pt-source">${renderSourceInner(group)}</div>`;
      }

      card.innerHTML = html;
      container.appendChild(card);
    });

    // Résoudre les tokens {{path|fmt}} sur le sous-arbre nouvellement injecté.
    if (typeof window.injectParams === 'function') {
      window.injectParams(container);
    }
  }

  // Rend le contenu commun « Source : ... » utilisé par les deux variantes.
  function renderSourceInner(group) {
    const { label, url, legal } = group.source;
    const linkPart = url
      ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`
      : escapeHtml(label);
    const legalPart    = legal              ? ` · ${escapeHtml(legal)}` : '';
    const verifiedPart = group.lastVerified ? ` <span class="muted">(vérifié ${escapeHtml(group.lastVerified)})</span>` : '';
    return `Source : ${linkPart}${legalPart}${verifiedPart}`;
  }

  // Variante TR pour insertion dans .param-table.
  function renderSourceRow(group) {
    let html = `<tr><td colspan="2" class="pt-source">${renderSourceInner(group)}</td></tr>`;
    if (group.source.note) {
      html += `<tr><td colspan="2" class="pt-note">⚠ ${escapeHtml(group.source.note)}</td></tr>`;
    }
    return html;
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  window.renderParamsTab = renderParamsTab;

  document.addEventListener('DOMContentLoaded', () => {
    const c = document.getElementById('parametres-container');
    if (c) renderParamsTab(c);
  });
})();
