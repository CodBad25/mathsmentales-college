/**
 * bridge.js — MathsMentales : bouton de partage + communication iframe
 *
 * Détecte la fin d'une activité (diaporama, exercices, etc.) et affiche
 * un bouton flottant "Partager" qui ouvre une modale avec le lien partageable.
 *
 * Fonctionne dans les deux contextes :
 * - En page principale : bouton + modale directement dans la page
 * - En iframe : envoie aussi un postMessage au parent Next.js
 */
(function () {
  'use strict';

  var IS_IFRAME = window.parent !== window;
  var PARENT_ORIGIN = '*';
  var shareButtonShown = false;

  // --- Ne pas s'activer sur la page d'accueil ---
  var path = window.location.pathname;
  if (/\/index\.html(\?|$|#)/.test(path) || path.endsWith('/mathsmentales/')) {
    return;
  }

  // --- Utilitaires ---

  function getExerciseTitle() {
    var selectors = [
      '#activityTitle', '#param-title-act', '.activity-title',
      'h1.activity', '#diaporama-title', '.titre-activite',
      '.slider-title'
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && el.textContent && el.textContent.trim()) {
        return el.textContent.trim();
      }
    }
    return document.title || '';
  }

  /**
   * Convertit l'URL actuelle en URL partageable via /play
   * Ex: /mathsmentales/diaporama.html?... → /play?mode=diaporama&...
   */
  function makeShareableUrl() {
    var loc = window.location;
    var match = loc.pathname.match(/\/mathsmentales\/(\w+)\.html/);
    if (!match) return loc.href;
    var mode = match[1];
    var search = loc.search;
    return loc.origin + '/play?mode=' + mode + (search ? '&' + search.slice(1) : '');
  }

  /**
   * Cherche un score affiché dans le DOM (mode interactif uniquement)
   * Retourne {score, total} ou null
   */
  function findScoreInDOM() {
    var elements = document.querySelectorAll('.score');
    for (var i = 0; i < elements.length; i++) {
      var text = elements[i].textContent || '';
      var m = text.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) {
        var score = parseInt(m[1], 10);
        var total = parseInt(m[2], 10);
        if (total > 0 && total <= 200) {
          return { score: score, total: total };
        }
      }
    }
    return null;
  }

  // --- Bouton flottant "Partager" ---

  function showShareButton() {
    if (shareButtonShown) return;
    shareButtonShown = true;

    var btn = document.createElement('button');
    btn.id = 'mm-share-btn';
    btn.innerHTML = '&#x1F517; Partager';
    btn.title = 'Obtenir le lien partageable pour vos élèves';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;'
      + 'padding:12px 20px;font-size:15px;font-weight:600;'
      + 'background:#4f46e5;color:white;border:none;border-radius:12px;'
      + 'cursor:pointer;box-shadow:0 4px 12px rgba(79,70,229,0.4);'
      + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;'
      + 'transition:transform 0.2s,box-shadow 0.2s;';

    btn.onmouseenter = function () {
      btn.style.transform = 'scale(1.05)';
      btn.style.boxShadow = '0 6px 20px rgba(79,70,229,0.5)';
    };
    btn.onmouseleave = function () {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 12px rgba(79,70,229,0.4)';
    };

    btn.onclick = function () {
      showShareModal();
    };

    document.body.appendChild(btn);

    // Envoyer aussi un postMessage si en iframe
    if (IS_IFRAME) {
      var scoreData = findScoreInDOM();
      window.parent.postMessage({
        type: 'mathsmentales-result',
        score: scoreData ? scoreData.score : 0,
        total: scoreData ? scoreData.total : 0,
        exerciseUrl: window.location.href,
        exerciseTitle: getExerciseTitle(),
        source: 'bridge-activity-end'
      }, PARENT_ORIGIN);
    }
  }

  function hideShareButton() {
    var btn = document.getElementById('mm-share-btn');
    if (btn) btn.remove();
    shareButtonShown = false;
  }

  // --- Modale de partage ---

  function showShareModal() {
    // Supprimer une modale existante
    var existing = document.getElementById('mm-share-modal');
    if (existing) existing.remove();

    var shareUrl = makeShareableUrl();
    var title = getExerciseTitle();
    var scoreData = findScoreInDOM();

    // Overlay
    var overlay = document.createElement('div');
    overlay.id = 'mm-share-modal';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;'
      + 'background:rgba(0,0,0,0.5);backdrop-filter:blur(3px);display:flex;'
      + 'align-items:center;justify-content:center;z-index:999999;padding:20px;'
      + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    var card = document.createElement('div');
    card.style.cssText = 'max-width:480px;width:100%;background:white;border-radius:16px;'
      + 'padding:28px;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    // Titre
    var h = document.createElement('h2');
    h.style.cssText = 'font-size:18px;font-weight:700;color:#1a1a2e;margin:0 0 4px 0';
    h.textContent = 'Partager cet exercice';
    card.appendChild(h);

    if (title) {
      var sub = document.createElement('p');
      sub.style.cssText = 'font-size:13px;color:#888;margin:0 0 16px 0';
      sub.textContent = title;
      card.appendChild(sub);
    }

    // Score (si disponible, mode interactif)
    if (scoreData) {
      var pct = Math.round((scoreData.score / scoreData.total) * 100);
      var color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
      var scoreLine = document.createElement('div');
      scoreLine.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:16px;'
        + 'padding:10px 14px;background:' + color + '10;border-radius:10px;border:1px solid ' + color + '30';
      scoreLine.innerHTML = '<span style="font-size:22px;font-weight:700;color:' + color + '">'
        + scoreData.score + '/' + scoreData.total + '</span>'
        + '<span style="font-size:14px;color:#666">'
        + (pct >= 80 ? 'Excellent !' : pct >= 50 ? 'Pas mal !' : 'Courage !')
        + '</span>';
      card.appendChild(scoreLine);
    }

    // Zone lien
    var linkBox = document.createElement('div');
    linkBox.style.cssText = 'background:#f8f9fa;border-radius:10px;padding:14px;margin-bottom:14px';

    var label = document.createElement('p');
    label.style.cssText = 'font-size:12px;font-weight:600;color:#374151;margin:0 0 8px 0';
    label.textContent = 'Lien pour vos élèves :';

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px';

    var input = document.createElement('input');
    input.readOnly = true;
    input.value = shareUrl;
    input.style.cssText = 'flex:1;padding:9px 12px;font-size:13px;border:1px solid #ddd;'
      + 'border-radius:8px;background:white;color:#374151;overflow:hidden;text-overflow:ellipsis;'
      + 'font-family:inherit;outline:none;min-width:0';
    input.onclick = function () { this.select(); };

    var copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copier';
    copyBtn.style.cssText = 'padding:9px 16px;font-size:13px;font-weight:600;'
      + 'background:#4f46e5;color:white;border:none;border-radius:8px;cursor:pointer;'
      + 'white-space:nowrap;font-family:inherit';
    copyBtn.onclick = function () {
      navigator.clipboard.writeText(shareUrl).then(function () {
        copyBtn.textContent = '\u2713 Copié !';
        copyBtn.style.background = '#22c55e';
        setTimeout(function () {
          copyBtn.textContent = 'Copier';
          copyBtn.style.background = '#4f46e5';
        }, 2000);
      }).catch(function () {
        input.select();
        document.execCommand('copy');
        copyBtn.textContent = '\u2713 Copié !';
        copyBtn.style.background = '#22c55e';
        setTimeout(function () {
          copyBtn.textContent = 'Copier';
          copyBtn.style.background = '#4f46e5';
        }, 2000);
      });
    };

    row.appendChild(input);
    row.appendChild(copyBtn);
    linkBox.appendChild(label);
    linkBox.appendChild(row);
    card.appendChild(linkBox);

    // Info
    var info = document.createElement('p');
    info.style.cssText = 'font-size:11px;color:#999;text-align:center;margin:0 0 16px 0;line-height:1.4';
    info.textContent = 'Collez ce lien dans Pronote, Google Classroom ou votre cahier de texte. '
      + 'Les élèves se connecteront avec Google pour que leurs résultats soient suivis.';
    card.appendChild(info);

    // Bouton fermer
    var closeBtn = document.createElement('button');
    closeBtn.textContent = 'Fermer';
    closeBtn.style.cssText = 'width:100%;padding:10px 20px;font-size:14px;font-weight:600;'
      + 'background:#f3f4f6;color:#374151;border:none;border-radius:10px;cursor:pointer;'
      + 'font-family:inherit';
    closeBtn.onclick = function () {
      overlay.remove();
    };
    card.appendChild(closeBtn);

    // Fermer en cliquant sur l'overlay (hors de la carte)
    overlay.onclick = function (e) {
      if (e.target === overlay) overlay.remove();
    };

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  // --- Monkey-patch postMessage (mode iframe) ---

  if (IS_IFRAME) {
    var _origPost = window.parent.postMessage.bind(window.parent);
    window.parent.postMessage = function (data, origin) {
      if (data && typeof data === 'object' && data.nbBonnesReponses !== undefined) {
        data.type = 'mathsmentales-result';
        data.score = data.nbBonnesReponses;
        data.total = data.nbBonnesReponses + data.nbMauvaisesReponses;
        data.exerciseUrl = data.url || window.location.href;
        data.exerciseTitle = getExerciseTitle();
      }
      return _origPost(data, origin);
    };

    window.parent.postMessage(
      { type: 'mathsmentales-ready', url: window.location.href },
      PARENT_ORIGIN
    );
  }

  // --- Détection de fin d'activité ---
  // Le diaporama passe de slideshow à tab-content (correction/énoncé/paramétrer)
  // On surveille l'apparition de #tab-content visible OU .score dans le DOM

  function init() {
    // 1. Surveiller tab-content (fin du diaporama classique)
    var tabContent = document.getElementById('tab-content');
    if (tabContent) {
      var tabObserver = new MutationObserver(function () {
        if (!tabContent.classList.contains('hidden')) {
          showShareButton();
        } else {
          // Diaporama relancé → cacher le bouton
          hideShareButton();
        }
      });
      tabObserver.observe(tabContent, { attributes: true, attributeFilter: ['class'] });

      // Vérifier l'état initial (si déjà visible)
      if (!tabContent.classList.contains('hidden')) {
        showShareButton();
      }
    }

    // 2. Surveiller les éléments .score (mode interactif)
    var bodyObserver = new MutationObserver(function () {
      if (findScoreInDOM()) {
        showShareButton();
      }
    });
    if (document.body) {
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
