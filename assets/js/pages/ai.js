/* Поиск товаров по фото предмета и по рендеру интерьера.
   Состояния экрана: idle (нет снимка) → ready (снимок выбран, цена видна) → running (ход поиска) → done | empty.
   Токены: reserve при запуске, commit при успехе, refund при пустом результате. Гость тратит пробные запуски. */
(function () {
  'use strict';
  var S = window.SOVE; if (!S) return;
  var D = S.data, F = S.fmt, ui = S.ui;
  var stage = document.getElementById('ai-stage');
  var elModes = document.getElementById('ai-modes');
  var elSteps = document.getElementById('ai-steps');
  var elLead = document.getElementById('ai-lead');
  if (!stage) return;

  var MAX_MB = 10;
  var SHOW_FINISHED_WITHIN = 10 * 60 * 1000; /* вернулся в течение 10 минут — сразу показываем результат */

  var MODES = {
    photo: {
      key: 'photo', cost: D.costs.photo, duration: 4000, cuts: [0.35, 0.75],
      name: 'Поиск по фото предмета', reason: 'Поиск по фото', what: 'фото',
      lead: 'Загрузите снимок одного предмета — кресла, светильника, стола. Покажем такой же и похожие товары партнёров с ценой METOD и розницей.',
      upTitle: 'Загрузите фото предмета',
      tips: ['Предмет виден целиком, не обрезан краем кадра', 'Дневной свет, без вспышки и жёстких теней', 'Один снимок — без коллажей и надписей поверх'],
      sample: D.ai.photoSample,
      sampleNote: 'Возьмём готовый снимок и пройдём весь путь: стоимость, поиск, результат.',
      runTitle: 'Ищем похожие товары',
      ownTitle: 'Ваше фото', another: 'Загрузить другое фото', back: 'Вернули ваше фото — можно продолжать'
    },
    render: {
      key: 'render', cost: D.costs.render, duration: 9000, cuts: [0.34, 0.8],
      name: 'Поиск по рендеру интерьера', reason: 'Поиск по рендеру', what: 'рендер',
      lead: 'Загрузите визуализацию комнаты. Найдём на ней предметы, подберём к каждому товары партнёров и соберём черновую смету.',
      upTitle: 'Загрузите рендер интерьера',
      tips: ['Кадр целиком — так, как его отдал визуализатор', 'Без водяных знаков и логотипов поверх', 'Чем крупнее предметы в кадре, тем точнее подбор'],
      sample: D.ai.renderSample,
      sampleNote: 'Возьмём готовый рендер из капсулы и пройдём весь путь: стоимость, поиск, смета.',
      runTitle: 'Разбираем рендер на предметы',
      ownTitle: 'Ваш рендер', another: 'Загрузить другой', back: 'Вернули ваш рендер — можно продолжать'
    }
  };

  var st = { mode: MODES[ui.qs('mode')] ? ui.qs('mode') : 'photo', view: 'idle', source: null, genId: null, error: '', tick: null, lastStage: -1 };

  /* ---------- мелочи ---------- */
  function plural(n, forms) { var a = Math.abs(n) % 100, b = a % 10; return forms[(a > 10 && a < 20) ? 2 : b === 1 ? 0 : (b >= 2 && b <= 4) ? 1 : 2]; }
  function returnTo() { return 'ai.html?mode=' + st.mode; }
  function mode() { return MODES[st.mode]; }
  function $(sel) { return stage.querySelector(sel); }
  function on(sel, fn) { var els = stage.querySelectorAll(sel); for (var i = 0; i < els.length; i++) els[i].addEventListener('click', fn); }
  function productsOf(items) { return (items || []).map(function (it) { var p = D.product(it.id); return p ? { p: p, match: it.match } : null; }).filter(Boolean); }
  function syncUrl() { try { history.replaceState(null, '', returnTo()); } catch (e) { /* file:// */ } }

  /* ---------- шапка: режим, шаги, подводка ---------- */
  function paintChrome() {
    var busy = st.view === 'running';
    var btns = elModes.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i], active = b.getAttribute('data-mode') === st.mode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
      b.disabled = busy && !active;
    }
    elLead.textContent = mode().lead;
    var step = st.view === 'running' ? 2 : (st.view === 'done' || st.view === 'empty') ? 3 : 1;
    var lis = elSteps.children;
    for (var k = 0; k < lis.length; k++) {
      lis[k].className = (k + 1 < step) ? 'is-done' : (k + 1 === step) ? 'is-current' : '';
      if (k + 1 === step) lis[k].setAttribute('aria-current', 'step'); else lis[k].removeAttribute('aria-current');
    }
  }
  (function initChrome() {
    var smalls = elModes.querySelectorAll('[data-cost]');
    for (var i = 0; i < smalls.length; i++) { var c = D.costs[smalls[i].getAttribute('data-cost')]; smalls[i].textContent = c ? F.tokens(c) : 'бесплатно'; }
    elModes.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-mode]'); if (!b || b.disabled) return;
      var next = b.getAttribute('data-mode'); if (next === st.mode || st.view === 'running') return;
      st.mode = next; st.error = '';
      /* свой снимок остаётся при смене режима, пример — свой у каждого режима */
      if (st.view === 'ready' && st.source && st.source.kind === 'own') { st.source.title = mode().ownTitle; keepDraft(false); }
      else { st.view = 'idle'; st.source = null; st.genId = null; S.draft.clear('ai'); }
      syncUrl(); render();
    });
  })();

  /* ---------- черновик: снимок не теряется при уходе на вход и оплату ---------- */
  function keepDraft(away, extra) {
    if (!st.source) return;
    var d = { mode: st.mode, source: st.source, away: !!away };
    for (var k in (extra || {})) d[k] = extra[k];
    S.draft.set('ai', d);
  }

  /* ---------- общий кадр слева ---------- */
  function frame(src, o) {
    o = o || {};
    var boxes = (o.boxes || []).map(function (b) {
      var style = 'left:' + b.box[0] + '%;top:' + b.box[1] + '%;width:' + b.box[2] + '%;height:' + b.box[3] + '%';
      return o.links
        ? '<a class="ai-box is-on" data-n="' + b.n + '" href="#ai-obj-' + b.n + '" style="' + style + '" aria-label="Предмет ' + b.n + ': ' + F.esc(b.name) + '"><span class="marker" aria-hidden="true">' + b.n + '</span></a>'
        : '<span class="ai-box" data-n="' + b.n + '" style="' + style + '" aria-hidden="true"><span class="marker">' + b.n + '</span></span>';
    }).join('');
    return '<figure class="ai-figure">' +
      '<div class="ai-frame' + (o.fit ? ' ai-frame--fit' : '') + (o.scan ? ' is-scanning' : '') + '">' +
      '<img src="' + F.esc(src) + '" alt="' + F.esc(o.alt || 'Загруженный снимок') + '">' + boxes + '</div>' +
      (o.caption ? '<figcaption class="dim"><span>' + F.esc(o.caption) + '</span></figcaption>' : '') + '</figure>';
  }

  /* ---------- 1. нет снимка ---------- */
  function viewIdle() {
    var m = mode();
    return '<div class="cam" id="ai-drop">' +
      /* экран-видоискатель: камера включается сама, если браузер разрешает */
      '<div class="cam__stage">' +
        '<video class="cam__video" id="cam-video" playsinline autoplay muted></video>' +
        '<div class="cam__hold" id="cam-hold">' +
          '<span class="cam__ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.6"/></svg></span>' +
          '<b class="cam__t" data-focus tabindex="-1">' + m.upTitle + '</b>' +
          '<span class="cam__d" id="cam-hint">наведите камеру или выберите снимок из галереи</span>' +
        '</div>' +
        '<i class="cam__c cam__c--tl"></i><i class="cam__c cam__c--tr"></i><i class="cam__c cam__c--bl"></i><i class="cam__c cam__c--br"></i>' +
        '<input type="file" id="ai-file" class="vh" accept="image/jpeg,image/png" aria-label="Выбрать снимок из галереи">' +
      '</div>' +

      '<div class="cam__bar">' +
        '<label class="cam__side" for="ai-file">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="8.5" cy="10" r="1.6"/><path d="M4 17l5-5 4 4 2.5-2.5L20 17"/></svg><span>Галерея</span></label>' +
        '<button type="button" class="cam__shot" data-act="shot" aria-label="Снять кадр"><i></i></button>' +
        '<button type="button" class="cam__side" data-act="sample">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
          '<path d="M12 4.5l2 4.4 4.8.6-3.5 3.3.9 4.7L12 15.3 7.8 17.5l.9-4.7L5.2 9.5l4.8-.6z"/></svg><span>Пример</span></button>' +
      '</div>' +

      (st.error ? '<div class="notice notice--error" role="alert" id="ai-error"><span class="small">' + F.esc(st.error) + '</span></div>' : '') +

      '<details class="cam__tips"><summary>Как снимать, чтобы нашлось</summary>' +
        '<ul>' + m.tips.map(function (t) { return '<li>' + F.esc(t) + '</li>'; }).join('') + '</ul>' +
        '<button type="button" class="btn btn--link btn--sm" data-act="sample-empty">Показать, как выглядит пустой ответ</button>' +
      '</details>';
  }

  /* Человек знает, что снял, а ядро — гадает. Подсказка резко чистит выдачу:
     ответ ядра фильтруем по названию и типу товара. */
  var HINTS = [
    { t: 'Диван', rx: /диван|софа|кушет/i },
    { t: 'Кресло', rx: /кресл/i },
    { t: 'Стул', rx: /стул|табурет|банкет/i },
    { t: 'Стол', rx: /стол(?!ешн)|консол|журнальн/i },
    { t: 'Кровать', rx: /кроват|изголов/i },
    { t: 'Хранение', rx: /комод|тумб|шкаф|стеллаж|витрин|буфет/i },
    { t: 'Свет', rx: /люстр|светильник|подвес|бра|торшер|лампа|спот/i },
    { t: 'Ковёр', rx: /ков[её]р|палас/i },
    { t: 'Декор', rx: /декор|ваз|картин|зеркал|подушк|плед|штор/i }
  ];
  function hintRx() {
    var h = HINTS.filter(function (x) { return x.t === st.hint; })[0];
    return h ? h.rx : null;
  }
  function hintChips() {
    return '<div class="hint"><span class="hint__t">Что на снимке?</span>' +
      '<div class="hint__row">' + HINTS.map(function (h) {
        return '<button type="button" class="hint__c' + (st.hint === h.t ? ' is-on' : '') + '" data-hint="' + F.esc(h.t) + '">' + F.esc(h.t) + '</button>';
      }).join('') + '</div>' +
      '<span class="hint__d">необязательно, но так подбор будет точнее</span></div>';
  }

  /* ---------- 1б. кадр выбран: оставить только нужный предмет ---------- */
  function viewCrop() {
    var src = st.source;
    return '<div class="crop">' +
      '<div class="crop__head"><b data-focus tabindex="-1">' + (src.kind === 'own' ? 'Оставьте предмет, который ищете' : 'Так это выглядит на примере') + '</b>' +
        '<span>' + (src.kind === 'own' ? 'потяните за углы рамки' : 'рамку можно потянуть за углы') + '</span></div>' +
      '<div class="crop__stage" id="crop-stage">' +
        '<img class="crop__img" id="crop-img" src="' + F.esc(src.src) + '" alt="' + F.esc(src.title) + '">' +
        '<div class="crop__box" id="crop-box">' +
          '<i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i>' +
        '</div>' +
      '</div>' +
      (src.kind === 'own' ? hintChips() : '') +
      (src.kind === 'own'
        ? '<div class="crop__acts">' +
            '<button type="button" class="btn btn--primary btn--block" data-act="crop-go">Найти товары</button>' +
            '<p class="crop__row">' +
              '<button type="button" class="crop__link" data-act="crop-all">Весь кадр</button>' +
              '<span aria-hidden="true">·</span>' +
              '<button type="button" class="crop__link" data-act="reset">Снять заново</button>' +
            '</p>' +
            '<p class="crop__note">' + (mode().cost ? 'Спишется ' + F.tokens(mode().cost) + ' после запуска' : 'Поиск по предмету бесплатный') + '</p>' +
          '</div>'
        /* это чужой снимок-пример: искать по нему нечего, зовём снять свой предмет */
        : '<div class="crop__acts">' +
            '<button type="button" class="btn btn--primary btn--block" data-act="reset">Снять свой предмет</button>' +
            '<p class="crop__row">' +
              '<button type="button" class="crop__link" data-act="crop-go">Показать, что будет дальше</button>' +
            '</p>' +
            '<p class="crop__note">Это пример из прототипа — ищем по вашему снимку</p>' +
          '</div>');
  }

  /* ---------- недавние поиски: показываем под результатом ---------- */
  function recentStrip(currentId) {
    var list = S.gens.list().filter(function (g) {
      return g.id !== currentId && (g.status === 'done' || g.status === 'empty') && g.src;
    }).slice(0, 3);
    if (!list.length) return '';
    return '<section class="recent"><span class="eyebrow">Вы уже искали</span>' +
      '<div class="recent__row">' + list.map(function (g) {
        var n = g.status === 'empty' ? 'ничего не нашли'
          : g.kind === 'render' ? ((g.result && g.result.objects ? g.result.objects.length : 0) + ' ' + plural((g.result && g.result.objects ? g.result.objects.length : 0), ['предмет', 'предмета', 'предметов']))
          : ((g.result && g.result.items ? g.result.items.length : 0) + ' ' + plural((g.result && g.result.items ? g.result.items.length : 0), ['товар', 'товара', 'товаров']));
        return '<button type="button" class="recent__i" data-open="' + g.id + '">' +
          '<img src="' + F.esc(g.src) + '" alt="" loading="lazy">' +
          '<span><b>' + F.esc(g.title || MODES[g.kind].name) + '</b><i>' + n + '</i></span></button>';
      }).join('') + '</div>' +
      '<a class="btn btn--link btn--sm" href="generations.html">Все мои поиски</a></section>';
  }


  /* ---------- 2. снимок выбран: цена до запуска ---------- */
  function costInfo() {
    var cost = mode().cost;
    if (!cost) return { button: 'Найти товары', line: 'Бесплатно, без списания токенов', note: 'Платим только за разбор рендера интерьера — там работы больше.' };
    if (S.auth.isIn()) {
      var bal = S.tokens.balance();
      if (bal >= cost) return { line: 'Спишется ' + F.tokens(cost) + ' · останется ' + F.num(bal - cost), note: 'Если ничего не найдём, токены вернутся на баланс.' };
      return { short: true, line: 'Нужно ' + F.tokens(cost) + ' · на балансе ' + F.num(bal), note: 'Снимок сохраним: после пополнения вернётесь на этот же экран.' };
    }
    var left = S.demo.left();
    if (left > 0) return { button: 'Найти товары · пробный запуск', line: 'Пробный запуск: осталось ' + left + ' из ' + D.demoLimit, note: 'Обычная цена — ' + F.tokens(cost) + '. Сейчас без регистрации и без списания; если ничего не найдём, запуск не сгорит.' };
    return { short: true, line: 'Пробные запуски закончились', note: 'Войдите, чтобы продолжить: новым пользователям дарим ' + F.tokens(D.gift.tokens) + ' на генерации. Снимок сохраним.' };
  }
  function paintCost() {
    var el = $('#ai-cost'), note = $('#ai-cost-note'); if (!el) return;
    var c = costInfo();
    el.textContent = c.line; el.classList.toggle('is-short', !!c.short); note.textContent = c.note;
    var btn = $('[data-act="launch"]'); if (btn) btn.textContent = c.button || ('Найти товары · ' + F.tokens(mode().cost));
  }
  function viewReady() {
    var m = mode(), src = st.source;
    return '<div class="split ai-split">' +
      '<div class="col-5">' + frame(src.src, { fit: true, caption: src.title, alt: src.title }) + '</div>' +
      '<div class="col-7 ai-side">' +
        '<div class="stack stack--3"><span class="eyebrow">Снимок готов</span><h2 class="h2" data-focus tabindex="-1">' + m.name + '</h2></div>' +
        '<div class="ai-file"><span class="ai-file__name">' + F.esc(src.name || src.title) + '</span><button type="button" class="btn btn--link btn--sm" data-act="reset">Выбрать другой снимок</button></div>' +
        (src.kind === 'own' ? '' : '<p class="small muted">Это пример из прототипа. Дальше всё как с вашим снимком: стоимость, поиск, результат.</p>') +
        '<div class="ai-launch">' +
          '<p class="ai-cost" id="ai-cost"></p>' +
          '<button type="button" class="btn btn--primary btn--lg" data-act="launch">Найти товары · ' + F.tokens(m.cost) + '</button>' +
          '<p class="small muted" id="ai-cost-note"></p>' +
        '</div>' +
      '</div></div>';
  }

  /* ---------- 3. ход поиска ---------- */
  function stageLabels(gen) {
    if (gen.kind === 'photo') return ['Анализирую фото', 'Ищу в каталоге', 'Отбираю похожие'];
    return ['Ищу предметы на рендере', 'Подбираю товары', 'Собираю смету'];
  }
  function viewRunning(gen) {
    var m = MODES[gen.kind], labels = stageLabels(gen);
    var boxes = (gen.kind === 'render' && gen.sample === 'sample') ? D.ai.renderSample.objects : [];
    /* поиск по предмету: снимок маленький сверху, под ним проявляются карточки-заготовки */
    if (gen.kind === 'photo') {
      return '<div class="run">' +
        '<div class="run__top">' +
          '<span class="run__pic"><img src="' + F.esc(st.source ? st.source.src : gen.src) + '" alt="' + F.esc(gen.title) + '"><i class="run__sweep" aria-hidden="true"></i></span>' +
          '<span class="run__b"><b data-focus tabindex="-1">' + m.runTitle + '</b>' +
            '<i id="ai-stage-now">' + labels[0] + '</i></span>' +
        '</span></div>' +
        '<div class="progress progress--thin" role="progressbar" aria-label="Ход поиска" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>' +
        '<ol class="stages vh" id="ai-stages">' + labels.map(function (t, i) { return '<li data-i="' + i + '">' + t + '</li>'; }).join('') + '</ol>' +
        '<div class="run__cards">' +
          '<span class="run__card" data-k="0"><i></i><b></b><em></em></span>' +
          '<span class="run__card" data-k="1"><i></i><b></b><em></em></span>' +
          '<span class="run__card" data-k="2"><i></i><b></b><em></em></span>' +
        '</div>' +
        '<p class="ai-charge run__charge">' + (gen.opId ? 'В резерве ' + F.tokens(gen.cost) + ' · спишем, только когда найдём товары' : 'Пробный запуск · токены не нужны') + '</p>' +
        '<p class="small" role="status" aria-live="polite" id="ai-live" style="position:absolute;left:-9999px"></p>' +
      '</div>';
    }
    return '<div class="split ai-split ai-split--run">' +
      '<div class="col-5">' + frame(st.source ? st.source.src : gen.src, { scan: true, boxes: boxes, caption: gen.title, alt: gen.title }) + '</div>' +
      '<div class="col-7 ai-side">' +
        '<div class="ai-status">' +
          '<div class="stack stack--3"><span class="eyebrow">Идёт поиск</span><h2 class="h2" data-focus tabindex="-1">' + m.runTitle + '</h2></div>' +
          '<div class="progress" role="progressbar" aria-label="Ход поиска" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>' +
          '<ol class="stages" id="ai-stages">' + labels.map(function (t, i) { return '<li data-i="' + i + '">' + t + '</li>'; }).join('') + '</ol>' +
          '<p class="small" role="status" aria-live="polite" id="ai-live" style="position:absolute;left:-9999px"></p>' +
        '</div>' +
        '<p class="ai-charge">' + (gen.opId ? 'В резерве ' + F.tokens(gen.cost) + ' · спишем, только когда найдём товары' : 'Пробный запуск · токены не нужны') + '</p>' +
        (gen.kind === 'render' ? '<p class="text ai-leave">Можно уйти со страницы — результат появится в <a class="link" href="generations.html">Генерациях</a>.</p>' : '') +
      '</div></div>';
  }
  function paintProgress(gen, p) {
    var m = MODES[gen.kind], cuts = m.cuts;
    var idx = p < cuts[0] ? 0 : p < cuts[1] ? 1 : 2;
    var bar = $('.progress'); if (!bar) return;
    bar.firstChild.style.width = Math.round(p * 100) + '%';
    bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    var lis = stage.querySelectorAll('#ai-stages > li'), labels = stageLabels(gen);
    for (var i = 0; i < lis.length; i++) lis[i].className = i < idx ? 'is-done' : i === idx ? 'is-now' : '';
    var now = $('#ai-stage-now'); if (now && now.textContent !== labels[idx]) now.textContent = labels[idx];
    var cards = stage.querySelectorAll('.run__card');
    if (cards.length) {
      var ready = Math.min(cards.length, Math.floor(p / 0.9 * cards.length));
      for (var c2 = 0; c2 < cards.length; c2++) cards[c2].classList.toggle('is-ready', c2 < ready);
    }
    if (gen.kind === 'render') {
      var total = D.ai.renderSample.objects.length;
      var found = Math.min(total, Math.floor(p / cuts[0] * total + 0.001));
      var boxes = stage.querySelectorAll('.ai-box');
      for (var b = 0; b < boxes.length; b++) boxes[b].classList.toggle('is-on', b < found);
      var k = idx < 1 ? 0 : idx > 1 ? total : Math.min(total, 1 + Math.floor((p - cuts[0]) / (cuts[1] - cuts[0]) * total));
      if (lis[0]) lis[0].textContent = idx === 0 ? labels[0] + (found ? ': ' + found + ' из ' + total : '') : 'Нашёл предметы: ' + total;
      if (lis[1]) lis[1].textContent = idx === 1 ? 'Подбираю товары: ' + k + ' из ' + total : idx > 1 ? 'Подобрал товары: ' + total + ' из ' + total : labels[1];
    }
    if (idx !== st.lastStage) { st.lastStage = idx; var live = $('#ai-live'); if (live) live.textContent = labels[idx]; }
  }
  function stopProgress() { if (st.tick) { clearInterval(st.tick); st.tick = null; } }
  function startProgress(genId) {
    stopProgress(); st.lastStage = -1;
    function tick() {
      var gen = S.gens.get(genId);
      if (!gen) { stopProgress(); return; }
      if (gen.status !== 'running') { stopProgress(); showFinished(gen); return; } /* довела другая вкладка */
      var p = Math.min(1, (Date.now() - gen.startedAt) / gen.duration);
      paintProgress(gen, p);
      if (p >= 1) { stopProgress(); showFinished(settle(genId)); }
    }
    st.tick = setInterval(tick, 200); tick();
  }

  /* запуск: гость — пробные, вошедший — резерв токенов */
  function launch() {
    var m = mode(), src = st.source, cost = m.cost, inn = S.auth.isIn();
    if (!src) return;
    if (!inn && S.demo.left() <= 0) { keepDraft(true); ui.needAuth('Пробные запуски закончились', returnTo()); return; }
    if (inn && !S.tokens.canAfford(cost)) { keepDraft(true); ui.needTokens(cost, returnTo()); return; }
    var result = src.kind === 'empty' ? null
      : st.mode === 'render' ? { sample: src.kind === 'sample', own: src.kind === 'own', objects: D.ai.renderSample.objects }
      : { own: src.kind === 'own', items: D.ai.photoSample.items };
    var gen = S.gens.add({ kind: st.mode, title: src.title, src: src.thumb || src.src, status: 'running', cost: inn ? cost : 0, demo: !inn, opId: null,
      sample: src.kind, result: result, startedAt: Date.now(), duration: m.duration });
    if (inn) {
      var opId = S.tokens.reserve(cost, m.reason + ' · ' + src.title, gen.id);
      if (!opId) { S.gens.update(gen.id, { status: 'error' }); keepDraft(true); ui.needTokens(cost, returnTo()); return; }
      S.gens.update(gen.id, { opId: opId });
    } else { S.demo.use(); }
    S.draft.clear('ai');
    st.genId = gen.id; st.view = 'running'; render(); toStage();
    /* свой снимок: спрашиваем боевое ядро, пока крутится индикатор */
    if (st.mode === 'photo' && src.kind === 'own') {
      S.gens.update(gen.id, { duration: 120000 });          /* ждём ответ, а не таймер */
      realSearch(src.src, function (items, err, why) {
        var g = S.gens.get(gen.id); if (!g || g.status !== 'running') return;
        if (items && items.length) {
          S.gens.update(gen.id, { result: { own: true, live: true, api: items.slice(0, 6), hint: st.hint || '' }, duration: Date.now() - g.startedAt });
          return;
        }
        if (why === 'miss') {   /* ядро принесло не ту категорию — честно говорим об этом */
          S.gens.update(gen.id, { status: 'running', result: { own: true, live: true, api: [], miss: st.hint }, duration: Date.now() - g.startedAt });
          return;
        }
        /* сервер не ответил — показываем упрощённый подбор и говорим об этом честно */
        st.fallback = err || 'ядро не ответило';
        matchBySource(src.src, function (local) {
          var g2 = S.gens.get(gen.id); if (!g2 || g2.status !== 'running') return;
          S.gens.update(gen.id, { result: { own: true, items: local || D.ai.photoSample.items }, duration: Date.now() - g2.startedAt });
        });
      });
    }
  }

  /* итог операции: списать или вернуть. Вызывается один раз на генерацию */
  function settle(genId) {
    var g = S.gens.get(genId);
    if (!g || g.status !== 'running') return g;
    if (g.sample === 'empty' || g.src === D.ai.emptySample.src) {
      if (g.opId) S.tokens.refund(g.opId, 'ничего не найдено'); else if (g.demo) S.demo.giveBack();
      return S.gens.update(genId, { status: 'empty', finishedAt: Date.now() });
    }
    if (g.opId) S.tokens.commit(g.opId);
    return S.gens.update(genId, { status: 'done', finishedAt: Date.now(),
      result: g.result || (g.kind === 'render' ? { sample: true, objects: D.ai.renderSample.objects } : { items: D.ai.photoSample.items }) });
  }
  function showFinished(gen) {
    if (!gen) { reset(); return; }
    st.genId = gen.id; st.mode = MODES[gen.kind] ? gen.kind : st.mode;
    if (!st.source) st.source = { kind: gen.sample || 'sample', src: gen.src, title: gen.title };
    st.view = gen.status === 'empty' ? 'empty' : 'done';
    syncUrl(); render(); toStage();
  }

  /* ---------- 4. результат ---------- */
  function chargeLine(gen) {
    if (gen.opId) return 'Списано ' + F.tokens(gen.cost) + ' · остаток ' + F.num(S.tokens.balance());
    if (!S.auth.isIn()) return 'Пробный запуск · осталось ' + S.demo.left() + ' из ' + D.demoLimit;
    return 'Пробный запуск · токены не списаны';
  }
  function ownNotice(gen) {
    return gen.sample === 'own' ? '<div class="notice" role="note"><span class="small">В прототипе распознавание не подключено — показываем результат на примере.</span></div>' : '';
  }
  function saveButton(gen) {
    var pr = gen.projectId ? S.projects.get(gen.projectId) : null;
    return pr
      ? '<a class="btn btn--ghost" href="project.html?id=' + encodeURIComponent(pr.id) + '">Сохранено · открыть проект</a>'
      : '<button type="button" class="btn btn--primary" data-act="save">Сохранить в проект</button>';
  }
  function metodBanner() {
    if (S.metod.active()) return '';
    var min = Math.min.apply(null, D.metodPlans.map(function (p) { return p.price; }));
    return '<div class="banner"><div class="stack stack--3 grow"><span class="eyebrow">METOD · подписка</span>' +
      '<span class="h3">Контакты поставщиков и промокоды открываются по подписке METOD</span></div>' +
      '<div class="row"><span class="small num" style="color:var(--line)">тарифы от ' + F.rub(min) + '</span>' +
      '<a class="btn btn--light" href="metod.html?returnTo=' + encodeURIComponent(returnTo()) + '">Выбрать тариф</a></div></div>';
  }
  function resultHead(gen, title) {
    return '<div class="row row--between row--end ai-result__head">' +
      '<div class="stack stack--3"><span class="eyebrow">Результат · ' + MODES[gen.kind].name.toLowerCase() + '</span>' +
      '<h2 class="h2" data-focus tabindex="-1">' + title + '</h2>' +
      '<p class="ai-charge">' + chargeLine(gen) + '</p></div>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-act="reset">' + MODES[gen.kind].another + '</button></div>';
  }

  function viewDoneRender(gen) {
    var r = gen.result || {}, objects = r.objects || D.ai.renderSample.objects;
    var withBoxes = gen.sample === 'sample' || (!gen.sample && r.sample);
    var nItems = 0, retail = 0, metod = 0, rows = '';
    var list = objects.map(function (o) {
      var items = productsOf(o.items); nItems += items.length;
      var first = items[0] ? items[0].p : null;
      if (first) {
        retail += first.retail; metod += first.metod;
        rows += '<li><span class="ai-estimate__what"><span class="ai-estimate__n num">' + o.n + '</span><span>' + F.esc(o.name) + ' <span class="muted">· ' + F.esc(first.name) + '</span></span></span>' +
          '<span class="ai-estimate__sum"><span class="num green">' + F.rub(first.metod) + '</span><span class="num muted strike">' + F.rub(first.retail) + '</span></span></li>';
      }
      var market = 'market.html' + (first ? '?category=' + encodeURIComponent(first.category) : '');
      return '<section class="ai-obj rule-top" id="ai-obj-' + o.n + '" data-n="' + o.n + '" aria-labelledby="ai-obj-t-' + o.n + '">' +
        '<div class="row row--between ai-obj__head"><div class="row row--nowrap"><span class="marker" aria-hidden="true">' + o.n + '</span><h3 class="h4" id="ai-obj-t-' + o.n + '">' + F.esc(o.name) + '</h3></div>' +
        (items.length ? '<a class="arrow-link" href="' + market + '">Все похожие в маркете</a>' : '') + '</div>' +
        (items.length
          ? '<div class="ai-cards' + (items.length === 1 ? ' ai-cards--one' : '') + '">' + items.map(function (it) { return ui.productCard(it.p, { tag: it.match }); }).join('') + '</div>'
          : '<p class="hatch ai-obj__none">В каталоге похожего нет</p>') +
        '</section>';
    }).join('');
    var title = 'Нашли ' + objects.length + ' ' + plural(objects.length, ['предмет', 'предмета', 'предметов']) + ' и ' + nItems + ' ' + plural(nItems, ['товар', 'товара', 'товаров']);
    return '<div class="ai-result">' + ownNotice(gen) + resultHead(gen, title) +
      '<div class="split ai-split">' +
        '<div class="col-5 sticky">' + frame(st.source ? st.source.src : gen.src, { fit: !withBoxes, boxes: withBoxes ? objects : [], links: true, caption: gen.title + (withBoxes ? ' · ' + objects.length + ' ' + plural(objects.length, ['предмет', 'предмета', 'предметов']) : ''), alt: gen.title }) + '</div>' +
        '<div class="col-7 ai-objects">' + list + '</div>' +
      '</div>' +
      '<section class="card ai-estimate" aria-labelledby="ai-est-title">' +
        '<div class="stack stack--3"><span class="eyebrow">Черновая смета</span><h3 class="h3" id="ai-est-title">Если взять первый товар для каждого предмета</h3></div>' +
        '<div class="grid grid--3 grid--gap-lg">' +
          '<div class="rule-top stack stack--2"><span class="mid-num">' + F.rub(retail) + '</span><span class="tiny muted">розница</span></div>' +
          '<div class="rule-top stack stack--2"><span class="mid-num green">' + F.rub(metod) + '</span><span class="tiny muted">по ценам METOD</span></div>' +
          '<div class="rule-top stack stack--2"><span class="mid-num">' + F.rub(retail - metod) + '</span><span class="tiny muted">экономия</span></div>' +
        '</div>' +
        '<ul class="rows rows--tight ai-estimate__rows">' + rows + '</ul>' +
        '<div class="row ai-actions">' + saveButton(gen) +
          '<button type="button" class="btn btn--ghost" data-act="download">Скачать смету</button>' +
          '<button type="button" class="btn btn--link" data-act="reset">' + MODES.render.another + '</button></div>' +
      '</section>' + metodBanner() + '</div>';
  }

  /* карточка товара из боевого каталога: цен и фото у прототипа нет, берём с сервера */
  function apiCard(it, top) {
    var off = parseInt(String(it.discount || '').replace(/\D/g, ''), 10) || 0;
    var metod = it.price_metod || it.price_retail || 0, retail = it.price_retail || metod;
    var img = apiImg(it.img);
    var near = top ? Math.round(Math.min(100, (it.score || 0) / top * 100)) : 0;
    return '<a class="pc pc--live" href="live.html?id=' + encodeURIComponent(it.id) + '">' +
      '<span class="pc__pic">' + (img ? '<img src="' + img + '" alt="" loading="lazy">' : '') +
        (off ? '<span class="pc__off">−' + off + ' %</span>' : '') +
        (near ? '<span class="pc__near">похоже на ' + near + ' %</span>' : '') + '</span>' +
      '<span class="pc__body">' +
        '<span class="pc__brand">' + F.esc(it.brand || it.subcat || '') + '</span>' +
        '<span class="pc__name">' + F.esc(it.name) + '</span>' +
        (metod ? '<span class="price"><span class="price__metod">' + F.rub(Math.round(metod)) + '</span>' +
          (retail > metod ? '<span class="price__retail">' + F.rub(Math.round(retail)) + '</span>' : '') + '</span>'
          : '<span class="price"><span class="price__ask">цена по запросу</span></span>') +
        '<span class="pc__meta">' + F.esc(it.delivery || 'каталог SOVEAPP') + '</span>' +
      '</span></a>';
  }

  /* карточка товара боевого каталога: детали подтягиваем с сервера */
  function openLive(id) {
    var it = (liveById[id] || {});
    var img = apiImg(it.img);
    var m = ui.modal({
      eyebrow: F.esc(it.brand || 'Каталог SOVEAPP'),
      title: it.name || 'Товар',
      html: '<div class="live-card">' +
        (img ? '<img class="live-card__pic" src="' + img + '" alt="">' : '') +
        '<div class="price">' + (it.price_metod ? '<span class="price__metod">' + F.rub(Math.round(it.price_metod)) + '</span>' : '') +
          (it.price_retail && it.price_retail > it.price_metod ? '<span class="price__retail">' + F.rub(Math.round(it.price_retail)) + '</span>' : '') + '</div>' +
        '<div class="pb-list" id="live-facts">' +
          (it.subcat ? '<div class="pb-item"><b>Тип</b><span>' + F.esc(it.subcat) + '</span></div>' : '') +
          (it.color ? '<div class="pb-item"><b>Цвет</b><span>' + F.esc(it.color) + '</span></div>' : '') +
          (it.material ? '<div class="pb-item"><b>Материал</b><span>' + F.esc(it.material) + '</span></div>' : '') +
          (it.delivery ? '<div class="pb-item"><b>Доставка</b><span>' + F.esc(it.delivery) + '</span></div>' : '') +
        '</div>' +
        '<p class="small muted">Контакты поставщика и промокод открываются по подписке METOD.</p>' +
      '</div>',
      actions: [ { label: 'Открыть по METOD', kind: 'primary', href: 'metod.html' },
                 { label: 'Закрыть', kind: 'link' } ]
    });
    /* дотягиваем подробности: стиль, комната, город доставки */
    if (API && window.fetch) {
      fetch(API + '/marketplace/product/' + encodeURIComponent(id))
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !m || !m.el) return;
          var box = m.el.querySelector('#live-facts'); if (!box) return;
          [['Стиль', d.style], ['Комната', d.room], ['Город', d.delivery_city]].forEach(function (pair) {
            if (!pair[1]) return;
            var row = document.createElement('div'); row.className = 'pb-item';
            row.innerHTML = '<b>' + F.esc(pair[0]) + '</b><span>' + F.esc(String(pair[1])) + '</span>';
            box.appendChild(row);
          });
        })
        .catch(function () {});
    }
  }

  function viewDonePhoto(gen) {
    var r = gen.result || {};
    if (r.miss) return viewLiveMiss(gen, r.miss);
    if (r.api && r.api.length) return viewDoneLive(gen, r.api);
    var items = productsOf(r.items || D.ai.photoSample.items);
    var exact = items.filter(function (it) { return it.match === 'exact'; }).length, near = items.length - exact;
    var title = 'Нашли ' + items.length + ' ' + plural(items.length, ['товар', 'товара', 'товаров']);
    var sub = (exact ? exact + ' ' + plural(exact, ['точное совпадение', 'точных совпадения', 'точных совпадений']) : '') +
      (exact && near ? ' · ' : '') + (near ? near + ' ' + plural(near, ['похожий', 'похожих', 'похожих']) : '');
    var market = 'market.html' + (items[0] ? '?category=' + encodeURIComponent(items[0].p.category) : '');
    /* сверху узкая полоса «что искали → что нашли»: кадр маленький, товары крупные */
    return '<div class="ai-result">' + ownNotice(gen) +
      '<div class="res-top">' +
        '<img class="res-top__pic" src="' + F.esc(st.source ? st.source.src : gen.src) + '" alt="' + F.esc(gen.title) + '">' +
        '<div class="res-top__b"><span class="eyebrow">Искали по снимку</span>' +
          '<b data-focus tabindex="-1">' + title + '</b>' +
          '<i>' + F.esc(sub) + '</i></div>' +
        '<button type="button" class="btn btn--ghost btn--sm res-top__again" data-act="reset">Другой снимок</button>' +
      '</div>' +
      '<p class="ai-charge res-top__charge">' + chargeLine(gen) + '</p>' +
      (items.length
        ? '<div class="ai-cards ai-cards--2">' + items.map(function (it) { return ui.productCard(it.p, { tag: it.match }); }).join('') + '</div>'
        : '<p class="hatch ai-obj__none">В каталоге похожего нет</p>') +
      '<div class="row row--between rule-top ai-actions"><div class="row ai-actions">' + saveButton(gen) + '</div>' +
        '<a class="arrow-link" href="' + market + '">Все похожие в маркете</a></div>' +
      metodBanner() + '</div>';
  }

  /* результат от боевого ядра */
  var liveById = {};
  function viewLiveMiss(gen, hint) {
    return '<div class="ai-result">' +
      '<div class="res-top">' +
        '<img class="res-top__pic" src="' + F.esc(st.source ? st.source.src : gen.src) + '" alt="">' +
        '<div class="res-top__b"><span class="eyebrow">Искали по снимку</span>' +
          '<b data-focus tabindex="-1">В категории «' + F.esc(hint) + '» похожего нет</b>' +
          '<i>ядро принесло вещи из других разделов</i></div>' +
      '</div>' +
      '<p class="ai-charge res-top__charge">' + chargeLine(gen) + '</p>' +
      '<div class="stack stack--3">' +
        '<button type="button" class="btn btn--primary btn--block" data-act="reset">Снять другой кадр</button>' +
        '<a class="btn btn--ghost btn--block" href="market.html">Посмотреть каталог руками</a>' +
      '</div>' +
      '<p class="small muted">Подсказка про категорию отсекает чужие находки. Уберите её на прошлом экране, чтобы увидеть всё, что нашло ядро.</p>' +
    '</div>';
  }
  function viewDoneLive(gen, items) {
    items.forEach(function (x) { liveById[x.id] = x; });
    var top = items.length ? (items[0].score || 0) : 0;
    return '<div class="ai-result">' +
      '<div class="res-top">' +
        '<img class="res-top__pic" src="' + F.esc(st.source ? st.source.src : gen.src) + '" alt="' + F.esc(gen.title) + '">' +
        '<div class="res-top__b"><span class="eyebrow">Искали по снимку</span>' +
          '<b data-focus tabindex="-1">Нашли ' + items.length + ' ' + plural(items.length, ['товар', 'товара', 'товаров']) + '</b>' +
          '<i>подобрало ядро SOVEAPP по боевому каталогу</i></div>' +
      '</div>' +
      '<p class="ai-charge res-top__charge">' + chargeLine(gen) + '</p>' +
      '<div class="ai-cards ai-cards--2">' + items.map(function (x) { return apiCard(x, top); }).join('') + '</div>' +
      '<div class="row row--between rule-top ai-actions">' +
        '<button type="button" class="btn btn--ghost" data-act="reset">Снять другой предмет</button>' +
        '<a class="arrow-link" href="market.html">Открыть маркет</a></div>' +
      metodBanner() + '</div>';
  }

  /* ---------- 5. ничего не нашли ---------- */
  function viewEmpty(gen) {
    var m = MODES[gen.kind];
    var back = gen.opId
      ? F.tokens(gen.cost) + ' ' + plural(gen.cost, ['вернулся', 'вернулись', 'вернулись']) + ' на баланс · остаток ' + F.num(S.tokens.balance()) + '.'
      : (S.auth.isIn() ? 'Токены не списаны.' : 'Пробный запуск не сгорел: осталось ' + S.demo.left() + ' из ' + D.demoLimit + '.');
    return '<div class="split ai-split">' +
      '<div class="col-5">' + frame(st.source ? st.source.src : gen.src, { fit: true, caption: gen.title, alt: gen.title }) + '</div>' +
      '<div class="col-7 ai-side">' +
        '<div class="stack stack--3"><span class="eyebrow">Результат · ' + m.name.toLowerCase() + '</span>' +
          '<h2 class="h2" data-focus tabindex="-1">Ничего не нашли · ' + (gen.opId ? 'токены возвращены' : 'запуск не потрачен') + '</h2></div>' +
        '<p class="ai-charge ai-charge--back">' + back + '</p>' +
        '<div class="stack stack--3"><p class="text">На снимке не получилось выделить мебель, свет или декор. Попробуйте другой кадр:</p>' +
          '<ul class="ai-advice">' + m.tips.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>' +
        '<div class="row ai-actions"><button type="button" class="btn btn--primary" data-act="reset">Загрузить другое фото</button>' +
          '<button type="button" class="btn btn--link" data-act="sample">Попробовать на примере</button></div>' +
      '</div></div>';
  }

  /* ---------- выбор файла ---------- */
  function shrink(img, maxSide, maxLen) {
    var side = maxSide, q = 0.84, data = '';
    for (var i = 0; i < 7; i++) {
      var k = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
      var ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
      data = c.toDataURL('image/jpeg', q);
      if (data.length <= maxLen) break;
      side = Math.round(side * 0.8); q = Math.max(0.5, q - 0.08);
    }
    return data;
  }
  function fail(text) { st.error = text; st.view = 'idle'; st.source = null; render(); var e = $('#ai-error'); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'nearest' }); }
  function pickFile(file) {
    if (!file) return;
    st.error = '';
    if (!/^image\/(jpeg|png)$/.test(file.type)) { fail('Файл «' + file.name + '» не подходит: нужна картинка JPG или PNG. Поиск не запускался, токены не списаны.'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { fail('Файл весит ' + (Math.round(file.size / 1024 / 1024 * 10) / 10).toString().replace('.', ',') + ' МБ, а можно до ' + MAX_MB + ' МБ. Сожмите снимок или выберите другой. Токены не списаны.'); return; }
    var drop = $('#ai-drop'); if (drop) drop.classList.add('is-over');
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      /* уменьшенные копии: для экрана и черновика (≈300 КБ) и для ленты генераций (≈100 КБ) */
      var src = shrink(img, 1400, 400000), thumb = shrink(img, 720, 140000);
      URL.revokeObjectURL(url);
      st.source = { kind: 'own', src: src, thumb: thumb, title: mode().ownTitle, name: file.name };
      afterShot();
    };
    img.onerror = function () { URL.revokeObjectURL(url); fail('Не получилось открыть «' + file.name + '»: файл повреждён или это не картинка. Токены не списаны.'); };
    img.src = url;
  }
  /* ---------- настоящий поиск: боевое ядро SOVEAPP ----------
     Прототип шлёт кадр на /api/ai/similar (прокси локального сервера → 194.87.138.86).
     Ответ — карточки боевого каталога (332 тыс. позиций). Если сервер недоступен,
     ниже работает упрощённый подбор по цвету. */
  var API = (location.protocol === 'http:' || location.protocol === 'https:') ? '/api' : null;
  function apiImg(raw) { return /^https?:/.test(raw || '') ? API + '/img?u=' + encodeURIComponent(raw) : ''; }
  function toBlob(dataUrl) {
    var parts = dataUrl.split(','), mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
    var bin = atob(parts[1]), n = bin.length, u8 = new Uint8Array(n);
    while (n--) u8[n] = bin.charCodeAt(n);
    return new Blob([u8], { type: mime });
  }
  function realSearch(dataUrl, cb) {
    if (!API || !window.fetch || !window.FormData) { cb(null, 'нет связи с сервером'); return; }
    var fd = new FormData();
    try { fd.append('file', toBlob(dataUrl), 'shot.jpg'); } catch (e) { cb(null, 'снимок не прочитался'); return; }
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 120000);
    fetch(API + '/ai/similar?topn=10', { method: 'POST', body: fd, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) { cb(null, (res.j && (res.j.detail || res.j.error)) || 'сервер ответил ошибкой'); return; }
        var items = (res.j && res.j.items) || [];
        items = items.filter(function (x) { return x && x.name; });
        /* подсказка человека важнее догадки ядра */
        var rx = hintRx();
        if (rx) {
          var fit = items.filter(function (x) { return rx.test(x.name || '') || rx.test(x.subcat || ''); });
          if (fit.length) items = fit;
          else { cb([], null, 'miss'); return; }
        }
        /* хвост со слабым совпадением режем по доле от лучшего */
        var top = items.length ? (items[0].score || 0) : 0;
        if (top > 0) items = items.filter(function (x) { return (x.score || 0) >= top * 0.55; });
        cb(items.slice(0, 6), null);
      })
      .catch(function (e) { clearTimeout(timer); cb(null, String(e && e.message || e)); });
  }

  /* ---------- подбор по снимку: сравниваем средний цвет и форму ----------
     Настоящего распознавания в прототипе нет, поэтому берём то, что можно честно
     посчитать в браузере: преобладающий цвет предмета и вытянутость кадра. */
  var COLORS_KEY = 'sove.proto.prodColors';
  var colorCache = {};
  try { colorCache = JSON.parse(localStorage.getItem(COLORS_KEY) || '{}') || {}; } catch (e) { colorCache = {}; }
  function saveColors() { try { localStorage.setItem(COLORS_KEY, JSON.stringify(colorCache)); } catch (e) {} }

  function meanColor(img) {
    var n = 28, c = document.createElement('canvas'); c.width = n; c.height = n;
    var ctx = c.getContext('2d');
    try { ctx.drawImage(img, 0, 0, n, n); } catch (e) { return null; }
    var px; try { px = ctx.getImageData(0, 0, n, n).data; } catch (e) { return null; }
    var r = 0, g = 0, b = 0, k = 0;
    for (var i = 0; i < px.length; i += 4) {
      var lum = (px[i] + px[i + 1] + px[i + 2]) / 3;
      if (px[i + 3] < 40 || lum > 246) continue;   /* белый фон каталога в расчёт не берём */
      r += px[i]; g += px[i + 1]; b += px[i + 2]; k++;
    }
    return k ? [Math.round(r / k), Math.round(g / k), Math.round(b / k)] : null;
  }
  function colorOf(prod, cb) {
    if (colorCache[prod.id]) { cb(colorCache[prod.id]); return; }
    var im = new Image();
    im.onload = function () { var c = meanColor(im); if (c) { colorCache[prod.id] = c; } cb(c); };
    im.onerror = function () { cb(null); };
    im.src = prod.img;
  }
  function dist(a, b) {
    var dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }
  /* похожие товары к загруженному снимку: цвет решает, форма чуть поправляет */
  function matchBySource(srcUrl, cb) {
    var img = new Image();
    img.onload = function () {
      var mine = meanColor(img);
      if (!mine) { cb(null); return; }
      var wide = img.naturalWidth / Math.max(1, img.naturalHeight);   /* >1.25 — вытянутый предмет */
      var pool = D.products.filter(function (p) { return p.img && p.category !== 'Отделка'; }).slice(0, 60);
      var left = pool.length, scored = [];
      if (!left) { cb(null); return; }
      pool.forEach(function (p) {
        colorOf(p, function (c) {
          if (c) {
            var score = dist(mine, c);
            var pw = (p.box && p.box[0] && p.box[1]) ? p.box[0] / p.box[1] : 1;
            score += Math.abs(Math.min(2, pw) - Math.min(2, wide)) * 24;   /* форма весит мягко */
            scored.push({ id: p.id, score: score });
          }
          if (--left === 0) {
            saveColors();
            scored.sort(function (a, b) { return a.score - b.score; });
            if (!scored.length) { cb(null); return; }
            /* первый — ближайший по цвету и форме, остальные добираем из его же полки,
               иначе к дивану приезжают унитаз и люстра одного оттенка */
            var best = D.product(scored[0].id);
            var same = scored.slice(1).filter(function (x) {
              var pr = D.product(x.id);
              return pr && best && (pr.subcat === best.subcat || pr.category === best.category);
            });
            var out = [scored[0]].concat(same.slice(0, 2));
            if (out.length < 3) out = out.concat(scored.slice(1).filter(function (x) {
              return out.indexOf(x) < 0;
            }).slice(0, 3 - out.length));
            cb(out.slice(0, 3).map(function (x) { return { id: x.id, match: 'near' }; }));
          }
        });
      });
    };
    img.onerror = function () { cb(null); };
    img.src = srcUrl;
  }

  /* после кадра: предмет сразу идёт на обрезку, интерьер — на экран со стоимостью */
  function afterShot() {
    st.crop = { x: 12, y: 12, w: 76, h: 76 };
    st.view = st.mode === 'photo' ? 'crop' : 'ready';
    keepDraft(false); render(); toStage();
  }

  /* ---------- камера прямо в экране: включается сама, если браузер разрешает ---------- */
  var liveStream = null;
  function stopLive() {
    if (liveStream) { liveStream.getTracks().forEach(function (t) { t.stop(); }); liveStream = null; }
  }
  function startLive() {
    var video = $('#cam-video'), hold = $('#cam-hold'), hint = $('#cam-hint');
    if (!video) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) {
      if (hint) hint.textContent = 'камера доступна с телефона и по защищённому адресу · выберите снимок из галереи';
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then(function (s) {
        liveStream = s; video.srcObject = s;
        var box = $('#ai-drop'); if (box) box.classList.add('is-live');
        if (hold) hold.hidden = true;
      })
      .catch(function () {
        if (hint) hint.textContent = 'доступ к камере закрыт · выберите снимок из галереи или откройте пример';
      });
  }
  /* кадр с живой камеры; если камеры нет — открываем галерею */
  function shoot() {
    var video = $('#cam-video');
    if (!liveStream || !video || !video.videoWidth) {
      var inp = $('#ai-file');
      if (inp) { try { inp.setAttribute('capture', 'environment'); } catch (e) {} inp.click(); }
      return;
    }
    var w = Math.min(1400, video.videoWidth), h = Math.round(video.videoHeight * w / video.videoWidth);
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    c.getContext('2d').drawImage(video, 0, 0, w, h);
    var tw = Math.min(720, w), th = Math.round(h * tw / w);
    var tc = document.createElement('canvas'); tc.width = tw; tc.height = th;
    tc.getContext('2d').drawImage(video, 0, 0, tw, th);
    stopLive();
    st.error = ''; st.genId = null;
    st.source = { kind: 'own', src: c.toDataURL('image/jpeg', 0.85), thumb: tc.toDataURL('image/jpeg', 0.7), title: mode().ownTitle, name: 'Снимок с камеры' };
    afterShot();
  }

  /* ---------- обрезка: рамка тянется за углы ---------- */
  function bindCrop() {
    var stageEl = $('#crop-stage'), box = $('#crop-box'), img = $('#crop-img');
    if (!stageEl || !box || !img) return;
    function paint() {
      box.style.left = st.crop.x + '%'; box.style.top = st.crop.y + '%';
      box.style.width = st.crop.w + '%'; box.style.height = st.crop.h + '%';
    }
    paint();
    var drag = null;
    function pos(e) {
      var r = stageEl.getBoundingClientRect();
      return { x: Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)),
               y: Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100)) };
    }
    stageEl.addEventListener('pointerdown', function (e) {
      var h = e.target.closest('[data-h]');
      drag = { h: h ? h.getAttribute('data-h') : 'move', start: pos(e), crop: { x: st.crop.x, y: st.crop.y, w: st.crop.w, h: st.crop.h } };
      stageEl.setPointerCapture(e.pointerId); e.preventDefault();
    });
    stageEl.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var p = pos(e), dx = p.x - drag.start.x, dy = p.y - drag.start.y, c = drag.crop, MIN = 12;
      if (drag.h === 'move') {
        st.crop.x = Math.max(0, Math.min(100 - c.w, c.x + dx));
        st.crop.y = Math.max(0, Math.min(100 - c.h, c.y + dy));
      } else {
        var right = c.x + c.w, bottom = c.y + c.h;
        if (drag.h === 'nw' || drag.h === 'sw') { st.crop.x = Math.max(0, Math.min(right - MIN, c.x + dx)); st.crop.w = right - st.crop.x; }
        if (drag.h === 'ne' || drag.h === 'se') { st.crop.w = Math.max(MIN, Math.min(100 - c.x, c.w + dx)); }
        if (drag.h === 'nw' || drag.h === 'ne') { st.crop.y = Math.max(0, Math.min(bottom - MIN, c.y + dy)); st.crop.h = bottom - st.crop.y; }
        if (drag.h === 'sw' || drag.h === 'se') { st.crop.h = Math.max(MIN, Math.min(100 - c.y, c.h + dy)); }
      }
      paint();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      stageEl.addEventListener(ev, function () { drag = null; });
    });
  }
  /* вырезаем выделенное и запускаем поиск */
  function cropAndLaunch(useAll) {
    if (useAll || !st.crop) { launch(); return; }
    var img = new Image();
    img.onload = function () {
      var c = st.crop;
      var sx = Math.round(img.naturalWidth * c.x / 100), sy = Math.round(img.naturalHeight * c.y / 100);
      var sw = Math.max(1, Math.round(img.naturalWidth * c.w / 100)), sh = Math.max(1, Math.round(img.naturalHeight * c.h / 100));
      var cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
      cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      var out = cv.toDataURL('image/jpeg', 0.86);
      st.source = { kind: st.source.kind, src: out, thumb: out.length > 140000 ? st.source.thumb : out, title: st.source.title, name: st.source.name };
      launch();
    };
    img.onerror = function () { launch(); };
    img.src = st.source.src;
  }

  /* ---------- камера: снимаем предмет прямо в приложении ---------- */
  var camStream = null;
  function closeCamera() {
    var l = document.getElementById('ai-cam');
    if (l) l.remove();
    if (camStream) { camStream.getTracks().forEach(function (t) { t.stop(); }); camStream = null; }
  }
  function openCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      var inp = $('#ai-file'); if (inp) { inp.setAttribute('capture', 'environment'); inp.click(); }
      return;
    }
    var l = document.createElement('div');
    l.className = 'ai-cam'; l.id = 'ai-cam';
    l.innerHTML =
      '<video class="ai-cam__video" id="ai-cam-video" playsinline autoplay muted></video>' +
      '<div class="ai-cam__frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>' +
      '<p class="ai-cam__hint">Наведите на предмет целиком, при дневном свете</p>' +
      '<div class="ai-cam__bar">' +
        '<button type="button" class="ai-cam__cancel" data-cam="close">Отмена</button>' +
        '<button type="button" class="ai-cam__shot" data-cam="shot" aria-label="Снять"></button>' +
        '<button type="button" class="ai-cam__flip" data-cam="flip" aria-label="Перевернуть камеру">⟲</button>' +
      '</div>' +
      '<p class="ai-cam__err" id="ai-cam-err" hidden></p>';
    document.body.appendChild(l);
    var video = document.getElementById('ai-cam-video'), facing = 'environment';

    function start() {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false })
        .then(function (st2) {
          camStream = st2; video.srcObject = st2;
        })
        .catch(function () {
          var e = document.getElementById('ai-cam-err');
          if (e) { e.hidden = false; e.textContent = 'Камера недоступна: разрешите доступ в настройках браузера или выберите снимок из галереи.'; }
        });
    }
    start();

    l.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cam]'); if (!b) return;
      var act = b.getAttribute('data-cam');
      if (act === 'close') { closeCamera(); return; }
      if (act === 'flip') {
        facing = facing === 'environment' ? 'user' : 'environment';
        if (camStream) camStream.getTracks().forEach(function (t) { t.stop(); });
        start(); return;
      }
      if (act === 'shot') {
        if (!video.videoWidth) return;
        var c = document.createElement('canvas');
        var w = Math.min(1400, video.videoWidth), h = Math.round(video.videoHeight * w / video.videoWidth);
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(video, 0, 0, w, h);
        var src = c.toDataURL('image/jpeg', 0.85);
        var tc = document.createElement('canvas');
        var tw = Math.min(720, w), th = Math.round(h * tw / w);
        tc.width = tw; tc.height = th;
        tc.getContext('2d').drawImage(video, 0, 0, tw, th);
        closeCamera();
        st.error = ''; st.genId = null;
        st.source = { kind: 'own', src: src, thumb: tc.toDataURL('image/jpeg', 0.7), title: mode().ownTitle, name: 'Снимок с камеры' };
        st.view = 'ready'; keepDraft(false); render(); toStage();
      }
    });
    document.addEventListener('keydown', function esc(ev) {
      if (ev.key === 'Escape') { closeCamera(); document.removeEventListener('keydown', esc); }
    });
  }

  function useSample(kind) {
    var s = kind === 'empty' ? D.ai.emptySample : mode().sample;
    st.error = ''; st.genId = null;
    st.source = { kind: kind, src: s.src, title: s.title, name: 'Пример · ' + s.title };
    stopLive();
    if (kind === 'empty') { keepDraft(false); launch(); return; }   /* пустой ответ показываем сразу */
    afterShot();
  }
  function reset() {
    stopProgress(); st.view = 'idle'; st.source = null; st.genId = null; st.error = ''; S.draft.clear('ai');
    render(); toStage();
  }

  /* ---------- сохранить в проект ---------- */
  function saveToProject() {
    var gen = S.gens.get(st.genId); if (!gen) return;
    if (!S.auth.isIn()) {
      keepDraft(true, { genId: gen.id, pendingSave: true });
      ui.needAuth('Войдите, чтобы сохранить результат', returnTo()); return;
    }
    ui.pickProject(function (projectId) {
      S.gens.attach(gen.id, projectId);
      var pr = S.projects.get(projectId);
      ui.toast('Сохранили в проект «' + (pr ? pr.name : 'Проект') + '»', 'ok');
      render();
    });
  }

  /* ---------- отрисовка ---------- */
  function toStage() {
    var top = stage.getBoundingClientRect().top;
    if (top < 0 || top > window.innerHeight * 0.45) stage.scrollIntoView({ block: 'start' });
    var h = $('[data-focus]'); if (h) { try { h.focus({ preventScroll: true }); } catch (e) { /* старые браузеры */ } }
  }
  function render() {
    var gen = st.genId ? S.gens.get(st.genId) : null;
    paintChrome();
    if (st.view !== 'idle') stopLive();
    if (st.view === 'crop' && st.source) stage.innerHTML = viewCrop();
    else if (st.view === 'ready' && st.source) { stage.innerHTML = viewReady(); paintCost(); }
    else if (st.view === 'running' && gen) { stage.innerHTML = viewRunning(gen); startProgress(gen.id); }
    else if (st.view === 'done' && gen) stage.innerHTML = (gen.kind === 'photo' ? viewDonePhoto(gen) : viewDoneRender(gen)) + recentStrip(gen.id);
    else if (st.view === 'empty' && gen) stage.innerHTML = viewEmpty(gen) + recentStrip(gen.id);
    else { st.view = 'idle'; stage.innerHTML = viewIdle(); }
    bind();
    if (st.view === 'idle') startLive();
    if (st.view === 'crop') bindCrop();
  }
  function bind() {
    var input = $('#ai-file'), drop = $('#ai-drop');
    if (input) {
      input.addEventListener('change', function () { pickFile(input.files && input.files[0]); });
      ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.add('is-over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('is-over'); }); });
    }
    on('[data-act="camera"]', function () { openCamera(); });
    on('[data-act="shot"]', shoot);
    on('[data-live]', function (e) { openLive(e.currentTarget.getAttribute('data-live')); });
    on('[data-hint]', function (e) {
      var v = e.currentTarget.getAttribute('data-hint');
      st.hint = (st.hint === v) ? '' : v;
      render();
    });
    on('[data-act="crop-go"]', function () { cropAndLaunch(false); });
    on('[data-act="crop-all"]', function () { cropAndLaunch(true); });
    on('[data-open]', function (e) {
      var id = e.currentTarget.getAttribute('data-open'), g = S.gens.get(id); if (!g) return;
      st.mode = MODES[g.kind] ? g.kind : st.mode;
      st.source = { kind: g.sample || 'sample', src: g.src, title: g.title };
      showFinished(g); syncUrl(); toStage();
    });
    on('[data-act="sample"]', function () { useSample('sample'); });
    on('[data-act="sample-empty"]', function () { useSample('empty'); });
    on('[data-act="reset"]', reset);
    on('[data-act="launch"]', launch);
    on('[data-act="save"]', saveToProject);
    on('[data-act="download"]', function () { ui.toast('В прототипе файл не формируется'); });
    /* рамка на картинке ↔ предмет в списке */
    var objs = stage.querySelectorAll('.ai-obj[data-n]');
    for (var i = 0; i < objs.length; i++) (function (sec) {
      var box = stage.querySelector('.ai-box[data-n="' + sec.getAttribute('data-n') + '"]'); if (!box) return;
      sec.addEventListener('mouseenter', function () { box.classList.add('is-hot'); });
      sec.addEventListener('mouseleave', function () { box.classList.remove('is-hot'); });
    })(objs[i]);
  }

  /* ---------- старт: незавершённый поиск → черновик → пустой экран ---------- */
  function boot() {
    var now = Date.now(), live = null, fresh = null;
    S.gens.list().forEach(function (g) {
      if (g.status !== 'running' || !g.startedAt || !g.duration) return;
      if (now - g.startedAt < g.duration) { if (!live) live = g; return; }
      var done = settle(g.id);
      if (!fresh && done && now - g.startedAt < SHOW_FINISHED_WITHIN) fresh = done;
    });
    var d = S.draft.get('ai');
    if (live) {
      st.mode = live.kind; st.genId = live.id; st.view = 'running';
      st.source = { kind: live.sample || 'sample', src: live.src, title: live.title };
      syncUrl(); render(); return;
    }
    if (d && d.genId) {
      var g = S.gens.get(d.genId); S.draft.clear('ai');
      if (g && g.status === 'done') {
        if (d.source) st.source = d.source;
        showFinished(g);
        /* окно «Куда положить?» само объясняет, что происходит: тост поверх него на телефоне закрывал бы поле названия */
        var reopenSave = d.pendingSave && S.auth.isIn() && !g.projectId;
        if (reopenSave) saveToProject();
        else if (d.away) ui.toast('Вернули ваш результат — можно сохранить в проект');
        return;
      }
      d = null;
    }
    if (d && d.source && MODES[d.mode]) {
      st.mode = d.mode; st.source = d.source; st.view = 'ready';
      syncUrl(); render();
      if (d.away) { ui.toast(mode().back); keepDraft(false); }
      return;
    }
    if (fresh) {
      showFinished(fresh);
      ui.toast(fresh.status === 'empty' ? 'Поиск завершился, пока вас не было: ничего не нашли, ' + (fresh.opId ? 'токены вернулись' : 'запуск не потрачен') : 'Поиск завершился, пока вас не было', fresh.status === 'empty' ? undefined : 'ok');
      return;
    }
    render();
  }

  S.onChange(function () { if (st.view === 'ready') paintCost(); });
  boot();
})();
