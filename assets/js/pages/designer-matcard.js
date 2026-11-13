/* Карточка материала — экран (ТЗ «Карточка материала», шаг 2): блок 1 «Материал» и блок 2 «Где стоит».
   Автосохранение: любое действие сразу пишет правку поверх сборки (DC.matPatch) и перерисовывает список комнат.
   Три варианта вида — ?d=1|2|3, переключатель в карточке при ?proto=1:
     1 · Лист — блоки друг под другом;  2 · Витрина — крупные фото товаров и зоны плитками;  3 · Шаги — блоки раскрываются по одному.
   Блоки 3 «Замены» и 4 «Для каких квартир» здесь пока строкой-сводкой — это шаги 3 и 4 ТЗ. */
(function () {
  var DC = window.SOVE_DC; if (!DC || !DC.materials) return;
  var st = DC.st, esc = DC.esc, ui = DC.ui, F = DC.F, POS = DC.POS, price = DC.price;
  var LIVING = ['Гостиная', 'Кухня-гостиная', 'Спальня', 'Детская', 'Кабинет'], WET = ['Санузел', 'Кухня', 'Постирочная'];
  var D_NAMES = { 1: 'Лист', 2: 'Витрина', 3: 'Шаги' }, SHARES = [[1, 'вся'], [0.5, '½'], [0.25, '¼']];

  function rooms(code) { return DC.realRooms(code).concat(['Общее']); }
  function fits(m, room) { var P = m.position && POS[m.position]; if (!P || room === 'Общее') return true; return P.rooms.indexOf(room) >= 0 || (P.rooms.indexOf('Кухня-гостиная') >= 0 && (room === 'Гостиная' || room === 'Кухня')); }
  function isFinish(m) { return /отделк/i.test(m.category || '') || /^м² |^п\.м\./.test(m.rule || ''); }
  function premOf(m) { return m.premium === 'same' ? m.base : m.premium; }
  function shareLabel(v) { var s = SHARES.filter(function (x) { return x[0] === v; })[0]; return s ? s[1] : DC.ruNum(v); }
  function prepIn(room) { return room === 'Общее' ? 'В «Общем»' : 'В зоне «' + room + '»'; }

  function prodTile(m, lv, ro) {
    var same = lv === 'premium' && m.premium === 'same', p = lv === 'base' ? m.base : premOf(m), name = lv === 'base' ? 'База' : 'Премиум';
    var pr = p ? (price(p) ? '<b>' + F.rub(price(p)) + '</b>' + (p.price_metod > 0 && p.price_retail > p.price_metod ? '<s>' + F.rub(p.price_retail) + '</s>' : '') : '<span class="dp-warn">нет цены</span>') : '';
    return '<div class="mc-prod' + (p ? '' : ' is-empty') + (same ? ' is-same' : '') + '"><span class="mc-prod__lv">' + name + (same ? ' · как База' : '') + '</span>' +
      '<span class="mc-prod__pic"' + (p && p.img ? ' style="background-image:' + esc(DC.cssUrl(p.img)) + '"' : '') + '></span>' +
      (p ? '<span class="mc-prod__br">' + esc(p.brand || '') + '</span><b class="mc-prod__n">' + esc(p.name || 'без названия') + '</b><span class="mc-prod__pr">' + pr + '</span>' : '<b class="mc-prod__n">Товар не выбран</b>') +
      (ro || same ? '' : '<span class="dr-btns"><button type="button" class="dr-sbtn" data-mc="rep" data-lv="' + lv + '">' + (p ? 'Заменить' : 'Выбрать') + '</button><button type="button" class="dr-sbtn is-quiet" data-mc="link" data-lv="' + lv + '">Ссылкой</button></span>') + '</div>';
  }
  function posSelect(m, ro) {
    var cats = [], by = {}; DC.KB.list.forEach(function (p) { if (p.hidden && p.code !== m.position) return; if (!by[p.cat]) { by[p.cat] = []; cats.push(p.cat); } by[p.cat].push(p); });
    return '<label class="mc-pos"><span>Позиция в интерьере</span><select class="input" data-mc="pos"' + (ro ? ' disabled' : '') + '>' + (m.position ? '' : '<option value="">' + esc(m.title || 'не выбрана') + ' — выберите позицию</option>') +
      cats.map(function (c) { return '<optgroup label="' + esc(c) + '">' + by[c].map(function (p) { return '<option value="' + esc(p.code) + '"' + (p.code === m.position ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select></label>';
  }
  function blockMat(m, ro, S) {
    return posSelect(m, ro) + '<div class="mc-prods">' + prodTile(m, 'base', ro) + prodTile(m, 'premium', ro) + '</div>' +
      '<label class="dr-check"><input type="checkbox" data-mc="same"' + (m.premium === 'same' ? ' checked' : '') + (ro || !m.base ? ' disabled' : '') + '> Премиум такой же, как База</label>' +
      (ro ? '' : '<div class="mc-cat"><label for="mc-q">Каталог</label><input class="input" id="mc-q" placeholder="Найти товар: название, бренд, категория" value="' + esc(S.q || '') + '" autocomplete="off"><div class="mc-res" id="mc-res">' + resHtml(S) + '</div></div>');
  }
  function resHtml(S) {
    if (!S.q || S.q.length < 2) return '';
    if (S.busy) return '<div class="da-empty">Ищу…</div>'; if (S.err) return '<div class="da-empty">Каталог не ответил (' + esc(S.err) + '). Попробуйте ещё раз или укажите товар ссылкой.</div>';
    if (!S.items) return ''; if (!S.items.length) return '<div class="da-empty">Ничего не нашлось.</div>';
    return S.items.map(function (p, i) { return '<div class="mc-opt"><span class="da-opt__pic"' + (p.img ? ' style="background-image:' + esc(DC.cssUrl(p.img)) + '"' : '') + '></span><span class="mc-opt__b"><b>' + esc(p.name) + '</b><span>' + esc(p.brand || '') + (price(p) ? ' · ' + F.rub(price(p)) : '') + '</span></span>' +
      '<span class="mc-opt__a"><button type="button" class="dr-sbtn" data-mc="pick" data-lv="base" data-i="' + i + '">в Базу</button><button type="button" class="dr-sbtn" data-mc="pick" data-lv="premium" data-i="' + i + '">в Премиум</button></span></div>'; }).join('');
  }
  function blockZones(m, code, ro, tiles) {
    var on = {}; m.zones.forEach(function (z) { on[z.room] = z.share || 1; }); var fin = isFinish(m);
    var quick = ro ? '' : '<div class="mc-quick">' + [['living', 'Все жилые'], ['wet', 'Мокрые'], ['all', 'Вся квартира'], ['common', 'Общее'], ['none', 'Снять все']].map(function (q) { return '<button type="button" class="dr-sbtn" data-mc="quick" data-q="' + q[0] + '">' + q[1] + '</button>'; }).join('') + '</div>';
    /* показываем только зоны, где позиция бывает, и уже выбранные; остальные — через «＋ Добавить зону». Доля — только если количество не по формуле калькулятора */
    if (DC.calcHas && DC.calcHas(m.position)) fin = false;
    var vis = rooms(code).filter(function (r) { return on[r] != null || fits(m, r); });
    var chips = '<div class="mc-zones' + (tiles ? ' is-tiles' : '') + '">' + vis.map(function (r) {
      var is = on[r] != null, off = !fits(m, r), custom = is && !SHARES.some(function (x) { return x[0] === on[r]; });
      return '<div class="mc-zone' + (is ? ' is-on' : '') + (off ? ' is-off' : '') + '"><button type="button" class="mc-zone__b" data-mc="zone" data-room="' + esc(r) + '"' + (ro ? ' disabled' : '') + ' aria-pressed="' + is + '">' + esc(r) + (off && !is ? '<i>не бывает</i>' : '') + '</button>' +
        (is && fin ? '<select class="mc-zone__s" data-mc="share" data-room="' + esc(r) + '"' + (ro ? ' disabled' : '') + ' aria-label="Доля">' + SHARES.map(function (x) { return '<option value="' + x[0] + '"' + (on[r] === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '<option value="custom"' + (custom ? ' selected' : '') + '>' + (custom ? DC.ruNum(on[r]) : 'своё…') + '</option></select>' : '') + '</div>';
    }).join('') + '</div>';
    var extra = DC.ROOM_NAMES.filter(function (r) { return vis.indexOf(r) < 0; });
    var more = ro || !extra.length ? '' : '<label class="mc-more"><span>Другая зона</span><select class="input" data-mc="zone-new"><option value="">＋ Добавить зону…</option>' + extra.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join('') + '</select></label>';
    return (m.zones.length ? '' : '<p class="mc-need">Выберите зоны — материал встанет в интерьер</p>') + quick + chips + more + (m.auto && !DC.matOverlay(code).patch[m.id] ? '<p class="pj-mut">Зоны взяты из справочника: в таблице комната не указана. Проверьте.</p>' : '');
  }
  /* блок 3 · Замены: до 10 товаров отдельно для Базы и Премиума. Варианты по цвету — тоже замены */
  var ALT_MAX = 10;
  function blockAlts(m, ro, S) {
    return '<p class="pj-mut">На что клиент может заменить товар. До ' + ALT_MAX + '.</p>' + [['base', 'База'], ['premium', 'Премиум']].map(function (L) {
      var list = m.alts[L[0]] || [], main = L[0] === 'base' ? m.base : premOf(m);
      return '<div class="mc-alts"><div class="mc-alts__h"><b>' + L[1] + '</b><span>' + list.length + ' из ' + ALT_MAX + '</span></div>' +
        (list.length ? list.map(function (p, i) {
          return '<div class="mc-alt"><span class="da-opt__pic"' + (p.img ? ' style="background-image:' + esc(DC.cssUrl(p.img)) + '"' : '') + '></span><span class="mc-opt__b"><b>' + esc(p.name || 'без названия') + '</b><span>' + esc(p.brand || '') + (price(p) ? (p.brand ? ' · ' : '') + F.rub(price(p)) : ' · нет цены') + '</span></span>' +
            (ro ? '' : '<span class="mc-alt__a"><button type="button" class="dr-sbtn" data-mc="alt-main" data-lv="' + L[0] + '" data-i="' + i + '"' + (main ? '' : ' title="Основного товара нет — замена станет основной"') + '>Сделать основным</button><button type="button" class="dr-sbtn is-x" data-mc="alt-del" data-lv="' + L[0] + '" data-i="' + i + '" aria-label="Убрать замену">×</button></span>') + '</div>';
        }).join('') : '<p class="pj-mut">Замен нет.</p>') +
        (ro ? '' : list.length < ALT_MAX ? '<span class="dr-btns"><button type="button" class="dr-sbtn mc-ai" data-mc="alt-ai" data-lv="' + L[0] + '"' + (S.aiBusy === 'alt' + L[0] ? ' disabled' : '') + '>' + (S.aiBusy === 'alt' + L[0] ? 'Подбираю…' : '✦ Подобрать с ИИ') + '</button><button type="button" class="dr-sbtn" data-mc="alt-add" data-lv="' + L[0] + '">＋ Замена</button></span>' : '<p class="pj-mut">Добавлено ' + ALT_MAX + ' из ' + ALT_MAX + '.</p>') + '</div>';
    }).join('');
  }
  /* блок 4 · Для каких квартир: по умолчанию для всех; иначе по типу квартиры (тот же · другой товар · не ставим)
     и «для второй и следующих комнат», если зона может повторяться. Других вариаций нет */
  var REPEAT = { 'Спальня': 4, 'Детская': 2, 'Санузел': 2 };
  /* Каким материалам нужен свой товар под тип квартиры — тем, у кого от площади меняется РАЗМЕР предмета, а не количество:
       мебель покупная — диван, обеденный стол, кровать, ТВ-тумба, шкаф, стеллаж;
       техника — телевизор (диагональ), холодильник, посудомойка (45 / 60), варочная панель (2 / 4 конфорки);
       текстиль — ковёр;  сантехника — ванна (длина).
     Отделке, свету, розеткам, дверям и заказной мебели это не нужно: там от площади растёт количество (м², п.м., штуки на комнату), его считает правило позиции. */
  /* По таблицам дизайнеров К1–К9 (разбор 13.11): размерные ряды под тип квартиры у дивана, кровати (160/180), обеденного стола (d80/d120/180–220),
     телевизора (43/50/55"), посудомойки (45/60 см) и жалюзи. Остальное в таблицах одно на все квартиры — растёт только количество. */
  var SIZED = /диван|кроват|обеденн|телевизор|посудомо|жалюзи|духов/i;  /* духовой шкаф: в калькуляторе до 60 м² обычный, от 60 м² — с СВЧ */
  function sized(m) { return SIZED.test(m.title || ''); }
  /* размер из названия товара: «200 см», «160х200», «55"», «600 мм» → число для сортировки */
  function sizeOf(name) {
    var t = String(name || '').replace(',', '.'), m;
    if ((m = t.match(/(\d{2,3})\s*[xх×*]\s*(\d{2,3})/i))) return Math.max(Number(m[1]), Number(m[2]));
    if ((m = t.match(/(\d{2,3})\s*(?:"|''|″|дюйм)/i))) return Number(m[1]);
    if ((m = t.match(/(\d{2,4})\s*(см|мм|cm|mm)/i))) return Number(m[1]) / (/мм|mm/i.test(m[2]) ? 10 : 1);
    return 0;
  }
  function varProd(v, ro, attrs) {
    function line(lv, name) { var p = lv === 'base' ? v.base : v.premium; return '<div class="mc-var__p"><span>' + name + '</span><b>' + (p ? esc((p.name || 'без названия').slice(0, 60)) + (price(p) ? ' · ' + F.rub(price(p)) : '') : (lv === 'premium' ? 'как в Базе' : 'не выбран')) + '</b>' + (ro ? '' : '<button type="button" class="dr-sbtn" ' + attrs + ' data-lv="' + lv + '">' + (p ? 'Заменить' : 'Выбрать') + '</button>') + '</div>'; }
    return '<div class="mc-var__ps">' + line('base', 'База') + line('premium', 'Премиум') + '</div>';
  }
  /* Вторая и следующие комнаты. Квартира больше — комнат одного вида несколько: 2к — две спальни, 3к — три; бывает второй санузел.
     Вторая комната по умолчанию получает ТОТ ЖЕ материал. Отличаться имеет смысл не всему:
       в спальне (и детской) — мебель, люстра и бра, текстиль и декор, акцентная стена;
       в санузле — сантехника, тумба и зеркало, плитка.
     Базовая отделка, розетки, двери и встроенный свет во всех комнатах одного вида одинаковые — для них вопроса нет. */
  /* «тип 1…4» в таблицах — разный товар во второй и следующей спальне: люстра (К1–К4), бра (К3, К4), настольная лампа (К1, К2), в К9 ещё диван и стол.
     Второго санузла с другой сантехникой в таблицах нет — предлагаем только для света и мебели спальни. */
  var REP = /люстр|бра|настольн|торшер|подвесн|диван|стол(?!еш)/i;
  function repeatOk(m, room) { return room !== 'Санузел' && REP.test(m.title || '') && !/встроен|трек|светов/i.test(m.title || ''); }
  /* Правило «Для каких квартир» — одно из трёх, по позиции (по таблицам дизайнеров К1–К9):
       size  — товар по размеру квартиры: диван, кровать, обеденный стол, телевизор, посудомойка, жалюзи → строки Студия…4к;
       room  — свет спальни: люстра, бра, настольная лампа, торшер → строки «Спальня 2, 3, 4»;
       same  — всё остальное: один товар во всех квартирах и во всех его зонах, меняется только количество. */
  function ruleOf(m) {
    if (m.by_flat || sized(m)) return 'size';
    if (DC.calcByType && DC.calcByType(m.position) && !(m.by_index)) {
      /* число по типам одинаковое (люстра в гостиной — везде 1) — блок не нужен */
      var qs = DC.FLATS.map(function (f) { var r = DC.calcQty(m.position, m.zones, DC.calcCtx(st.cap, 'база', f[0])); return r ? r.q : 0; });
      if (qs.some(function (q) { return q !== qs[0]; })) return 'count';
    }
    if (m.by_index || (repeatOk(m, 'Спальня') && m.zones.some(function (z) { return z.room === 'Спальня' || z.room === 'Детская'; }))) return 'room';
    return 'same';
  }
  function blockFlats(m, ro, S) {
    var rule = ruleOf(m), zs = m.zones.map(function (z) { return z.room; });
    function line(label, v, pick, reset, none, n) {
      var own = v && typeof v === 'object', p = own ? (v.base || v.premium) : null, off = v === 'none';
      var mid = off ? '<span class="mc-l__no">не ставим</span>' : '<button type="button" class="mc-l__p' + (own ? ' is-own' : '') + '" ' + pick + ' data-lv="base"' + (ro ? ' disabled' : '') + '>' + (p ? esc(shortName(p)) + (price(p) ? ' · ' + F.rub(price(p)) : '') : '<i>основной</i>') + '</button>';
      var acts = ro ? '' : (own || off ? '<button type="button" class="mc-l__a" ' + reset + '>основной</button>' : '') + (none && !off ? '<button type="button" class="mc-l__a" ' + none + '>не ставим</button>' : '');
      return '<div class="mc-l"><b>' + label + (n ? '<i class="mc-l__n">' + n + '</i>' : '') + '</b>' + mid + (acts ? '<span class="mc-l__as">' + acts + '</span>' : '') + '</div>';
    }
    /* количество по калькулятору для каждого типа квартиры */
    var u = DC.matUnit(m);
    function cnt(fk) { if (!DC.calcHas(m.position)) return null; var r = DC.calcQty(m.position, m.zones, DC.calcCtx(st.cap, 'база', fk)); return r ? r.q : null; }
    function qn(fk) { var q = cnt(fk); return q == null ? '' : q ? DC.ruNum(Math.round(q * 10) / 10) + ' ' + u : 'нет'; }
    if (rule === 'count') return '<p class="mc-rule"><b>Количество по типу квартиры</b><span>Товар один, меняется число — по калькулятору.</span></p>' +
      '<div class="mc-cnt">' + DC.FLATS.map(function (f) { return '<span><i>' + f[1] + '</i><b>' + qn(f[0]) + '</b></span>'; }).join('') + '</div>';
    if (rule === 'same') return '<p class="mc-rule"><b>Один товар везде</b><span>' + (zs.length > 1 ? 'Во всех ' + zs.length + ' зонах (' + esc(zs.join(', ')) + ') и во всех квартирах' : 'Во всех квартирах') + ' — этот товар. От квартиры меняется только количество.</span></p>';
    if (rule === 'size') return '<p class="mc-rule"><b>По типу квартиры</b><span>Студия, Евро-2 … Евро-5 — как в калькуляторе. Нажмите строку — откроется каталог.</span></p>' +
      (ro ? '' : '<span class="dr-btns"><button type="button" class="dr-sbtn mc-ai" data-mc="flat-ai"' + (S.aiBusy === 'flat' ? ' disabled' : '') + '>' + (S.aiBusy === 'flat' ? 'Подбираю…' : '✦ Подобрать по размерам') + '</button></span>') +
      DC.FLATS.map(function (f) { var v = m.by_flat && m.by_flat[f[0]]; return line(f[1], v, 'data-mc="flat-rep" data-f="' + f[0] + '"', 'data-mc="flat-to" data-f="' + f[0] + '" data-v="same"', 'data-mc="flat-to" data-f="' + f[0] + '" data-v="none"', v === 'none' ? '' : qn(f[0])); }).join('');
    var rooms = zs.filter(function (r) { return r === 'Спальня' || r === 'Детская'; });
    return '<p class="mc-rule"><b>По комнатам</b><span>Если спален несколько, в каждой может быть свой товар. Основной — в первой спальне.</span></p>' + (DC.calcHas(m.position) ? '<div class="mc-cnt">' + DC.FLATS.map(function (f) { return '<span><i>' + f[1] + '</i><b>' + qn(f[0]) + '</b></span>'; }).join('') + '</div>' : '') + rooms.map(function (room) {
      var bi = (m.by_index && m.by_index[room]) || {}, rows = '';
      for (var i = 2; i <= REPEAT[room]; i++) rows += line(esc(room) + ' ' + i, bi[i], 'data-mc="idx-rep" data-room="' + esc(room) + '" data-i="' + i + '"', 'data-mc="idx-to" data-room="' + esc(room) + '" data-i="' + i + '"', '');
      return rows;
    }).join('') + (zs.length > rooms.length ? '<p class="pj-mut">В остальных зонах (' + esc(zs.filter(function (r) { return rooms.indexOf(r) < 0; }).join(', ')) + ') — основной.</p>' : '');
  }
  function shortName(p) { var n = String(p.name || 'без названия'); return n.length > 46 ? n.slice(0, 44) + '…' : n; }


  function qtyLine(m, code) {
    var pl = DC.matPlan(code), q = 0, any = false;
    m.zones.forEach(function (z) { var v = DC.planQty(code, { room: z.room, pos: m.position, qty_rule: m.rule, share: z.share || 1 }, { rooms: pl.rooms }); if (v != null) { q += v; any = true; } });
    var u = /^м² /.test(m.rule) ? 'м²' : /^п\.м\./.test(m.rule) ? 'п.м.' : /^компл/.test(m.rule) ? 'компл.' : 'шт';
    return 'Количество: ' + (m.rule ? esc(m.rule) + (m.zones.some(function (z) { return (z.share || 1) !== 1; }) ? ' × доля' : '') : 'правило не задано') + (any ? ' · ' + (pl.real ? 'по планировке ' : 'на ') + DC.ruNum(pl.area) + ' м² ≈ ' + DC.ruNum(q) + ' ' + u : '');
  }
  /* Количество и сумма: по зонам. Количество считается само (правило позиции × комната × доля); дизайнер может вписать своё */
  /* Количество и сумма — по формулам калькулятора: формула, на какую квартиру, итог; можно вписать своё на всю квартиру */
  function blockQty(m, code, ro) {
    if (!m.zones.length) return '<p class="pj-mut">Сначала выберите зоны.</p>';
    var cb = DC.matCalc(code, m, 'база'), cp = DC.matCalc(code, m, 'премиум'), u = DC.matUnit(m), ctx = cb.ctx;
    var zs = Object.keys(cb.by), split = zs.length > 1 ? '<div class="mc-qz">' + zs.map(function (z) { return '<span>' + esc(z) + ' <b>' + DC.ruNum(Math.round(cb.by[z] * 10) / 10) + '</b></span>'; }).join('') + '</div>' : '';
    var diff = Math.abs(cb.q - cp.q) > 0.01 ? ' · в Премиуме ' + DC.ruNum(cp.q) + ' ' + u : '';
    return '' + /* формулы с экрана убраны (Алина 13.11) — считаются по калькулятору в designer-calc.js */
      '<div class="mc-q"><span class="mc-q__b"><b>Количество на квартиру</b><span>' + (cb.manual ? 'вписано вручную' : 'посчитано') + diff + '</span></span><span class="mc-q__in"><input class="input" inputmode="decimal" data-mc="qty-total" value="' + DC.ruNum(Math.round(cb.q * 100) / 100) + '"' + (ro ? ' disabled' : '') + ' aria-label="Количество на квартиру"><i>' + u + '</i>' + (cb.manual && !ro ? '<button type="button" class="dr-sbtn is-x" data-mc="qty-auto" title="Вернуть формулу">↺</button>' : '') + '</span></div>' + split +
      '<div class="mc-q is-sum"><span class="mc-q__b"><b>Сумма</b></span><span class="mc-q__s">' + (price(cb.product) ? '<span>База <b>' + F.rub(Math.round(cb.sum)) + '</b></span>' : '') + (price(cp.product) ? '<span>Премиум <b>' + F.rub(Math.round(cp.sum)) + '</b></span>' : '') + '</span></div>';
  }
  function summary(m, key) {
    if (key === 'mat') { var p = m.base || premOf(m); return (p ? esc((p.name || '').slice(0, 46)) : 'товар не выбран') + (m.premium === 'same' ? ' · Премиум = База' : !m.premium ? ' · нет Премиума' : ''); }
    return m.zones.length ? esc(m.zones.map(function (z) { return z.room + ((z.share || 1) !== 1 ? ' ' + shareLabel(z.share) : ''); }).join(', ')) : 'зоны не выбраны';
  }

  function openCard(code, id, opts) {
    var m0 = DC.matById(code, id); if (!m0) { ui.toast('Карточка не найдена', 'error'); return; }
    var ro = !DC.canEdit(code), S = { q: '', items: null, busy: false, err: '', timer: null, seq: 0, open: m0.zones.length ? 'mat' : 'zones' };
    var M = DC.sheet({ title: m0.title || 'Материал', html: '<div id="mc"></div>', actions: [{ label: 'Готово', kind: 'primary' }] }); M.el.classList.add('mc-sheet');
    var box = M.el.querySelector('#mc'), head = M.el.querySelector('#modal-title');
    function mat() { return DC.matById(code, id); }
    function save(p, msg) { DC.matPatch(code, id, p); DC.paint(); render(); if (msg) ui.toast(msg); }
    function render() {
      var m = mat(); if (!m) { M.close(); return; }
      var d = 1; if (head) head.textContent = m.title || 'Материал'; /* Алина 13.11 выбрала вариант 1 · Лист; «Витрина» и «Шаги» остались в коде и стилях на случай возврата */
      var sw = '';
      function sec(key, title, body) {
        if (d !== 3) return '<section class="mc-b"><h3>' + title + '</h3>' + body + '</section>';
        var open = S.open === key; return '<section class="mc-b mc-acc' + (open ? ' is-open' : '') + '"><button type="button" class="mc-acc__h" data-mc="acc" data-k="' + key + '" aria-expanded="' + open + '"><b>' + title + '</b><span>' + summary(m, key) + '</span></button>' + (open ? body : '') + '</section>';
      }
      box.className = 'mc mc--d' + d + (ro ? ' is-ro' : '');
      ro = !DC.canEdit(code);
      var stt = DC.statusOf(code), lock = !ro ? '' : '<div class="mc-lock"><b>Только просмотр — кнопки неактивны</b><span>' + (stt === 'pub' ? 'Интерьер опубликован, правки закрыты. Чтобы менять материалы, создайте черновик следующей версии — клиенты останутся на опубликованной.' : stt === 'review' ? 'Интерьер на проверке у главного дизайнера.' : 'Интерьер закрыт для правок.') + '</span>' + (stt === 'pub' && DC.mineCap(code) ? '<button type="button" class="btn btn--primary btn--small" data-mc="unlock">Внести изменения</button>' : '') + '</div>';
      box.innerHTML = sw + lock +
        sec('mat', 'Материал', blockMat(m, ro, S)) + sec('zones', 'Где стоит', blockZones(m, code, ro, d === 2)) + sec('qty', 'Количество и сумма', blockQty(m, code, ro)) + sec('alts', 'Замены', blockAlts(m, ro, S)) + (ruleOf(m) === 'same' ? '' : sec('flats', 'Для каких квартир', blockFlats(m, ro, S)))  /* один товар везде — блок не нужен (Алина 13.11) */ +
        (ro ? '' : '<button type="button" class="dp-del" data-mc="remove">Убрать из капсулы</button>');
      if (S.focus) { var q = box.querySelector('#mc-q'); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }
    }
    function setZones(z, msg) { save({ zones: z }, msg); }
    function others(m, room) { return m.position ? (DC.materials(code) || []).filter(function (x) { return x.id !== id && x.position === m.position && x.zones.some(function (z) { return z.room === room; }); }) : []; }
    function addZone(room) {
      var m = mat(), busy = others(m, room);
      if (!fits(m, room)) ui.toast('По справочнику «' + (m.title || 'эта позиция') + '» в зоне «' + room + '» не бывает — проверьте');
      if (!busy.length) { setZones(m.zones.concat([{ room: room, share: 1 }])); return; }
      var o = busy[0], on = (o.base || premOf(o) || {}).name || o.title;
      var q = DC.sheet({ title: 'В этой зоне уже есть материал', html: '<p class="text">' + prepIn(room) + ' на позиции «' + esc(m.title) + '» уже стоит «' + esc(on) + '».</p><div class="mc-ask"><button type="button" class="btn btn--primary btn--block" data-a="replace">Заменить</button><button type="button" class="btn btn--ghost btn--block" data-a="split">Поделить поровну</button><button type="button" class="btn btn--link" data-a="cancel">Отмена</button></div>', actions: [] });
      q.el.addEventListener('click', function (e) {
        var a = e.target.closest('[data-a]'); if (!a) return; var how = a.getAttribute('data-a'); q.close(); if (how === 'cancel') return;
        busy.forEach(function (x) { DC.matPatch(code, x.id, { zones: how === 'replace' ? x.zones.filter(function (z) { return z.room !== room; }) : x.zones.map(function (z) { return z.room === room ? { room: room, share: Math.round(100 / (busy.length + 1)) / 100 } : z; }) }); });
        setZones(mat().zones.concat([{ room: room, share: how === 'split' ? Math.round(100 / (busy.length + 1)) / 100 : 1 }]), how === 'replace' ? 'Заменено в зоне «' + room + '»' : 'Зона поделена');
      });
    }
    function search() {
      var q = S.q.trim(); if (q.length < 2) { S.items = null; S.busy = false; paintRes(); return; }
      var my = ++S.seq; S.busy = true; S.err = ''; paintRes();
      DC.getJSON(DC.API + '/marketplace/search?q=' + encodeURIComponent(q) + '&page_size=8').then(function (d) { if (my !== S.seq) return; S.items = (d.items || []).slice(0, 8); S.busy = false; paintRes(); }, function (e) { if (my !== S.seq) return; S.busy = false; S.err = e.message; paintRes(); });
    }
    function pickVar(kind, key, lv) {
      var m = mat(), label = kind === 'flat' ? (DC.FLATS.filter(function (x) { return x[0] === key; })[0] || [])[1] : key.replace('|', ' ');
      DC.openSearch((lv === 'base' ? 'База' : 'Премиум') + ' · ' + label, m.title || '', m.title || '', function (p) {
        var cur = mat();
        if (kind === 'flat') { var bf = DC.merge(cur.by_flat || {}, {}); DC.FLATS.forEach(function (x) { if (!bf[x[0]]) bf[x[0]] = 'same'; }); var o = bf[key] && typeof bf[key] === 'object' ? DC.merge(bf[key], {}) : { base: null, premium: null }; o[lv] = p; bf[key] = o; save({ by_flat: bf }, 'Товар для «' + label + '» сохранён'); }
        else { var parts = key.split('|'), bi = JSON.parse(JSON.stringify(cur.by_index || {})); bi[parts[0]] = bi[parts[0]] || {}; var o2 = bi[parts[0]][parts[1]] || { base: null, premium: null }; o2[lv] = p; bi[parts[0]][parts[1]] = o2; save({ by_index: bi }, 'Товар для «' + label + '» сохранён'); }
      });
    }
    function catalog(m) { /* товары каталога по названию позиции: с ценой и фото */
      var wait = new Promise(function (ok, no) { setTimeout(function () { no(new Error('нет ответа 15 секунд')); }, 15000); });
      return Promise.race([DC.getJSON(DC.API + '/marketplace/search?q=' + encodeURIComponent(m.title || '') + '&page_size=12'), wait]).then(function (d) { return (d.items || []).filter(function (x) { return x.img && (DC.num(x.price_metod) || DC.num(x.price_retail)); }).map(DC.catProduct); });
    }
    function paintRes() { var r = box.querySelector('#mc-res'); if (r) r.innerHTML = resHtml(S); }
    function setProd(lv, p) { var m = mat(), patch = {}; patch[lv] = p; if (lv === 'base' && !m.position) { /* позиция подставляется по типу товара — пока по названию */ var g = DC.resolvePos(p.name, '', '') || DC.guessPos(p.name, '', ''); if (g && POS[g]) { patch.position = g; patch.title = POS[g].name; patch.category = POS[g].cat; patch.rule = POS[g].rule || ''; patch.unit = POS[g].unit || ''; } } save(patch, lv === 'base' ? 'Товар Базы сохранён' : 'Товар Премиума сохранён'); }

    box.addEventListener('input', function (e) { if (e.target.id !== 'mc-q') return; S.q = e.target.value; S.focus = true; clearTimeout(S.timer); S.timer = setTimeout(search, 400); });
    box.addEventListener('focusout', function (e) { if (e.target.id === 'mc-q') S.focus = false; });
    box.addEventListener('change', function (e) {
      var t = e.target, k = t.getAttribute('data-mc'), m = mat(); if (!k || !m || ro) return;
      if (k === 'qty-total') {
        var raw2 = t.value.trim().replace(/\s/g, '').replace(',', '.'), qv2 = Number(raw2);
        if (raw2 === '') { save({ qty: null }, 'Количество снова по формуле'); return; }
        if (!(qv2 >= 0) || !isFinite(qv2)) { ui.toast('Количество — число, например 12,5', 'error'); render(); return; }
        save({ qty: qv2 }, 'Количество сохранено'); return;
      }
      if (k === 'qty') {
        var qr = t.getAttribute('data-room'), raw = t.value.trim().replace(/\s/g, '').replace(',', '.'), qv = Number(raw);
        if (raw === '') { setZones(m.zones.map(function (z) { if (z.room !== qr) return z; var c = DC.merge(z, {}); delete c.qty; return c; }), 'Количество снова считается само'); return; }
        if (!(qv >= 0) || !isFinite(qv)) { ui.toast('Количество — число, например 12,5', 'error'); render(); return; }
        setZones(m.zones.map(function (z) { return z.room === qr ? DC.merge(z, { qty: qv }) : z; }), 'Количество сохранено'); return;
      }
      if (k === 'zone-new') { if (t.value) { var nz = t.value; if (!fits(m, nz)) ui.toast('По справочнику «' + (m.title || 'эта позиция') + '» в зоне «' + nz + '» не бывает — проверьте'); setZones(m.zones.concat([{ room: nz, share: 1 }]), 'Зона «' + nz + '» добавлена в интерьер'); } return; }
      if (k === 'pos') { var P = POS[t.value]; if (P) save({ position: P.code, title: P.name, category: P.cat, rule: P.rule || '', unit: P.unit || '', work: P.work || '' }, 'Позиция: ' + P.name); }
      else if (k === 'flat-set') {
        var bf = DC.merge(m.by_flat || {}, {}), f = t.getAttribute('data-f');
        bf[f] = t.value === 'own' ? { base: null, premium: null } : t.value; save({ by_flat: bf }, t.value === 'none' ? 'В этом типе квартиры материал не ставим' : '');
        if (t.value === 'own') pickVar('flat', f, 'base');
      }
      else if (k === 'idx-set') {
        var room2 = t.getAttribute('data-room'), i2 = Number(t.getAttribute('data-i')), bi = JSON.parse(JSON.stringify(m.by_index || {})); bi[room2] = bi[room2] || {};
        if (t.value === 'own') bi[room2][i2] = { base: null, premium: null }; else { delete bi[room2][i2]; if (!Object.keys(bi[room2]).length) delete bi[room2]; }
        save({ by_index: Object.keys(bi).length ? bi : null }); if (t.value === 'own') pickVar('idx', room2 + '|' + i2, 'base');
      }
      else if (k === 'same') save({ premium: t.checked ? 'same' : (m.base ? DC.merge(m.base, {}) : null) }, t.checked ? 'Премиум такой же, как База' : 'Премиум отдельно — выберите товар');
      else if (k === 'share') {
        var room = t.getAttribute('data-room'), v = t.value === 'custom' ? Number(String(window.prompt('Доля от 0 до 1, например 0,3', '0,3') || '').replace(',', '.')) : Number(t.value);
        if (!(v > 0 && v <= 1)) { ui.toast('Доля — число больше 0 и не больше 1', 'error'); render(); return; }
        var sum = others(m, room).reduce(function (s, x) { return s + (x.zones.filter(function (z) { return z.room === room; })[0].share || 1); }, v);
        setZones(m.zones.map(function (z) { return z.room === room ? { room: room, share: v } : z; }), sum > 1.001 ? 'Доли в зоне «' + room + '» в сумме больше 1 — проверьте' : '');
      }
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mc]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return; var k = b.getAttribute('data-mc'), m = mat(); if (!m) return;
      if (k === 'd') { st.d = Number(b.getAttribute('data-d')); render(); return; }
      if (k === 'unlock') { DC.setStatus(code, 'next', 'Создан черновик новой версии — можно править'); render(); return; }
      if (k === 'acc') { S.open = S.open === b.getAttribute('data-k') ? '' : b.getAttribute('data-k'); render(); return; }
      if (ro) return;
      if (k === 'idx-open') { S.idxOpen = true; render(); return; }
      if (k === 'idx-close') { S.idxOpen = false; render(); return; }
      if (k === 'qty-auto' && !b.getAttribute('data-room')) { save({ qty: null }, 'Количество снова по формуле'); return; }
      if (k === 'qty-auto') { var ar = b.getAttribute('data-room'); setZones(m.zones.map(function (z) { if (z.room !== ar) return z; var c = DC.merge(z, {}); delete c.qty; return c; }), 'Количество снова считается само'); return; }
      if (k === 'zone') { var room = b.getAttribute('data-room'); if (m.zones.some(function (z) { return z.room === room; })) setZones(m.zones.filter(function (z) { return z.room !== room; })); else addZone(room); }
      else if (k === 'quick') {
        var q = b.getAttribute('data-q'), real = DC.realRooms(code), want = q === 'living' ? real.filter(function (r) { return LIVING.indexOf(r) >= 0; }) : q === 'wet' ? real.filter(function (r) { return WET.indexOf(r) >= 0; }) : q === 'all' ? real : q === 'common' ? ['Общее'] : [];
        if (q === 'none') { setZones([]); return; }
        var have = m.zones.map(function (z) { return z.room; }), add = want.filter(function (r) { return have.indexOf(r) < 0; }), clash = add.filter(function (r) { return others(m, r).length; });
        var free = add.filter(function (r) { return clash.indexOf(r) < 0; });
        setZones(m.zones.concat(free.map(function (r) { return { room: r, share: 1 }; })), !add.length ? 'Эти зоны уже выбраны' : clash.length ? 'Добавлено зон: ' + free.length + '. В ' + clash.join(', ') + ' уже стоит другой материал — включите зону отдельно' : 'Добавлено зон: ' + free.length);
      }
      else if (k === 'rep') { var lv = b.getAttribute('data-lv'); DC.openSearch((lv === 'base' ? 'Товар Базы' : 'Товар Премиума') + ' — каталог', m.title || '', m.title || '', function (p) { setProd(lv, p); }); }
      else if (k === 'link') { var lv2 = b.getAttribute('data-lv'); DC.openLink(m.title || 'Материал', lv2 === 'base' ? m.base : premOf(m), function (p) { setProd(lv2, p); }); }
      else if (k === 'alt-add' || k === 'alt-del' || k === 'alt-main') {
        var L = b.getAttribute('data-lv'), i = Number(b.getAttribute('data-i')), alts = { base: (m.alts.base || []).slice(), premium: (m.alts.premium || []).slice() }, nm = L === 'base' ? 'Базы' : 'Премиума';
        if (k === 'alt-add') {
          /* поиск по каталогу сразу по той же позиции */
          DC.openSearch('Замена для ' + nm, m.title || '', m.title || '', function (p) {
            var cur = mat(), a2 = { base: (cur.alts.base || []).slice(), premium: (cur.alts.premium || []).slice() }, mainNow = L === 'base' ? cur.base : premOf(cur);
            if (DC.sameProduct(p, mainNow) || a2[L].some(function (x) { return DC.sameProduct(x, p); })) { ui.toast('Этот товар уже стоит в карточке', 'error'); return; }
            if (a2[L].length >= ALT_MAX) { ui.toast('Уже ' + ALT_MAX + ' замен', 'error'); return; }
            a2[L].push(p); save({ alts: a2 }, 'Замена добавлена');
          });
        } else if (k === 'alt-del') { alts[L].splice(i, 1); save({ alts: alts }, 'Замена убрана'); }
        else { /* «Сделать основным»: замена и основной товар меняются местами */
          var pick = alts[L][i], main = L === 'base' ? m.base : premOf(m), patch = {}; if (!pick) return;
          if (main) alts[L][i] = main; else alts[L].splice(i, 1);
          patch.alts = alts; patch[L] = pick;
          if (L === 'base' && m.premium === 'same') patch.premium = main ? DC.merge(main, {}) : null;   /* Премиум был «как База» — остаётся с прежним товаром */
          save(patch, 'Основной товар ' + nm + ' заменён');
        }
      }
      else if (k === 'flat-mode') {
        var v = b.getAttribute('data-v');
        if (v === 'dep') S.flatAll = false;
        if (v === 'dep' && !m.by_flat) { var nf = {}; DC.FLATS.forEach(function (x) { nf[x[0]] = 'same'; }); save({ by_flat: nf }); }
        else if (v === 'all') { S.flatAll = true; if (m.by_flat) save({ by_flat: null }, 'Материал один для всех квартир'); else render(); }
      }
      else if (k === 'alt-ai') {
        /* ИИ-подбор замен: товары каталога по той же позиции, с ценой и фото, без повторов; Премиуму — дороже основного товара Базы, Базе — ближе к нему по цене */
        var La = b.getAttribute('data-lv'); S.aiBusy = 'alt' + La; render();
        catalog(m).then(function (items) {
          var cur = mat(), a3 = { base: (cur.alts.base || []).slice(), premium: (cur.alts.premium || []).slice() }, mainP = La === 'base' ? cur.base : premOf(cur), ref = price(cur.base) || price(mainP) || 0;
          var pool = items.filter(function (p) { return !DC.sameProduct(p, mainP) && !a3[La].some(function (x) { return DC.sameProduct(x, p); }); });
          if (La === 'premium' && ref) { var up = pool.filter(function (p) { return price(p) > ref; }); if (up.length >= 3) pool = up; }
          pool.sort(function (x, y) { return Math.abs(price(x) - (price(mainP) || ref)) - Math.abs(price(y) - (price(mainP) || ref)); });
          var add = pool.slice(0, Math.min(3, ALT_MAX - a3[La].length)); S.aiBusy = '';
          if (!add.length) { render(); ui.toast('В каталоге не нашлось подходящих замен по позиции «' + (cur.title || '') + '»', 'error'); return; }
          a3[La] = a3[La].concat(add); save({ alts: a3 }, 'ИИ подобрал замен: ' + add.length + ' — проверьте');
        }, function (e) { S.aiBusy = ''; render(); ui.toast('Каталог не ответил (' + e.message + ') — попробуйте ещё раз', 'error'); });
      }
      else if (k === 'flat-ai') {
        /* ИИ-подбор по типам квартир: товары каталога той же позиции раскладываются по размеру — меньший в Студию, больший в 4к */
        S.aiBusy = 'flat'; render();
        catalog(m).then(function (items) {
          var cur = mat(), withSize = items.map(function (p) { return { p: p, s: sizeOf(p.name) }; }).filter(function (x) { return x.s > 0; }).sort(function (x, y) { return x.s - y.s; }), uniq = [];
          withSize.forEach(function (x) { if (!uniq.length || uniq[uniq.length - 1].s !== x.s) uniq.push(x); });
          S.aiBusy = '';
          if (uniq.length < 2) { render(); ui.toast('В каталоге не нашлось товаров разного размера по позиции «' + (cur.title || '') + '» — задайте вручную', 'error'); return; }
          var bf = {}; DC.FLATS.forEach(function (f, i) { var x = uniq[Math.round(i * (uniq.length - 1) / (DC.FLATS.length - 1))].p; bf[f[0]] = DC.sameProduct(x, cur.base) ? 'same' : { base: x, premium: null }; });
          S.flatAll = false; save({ by_flat: bf }, 'ИИ разложил товары по типам квартир — проверьте размеры');
        }, function (e) { S.aiBusy = ''; render(); ui.toast('Каталог не ответил (' + e.message + ') — попробуйте ещё раз', 'error'); });
      }
      else if (k === 'flat-to') { var bf3 = DC.merge(m.by_flat || {}, {}); DC.FLATS.forEach(function (x) { if (!bf3[x[0]]) bf3[x[0]] = 'same'; }); bf3[b.getAttribute('data-f')] = b.getAttribute('data-v'); save({ by_flat: bf3 }); }
      else if (k === 'idx-to') { var bi3 = JSON.parse(JSON.stringify(m.by_index || {})), rr = b.getAttribute('data-room'); if (bi3[rr]) { delete bi3[rr][b.getAttribute('data-i')]; if (!Object.keys(bi3[rr]).length) delete bi3[rr]; } save({ by_index: Object.keys(bi3).length ? bi3 : null }); }
      else if (k === 'flat-rep') pickVar('flat', b.getAttribute('data-f'), b.getAttribute('data-lv'));
      else if (k === 'idx-rep') pickVar('idx', b.getAttribute('data-room') + '|' + b.getAttribute('data-i'), b.getAttribute('data-lv'));
      else if (k === 'pick') { var it = S.items && S.items[Number(b.getAttribute('data-i'))]; if (it) setProd(b.getAttribute('data-lv'), DC.catProduct(it)); }
      else if (k === 'remove') { var c = DC.sheet({ title: 'Убрать из капсулы?', html: '<p class="text">«' + esc(m.title) + '» пропадёт из всех зон капсулы.</p>', actions: [{ label: 'Убрать', kind: 'primary', onClick: function () { DC.matRemove(code, id); DC.paint(); M.close(); ui.toast('Материал убран из капсулы'); } }, { label: 'Оставить', kind: 'link' }] }); }
    });
    render();
    if (opts && opts.focus === 'zones') setTimeout(function () { var z = [].filter.call(box.querySelectorAll('.mc-b h3'), function (h) { return h.textContent === 'Где стоит'; })[0]; if (z && z.scrollIntoView) z.scrollIntoView({ block: 'start' }); }, 50);
  }
  DC.openMaterial = openCard; DC.matRule = ruleOf;
  DC.acts.mat = function (b) { openCard(st.cap, b.getAttribute('data-id')); };
})();
