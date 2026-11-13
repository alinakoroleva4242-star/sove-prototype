/* Вкладка «Материалы» — список карточек (ТЗ «Карточка материала», шаг 5):
   «Не размещены · N» жёлтой полосой → карточки по категориям сметы → «＋ Материал» (прилипает снизу) → режим «Выбрать» и «Поставить в зоны».
   Плитки зон и поле «Квартира» рисует designer-admin.js / designer-dna.js; здесь — только список. */
(function () {
  var DC = window.SOVE_DC; if (!DC || !DC.materials) return;
  var st = DC.st, esc = DC.esc, ui = DC.ui, F = DC.F, price = DC.price;
  var LIVING = ['Гостиная', 'Кухня-гостиная', 'Спальня', 'Детская', 'Кабинет'], WET = ['Санузел', 'Кухня', 'Постирочная'];

  /* товар карточки для выбранных уровня и типа квартиры; null — в этом типе квартиры материала нет */
  function shown(m, level) {
    if (!m.zones.length) return { p: level === 'премиум' ? (m.premium === 'same' || !m.premium ? m.base : m.premium) : m.base, rooms: [] };
    var rows = DC.expand(m, st.flat || null, level).filter(function (r) { return r.role === 'main'; }); if (!rows.length) return null;
    var main = rows.filter(function (r) { return !r.variant; })[0] || rows[0], rooms = [];
    rows.forEach(function (r) { if (!r.variant && rooms.indexOf(r.room) < 0) rooms.push(r.room); });
    return { p: main.product, rooms: rooms };
  }
  function priceHtml(p) { return !p ? '' : price(p) ? '<em>' + F.rub(price(p)) + '</em>' + (p.price_metod > 0 && p.price_retail > p.price_metod ? '<s>' + F.rub(p.price_retail) + '</s>' : '') : '<span class="is-none">нет цены</span>'; }
  function row(m, level, sel) {
    var s = shown(m, level); if (!s) return '';
    var p = s.p, lv = level === 'премиум' ? 'premium' : 'base', nAlt = (m.alts[lv] || []).length, on = !!(st.matSel && st.matSel[m.id]);
    var chips = s.rooms.length ? s.rooms.slice(0, 4).map(function (r) { return '<i>' + esc(r) + '</i>'; }).join('') + (s.rooms.length > 4 ? '<i>+' + (s.rooms.length - 4) + '</i>' : '') : '<i class="is-none">зоны не выбраны</i>';
    var meta = []; if (nAlt) meta.push('⇄ ' + nAlt); if (m.by_flat || m.by_index) meta.push('◐ зависит от квартиры'); if (!m.premium) meta.push('нет Премиума');
    return '<button type="button" class="da-row dr-row dr-srow mt-card' + (on ? ' is-sel' : '') + '" data-act="' + (sel ? 'mat-chk' : 'mat') + '" data-id="' + esc(m.id) + '"' + (sel ? ' aria-pressed="' + on + '"' : '') + '>' +
      (sel ? '<span class="mt-chk" aria-hidden="true">' + (on ? '✓' : '') + '</span>' : '') +
      '<span class="da-row__pic">' + (p && p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy">' : DC.ic('photo')) + '</span>' +
      '<span class="da-row__b"><b>' + esc(m.title || 'без названия') + '</b><span class="da-row__p' + (p && p.name ? '' : ' is-empty') + '">' + (p ? esc((p.brand ? p.brand + ' · ' : '') + (p.name || 'без названия')) : 'Товар не выбран') + '</span>' +
      '<span class="mt-zones">' + chips + '</span>' + (meta.length ? '<span class="dr-qty">' + meta.join(' · ') + '</span>' : '') + '</span>' +
      '<span class="da-row__r">' + priceHtml(p) + '</span></button>';
  }

  /* ── что осталось сделать по материалу: всё, что мешает публикации, плюс минимум 3 замены ── */
  var ALT_MIN = 3;
  function todo(m) {
    var r = [];
    if (!m.zones.length) r.push('нет зоны');
    if (!m.position) r.push('нет позиции');
    if (!m.base) r.push('нет товара');
    else { if (!price(m.base)) r.push('нет цены'); if (!m.base.img) r.push('нет фото'); }
    if (!m.premium) r.push('нет Премиума');
    var holes = 0; if (m.by_flat) DC.FLATS.forEach(function (f) { var v = m.by_flat[f[0]]; if (v && typeof v === 'object' && !v.base && !v.premium) holes++; });
    if (holes) r.push('товар по квартирам');
    var nb = (m.alts.base || []).length, np = (m.alts.premium || []).length;
    if (m.base && nb < ALT_MIN) r.push('замен ' + nb + ' из ' + ALT_MIN);
    if (m.premium && m.premium !== 'same' && np < ALT_MIN) r.push('замен Премиума ' + np + ' из ' + ALT_MIN);
    return r;
  }
  DC.matReady = function (code) { var ms = DC.matBuilt && !DC.matBuilt(code) ? null : DC.materials(code); if (!ms) return null; return { total: ms.length, done: ms.filter(function (m) { return !todo(m).length; }).length }; };
  function premOf(m) { return m.premium === 'same' || !m.premium ? m.base : m.premium; }
  function pic(p, tag) { return '<span class="ml-pic"' + (p && p.img ? ' style="background-image:' + esc(DC.cssUrl ? DC.cssUrl(p.img) : 'url(' + JSON.stringify(p.img) + ')') + '"' : '') + '><i>' + tag + '</i></span>'; }
  function zoneCands(code, m) {
    var P = m.position && DC.POS[m.position], real = DC.realRooms(code), rs = real.filter(function (r) { return !P || !P.rooms || !P.rooms.length || P.rooms.indexOf(r) >= 0; });
    rs = rs.concat(['Общее']); m.zones.forEach(function (z) { if (rs.indexOf(z.room) < 0) rs.push(z.room); }); return rs;
  }
  /* строка: База и Премиум рядом; по нажатию раскрывается правка — зоны, товар, Премиум, ИИ — без карточки */
  function row2(code, m, sel, can) {
    var td = todo(m), open = can && !sel && st.matOpen === m.id, on = !!(st.matSel && st.matSel[m.id]), same = m.premium === 'same', pp = m.premium && !same ? m.premium : null;
    var chips = m.zones.length ? m.zones.slice(0, 4).map(function (z) { return '<i>' + esc(z.room) + '</i>'; }).join('') + (m.zones.length > 4 ? '<i>+' + (m.zones.length - 4) + '</i>' : '') : '';
    var prices = '<span class="ml-pr">' + (m.base && price(m.base) ? '<b>' + F.rub(price(m.base)) + '</b>' : '') + (pp && price(pp) ? '<b class="is-p">' + F.rub(price(pp)) + '</b>' : same ? '<span>Премиум такой же</span>' : '') + '</span>';
    var head = '<button type="button" class="ml-h" data-act="' + (sel ? 'mat-chk' : can ? 'ml-open' : 'mat') + '" data-id="' + esc(m.id) + '" aria-expanded="' + open + '">' +
      (sel ? '<span class="mt-chk" aria-hidden="true">' + (on ? '✓' : '') + '</span>' : '') +
      '<span class="ml-pics">' + pic(m.base, 'Б') + (same ? '' : pic(pp, 'П')) + '</span>' +
      '<span class="ml-b"><b>' + esc(m.title || 'без названия') + (m.ai ? ' <em class="ml-ai">✦ ИИ — проверьте</em>' : '') + '</b><span class="ml-n">' + (m.base ? esc((m.base.brand ? m.base.brand + ' · ' : '') + (m.base.name || '')) : 'Товар не выбран') + '</span>' +
      (chips ? '<span class="mt-zones">' + chips + '</span>' : '') + (td.length ? '<span class="ml-td">' + td.map(function (t) { return '<i>' + esc(t) + '</i>'; }).join('') + '</span>' : '') + '</span>' + prices + '</button>';
    var panel = !open ? '' : '<div class="ml-ed"><div class="ml-ed__l">Где стоит</div><div class="ml-zs">' + zoneCands(code, m).map(function (r) { var z = m.zones.some(function (q) { return q.room === r; }); return '<button type="button" class="ml-z' + (z ? ' is-on' : '') + '" data-act="ml-zone" data-id="' + esc(m.id) + '" data-room="' + esc(r) + '" aria-pressed="' + z + '">' + esc(r) + '</button>'; }).join('') + '</div>' +
      '<div class="dr-btns"><button type="button" class="dr-sbtn" data-act="ml-prod" data-lv="base" data-id="' + esc(m.id) + '">' + (m.base ? 'Заменить Базу' : 'Выбрать товар') + '</button>' +
      '<button type="button" class="dr-sbtn" data-act="ml-prod" data-lv="premium" data-id="' + esc(m.id) + '">' + (pp ? 'Заменить Премиум' : 'Выбрать Премиум') + '</button>' +
      (m.base && !same ? '<button type="button" class="dr-sbtn" data-act="ml-same" data-id="' + esc(m.id) + '">Премиум такой же</button>' : '') +
      (td.length ? '<button type="button" class="dr-sbtn mc-ai" data-act="ml-ai" data-id="' + esc(m.id) + '"' + (st.aiOne === m.id ? ' disabled' : '') + '>' + (st.aiOne === m.id ? 'Подбираю…' : '✦ Заполнить с ИИ') + '</button>' : '') +
      (m.ai ? '<button type="button" class="dr-sbtn" data-act="ml-ok" data-id="' + esc(m.id) + '">Проверено</button>' : '') +
      '<button type="button" class="dr-sbtn" data-act="mat" data-id="' + esc(m.id) + '">Карточка ›</button></div></div>';
    return '<div class="ml-row' + (open ? ' is-open' : '') + (on ? ' is-sel' : '') + (td.length ? ' is-todo' : '') + '">' + head + panel + '</div>';
  }

  /* ── «По квартирам» (упрощено, Алина 13.11): только материалы, где товар зависит от размера квартиры.
     Строка читается словами: «Студия, Евро-2 — этот товар», «Евро-3 – Евро-5 — другой». Количество считается само и здесь не показывается. ── */
  function flatGroups(m, lv) {
    var gs = []; DC.FLATS.forEach(function (f) {
      var v = m.by_flat ? m.by_flat[f[0]] : null, p = v && typeof v === 'object' ? (v[lv] || v.base) : null;
      var kind = v === 'none' ? 'none' : p ? 'other' : 'main', key = kind === 'other' ? 'o:' + (p.id || p.name) : kind, g = gs.filter(function (x) { return x.key === key; })[0];
      if (!g) { g = { key: key, kind: kind, p: p, flats: [] }; gs.push(g); } g.flats.push(f);
    });
    return gs;
  }
  function flatNames(fs) { return fs.length === DC.FLATS.length ? 'Все квартиры' : fs.map(function (f) { return f[1]; }).join(', '); }
  function flatsView(code, level, can) {
    var ms = (DC.materials(code) || []).filter(function (m) { return m.zones.length && DC.matRule && DC.matRule(m) === 'size'; });
    if (!ms.length) return '<div class="da-issues"><div class="da-ok">В этом интерьере нет материалов, которые зависят от размера квартиры.</div></div>';
    var lv = level === 'премиум' ? 'premium' : 'base';
    return '<div class="fl-intro"><b>Какой товар в какой квартире</b><span>Мебель и техника, которые зависят от размера квартиры. Количество считается само.</span></div><div class="fl-list">' + ms.map(function (m) {
      var main = lv === 'premium' ? premOf(m) : m.base, gs = flatGroups(m, lv), one = gs.length === 1;
      /* шкала из пяти типов: у каждой группы свой цвет, тот же цвет — у её строки ниже */
      var scale = one ? '' : '<div class="fl-scale">' + DC.FLATS.map(function (f) { var gi = 0; gs.forEach(function (g, i) { if (g.flats.indexOf(f) >= 0) gi = i; }); return '<span class="fl-c' + (gi % 5) + (gs[gi].kind === 'none' ? ' is-none' : '') + '">' + f[1] + '</span>'; }).join('') + '</div>';
      return '<section class="fl-m"><div class="fl-m__h"><b class="fl-m__t">' + esc(m.title || '') + '</b><span>' + (one ? 'один товар' : DC.plural(gs.filter(function (g) { return g.kind !== 'none'; }).length, 'товар', 'товара', 'товаров')) + '</span></div>' + scale + gs.map(function (g, gi) {
        var p = g.kind === 'main' ? main : g.p, ks = g.flats.map(function (f) { return f[0]; }).join(',');
        return '<div class="fl-g fl-c' + (one ? 'x' : gi % 5) + (g.kind === 'none' ? ' is-none' : '') + '">' + (g.kind === 'none' ? '<span class="ml-pic"></span>' : pic(p, '')) +
          '<span class="fl-g__b"><span class="fl-g__f">' + (one ? '<i>Все квартиры</i>' : g.flats.map(function (f) { return '<i>' + f[1] + '</i>'; }).join('')) + '</span><span class="fl-g__n">' + (g.kind === 'none' ? 'Не ставим' : esc(p ? (p.name || '') : 'Товар не выбран')) + '</span>' +
          (g.kind !== 'none' && p && price(p) ? '<b>' + F.rub(price(p)) + '</b>' : '') + '</span>' +
          (can && g.kind !== 'main' ? '<button type="button" class="dr-sbtn" data-act="fl-edit" data-id="' + esc(m.id) + '" data-ks="' + ks + '">Изменить</button>' : '') + '</div>';
      }).join('') + (can ? '<button type="button" class="fl-add" data-act="fl-add" data-id="' + esc(m.id) + '">＋ Другой товар для части квартир</button>' : '') + '</section>';
    }).join('') + '</div>';
  }
  function setFlats(code, id, keys, v) {
    var cur = DC.matById(code, id), bf = JSON.parse(JSON.stringify(cur.by_flat || {})); DC.FLATS.forEach(function (f) { if (!bf[f[0]]) bf[f[0]] = 'same'; });
    keys.forEach(function (k) { bf[k] = typeof v === 'function' ? v(bf[k]) : v; }); DC.matPatch(code, id, { by_flat: bf }); DC.paint();
  }
  function pickFor(code, id, keys) {
    var m = DC.matById(code, id), lv = st.level === 'премиум' ? 'premium' : 'base', names = DC.FLATS.filter(function (f) { return keys.indexOf(f[0]) >= 0; }).map(function (f) { return f[1]; }).join(', ');
    DC.openSearch((m.title || 'Материал') + ' · ' + names, 'Товар для этих квартир, ' + st.level, m.title || '', function (p) {
      setFlats(code, id, keys, function (old) { var o = old && typeof old === 'object' ? JSON.parse(JSON.stringify(old)) : { base: null, premium: null }; o[lv] = p; return o; }); ui.toast('Сохранено: ' + names);
    });
  }
  /* «＋ Другой товар для части квартир»: отметить квартиры → каталог */
  DC.acts['fl-add'] = function (b) {
    var code = st.cap, id = b.getAttribute('data-id'), m = DC.matById(code, id), on = {}; if (!m) return;
    var sh = DC.sheet({ title: m.title || 'Материал', html: '<p class="small muted">В каких квартирах нужен другой товар?</p><div class="ml-zs" id="fl-pick"></div>', actions: [
      { label: 'Выбрать товар', kind: 'primary', close: false, onClick: function (ev, api) { var ks = Object.keys(on); if (!ks.length) { ui.toast('Отметьте хотя бы одну квартиру', 'error'); return; } api.close(); pickFor(code, id, ks); } },
      { label: 'Не ставим в этих квартирах', close: false, onClick: function (ev, api) { var ks = Object.keys(on); if (!ks.length) { ui.toast('Отметьте хотя бы одну квартиру', 'error'); return; } api.close(); setFlats(code, id, ks, 'none'); } },
      { label: 'Отмена', kind: 'link' }] });
    var box = sh.el.querySelector('#fl-pick');
    function draw() { box.innerHTML = DC.FLATS.map(function (f) { return '<button type="button" class="ml-z' + (on[f[0]] ? ' is-on' : '') + '" data-k="' + f[0] + '" aria-pressed="' + !!on[f[0]] + '">' + f[1] + '</button>'; }).join(''); }
    box.addEventListener('click', function (e) { var x = e.target.closest('[data-k]'); if (!x) return; var k = x.getAttribute('data-k'); if (on[k]) delete on[k]; else on[k] = 1; draw(); });
    draw();
  };
  DC.acts['fl-edit'] = function (b) {
    var code = st.cap, id = b.getAttribute('data-id'), ks = b.getAttribute('data-ks').split(','), m = DC.matById(code, id); if (!m) return;
    DC.sheet({ title: (m.title || 'Материал') + ' · ' + DC.FLATS.filter(function (f) { return ks.indexOf(f[0]) >= 0; }).map(function (f) { return f[1]; }).join(', '), html: '', actions: [
      { label: 'Выбрать другой товар', kind: 'primary', onClick: function () { pickFor(code, id, ks); } },
      { label: 'Вернуть основной товар', onClick: function () { setFlats(code, id, ks, 'same'); } },
      { label: 'Не ставим в этих квартирах', onClick: function () { setFlats(code, id, ks, 'none'); } },
      { label: 'Отмена', kind: 'link' }] });
  };

  /* ── каркас интерьера: собран по 9 опубликованным интерьерам (пересчёт 13.11, 42–78 материалов в каждом).
     CORE — позиции, которые есть в 7–9 интерьерах из 9; OPT — в 3–6. Комнаты — где позиция стоит в этих интерьерах.
     Каркас — подсказка, не ограничение: «＋ Материал» из каталога добавляет что угодно сверх него. ── */
  var LIVR = ['Кухня-гостиная', 'Гостиная', 'Кухня', 'Спальня', 'Прихожая', 'Гардеробная'], KIT = ['Кухня', 'Кухня-гостиная'], LR = ['Гостиная', 'Кухня-гостиная'], WC = ['Санузел'], ALLZ = LIVR.concat(WC), COM = ['Общее'];
  var CORE = [['Стены', LIVR], ['Пол', LIVR], ['Пол плитка', ['Санузел', 'Прихожая']], ['Плинтус', LIVR], ['Затирка', ['Санузел']], ['Техническая покраска', COM], ['Зеркало под ключ', WC],
    ['Бра', ['Спальня', 'Прихожая']], ['Люстра', ['Гостиная', 'Кухня-гостиная', 'Спальня']], ['Встроенный свет', LIVR], ['Влагозащищённый свет', WC], ['Торшер', LR],
    ['Рамки', ALLZ], ['Переключатели', ALLZ], ['Слаботочные розетки', ['Гостиная', 'Кухня-гостиная', 'Кухня', 'Спальня']],
    ['Душевая система', WC], ['Смеситель раковины', WC], ['Инсталляция', WC], ['Унитаз', WC], ['Кнопка смыва', WC], ['Раковина', WC], ['Душевое ограждение', WC], ['Кухонная мойка', KIT], ['Смеситель кухни', KIT],
    ['Холодильник', KIT], ['Посудомойка', KIT], ['Духовой шкаф', KIT], ['Варочная панель', KIT], ['Вытяжка', KIT], ['СВЧ', KIT], ['Стиральная машина', WC],
    ['Диван', LR], ['Кровать', ['Спальня']], ['Обеденный стол', KIT], ['Стулья', KIT], ['Журнальный стол', LR], ['Прикроватная тумба', ['Спальня']],
    ['Шкаф', ['Прихожая', 'Спальня']], ['Тумба санузла', WC], ['Кухня', KIT], ['ТВ-зона / рабочее место', LR],
    ['Межкомнатная дверь', COM], ['Дверная фурнитура', COM], ['Ковёр', ['Гостиная', 'Кухня-гостиная', 'Спальня']]];
  var OPT = [['Акцентная стена', ['Гостиная', 'Спальня']], ['Столешница', ['Кухня', 'Кухня-гостиная', 'Санузел']], ['Электрокарниз', ['Гостиная', 'Кухня-гостиная', 'Спальня']], ['Фартук', KIT], ['Потолочный карниз', LIVR], ['Стены санузла', WC], ['Радиатор', ['Спальня', 'Кухня-гостиная', 'Гостиная']],
    ['Настольная лампа', ['Спальня']], ['Подвесной свет', KIT], ['Свет над островом', KIT], ['Розетки', ALLZ], ['Выключатели', ALLZ], ['Терморегулятор', WC],
    ['Гигиенический душ', WC], ['Трап', WC], ['Полотенцесушитель', WC], ['Ванна', WC], ['Телевизор', LR],
    ['Пуф', ['Прихожая']], ['Кресло', LR], ['Барные стулья', KIT], ['Консоль', ['Прихожая']], ['Стеллаж', LR], ['ТВ-тумба', LR], ['Крючки', ['Прихожая']],
    ['Двустворчатая дверь', COM], ['Шторы', ['Гостиная', 'Кухня-гостиная', 'Спальня']], ['Картина', ['Гостиная', 'Спальня']], ['Декор', ['Гостиная', 'Спальня']]];
  var posByName = null;
  function posCode(name) { if (!posByName) { posByName = {}; Object.keys(DC.POS).forEach(function (k) { posByName[DC.POS[k].name] = k; }); } return posByName[name] || ''; }
  function frameList(code) { /* что из каркаса уже есть в интерьере */
    var have = {}; (DC.materials(code) || []).forEach(function (m) { if (m.position) have[m.position] = 1; });
    function map(list, core) { return list.map(function (x) { var c = posCode(x[0]); return c ? { code: c, name: x[0], rooms: x[1], core: core, has: !!have[c] } : null; }).filter(Boolean); }
    return map(CORE, true).concat(map(OPT, false));
  }
  function frameAdd(code, items) {
    var real = DC.realRooms(code), ov = DC.matOverlay(code), n = 0;
    items.forEach(function (x, i) {
      var zones = x.rooms[0] === 'Общее' ? ['Общее'] : real.filter(function (r) { return x.rooms.indexOf(r) >= 0; });
      var id = DC.matAdd(code, null, { position: x.code, zones: zones.length ? zones : ['__none'], origin: 'frame' }), m = ov.added.filter(function (y) { return y.id === id; })[0];
      if (m) { m.id = id + '-' + i; if (!zones.length) m.zones = []; } n++;
    });
    DC.saveStore(); return n;
  }
  DC.acts['fr-fill'] = function () {
    var code = st.cap, list = frameList(code).filter(function (x) { return x.core && !x.has; }); if (!list.length) return;
    var n = frameAdd(code, list); DC.paint(); ui.toast('Каркас добавлен: ' + DC.plural(n, 'позиция', 'позиции', 'позиций') + '. Выберите товары или нажмите «✦ Заполнить всё с ИИ»');
  };
  /* «＋ Из каркаса»: чего из каркаса ещё нет — отметить и добавить пустыми строками */
  DC.acts['fr-more'] = function () {
    var code = st.cap, list = frameList(code).filter(function (x) { return !x.has; }), on = {};
    if (!list.length) { ui.toast('Все позиции каркаса уже есть в интерьере'); return; }
    var sh = DC.sheet({ title: 'Добавить из каркаса', html: '<p class="small muted">Позиции, которые встречаются в готовых интерьерах, а здесь их пока нет.</p><div id="fr-pick"></div>', actions: [
      { label: 'Добавить', kind: 'primary', close: false, onClick: function (ev, api) { var pick = list.filter(function (x) { return on[x.code]; }); if (!pick.length) { ui.toast('Отметьте хотя бы одну позицию', 'error'); return; } api.close(); var n = frameAdd(code, pick); DC.paint(); ui.toast('Добавлено: ' + n); } },
      { label: 'Отмена', kind: 'link' }] });
    var box = sh.el.querySelector('#fr-pick');
    function grp(title, core) { var l = list.filter(function (x) { return x.core === core; }); return l.length ? '<div class="ml-ed__l">' + title + ' · ' + l.length + '</div><div class="ml-zs">' + l.map(function (x) { return '<button type="button" class="ml-z' + (on[x.code] ? ' is-on' : '') + '" data-k="' + x.code + '" aria-pressed="' + !!on[x.code] + '">' + esc(x.name) + '</button>'; }).join('') + '</div>' : ''; }
    function draw() { box.innerHTML = grp('Есть почти в каждом интерьере', true) + grp('Бывает', false); }
    box.addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; var k = b.getAttribute('data-k'); if (on[k]) delete on[k]; else on[k] = 1; draw(); });
    draw();
  };

  DC.matListView = function (code, level) {
    var ms = DC.materials(code); if (!ms) return '<div class="da-ok">Загружаю материалы…</div>';
    var can = DC.canEdit(code), sel = can && !!st.matSelMode, view = st.matView || 'list';
    var left = ms.filter(function (m) { return todo(m).length; }), done = ms.filter(function (m) { return !todo(m).length; }), pct = ms.length ? Math.round(done.length / ms.length * 100) : 0, ai = st.aiAll;
    var bar = '<section class="ml-prog"><div class="ml-prog__h"><b>Заполнено ' + done.length + ' из ' + ms.length + '</b><span>' + (left.length ? 'осталось ' + left.length : 'всё готово') + '</span></div><div class="ml-prog__bar"><i style="width:' + pct + '%"></i></div>' +
      (can && left.length ? '<button type="button" class="btn btn--primary btn--small mc-ai" data-act="ml-ai-all"' + (ai ? ' disabled' : '') + '>' + (ai ? 'ИИ заполняет… ' + ai.n + ' из ' + ai.total : '✦ Заполнить всё с ИИ') + '</button>' : '') +
      (!can && left.length && DC.setStatus ? '<button type="button" class="dr-sbtn" data-act="ml-unlock">Внести изменения</button>' : '') + '</section>';
    var tabs = '<div class="mt-tools"><div class="da-seg"><button type="button" class="' + (view === 'list' ? 'is-on' : '') + '" data-act="ml-view" data-v="list">Список</button><button type="button" class="' + (view === 'flats' ? 'is-on' : '') + '" data-act="ml-view" data-v="flats">По типу квартир</button></div>' +
      (can && view === 'list' ? '<button type="button" class="dr-sbtn" data-act="fr-more">＋ Из каркаса</button><button type="button" class="dr-sbtn" data-act="mat-sel">' + (sel ? 'Готово' : 'Выбрать') + '</button>' : '') + '</div>';
    if (view === 'flats') return '<div class="dr-main mt-main">' + bar + tabs + flatsView(code, level, can) + '</div>';
    var cats = [], by = {}, byL = {};
    DC.KB.list.forEach(function (p) { if (cats.indexOf(p.cat) < 0) cats.push(p.cat); });
    left.forEach(function (m) { var c = m.category || 'Без позиции в справочнике'; if (cats.indexOf(c) < 0) cats.push(c); (byL[c] = byL[c] || []).push(m); });
    var leftHtml = left.length ? '<section class="da-group"><div class="da-group__h"><b>Осталось сделать</b><span>' + left.length + '</span></div>' + cats.map(function (c) { return byL[c] ? '<div class="ml-cat">' + esc(c) + ' · ' + byL[c].length + '</div><div class="ml-rows">' + byL[c].map(function (m) { return row2(code, m, sel, can); }).join('') + '</div>' : ''; }).join('') + '</section>' : '';
    var dOpen = st.matDoneOpen != null ? st.matDoneOpen : !left.length;
    var fr = can ? frameList(code) : [], frCore = fr.filter(function (x) { return x.core; }), frMiss = frCore.filter(function (x) { return !x.has; }).length;
    var frameCard = can && frMiss && ms.length < 10 ? '<section class="ml-frame"><b>Каркас интерьера</b><span>' + DC.plural(frCore.length, 'позиция', 'позиции', 'позиций') + ', которые есть почти в каждом готовом интерьере: отделка, свет, сантехника, техника, мебель, двери. Останется выбрать товары. Свои материалы из каталога можно добавлять сверх каркаса.</span><button type="button" class="btn btn--primary btn--small" data-act="fr-fill">Заполнить каркасом · ' + frMiss + '</button></section>' : '';
    done.forEach(function (m) { var c = m.category || 'Без позиции в справочнике'; if (cats.indexOf(c) < 0) cats.push(c); (by[c] = by[c] || []).push(m); });
    var doneHtml = done.length ? '<section class="da-group"><button type="button" class="ml-done" data-act="ml-done" aria-expanded="' + dOpen + '"><b>Заполнено · ' + done.length + '</b><span>' + (dOpen ? 'Свернуть' : 'Показать') + '</span></button>' +
      (dOpen ? cats.map(function (c) { return by[c] ? '<div class="ml-cat">' + esc(c) + '</div><div class="ml-rows">' + by[c].map(function (m) { return row2(code, m, sel, can); }).join('') + '</div>' : ''; }).join('') : '') + '</section>' : '';
    var nSel = st.matSel ? Object.keys(st.matSel).length : 0;
    var sticky = !can ? '' : sel ? '<div class="mt-sticky"><button type="button" class="btn btn--primary btn--block" data-act="mat-put"' + (nSel ? '' : ' disabled') + '>Поставить в зоны' + (nSel ? ' · ' + nSel : '') + '</button></div>'
      : '<div class="mt-sticky"><button type="button" class="btn btn--primary btn--block" data-act="mat-new">＋ Материал</button></div>';
    return '<div class="dr-main mt-main">' + bar + tabs + frameCard + (leftHtml + doneHtml || (frameCard ? '' : '<div class="da-issues"><div class="da-ok">В интерьере пока нет материалов. Нажмите «＋ Материал».</div></div>')) + sticky + '</div>';
  };

  DC.acts['ml-unlock'] = function () { DC.setStatus(st.cap, 'next', 'Создан черновик новой версии'); DC.paint(); };
  DC.acts['ml-view'] = function (b) { st.matView = b.getAttribute('data-v'); st.matSelMode = false; DC.paint(); };
  DC.acts['ml-done'] = function () { st.matDoneOpen = !(st.matDoneOpen != null ? st.matDoneOpen : false); DC.paint(); };
  DC.acts['ml-open'] = function (b) { var id = b.getAttribute('data-id'); st.matOpen = st.matOpen === id ? '' : id; DC.paint(); };
  DC.acts['ml-ok'] = function (b) { DC.matPatch(st.cap, b.getAttribute('data-id'), { ai: null }); DC.paint(); };
  DC.acts['ml-same'] = function (b) { DC.matPatch(st.cap, b.getAttribute('data-id'), { premium: 'same' }); DC.paint(); ui.toast('Премиум такой же, как База'); };
  DC.acts['ml-zone'] = function (b) {
    var code = st.cap, id = b.getAttribute('data-id'), r = b.getAttribute('data-room'), m = DC.matById(code, id); if (!m) return;
    if (m.zones.some(function (z) { return z.room === r; })) { DC.matPatch(code, id, { zones: m.zones.filter(function (z) { return z.room !== r; }) }); DC.paint(); return; }
    var busy = m.position && (DC.materials(code) || []).some(function (o) { return o.id !== id && o.position === m.position && o.zones.some(function (q) { return q.room === r; }); });
    if (busy) { ui.toast('В зоне «' + r + '» на этой позиции уже стоит другой материал — решите в карточке'); DC.openMaterial(code, id, { focus: 'zones' }); return; }
    DC.matPatch(code, id, { zones: m.zones.concat([{ room: r, share: 1 }]) }); DC.paint();
  };
  DC.acts['ml-prod'] = function (b) {
    var code = st.cap, id = b.getAttribute('data-id'), lv = b.getAttribute('data-lv'), m = DC.matById(code, id); if (!m) return;
    DC.openSearch((m.title || 'Материал') + ' · ' + (lv === 'base' ? 'База' : 'Премиум'), 'Товар из каталога', m.title || '', function (p) { var patch = {}; patch[lv] = p; DC.matPatch(code, id, patch); DC.paint(); ui.toast('Товар заменён'); });
  };

  /* ── ИИ-заполнение: зоны по справочнику, Премиум и замены — из каталога по названию позиции. Всё помечается «ИИ — проверьте» ── */
  function catalog(m) { return catFor(m); }
  /* ИИ-подбор замен из каталога: запрос по позиции и по типу основного товара, только та же позиция справочника, с фото и ценой */
  function kindOf(m) { return String((m.base && m.base.name) || '').split(/[\s,.(]+/).filter(function (w) { return w.length > 3 && !/\d/.test(w) && /^[а-яё]/i.test(w); })[0] || ''; }
  var catCache = {};
  function catFor(m) {
    var kind = kindOf(m), qs = [m.title].concat(kind && kind.toLowerCase() !== String(m.title || '').toLowerCase() ? [kind] : []).filter(Boolean), kw = kind.toLowerCase().slice(0, 5);
    return Promise.all(qs.map(function (q) { if (catCache[q]) return catCache[q]; var wait = new Promise(function (ok) { setTimeout(function () { ok([]); }, 20000); }); return (catCache[q] = Promise.race([DC.getJSON(DC.API + '/marketplace/search?q=' + encodeURIComponent(q) + '&page_size=30').then(function (d) { return d.items || []; }, function () { return []; }), wait])); })).then(function (lists) {
      var seen = {};
      return [].concat.apply([], lists).filter(function (x) { return x.img && (DC.num(x.price_metod) || DC.num(x.price_retail)); }).map(DC.catProduct).filter(function (x) { var k = x.id; if (seen[k]) return false; seen[k] = 1; var pc = DC.posOfProduct ? DC.posOfProduct(x) : ''; return pc ? pc === m.position : (kw && String(x.name || '').toLowerCase().indexOf(kw) >= 0); });
    });
  }
  DC.aiAlts = function (code, id) {
    var m = DC.matById(code, id); if (!m || !m.base || !m.position) return Promise.resolve(0);
    var prem = m.premium && m.premium !== 'same' ? m.premium : null, nb = (m.alts.base || []).length, np = (m.alts.premium || []).length;
    if (nb >= ALT_MIN && (!prem || np >= ALT_MIN)) return Promise.resolve(0);
    return catFor(m).then(function (pool) {
      var alts = { base: (m.alts.base || []).slice(), premium: (m.alts.premium || []).slice() }, used = [m.base, prem].concat(alts.base, alts.premium).filter(Boolean), added = 0;
      function free(p) { return !used.some(function (u) { return DC.sameProduct(u, p); }); }
      function take(lv, ref, list) { list.sort(function (x, y) { return Math.abs(price(x) - price(ref)) - Math.abs(price(y) - price(ref)); }); list.forEach(function (p) { if (alts[lv].length >= ALT_MIN || !free(p)) return; alts[lv].push(p); used.push(p); added++; }); }
      take('base', m.base, pool.slice());
      if (prem) { var up = pool.filter(function (p) { return price(p) >= price(m.base) * 1.1; }); take('premium', prem, up.length >= ALT_MIN ? up : pool.slice()); }
      if (added) DC.matPatch(code, id, { alts: alts, ai: 1 });
      return added;
    });
  };
  /* все материалы интерьера: по три запроса одновременно */
  DC.aiAltsAll = function (code, onStep) {
    var ids = (DC.materials(code) || []).filter(function (m) { return m.base && m.position; }).map(function (m) { return m.id; }), i = 0, st0 = { n: 0, total: ids.length, added: 0 };
    function next() { if (i >= ids.length) return Promise.resolve(); var id = ids[i++]; return DC.aiAlts(code, id).then(function (k) { st0.added += k; }, function () {}).then(function () { st0.n++; if (onStep) onStep(st0); return next(); }); }
    return Promise.all([next(), next(), next()]).then(function () { return st0; });
  };
  function aiFill(code, id) {
    var m = DC.matById(code, id); if (!m) return Promise.resolve(0);
    var patch = {}, n = 0, all = DC.materials(code) || [];
    if (!m.zones.length && m.position && DC.POS[m.position]) {
      var P = DC.POS[m.position], real = DC.realRooms(code), rs = P.rooms && P.rooms.length ? real.filter(function (r) { return P.rooms.indexOf(r) >= 0; }) : [];
      if (!rs.length && P.rooms && P.rooms.indexOf('Общее') >= 0) rs = ['Общее'];
      rs = rs.filter(function (r) { return !all.some(function (o) { return o.id !== id && o.position === m.position && o.zones.some(function (q) { return q.room === r; }); }); });
      if (rs.length) { patch.zones = rs.map(function (r) { return { room: r, share: 1 }; }); n++; }
    }
    var needP = m.base && !m.premium, nb = (m.alts.base || []).length, np = (m.alts.premium || []).length, needA = m.base && nb < ALT_MIN;
    if (!m.base && m.title) return catalog(m).then(function (items) {
      if (!items.length) { if (n) { patch.ai = 1; DC.matPatch(code, id, patch); } return n; }
      var srt = items.slice().sort(function (x, y) { return price(x) - price(y); }); patch.base = srt[Math.floor((srt.length - 1) / 3)]; /* ближе к недорогим — это База */ patch.ai = 1; DC.matPatch(code, id, patch);
      return aiFill(code, id).then(function (k) { return n + 1 + k; });
    });
    if (!m.base || !m.title || (!needP && !needA && !(m.premium && m.premium !== 'same' && np < ALT_MIN))) { if (n) { patch.ai = 1; DC.matPatch(code, id, patch); } return Promise.resolve(n); }
    return catalog(m).then(function (items) {
      var ref = price(m.base) || 0, prem = m.premium, alts = { base: (m.alts.base || []).slice(), premium: (m.alts.premium || []).slice() };
      var pool = items.filter(function (p) { return !DC.sameProduct(p, m.base); });
      if (needP) { var up = pool.filter(function (p) { return ref && price(p) > ref * 1.15; }).sort(function (x, y) { return price(x) - price(y); })[0]; prem = up || 'same'; patch.premium = prem; n++; }
      function fill(lv, main) {
        var c = pool.filter(function (p) { return !DC.sameProduct(p, main) && !alts[lv].some(function (x) { return DC.sameProduct(x, p); }); }).sort(function (x, y) { return Math.abs(price(x) - price(main)) - Math.abs(price(y) - price(main)); });
        var add = c.slice(0, Math.max(0, ALT_MIN - alts[lv].length)); if (add.length) { alts[lv] = alts[lv].concat(add); n++; }
      }
      fill('base', m.base); if (prem && prem !== 'same') fill('premium', prem);
      if (alts.base.length !== nb || alts.premium.length !== np) patch.alts = alts;
      if (n) { patch.ai = 1; DC.matPatch(code, id, patch); }
      return n;
    });
  }
  DC.acts['ml-ai'] = function (b) {
    var id = b.getAttribute('data-id'); st.aiOne = id; DC.paint();
    aiFill(st.cap, id).then(function (n) { st.aiOne = ''; DC.paint(); ui.toast(n ? 'ИИ заполнил — проверьте' : 'ИИ не нашёл, чем заполнить — заполните вручную', n ? undefined : 'error'); }, function (e) { st.aiOne = ''; DC.paint(); ui.toast('Каталог не ответил — попробуйте ещё раз', 'error'); });
  };
  DC.acts['ml-ai-all'] = function () {
    var code = st.cap, ids = (DC.materials(code) || []).filter(function (m) { return todo(m).length; }).map(function (m) { return m.id; }); if (!ids.length || st.aiAll) return;
    var A = st.aiAll = { n: 0, total: ids.length, ok: 0, err: 0 }, i = 0; DC.paint();
    function next() {
      if (i >= ids.length) return Promise.resolve(); var id = ids[i++];
      return aiFill(code, id).then(function (n) { if (n) A.ok++; }, function () { A.err++; }).then(function () { A.n++; if (st.cap === code && A.n % 3 === 0) DC.paint(); return next(); });
    }
    Promise.all([next(), next(), next()]).then(function () {
      st.aiAll = null; DC.paint(); var r = DC.matReady(code);
      ui.toast('ИИ заполнил материалов: ' + A.ok + (A.err ? '. Каталог не ответил: ' + A.err : '') + (r ? '. Осталось вручную: ' + (r.total - r.done) : ''));
    });
  };

  /* ── бюджет: «Проверьте количество» — количество введено вручную и расходится с расчётом, или расчёта для позиции нет ── */
  function qtyWarn(code) {
    var out = []; (DC.materials(code) || []).forEach(function (m) {
      if (!m.zones.length) return; var has = DC.calcHas && DC.calcHas(m.position);
      if (m.qty != null && has) { var f = DC.calcQty(m.position, m.zones, DC.calcCtx(code, 'база')); f = f ? f.q : 0; if (f && Math.abs(m.qty - f) / f > 0.3) out.push({ m: m, text: 'вручную ' + DC.ruNum(m.qty) + ', по расчёту ' + DC.ruNum(Math.round(f * 10) / 10) }); }
      else if (!has && m.qty == null && !m.zones.some(function (z) { return z.qty != null; })) out.push({ m: m, text: 'расчёта нет — считаем 1 на зону' });
    });
    return out;
  }
  var strip0 = DC.budgetStrip;
  DC.budgetStrip = function (code) {
    var h = strip0(code); if (!h) return h; var w = qtyWarn(code); if (!w.length) return h;
    var open = !!st.budQty, blk = '<div class="mt-bud__f"><button type="button" class="mt-bud__btn" data-act="bud-qty" aria-expanded="' + open + '">Проверьте количество · ' + w.length + '</button></div>' +
      (open ? '<div class="mt-bud__tb">' + w.map(function (x) { return '<button type="button" class="mt-bud__q" data-act="mat" data-id="' + esc(x.m.id) + '"><span>' + esc(x.m.title || '') + '</span><i>' + esc(x.text) + '</i></button>'; }).join('') + '</div>' : '');
    var k = h.lastIndexOf('</section>'); return k < 0 ? h + blk : h.slice(0, k) + blk + h.slice(k);
  };
  DC.acts['bud-qty'] = function () { st.budQty = !st.budQty; DC.paint(); };

  DC.acts['un-tog'] = function () { st.unOpen = !(st.unOpen != null ? st.unOpen : true); DC.paint(); };
  DC.acts['mat-sel'] = function () { st.matSelMode = !st.matSelMode; st.matSel = {}; DC.paint(); };
  DC.acts['mat-chk'] = function (b) { var id = b.getAttribute('data-id'); st.matSel = st.matSel || {}; if (st.matSel[id]) delete st.matSel[id]; else st.matSel[id] = 1; DC.paint(); };

  /* «＋ Материал»: каталог или ссылка → карточка с товаром в Базе, блок «Где стоит» первым */
  DC.matNew = function (opts) {
    var code = st.cap; opts = opts || {}; if (!DC.canEdit(code)) { ui.toast('Капсула закрыта для правок', 'error'); return; }
    var sub = opts.position && DC.POS[opts.position] ? DC.POS[opts.position].name + (opts.zones && opts.zones.length ? ' · ' + opts.zones.join(', ') : '') : 'Новый материал капсулы';
    function done(p) { var id = DC.matAdd(code, p, { position: opts.position, zones: opts.zones }), m = DC.matById(code, id); DC.paint(); if (m && !m.position) DC.askPos(code, id, function () { DC.openMaterial(code, id, { focus: 'zones' }); }); else DC.openMaterial(code, id, { focus: 'zones' }); }
    DC.openSearch('＋ Материал — каталог', sub, opts.position && DC.POS[opts.position] ? DC.POS[opts.position].name : '', done);
  };
  DC.acts['mat-new'] = function () { DC.matNew(); };
  /* «Что это?» — позицию не узнали ни по каталогу, ни по названию: дизайнер выбирает её сам, и материал встаёт в категорию бюджета */
  DC.askPos = function (code, id, then) {
    var m = DC.matById(code, id); if (!m) return; var cats = [], by = {};
    DC.KB.list.forEach(function (p) { if (p.hidden) return; if (!by[p.cat]) { by[p.cat] = []; cats.push(p.cat); } by[p.cat].push(p); });
    var guessCat = m.base && m.base.ccat && by[m.base.ccat] ? m.base.ccat : '';
    var sh = DC.sheet({ title: 'Позиция в интерьере', html: '<p class="small muted">' + esc((m.base && m.base.name) || m.title || '') + '</p><p class="ap-must">Без позиции материал не попадёт в бюджет и не пройдёт проверку. Выберите, что это.</p><div id="ap-box"></div>', actions: [{ label: 'Не добавлять этот товар', kind: 'link', onClick: function () { DC.matRemove(code, id); DC.paint(); } }] });
    var box = sh.el.querySelector('#ap-box');
    box.innerHTML = (guessCat ? [guessCat] : []).concat(cats.filter(function (c) { return c !== guessCat; })).map(function (c) { return '<details class="ap-cat"' + (c === guessCat ? ' open' : '') + '><summary>' + esc(c) + '</summary><div class="ml-zs">' + by[c].map(function (p) { return '<button type="button" class="ml-z" data-code="' + p.code + '">' + esc(p.name) + '</button>'; }).join('') + '</div></details>'; }).join('');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-code]'); if (!b) return; var P = DC.POS[b.getAttribute('data-code')];
      DC.matPatch(code, id, { position: b.getAttribute('data-code'), title: P.name, category: P.cat, rule: P.rule || '', unit: P.unit || '', work: P.work || '' });
      if (m.base) DC.catPos(m.base, b.getAttribute('data-code')); /* запомнить: этот товар каталога — эта позиция */
      sh.close(); DC.paint(); ui.toast('«' + P.name + '» — в категории «' + P.cat + '»'); if (then) then();
    });
  };
  /* «＋» у категории бюджета: позиция этой категории → каталог → материал сразу с позицией и зонами */
  function posZones(code, pos) {
    var P = DC.POS[pos], real = DC.realRooms(code), rs = P && P.rooms ? real.filter(function (r) { return P.rooms.indexOf(r) >= 0; }) : [];
    if (!rs.length && P && P.rooms && P.rooms.indexOf('Общее') >= 0) rs = ['Общее'];
    return rs;
  }
  DC.acts['bud-add'] = function (b) {
    var code = st.cap, cat = b.getAttribute('data-cat'); if (!DC.canEdit(code)) { ui.toast('Интерьер закрыт для правок — нажмите «Внести изменения»', 'error'); return; }
    var have = {}; (DC.materials(code) || []).forEach(function (m) { if (m.position && m.zones.length) have[m.position] = 1; });
    var list = DC.KB.list.filter(function (p) { return p.cat === cat && !p.hidden; });
    var sh = DC.sheet({ title: '＋ ' + cat, html: '<p class="small muted">Что добавить? Отмечено ✓ — уже есть в интерьере.</p><div class="ml-zs" id="ba-box">' + list.map(function (p) { return '<button type="button" class="ml-z' + (have[p.code] ? ' is-has' : '') + '" data-code="' + p.code + '">' + (have[p.code] ? '✓ ' : '') + esc(p.name) + '</button>'; }).join('') + '</div>', actions: [{ label: 'Отмена', kind: 'link' }] });
    sh.el.querySelector('#ba-box').addEventListener('click', function (e) {
      var x = e.target.closest('[data-code]'); if (!x) return; var pos = x.getAttribute('data-code'), P = DC.POS[pos]; sh.close();
      DC.openSearch('＋ ' + P.name, cat + ' · товар в Базу', P.name, function (p) {
        var id = DC.matAdd(code, p, { position: pos, zones: posZones(code, pos), origin: 'budget' }); DC.paint();
        var m = DC.matById(code, id); ui.toast(P.name + ' — в бюджете, категория «' + cat + '»' + (m && m.zones.length ? '' : '. Выберите зоны'));
        if (m && !m.zones.length) DC.openMaterial(code, id, { focus: 'zones' });
      });
    });
  };


  /* «Поставить в зоны»: одни зоны сразу нескольким материалам. Зона, где на той же позиции уже стоит другой материал, пропускается */
  DC.acts['mat-put'] = function () {
    var code = st.cap, ids = Object.keys(st.matSel || {}); if (!ids.length) return;
    var rooms = DC.realRooms(code).concat(['Общее']), on = {};
    var m = DC.sheet({ title: 'Поставить в зоны', html: '<p class="small muted">' + DC.plural(ids.length, 'материал', 'материала', 'материалов') + ' — зоны добавятся к уже выбранным.</p><div id="mt-put"></div>', actions: [{ label: 'Поставить', kind: 'primary', close: false, onClick: function (ev, api) {
      var want = rooms.filter(function (r) { return on[r]; }); if (!want.length) { ui.toast('Отметьте хотя бы одну зону', 'error'); return; }
      var added = 0, skipped = 0;
      ids.forEach(function (id) {
        var x = DC.matById(code, id); if (!x) return; var z = x.zones.slice();
        want.forEach(function (r) {
          if (z.some(function (q) { return q.room === r; })) return;
          var busy = x.position && (DC.materials(code) || []).some(function (o) { return o.id !== id && o.position === x.position && o.zones.some(function (q) { return q.room === r; }); });
          if (busy) { skipped++; return; } z.push({ room: r, share: 1 }); added++;
        });
        if (z.length !== x.zones.length) DC.matPatch(code, id, { zones: z });
      });
      api.close(); st.matSelMode = false; st.matSel = {}; DC.paint();
      ui.toast('Добавлено зон: ' + added + (skipped ? '. Пропущено ' + skipped + ' — там на этой позиции уже стоит другой материал' : ''));
    } }, { label: 'Отмена', kind: 'link' }] });
    var box = m.el.querySelector('#mt-put');
    function draw() {
      box.innerHTML = '<div class="mc-quick">' + [['living', 'Все жилые'], ['wet', 'Мокрые'], ['all', 'Вся квартира'], ['common', 'Общее']].map(function (q) { return '<button type="button" class="dr-sbtn" data-q="' + q[0] + '">' + q[1] + '</button>'; }).join('') + '</div>' +
        '<div class="mc-zones">' + rooms.map(function (r) { return '<div class="mc-zone' + (on[r] ? ' is-on' : '') + '"><button type="button" class="mc-zone__b" data-room="' + esc(r) + '" aria-pressed="' + !!on[r] + '">' + esc(r) + '</button></div>'; }).join('') + '</div>';
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-room],[data-q]'); if (!b) return; var q = b.getAttribute('data-q'), real = DC.realRooms(code);
      if (q) (q === 'living' ? real.filter(function (r) { return LIVING.indexOf(r) >= 0; }) : q === 'wet' ? real.filter(function (r) { return WET.indexOf(r) >= 0; }) : q === 'all' ? real : ['Общее']).forEach(function (r) { on[r] = 1; });
      else { var r = b.getAttribute('data-room'); if (on[r]) delete on[r]; else on[r] = 1; }
      draw();
    });
    draw();
  };
})();

/* Названия категорий мебели в кабинете дизайнера (Алина 13.11): в данных каталога и справочнике остаются «Мебель покупная / заказная» —
   по ним идёт сопоставление, поэтому меняем только подпись на экране. */
(function () {
  var MAP = [[/Мебель покупная/g, 'Мебель'], [/Мебель заказная/g, 'Встроенная мебель']];
  function fix(n) { var t = n.nodeValue, r = t; if (t.indexOf('Мебель') < 0) return; MAP.forEach(function (m) { r = r.replace(m[0], m[1]); }); if (r !== t) n.nodeValue = r; }
  function walk(el) { if (el.nodeType === 3) { fix(el); return; } if (el.nodeType !== 1) return; var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n; while ((n = w.nextNode())) fix(n); }
  walk(document.body);
  new MutationObserver(function (ms) { ms.forEach(function (m) { if (m.type === 'characterData') fix(m.target); else Array.prototype.forEach.call(m.addedNodes, walk); }); }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
