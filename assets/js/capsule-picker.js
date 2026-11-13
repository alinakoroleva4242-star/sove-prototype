/* Окно выбора интерьера — одно на всё приложение (общий договор WP0, 02.11.2026; саммари созвона 28.10, пп. 5–9, 14).
   Подключать после site.js (лучше после repair.js, kb/capsules.js и demo-flow.js — их читаем в момент вызова, а не при загрузке).
   Стили — assets/css/capsule-picker.css. Классы и атрибуты только .cpk-* / data-cpk-* (префикс .cp- занят в extra.css).

   window.SOVE.capsulePicker:
   open(o) → { close, el } — шторка снизу (на широком экране по центру), z-index 300: грип, Esc, клик по фону, фокус внутри (Tab зациклен)
     и возврат фокуса. Сверху — фильтр по стилям пилюлями с переносом («Все» + стили), сетка карточек две в ряд, внизу —
     «База | Премиум», «Что входит» (внутренний вид шторки по классификатору) и главная кнопка. Окно бесплатное — у гостя тоже.
     Фокус при открытии: с клавиатуры — выбранная карточка, касанием или из кода — заголовок окна (без рамки поверх обводки выбора).
     Двойной тап: гаснущее окно (180 мс) и прозрачный щит под ним (до SHIELD_MS) глотают второй тап — он не уходит на страницу и не выбирает
     второй раз; новое окно, открытое из onPick / onOwn, ложится поверх щита.
     o.entry   'budget' | 'plan' | 'interior' | 'my' — откуда открыли (по умолчанию по body[data-page])
     o.current id капсулы для предвыбора (по умолчанию — текущая капсула объекта); выбирает человек, запись — только по кнопке
     o.level   'base' | 'premium' (по умолчанию — тип ремонта объекта)
     o.own     true — плитка «＋ Свой интерьер» первой в сетке; показывается, только если передан и o.onOwn
     o.onOwn() плитка «Свой интерьер»: окно закрывается, затем onOwn — синхронно в клике (можно сразу input.click())
     o.onPick(res) после главной кнопки, когда окно уже закрыто; res — как у apply(), без изменений — changed: false
     o.onClose(res | null) после любого закрытия, кроме замены окна новым
     o.apply   по умолчанию true — окно само записывает выбор через apply(); false — только вернуть выбор в onPick
               (блок, которому сначала нужно списание или проверка, зовёт apply() сам после успеха)
     o.toast   по умолчанию true — тост «Интерьер «…» · База» после закрытия (только если окно само записало и что-то поменялось)
     o.note    строка над кнопкой (например, цена сборки в Интерьере) — текст, не HTML
     o.okLabel строка или function(id, level) → строка — подпись главной кнопки. Без неё: «Выбрать», а если капсула и уровень
               те же, что у объекта, — «Готово» (закрыть без записи)
   apply({capsuleId, level}, {entry, toast}) → res | null — ЕДИНСТВЕННАЯ запись выбора в объект, порядок важен:
     flow.interior = {type:'capsule', id, name} (SOVE_FLOW или прямо sove.demo.flow.v1) → R.interiors.choose(id, {level, source: entry, flatId})
     (ядро «Моего ремонта»: та же капсула у объекта — становится текущей, иначе одна лёгкая запись {type:'capsule', source, capsuleId, name, img,
     imageUrl, level} без slots / dna / productIds, обновляется на месте; без choose — запасной путь: только квартира) →
     r.scoutParams (капсула и уровень) и r.budgetPlan.type → квартира {capsuleId, budgetType} → S.my.set({capsuleId, level}) →
     SOVE_FLOW.refreshBudget() → событие window 'sove:capsule' (detail = res). Без repair.js (главная) — только flow и S.my.
     res = { capsuleId, level, flatId, interiorId, changed, entry }; opts.toast — показать тот же тост, что окно.
   current() → { capsuleId, level, own, interiorId, flatId } — текущий интерьер объекта (own — свой интерьер без капсулы)
   card(c | id | {name, img, style, palette}, o) → HTML карточки как в Бюджете: картинка, имя, стиль, палитра, цена за м²; скругление 16;
     выбранная — обводка акцентом и галочка. o = { active, compact, level, tag: 'button' | 'a' | 'div', href, attrs, badge, sub, foot }:
     compact — уменьшенная вертикальная (Планировка, Интерьер) в .cpk-grid--compact; badge — метка на фото («текущий»); sub — строка
     вместо стиля (текст); foot — готовый HTML низа вместо палитры и цены (экранирует блок); attrs — свои атрибуты строкой.
     Цены нет для уровня — не выдумываем: «уточняется», для Премиума без своей цены — «цена — в расчёте». Авторская капсула (c.designer) —
     «авторский · от …», как в каталоге.
   name(id) → короткое имя без кода (SOVE_KB.capsule(id).name, иначе имя из data.js); list() — капсулы в порядке data.js;
   levelName(level) → 'База' | 'Премиум'.
   Декларативно: <a|button data-cpk-open="budget|plan|interior|my" [data-cpk-current="k4"]> открывает окно без onPick
   (обычная ссылка с href остаётся запасным путём на страницах без модуля); блоки, которым нужна перерисовка, слушают 'sove:capsule'.
   Окна SOVE.ui (modal, confirm) изнутри НЕ открывать: модалка (z 100) ляжет под шторку, а её close() сбрасывает body.overflow.
   Кодов капсул нет ни в тексте, ни в alt. */
(function () {
  var S = window.SOVE; if (!S || !S.data || !S.ui) return;
  var D = S.data, F = S.fmt, esc = F.esc;
  var SELF = (document.currentScript && document.currentScript.src) || '';
  var FLOW_KEY = 'sove.demo.flow.v1', EV_KEY = 'sove.events';
  var LEVELS = ['base', 'premium'];
  var SHIELD_MS = 350;                                                              /* окно гаснет 180 мс, щит держим дольше — на второй тап */
  /* как человек работает со страницей: клавиатура — фокус на выбранной карточке с рамкой, касание или мышь — на заголовке окна */
  var kbd = false;
  document.addEventListener('keydown', function (e) { if (!e.metaKey && !e.ctrlKey && !e.altKey) kbd = true; }, true);
  ['pointerdown', 'mousedown', 'touchstart'].forEach(function (t) { document.addEventListener(t, function () { kbd = false; }, { capture: true, passive: true }); });
  /* прозрачный щит под закрывающимся окном: окно уходит из DOM через 180 мс, как раньше, а второй тап двойного нажатия до SHIELD_MS
     ловит щит (не страница под окном). Вставляем перед окном — новое окно (из onPick / onOwn) оказывается поверх щита */
  function shield(back) {
    var d = document.createElement('div'); d.className = 'cpk-shield'; d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:300;background:transparent;-webkit-tap-highlight-color:transparent;';
    function eat(e) { e.preventDefault(); e.stopPropagation(); }
    d.addEventListener('click', eat); d.addEventListener('mousedown', eat);
    if (back.parentNode) back.parentNode.insertBefore(d, back); else document.body.appendChild(d);
    setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, SHIELD_MS);
  }
  var PLUS = '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* ---------- данные ---------- */
  function capOf(id) { var c = id && typeof id === 'string' ? D.capsule(id) : null; return c && !c.soon ? c : null; }
  function name(id) {
    var c = id && typeof id === 'object' ? id : D.capsule(id); if (!c) return '';
    var KB = window.SOVE_KB, k = c.id && KB && typeof KB.capsule === 'function' ? KB.capsule(c.id) : null;
    return (k && k.name) || c.name || '';
  }
  function normLevel(l) { return l === 'premium' ? 'premium' : 'base'; }
  function levelName(l) { return l === 'premium' ? 'Премиум' : 'База'; }
  function list() { return D.capsules.slice(); }
  function entryOf() {
    var p = document.body ? document.body.getAttribute('data-page') : '';
    return p === 'scout' ? 'budget' : (p === 'plan-demo' || p === 'arrange' || p === 'plan') ? 'plan' : p === 'interior' ? 'interior' : 'my';
  }
  function flowLoad() { try { return JSON.parse(localStorage.getItem(FLOW_KEY) || '{}') || {}; } catch (e) { return {}; } }
  function flowCap() { var it = flowLoad().interior; if (!it) return null; if (typeof it === 'string') return it; return it.type === 'own' ? null : (it.capsuleId || it.id || null); }
  function track(nm, props) {
    try {
      var R = S.repair, f = R && R.flats ? R.flats.active() : null;
      var ev = Object.assign({ name: nm, ts: Date.now(), flatId: f ? f.id : null }, props || {});
      var a = JSON.parse(localStorage.getItem(EV_KEY) || '[]'); if (!Array.isArray(a)) a = [];
      a.push(ev); localStorage.setItem(EV_KEY, JSON.stringify(a.slice(-500)));
    } catch (e) {}
  }

  /* текущий интерьер объекта: квартира «Моего ремонта» → её текущий интерьер; без квартиры — расчёт (S.my) или выбор Планировки */
  function current() {
    var R = S.repair, f = R && R.flats ? R.flats.active() : null, it = f ? R.get(f.id).interior : null, my = {};
    try { my = (S.my && S.my.get()) || {}; } catch (e) {}
    var capId = it ? (it.capsuleId || null) : ((f && f.capsuleId) || my.capsuleId || flowCap());
    if (!capOf(capId)) capId = null;
    return { capsuleId: capId, level: normLevel((f && f.budgetType) || my.level || (it && it.level)), own: !!it && !it.capsuleId, interiorId: it ? it.id : null, flatId: f ? f.id : null };
  }

  /* ---------- карточка ---------- */
  function dots(c) { return c.palette && c.palette.length ? '<span class="cpk-card__dots" aria-hidden="true">' + c.palette.map(function (h) { return '<i style="background:' + esc(h) + '"></i>'; }).join('') + '</span>' : ''; }
  /* авторская капсула (c.designer) — «авторский · от …», как в каталоге (site.js capsuleCard) */
  function price(c, level) {
    if (c.soon) return '<span class="cpk-card__price is-muted">скоро</span>';
    var v = level === 'premium' ? c.pricePerM2Premium : c.pricePerM2, au = c.designer ? '<span class="cpk-card__au">авторский · </span>' : '';
    if (v) return au ? '<span class="cpk-card__price has-au">' + au + '<span class="cpk-card__v">от <b>' + F.num(v) + '</b> ₽/м²</span></span>'
      : '<span class="cpk-card__price">от <b>' + F.num(v) + '</b> ₽/м²</span>';
    /* Премиум без своей цены считается по цене Базы (решение 02.11) — так и пишем, а не «цена — в расчёте» у всех капсул */
    if (level === 'premium' && c.pricePerM2) return '<span class="cpk-card__price is-muted">' + au + 'от <b>' + F.num(c.pricePerM2) + '</b> ₽/м² · как База</span>';
    return '<span class="cpk-card__price is-muted">' + au + 'уточняется</span>';
  }
  function card(c, o) {
    o = o || {};
    if (typeof c === 'string') c = D.capsule(c);
    if (!c || typeof c !== 'object') return '';
    var isCap = !!(c.id && D.capsule(c.id)), level = normLevel(o.level), off = isCap && !!c.soon;
    var tag = o.tag === 'a' || o.tag === 'div' ? o.tag : 'button';
    var img = isCap ? (c.wide || c.cover || '') : (c.img || c.imageUrl || c.cover || ''), pos = isCap && c.wide && c.widePos ? c.widePos : '';
    var sub = o.sub !== undefined && o.sub !== null ? String(o.sub) : (c.style || '');
    var badge = o.badge || (o.current ? 'текущий' : '');
    var foot = o.foot !== undefined && o.foot !== null ? String(o.foot) : isCap ? dots(c) + price(c, level) : dots(c);
    var cls = 'cpk-card' + (o.compact ? ' cpk-card--compact' : '') + (o.active ? ' is-on' : '') + (off ? ' is-off' : '') + (tag === 'div' ? ' is-static' : '');
    var inner = '<span class="cpk-card__pic">' +
        (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" width="560" height="430"' + (pos ? ' style="object-position:' + esc(pos) + '"' : '') + '>' : '') +
        '<span class="cpk-card__ok" aria-hidden="true">' + CHECK + '</span>' + (badge ? '<span class="cpk-card__now">' + esc(badge) + '</span>' : '') + '</span>' +
      '<span class="cpk-card__body"><span class="cpk-card__name">' + esc(isCap ? name(c) : (c.name || '')) + '</span>' +
        (sub ? '<span class="cpk-card__style">' + esc(sub) + '</span>' : '') + (foot ? '<span class="cpk-card__foot">' + foot + '</span>' : '') + '</span>';
    var attrs = o.attrs ? ' ' + o.attrs : '';
    if (tag === 'a') return '<a class="' + cls + '" href="' + esc(o.href || '#') + '"' + attrs + '>' + inner + '</a>';
    if (tag === 'div') return '<div class="' + cls + '"' + attrs + '>' + inner + '</div>';
    return '<button type="button" class="' + cls + '" aria-pressed="' + !!o.active + '"' + (off ? ' disabled' : '') + attrs + '>' + inner + '</button>';
  }

  /* ---------- запись выбора в объект ---------- */
  /* «Тип ремонта: …» — только если у объекта уже был интерьер этой капсулы и поменялся один уровень;
     капсула была лишь в расчёте (S.my, квартира) — запись интерьера новая: «Интерьер «…» · База» */
  function toastText(res, before) {
    var R0 = S.repair, hasObj = !!(R0 && R0.flats && R0.interiors);
    var onlyLevel = !!before && before.capsuleId === res.capsuleId && before.level !== res.level && (!hasObj || !!before.interiorId);
    var t = onlyLevel ? 'Тип ремонта: ' + levelName(res.level) : 'Интерьер «' + name(res.capsuleId) + '» · ' + levelName(res.level);
    var R = S.repair;
    try { if (R && R.flats && R.flats.list().length > 1) { var f = R.flats.active(); if (f) t += ' · ' + f.name; } } catch (e) {}
    return t;
  }
  function apply(choice, opts) {
    choice = choice || {}; opts = opts || {};
    var c = capOf(choice.capsuleId); if (!c) return null;
    var id = c.id, level = normLevel(choice.level), entry = opts.entry || entryOf(), before = current();
    var FL = window.SOVE_FLOW, R = S.repair;
    var res = { capsuleId: id, level: level, flatId: null, interiorId: null, changed: false, entry: entry };
    /* 1) Планировка (flow.interior) — до квартиры: перерисовка по 'sove:repair' уже видит новый интерьер */
    try {
      if (FL && typeof FL.save === 'function' && typeof FL.capsuleInterior === 'function') FL.save({ interior: FL.capsuleInterior(id) });
      else { var fl = flowLoad(); fl.interior = { type: 'capsule', id: id, name: name(id) }; localStorage.setItem(FLOW_KEY, JSON.stringify(fl)); }
    } catch (e) {}
    if (R && R.flats && R.interiors) {
      var f = R.flats.ensure(), it = null; res.flatId = f.id;
      /* 2) текущий интерьер объекта — правило одной лёгкой записи живёт только в repair.js (R.interiors.choose);
            без него запасной путь — квартира {capsuleId, budgetType} ниже */
      try { if (typeof R.interiors.choose === 'function') it = R.interiors.choose(id, { level: level, source: entry, flatId: f.id }); } catch (e) { it = null; }
      /* 3) тип ремонта одинаковый в квартире, расчёте и бюджете Планировки (fromRepair читает r.scoutParams целиком) */
      var r = R.get(f.id);
      if (r.scoutParams) { r.scoutParams.capsuleId = id; r.scoutParams.level = level; }
      if (r.budgetPlan) r.budgetPlan.type = level;
      R.flats.update(f.id, { capsuleId: id, budgetType: level });                   /* всегда оба ключа: зеркало S.my обновляет только update */
      var now = R.get(f.id).interior; res.interiorId = (it && it.id) || (now && now.id) || null;
    }
    /* поменялось: капсула, тип ремонта или текущий интерьер объекта (выбор той же капсулы впервые записал её интерьер) */
    res.changed = before.capsuleId !== id || before.level !== level || (before.interiorId || null) !== res.interiorId;
    /* 4) расчёт */
    try { if (S.my && typeof S.my.set === 'function') S.my.set({ capsuleId: id, level: level }); } catch (e) {}
    /* 5) бюджет Планировки */
    try { if (FL && typeof FL.refreshBudget === 'function') FL.refreshBudget(); } catch (e) {}
    track('cpk_pick', { entry: entry, capsule: id, level: level, changed: res.changed });
    try { window.dispatchEvent(new CustomEvent('sove:capsule', { detail: res })); } catch (e) {}
    if (opts.toast && res.changed) S.ui.toast(toastText(res, before), 'ok');
    return res;
  }

  /* ---------- «Что входит»: классификатор SOVEAPP (assets/js/classifier.js), подгружаем по первому открытию ---------- */
  var clsLoading = false, clsWait = [];
  function loadClassifier(done) {
    if (S.classifier && S.classifier.sections) return done(true);
    clsWait.push(done); if (clsLoading) return; clsLoading = true;
    var s = document.createElement('script');
    s.src = SELF && /capsule-picker\.js/.test(SELF) ? SELF.replace(/capsule-picker\.js/, 'classifier.js') : 'assets/js/classifier.js';
    function flush(ok) { clsLoading = false; var w = clsWait; clsWait = []; w.forEach(function (fn) { fn(ok); }); }
    s.onload = function () { flush(!!(S.classifier && S.classifier.sections)); };
    s.onerror = function () { if (s.parentNode) s.parentNode.removeChild(s); flush(false); };
    document.head.appendChild(s);
  }
  /* как в окне классификатора расчёта (scout.js, задача 41 Алины): цены только в разделе «Мебель», в остальных — что входит, без цены и единицы */
  function clsNoPrice(v) { v = String(v || '').replace(/^\d[\d\s]*\s*(,|—)\s*/, ''); return /^одна сумма/i.test(v) ? 'входит' : v; }
  function clsItem(name) { return String(name || '').replace(/,\s*(за\s+)?1?\s*(м²|пост|л|шт|п\.\s*м|м\s*п\.)\s*$/i, ''); }
  function clsHtml(level) {
    var C = S.classifier, other = level === 'premium' ? 'base' : 'premium', otherName = other === 'premium' ? 'в Премиуме' : 'в Базе';
    return '<div class="cpk-cls">' + C.sections.map(function (sec) {
      var priced = /мебель/i.test(sec.title) && !/встроенная/i.test(sec.title), val = priced ? function (v) { return v; } : clsNoPrice, item = priced ? function (v) { return v; } : clsItem;
      return '<section class="cpk-cls__sec"><h3 class="cpk-cls__t">' + esc(sec.title) + '</h3>' + (sec.rows || []).map(function (r) {
        return '<div class="cpk-cls__row"><span>' + esc(item(r.item)) + '</span><b>' + esc(val(r[level]) || '—') + '</b>' +
          (r[other] && val(r[other]) !== val(r[level]) ? '<small>' + otherName + ': ' + esc(val(r[other])) + '</small>' : '') + '</div>';
      }).join('') + '</section>';
    }).join('') + '<p class="cpk-cls__note">Цены мебели — ориентиры за штуку. Остальное посчитаем по вашей планировке.</p></div>';
  }

  /* ---------- окно ---------- */
  var active = null;
  function open(o) {
    o = o || {};
    if (active) active.close(true);                                                 /* прежнее окно — без колбэков */
    var entry = o.entry || entryOf(), now = current();
    var st = { view: 'list', style: '', sel: capOf(o.current) ? o.current : (o.current ? null : now.capsuleId), level: normLevel(o.level || now.level),
      cur: now.capsuleId, curLevel: now.level, res: null, closed: false, top: 0 };
    var own = o.own === true && typeof o.onOwn === 'function';
    var styles = []; D.capsules.forEach(function (c) { if (c.style && styles.indexOf(c.style) < 0) styles.push(c.style); });
    var prevFocus = document.activeElement, prevOverflow = document.body.style.overflow;
    var back = document.createElement('div'); back.className = 'cpk-back'; back.setAttribute('data-cpk-entry', entry);
    back.innerHTML = '<div class="cpk" role="dialog" aria-modal="true" aria-labelledby="cpk-t"><div class="cpk__head"></div><div class="cpk__body"></div><div class="cpk__foot"></div></div>';
    var box = back.firstChild, head = box.children[0], body = box.children[1], foot = box.children[2];
    var X = '<button type="button" class="cpk__x" data-cpk-close aria-label="Закрыть">×</button>';

    /* та же капсула и тот же тип, и интерьер у объекта уже записан — записывать нечего */
    function isSame() { return !!st.sel && st.sel === st.cur && st.level === st.curLevel && (!S.repair || !!now.interiorId); }
    function okText() {
      if (!st.sel) return 'Выберите капсулу';
      if (typeof o.okLabel === 'function') { try { var t = o.okLabel(st.sel, st.level); if (t) return String(t); } catch (e) {} }
      else if (o.okLabel) return String(o.okLabel);
      return isSame() ? 'Готово' : 'Выбрать';
    }
    function paintHead() {
      head.innerHTML = '<i class="cpk__grip" aria-hidden="true"></i>' + (st.view === 'info'
        ? '<div class="cpk__h"><span class="cpk__ttl"><button type="button" class="cpk__back" data-cpk-list>‹ К интерьерам</button><b class="cpk__t" id="cpk-t" tabindex="-1">Что входит в ремонт</b>' +
            '<small>Материалы и бренды Базы и Премиума по классификатору SOVEAPP</small></span>' + X + '</div>'
        : '<div class="cpk__h"><span class="cpk__ttl"><b class="cpk__t" id="cpk-t" tabindex="-1">Выберите интерьер</b><small>Капсулы SOVEAPP: материалы, мебель и цена за м²</small></span>' + X + '</div>' +
          '<div class="cpk-filt" role="group" aria-label="Стиль">' + [''].concat(styles).map(function (s) {
            var on = st.style === s; return '<button type="button" class="cpk-chip' + (on ? ' is-on' : '') + '" data-cpk-style="' + esc(s) + '" aria-pressed="' + on + '">' + esc(s || 'Все') + '</button>';
          }).join('') + '</div>');
    }
    function ownTile() {
      return '<button type="button" class="cpk-own' + (now.own ? ' is-on' : '') + '" data-cpk-own aria-pressed="' + now.own + '"><span class="cpk-own__plus" aria-hidden="true">' + PLUS + '</span>' +
        '<b>Свой интерьер</b><small>' + (now.own ? 'текущий · ' : '') + 'фото, рендер или Pinterest</small></button>';
    }
    function paintBody() {
      if (st.view === 'info') {
        if (S.classifier && S.classifier.sections) { body.innerHTML = clsHtml(st.level); return; }
        body.innerHTML = '<div class="cpk-msg cpk-msg--busy" role="status">Загружаем классификатор…</div>';
        loadClassifier(function (ok) {
          if (st.closed || st.view !== 'info') return;
          if (ok) { body.innerHTML = clsHtml(st.level); return; }
          body.innerHTML = '<div class="cpk-msg" role="alert"><b>Классификатор не загрузился</b><span>Проверьте связь и откройте ещё раз.</span><button type="button" class="cpk__back" data-cpk-list>‹ К интерьерам</button></div>';
        });
        return;
      }
      var shown = D.capsules.filter(function (c) { return !st.style || c.style === st.style; });
      body.innerHTML = '<div class="cpk-grid">' + (own ? ownTile() : '') + shown.map(function (c) {
        return card(c, { active: c.id === st.sel, level: st.level, badge: c.id === st.cur ? 'текущий' : '', attrs: 'data-cpk-cap="' + esc(c.id) + '"' });
      }).join('') + '</div>';
    }
    function paintFoot() {
      foot.innerHTML = '<p class="cpk-sel" aria-live="polite"></p>' +
        '<div class="cpk-lv"><div class="cpk-seg" role="group" aria-label="Тип ремонта">' + LEVELS.map(function (l) { return '<button type="button" data-cpk-level="' + l + '" aria-pressed="false">' + levelName(l) + '</button>'; }).join('') + '</div>' +
          '<button type="button" class="cpk-info" data-cpk-info>Что входит</button></div>' +
        (o.note ? '<small class="cpk-note">' + esc(o.note) + '</small>' : '') +
        '<button type="button" class="cpk-ok" data-cpk-ok></button>';
      syncFoot();
    }
    function syncFoot() {
      var c = st.sel && D.capsule(st.sel);
      foot.querySelector('.cpk-sel').innerHTML = c ? '<span>Выбрано:</span><b>' + esc(name(c)) + ' · ' + levelName(st.level) + '</b>' : '<span>Капсула не выбрана</span>';
      [].forEach.call(foot.querySelectorAll('[data-cpk-level]'), function (b) { var on = b.getAttribute('data-cpk-level') === st.level; b.setAttribute('aria-pressed', String(on)); b.classList.toggle('is-on', on); });
      foot.querySelector('[data-cpk-info]').hidden = st.view === 'info';
      var okb = foot.querySelector('[data-cpk-ok]'); okb.disabled = !st.sel; okb.textContent = okText();
    }
    function focusEl(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
    function reveal(el) { if (el && (el.offsetTop < body.scrollTop || el.offsetTop + el.offsetHeight > body.scrollTop + body.clientHeight)) body.scrollTop = Math.max(0, el.offsetTop - 12); }
    function setView(v) {
      if (v === st.view) return;
      if (v === 'info') st.top = body.scrollTop;
      st.view = v; paintHead(); paintBody(); syncFoot();
      if (v === 'info') { body.scrollTop = 0; focusEl(head.querySelector('[data-cpk-list]')); }
      else { body.scrollTop = st.top; focusEl(foot.querySelector('[data-cpk-info]')); }
    }
    function select(id) {
      if (!capOf(id)) return; st.sel = id;
      [].forEach.call(body.querySelectorAll('[data-cpk-cap]'), function (b) { var on = b.getAttribute('data-cpk-cap') === id; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
      syncFoot();
    }
    function setLevel(l) {
      st.level = normLevel(l);
      if (st.view === 'info') { if (S.classifier && S.classifier.sections) { var y = body.scrollTop; body.innerHTML = clsHtml(st.level); body.scrollTop = y; } }
      else [].forEach.call(body.querySelectorAll('[data-cpk-cap]'), function (b) { var c = D.capsule(b.getAttribute('data-cpk-cap')), el = b.querySelector('.cpk-card__price'); if (c && el) el.outerHTML = price(c, st.level); });
      syncFoot();
    }
    /* закрытое окно гаснет 180 мс и ловит нажатия (.is-closing), дальше до SHIELD_MS — щит: второй тап двойного нажатия не уходит на страницу */
    function close(silent) {
      if (st.closed) return; st.closed = true;
      back.classList.remove('is-open'); back.classList.add('is-closing'); document.removeEventListener('keydown', onKey, true);
      var tt = box.querySelector('#cpk-t'); if (tt) tt.removeAttribute('id');        /* новое окно сразу получит свой заголовок */
      if (silent) { if (back.parentNode) back.parentNode.removeChild(back); }
      else { shield(back); setTimeout(function () { if (back.parentNode) back.parentNode.removeChild(back); }, 180); }
      document.body.style.overflow = prevOverflow;
      if (active === api) active = null;
      if (prevFocus && prevFocus.focus && document.body.contains(prevFocus)) try { prevFocus.focus({ preventScroll: true }); } catch (e) {}
      if (!silent && typeof o.onClose === 'function') o.onClose(st.res);
    }
    function ok() {
      if (!st.sel) return;
      var res;
      if (isSame()) res = { capsuleId: st.sel, level: st.level, flatId: now.flatId, interiorId: now.interiorId, changed: false, entry: entry };
      else if (o.apply === false) res = { capsuleId: st.sel, level: st.level, flatId: now.flatId, interiorId: null, changed: true, entry: entry };
      else res = apply({ capsuleId: st.sel, level: st.level }, { entry: entry });
      st.res = res; close();
      if (res && res.changed && o.apply !== false && o.toast !== false) S.ui.toast(toastText(res, now), 'ok');
      if (typeof o.onPick === 'function') o.onPick(res);
    }
    function focusables() {
      return [].filter.call(box.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'), function (el) { return !el.hidden && el.getClientRects().length > 0; });
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.stopPropagation(); e.preventDefault(); if (st.view === 'info') setView('list'); else close(); return; }
      if (e.key !== 'Tab') return;
      var fs = focusables(); if (!fs.length) return;
      var i = fs.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); focusEl(fs[fs.length - 1]); }
      else if (!e.shiftKey && (i < 0 || i === fs.length - 1)) { e.preventDefault(); focusEl(fs[0]); }
    }

    back.addEventListener('click', function (e) {
      if (st.closed) { e.preventDefault(); e.stopPropagation(); return; }           /* окно гаснет: второй тап — ни выбора, ни перехода */
      if (e.target === back || e.target.closest('[data-cpk-close]')) return close();
      var t;
      if ((t = e.target.closest('[data-cpk-cap]'))) { if (!t.disabled) select(t.getAttribute('data-cpk-cap')); return; }
      if ((t = e.target.closest('[data-cpk-style]'))) {
        st.style = t.getAttribute('data-cpk-style') || '';
        /* выбранная капсула не подходит под стиль — выбор снимаем: иначе внизу «Выбрано: …», а карточки в списке нет (сверка 02.11) */
        if (st.sel && st.style) { var sc = D.capsule(st.sel); if (sc && sc.style !== st.style) { st.sel = null; paintFoot(); } }
        [].forEach.call(head.querySelectorAll('[data-cpk-style]'), function (b) { var on = (b.getAttribute('data-cpk-style') || '') === st.style; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', String(on)); });
        paintBody(); body.scrollTop = 0; return;
      }
      if ((t = e.target.closest('[data-cpk-level]'))) return setLevel(t.getAttribute('data-cpk-level'));
      if (e.target.closest('[data-cpk-info]')) return setView('info');
      if (e.target.closest('[data-cpk-list]')) return setView('list');
      if (e.target.closest('[data-cpk-own]')) { close(); if (own) o.onOwn(); return; }
      if (e.target.closest('[data-cpk-ok]')) return ok();
    });
    back.addEventListener('mousedown', function (e) { if (st.closed) e.preventDefault(); });   /* фокус остаётся там, куда его вернули */

    paintHead(); paintBody(); paintFoot();
    document.body.appendChild(back); document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(function () { back.classList.add('is-open'); });
    /* с клавиатуры — на выбранную карточку (рамка фокуса нужна), касанием или из кода (Интерьер по ?capsule=) — на заголовок:
       иначе поверх обводки выбора видна вторая рамка */
    var first = body.querySelector('.cpk-card.is-on') || body.querySelector('.cpk-card:not([disabled]), .cpk-own');
    focusEl((kbd && first) || head.querySelector('.cpk__t')); reveal(first);
    track('cpk_open', { entry: entry });
    var api = { close: function (silent) { close(silent === true); }, el: back };
    active = api;
    return api;
  }

  /* ---------- декларативный вход: <a data-cpk-open="budget"> — окно вместо перехода (Ctrl/Cmd-клик — обычная ссылка) ---------- */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target.closest && e.target.closest('[data-cpk-open]'); if (!t || t.closest('.cpk-back')) return;
    e.preventDefault();
    open({ entry: t.getAttribute('data-cpk-open') || entryOf(), current: t.getAttribute('data-cpk-current') || undefined });
  });

  S.capsulePicker = { open: open, apply: apply, current: current, card: card, name: name, list: list, levelName: levelName,
    close: function () { if (active) active.close(); }, isOpen: function () { return !!active; } };
})();
