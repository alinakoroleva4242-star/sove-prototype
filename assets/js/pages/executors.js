/* «Исполнители» — маркет исполнителей (чат команды 30.10.2026). Данные — assets/js/executors-data.js.
   Три плашки: строительные компании, мастера, дизайнеры; у мастеров — чипы видов работ.
   Раздел и вид работ живут в адресе (?sec=masters&cat=tops): перезагрузка и «Назад» не сбрасывают выбор.
   Заявка — первое касание в чате с партнёром (как на «На заказ»), контакты на странице не показываем. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc;
  var root = document.getElementById('xs-root'); if (!root) return;
  var X = window.SOVE_EXECUTORS;
  if (!X || !X.items) {
    root.innerHTML = '<div class="xe"><b class="xe__t">Не удалось загрузить исполнителей</b>' +
      '<p class="xe__d">Обновите страницу. Если не поможет — напишите в поддержку.</p>' +
      '<div class="xe__acts"><a class="btn btn--primary" href="chats.html?kind=support">Написать в поддержку</a></div></div>';
    return;
  }

  /* знаки плашек — тем же тонким штрихом, что квадраты главной (home3.js SQ_IC) */
  var ICO = {
    builders: '<path d="M2.8 20.6V8.2h8v12.4" fill="#f8eeec"/><path d="M5 11.4h3.6M5 14.6h3.6M5 17.8h3.6"/><path d="M2 20.6h20"/><path d="M19.6 20.6V8.4"/><path d="M10.8 4.2h10.8"/><rect x="17.6" y="5.8" width="4" height="2.6" rx=".6" fill="#a75f42"/><path d="M13.6 4.2v4M12.6 8.2h2"/>',
    masters: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" fill="#a75f42"/>',
    designers: '<path d="M5.4 5.6a2 2 0 0 1 2-2h8.8v13.2H7.4a2 2 0 0 0-2 2z" fill="#f8eeec"/><path d="M5.4 5.6v13.2a2 2 0 0 0 2 2h8.8"/><path d="M8.6 8h4.6M8.6 11.4h4.6"/><path d="m21.2 2.8 1.2 1.2-5.8 5.8-1.8.6.6-1.8z" fill="#a75f42"/>'
  };
  function svg(id) {
    return '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">' + (ICO[id] || '') + '</svg>';
  }
  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? one : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many);
  }
  function inSec(id) { return X.items.filter(function (x) { return x.sec === id; }); }

  var Q = new URLSearchParams(location.search);
  var sec = X.sections.some(function (s) { return s.id === Q.get('sec'); }) ? Q.get('sec') : 'masters';
  var cat = X.cats.some(function (c) { return c.id === Q.get('cat'); }) ? Q.get('cat') : 'all';

  function keepInUrl() {
    var q = new URLSearchParams(location.search);
    q.set('sec', sec);
    if (sec === 'masters' && cat !== 'all') q.set('cat', cat); else q.delete('cat');
    history.replaceState(history.state, '', location.pathname + '?' + q.toString() + location.hash);
  }

  function plaques() {
    return '<div class="xs-secs" role="group" aria-label="Раздел">' + X.sections.map(function (s) {
      var n = inSec(s.id).length, on = s.id === sec;
      return '<button type="button" class="xs-sec' + (on ? ' is-on' : '') + '" data-sec="' + s.id + '" aria-pressed="' + on + '">' +
        '<span class="xs-sec__ico">' + svg(s.id) + '</span>' +
        '<b class="xs-sec__t">' + esc(s.t) + '</b>' +
        '<span class="xs-sec__n' + (n ? '' : ' is-soon') + '">' + (n ? n + ' ' + plural(n, 'исполнитель', 'исполнителя', 'исполнителей') : 'скоро') + '</span>' +
        '</button>';
    }).join('') + '</div>';
  }

  function chips(list) {
    var all = [{ id: 'all', t: 'Все', n: list.length }].concat(X.cats.map(function (c) {
      return { id: c.id, t: c.t, n: list.filter(function (x) { return x.cat === c.id; }).length };
    }).filter(function (c) { return c.n; }));
    return '<div class="xs-chips" role="group" aria-label="Вид работ">' + all.map(function (c) {
      var on = c.id === cat;
      return '<button type="button" class="chip xs-chip' + (on ? ' is-on' : '') + '" data-cat="' + c.id + '" aria-pressed="' + on + '">' +
        esc(c.t) + '<i>' + c.n + '</i></button>';
    }).join('') + '</div>';
  }

  /* две первые буквы значимых слов: «Кухни от Марата» → КМ (предлоги и «и» пропускаем) */
  function initials(name) {
    var w = name.replace(/[^A-Za-zА-Яа-яЁё0-9 ]/g, ' ').trim().split(/\s+/).filter(function (s) { return s.length > 2; });
    return ((w[0] || '')[0] + ((w[1] || '')[0] || '')).toUpperCase();
  }
  function card(x) {
    var meta = [x.geo, x.note].filter(Boolean).join(' · ');
    var href = 'chats.html?kind=partner&partner=' + encodeURIComponent(x.id) + '&name=' + encodeURIComponent(x.name);
    return '<article class="xc">' +
      '<div class="xc__top">' +
        '<span class="xc__ava" aria-hidden="true">' + esc(initials(x.name)) + '</span>' +
        '<span class="xc__id"><b class="xc__name">' + esc(x.name) + '</b><span class="xc__what">' + esc(x.what) + '</span></span>' +
        (x.disc ? '<span class="xc__disc" title="Скидка участникам METOD">' + esc(x.disc) + '</span>' : '') +
      '</div>' +
      (meta ? '<p class="xc__meta">' + esc(meta) + '</p>' : '') +
      '<a class="xc__cta" href="' + href + '">Оставить заявку</a>' +
      '</article>';
  }

  function body() {
    var s = X.sections.filter(function (x) { return x.id === sec; })[0];
    var list = inSec(sec);
    if (!list.length) {
      var e = s.empty || { t: 'Скоро здесь появятся исполнители', d: '' };
      return '<div class="xe">' +
        '<b class="xe__t">' + esc(e.t) + '</b>' +
        (e.d ? '<p class="xe__d">' + esc(e.d) + '</p>' : '') +
        '<div class="xe__acts"><button type="button" class="btn btn--primary" data-sec="masters">Смотреть мастеров</button>' +
        (e.more ? '<a class="btn btn--ghost" href="' + e.more.href + '">' + esc(e.more.t) + '</a>' : '') + '</div></div>';
    }
    var shown = cat === 'all' ? list : list.filter(function (x) { return x.cat === cat; });
    return chips(list) +
      '<p class="xs-count" aria-live="polite">' + shown.length + ' ' + plural(shown.length, 'исполнитель', 'исполнителя', 'исполнителей') + '</p>' +
      '<div class="xc-grid">' + shown.map(card).join('') + '</div>' +
      (sec === 'masters' && X.soon && X.soon.length ? '<p class="xs-soon">Скоро: ' + esc(X.soon.join(', ')) + '.</p>' : '');
  }

  function paint() {
    root.innerHTML =
      '<div class="stack stack--2 xs-head"><span class="eyebrow">Маркет исполнителей</span>' +
      '<h1 class="h1">Исполнители</h1>' +
      '<p class="lead">Мастера, строители и дизайнеры, с которыми работает METOD. Скидки — для участников клуба.</p></div>' +
      plaques() +
      '<div class="xs-body" id="xs-body">' + body() + '</div>' +
      '<div class="xs-join"><b>Вы мастер, бригада или дизайнер?</b><span>Расскажите о себе — добавим в исполнители.</span>' +
      '<a class="btn btn--ghost btn--sm" href="chats.html?kind=support">Написать нам</a></div>';
    root.querySelectorAll('[data-sec]').forEach(function (b) {
      b.addEventListener('click', function () {
        var to = b.getAttribute('data-sec'); if (to === sec) return;
        var fromEmpty = !!b.closest('.xe');   /* «Смотреть мастеров» из пустого раздела — показать список, а не плашки */
        sec = to; cat = 'all'; keepInUrl(); paint();
        var bodyEl = document.getElementById('xs-body'); if (bodyEl && fromEmpty) bodyEl.scrollIntoView({ block: 'nearest' });
      });
    });
    root.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { cat = b.getAttribute('data-cat'); keepInUrl(); paint(); });
    });
  }
  paint();
})();
