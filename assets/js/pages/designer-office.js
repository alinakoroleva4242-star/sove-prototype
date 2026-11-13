/* Кабинет главного дизайнера, шаги 6–7: действия во «Всех капсулах», «Расход и работы», «Качество данных», «Справочники» с журналом правок. */
(function () {
  var DC = window.SOVE_DC; if (!DC) return;
  var st = DC.st, ROLE = DC.ROLE, esc = DC.esc, ui = DC.ui, ic = DC.ic, POS = DC.POS, KB = DC.KB;
  function head(t, sub) { return '<div class="da-head"><div class="stack stack--1"><h1 class="h1 h1--sm da-title">' + esc(t) + '</h1><p class="da-sub">' + sub + '</p></div></div>'; }
  function okBox(t) { return '<div class="da-issues"><div class="da-ok">' + t + '</div></div>'; }
  function lvLabel(l) { return DC.LEVELS.filter(function (x) { return x[0] === l; })[0][1]; }
  DC.head = head; DC.okBox = okBox;

  /* ── Б3. Все капсулы: действия под карточкой и «обновлена» ── */
  DC.cardActs = function (code) {
    var s = DC.statusOf(code), t = st.tables[DC.tkey(code, 'база')], upd = (st.meta[code] || {}).updatedAt || (t && t.updated) || '', b = [];
    function btn(a, l) { b.push('<button type="button" class="dr-sbtn" data-act="' + a + '" data-cap="' + esc(code) + '">' + l + '</button>'); }
    if (s === 'pub') { btn('c-hide', 'Скрыть'); btn('c-archive', 'В архив'); } else if (s === 'hidden') btn('c-show', 'Вернуть на витрину');
    var d = upd ? new Date(upd) : null;
    return '<div class="da-cardw__f"><span>' + (d && !isNaN(d) ? 'обновлена ' + d.toLocaleDateString('ru-RU') : '') + '</span><span class="dr-btns">' + b.join('') + '</span></div>';
  };
  function withCap(code, fn) { var prev = st.cap; st.cap = code; fn(); st.cap = prev; }
  DC.acts['c-hide'] = function (b) { DC.setStatus(b.getAttribute('data-cap'), 'hidden', 'Капсула скрыта с витрины'); };
  DC.acts['c-show'] = function (b) { DC.setStatus(b.getAttribute('data-cap'), 'pub', 'Капсула снова на витрине'); };
  DC.acts['c-archive'] = function (b) { var code = b.getAttribute('data-cap'); ui.confirm({ title: 'Отправить в архив?', text: '«' + DC.capName(code) + '» останется только для просмотра.', ok: 'В архив', onOk: function () { DC.setStatus(code, 'archive', 'Капсула в архиве'); } }); };

  /* ── Б4. Расход и работы ── */
  function capSelect(act, cur) { return '<select class="input" data-of="' + act + '" aria-label="Капсула">' + (st.caps || []).map(function (c) { return '<option value="' + esc(c.code) + '"' + (c.code === cur ? ' selected' : '') + '>' + esc(DC.capName(c.code) || c.code) + '</option>'; }).join('') + '</select>'; }
  function lvlSeg(act, cur) { return '<div class="da-seg">' + DC.LEVELS.map(function (l) { return '<button type="button" class="' + (l[0] === cur ? 'is-on' : '') + '" data-act="' + act + '" data-level="' + l[0] + '">' + l[1] + '</button>'; }).join('') + '</div>'; }
  /* надёжность расчёта: насколько правило даёт число без дизайн-проекта */
  function reliab(r) {
    if (!r.qty_rule) return ['низкая', 'нет правила количества'];
    if (!r.room) return ['низкая', 'строка на всю квартиру — комната не указана'];
    if (r.qty_rule === 'п.м. по проекту') return ['низкая', 'длина берётся из проекта — на эталоне не считается'];
    if (r.posGuess) return ['низкая', 'позиция подобрана по части названия'];
    if (/м²|периметра/.test(r.qty_rule)) return ['средняя', (r.share || 1) === 1 ? 'считается от площади комнаты — проверьте долю' : 'от площади комнаты с долей ' + DC.ruNum(r.share)];
    if (!r.work_code) return ['средняя', 'нет кода работы'];
    return ['высокая', ''];
  }
  DC.sections.usage = function () {
    var h = head('Расход и работы', 'Правило, доля и код работы по каждой позиции. Расход — на эталонной квартире: ' + DC.ETALON.area + ' м², 4 комнаты, 1 санузел.');
    if (!st.caps) return h + okBox('Загружаю…');
    var code = st.uCap && st.caps.some(function (c) { return c.code === st.uCap; }) ? st.uCap : st.caps[0].code, level = st.uLevel || 'база', rows = DC.rowsFor(code, level);
    st.uCap = code;
    var top = '<div class="of-top">' + capSelect('ucap', code) + lvlSeg('ulevel', level) + '</div>';
    if (!rows) { DC.loadTable(code, level); return h + top + okBox('Загружаю состав…'); }
    var mains = rows.filter(function (r) { return r.role !== 'alt' && r.pos; }), appr = !!(st.meta[code] || {}).qtyApproved, by = {}, order = [];
    mains.forEach(function (r) { var k = DC.rowRoom(code, r); if (!by[k]) { by[k] = []; order.push(k); } by[k].push(r); });
    order.sort(function (a, b) { return (a ? DC.ROOM_NAMES.indexOf(a) : 99) - (b ? DC.ROOM_NAMES.indexOf(b) : 99); });
    var body = order.map(function (room) {
      return '<section class="da-group"><div class="da-group__h"><b>' + esc(DC.roomLabel(room)) + '</b><span>' + by[room].length + '</span></div><div class="of-rows">' + by[room].map(function (r) {
        var rl = reliab(r), eq = DC.etalonQty(r), P = POS[r.pos];
        return '<div class="of-row"><div class="of-row__t"><b>' + esc(P.name) + (r.variant ? ' · ' + esc(DC.variantLabel(r.variant, r.room)) : '') + '</b><span class="of-rel of-rel--' + (rl[0] === 'высокая' ? 'hi' : rl[0] === 'средняя' ? 'mid' : 'lo') + '">' + rl[0] + '</span></div>' +
          '<div class="of-row__f"><label>Правило<select class="input" data-u="qty_rule" data-key="' + esc(r.key) + '"><option value="">не задано</option>' + DC.RULE_LIST.map(function (x) { return '<option' + (x === r.qty_rule ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select></label>' +
          '<label>Доля<input class="input" inputmode="decimal" data-u="share" data-key="' + esc(r.key) + '" value="' + DC.ruNum(r.share || 1) + '"></label>' +
          '<label>Код работы<input class="input" data-u="work_code" data-key="' + esc(r.key) + '" value="' + esc(r.work_code || '') + '" placeholder="нет"></label></div>' +
          '<div class="of-row__q"><span>На эталоне: <b>' + (eq === null ? '—' : '≈ ' + DC.ruNum(eq) + ' ' + esc(r.unit || P.unit || '')) + '</b></span>' + (rl[1] ? '<span>' + esc(rl[1]) + '</span>' : '') + '</div></div>';
      }).join('') + '</div></section>';
    }).join('');
    return h + top + '<div class="of-appr' + (appr ? ' is-ok' : '') + '"><span>' + (appr ? '✓ Расход утверждён — у капсулы отметка «Количество ✓».' : 'Расход не утверждён — у капсулы «! Количество».') + '</span><button type="button" class="btn btn--' + (appr ? 'ghost' : 'primary') + ' btn--small" data-act="u-approve">' + (appr ? 'Снять утверждение' : 'Утвердить расход') + '</button></div>' +
      (mains.length ? body : okBox('В этом уровне нет строк с позицией.'));
  };
  DC.acts.ulevel = function (b) { st.uLevel = b.getAttribute('data-level'); DC.paint(); };
  DC.acts['u-approve'] = function () { var m = DC.meta(st.uCap); m.qtyApproved = !m.qtyApproved; m.qtyApprovedBy = ROLE.who; DC.saveMeta(); DC.paint(); ui.toast(m.qtyApproved ? 'Расход утверждён' : 'Утверждение снято'); };

  /* ── Б8. Качество данных ── */
  var QK = [['noprice', 'Цена 0 или пусто'], ['nophoto', 'Нет фото'], ['noroom', 'Строка без комнаты'], ['nopos', 'Строка без позиции'], ['dup', 'Повтор ключа'], ['cheaper', 'Премиум дешевле Базы']];
  DC.qualityCount = function () { var n = 0; (st.caps || []).forEach(function (c) { DC.LEVELS.forEach(function (l) { n += DC.check(c.code, l[0]).filter(function (i) { return QK.some(function (k) { return k[0] === i.kind; }); }).length; }); }); return n; };
  DC.sections.quality = function () {
    var h = head('Качество данных', 'Ошибки в составе всех капсул, оба уровня. Нажмите строку — открою позицию.');
    if (!st.caps) return h + okBox('Загружаю…');
    var all = [], wait = 0;
    st.caps.forEach(function (c) { DC.LEVELS.forEach(function (l) { if (!DC.rowsFor(c.code, l[0])) { if (!st.errs[DC.tkey(c.code, l[0])]) wait++; return; } DC.check(c.code, l[0]).forEach(function (i) { if (i.go.key) all.push({ code: c.code, level: l[0], i: i }); }); }); });
    var body = QK.map(function (k) {
      var list = all.filter(function (x) { return x.i.kind === k[0]; }), open = st.qOpen === k[0], lim = 60;
      return '<section class="dr-acc__i' + (open ? ' is-open' : '') + '"><button type="button" class="dr-acc__h of-qh" data-act="q-open" data-k="' + k[0] + '" aria-expanded="' + open + '"><span class="dr-acc__t"><b>' + k[1] + '</b></span><span class="of-qn' + (list.length ? ' is-warn' : '') + '">' + list.length + '</span><span class="dr-acc__ch">' + ic('chevron', 16) + '</span></button>' +
        (open ? '<div class="dr-acc__b">' + (list.length ? '<div class="da-issues">' + list.slice(0, lim).map(function (x) {
          return '<button type="button" class="da-issue" data-act="q-go" data-cap="' + esc(x.code) + '" data-level="' + x.level + '" data-key="' + esc(x.i.go.key) + '"><span><b>' + esc(DC.capName(x.code)) + ' → ' + esc(x.i.title) + '</b><span>' + lvLabel(x.level) + ' · ' + esc(x.i.text) + '</span></span><span class="da-cap__ch">' + ic('chevron') + '</span></button>';
        }).join('') + '</div>' + (list.length > lim ? '<p class="da-sub">Показаны первые ' + lim + ' из ' + list.length + '.</p>' : '') : '<div class="da-ok">Таких ошибок нет.</div>') + '</div>' : '') + '</section>';
    }).join('');
    return h + (wait ? '<p class="da-sub">Ещё загружаю состав: ' + wait + '…</p>' : '') + '<div class="dr-acc">' + body + '</div>';
  };
  DC.acts['q-open'] = function (b) { var k = b.getAttribute('data-k'); st.qOpen = st.qOpen === k ? '' : k; DC.paint(); };
  DC.acts['q-go'] = function (b) {
    var code = b.getAttribute('data-cap'), level = b.getAttribute('data-level'), key = b.getAttribute('data-key');
    st.sec = 'allcaps'; st.screen = 'cap'; st.cap = code; st.level = level; st.tab = 'rows';
    var r = (DC.rowsFor(code, level) || []).filter(function (x) { return x.key === key; })[0];
    if (r) { st.room = DC.rowRoom(code, r); st.open[st.room] = true; st.fCat = ''; var c = DC.roomCells(code, level, st.room).filter(function (x) { return x.rows.some(function (y) { return y.key === key; }); })[0]; st.flash = c && c.main ? c.main.key : key; }
    DC.paint(true);
  };

  /* ── Б7. Справочники ── */
  var SLOTS = [[1, 'Пол'], [2, 'Плитка пола'], [3, 'Стены'], [4, 'Акцентная стена'], [5, 'Плитка санузла'], [6, 'Фартук кухни'], [7, 'Двери'], [8, 'Плинтус и молдинги'], [9, 'Потолок'], [10, 'Сантехника'], [11, 'Свет'], [12, 'Фурнитура и розетки']];
  /* слот доски по умолчанию — разложено Claude по смыслу названий, проверить */
  function defSlot(p) {
    var by = { floor: 1, floor_tile: 2, walls: 3, accent_wall: 4, bath_walls: 5, backsplash: 6, door: 7, double_door: 7, baseboard: 8, ceiling_cornice: 8, moldings: 8, ceiling: 9, door_hw: 12 };
    return by[p.code] || (p.cat === 'Сантехника' ? 10 : p.cat === 'Освещение' ? 11 : p.cat === 'Выключатели и розетки' ? 12 : 0);
  }
  var FORMATS0 = [['studio', 'Студия'], ['euro2', 'Евро-2'], ['euro3', 'Евро-3'], ['euro4', 'Евро-4'], ['euro5', 'Евро-5']];
  /* типы квартир для «Материалов»: состав комнат — из справочника «Форматы квартир»; пустые форматы — по умолчанию (ДОПУЩЕНИЕ, проверить с Дианой) */
  var APT = [['studio', 'Студия', 'Кухня-гостиная, Санузел, Прихожая'], ['euro2', '1к (Евро-2)', 'Кухня-гостиная, Спальня, Санузел, Прихожая'], ['euro3', '2к (Евро-3)', 'Кухня-гостиная, Спальня, Спальня, Санузел, Прихожая'], ['euro4', '3к (Евро-4)', 'Кухня-гостиная, Спальня, Спальня, Спальня, Санузел, Прихожая'], ['euro5', '4к (Евро-5)', 'Кухня-гостиная, Спальня, Спальня, Спальня, Спальня, Санузел, Прихожая']];
  DC.aptTypes = function () { var f = dict().formats; return APT.map(function (a) { var x = f.filter(function (y) { return y.code === a[0]; })[0], rs = (x && x.rooms) || a[2]; return { code: a[0], name: a[1], rooms: rs.split(',').map(function (r) { return r.trim(); }).filter(Boolean), fromDict: !!(x && x.rooms) }; }); };
  function dict() {
    var d = DC.db('dict', null);
    if (!d) {
      d = DC.store().extra.dict = { rooms: {}, pos: {}, added: [], formats: FORMATS0.map(function (f) { return { code: f[0], name: f[1], rooms: '', shares: '', windows: '' }; }), log: [] };
      /* Евро-3 — пример из шапки листа «Форматы квартир»; остальные форматы в таблице пустые */
      d.formats[2] = { code: 'euro3', name: 'Евро-3', rooms: 'Кухня-гостиная, Спальня, Спальня, Санузел, Прихожая', shares: '0,40; 0,22; 0,18; 0,08; 0,12', windows: '1; 1; 1; 0; 0' };
    }
    return d;
  }
  /* правки справочника позиций применяются к общему списку — их видят «Комнаты», «Проверка» и «Расход» */
  function applyDict() {
    var d = dict();
    (d.added || []).forEach(function (a) { if (!POS[a.code]) { var p = { code: a.code, name: a.name, cat: a.cat, rooms: a.rooms.slice(), rule: a.rule, unit: a.unit, work: a.work || '', layer: a.layer || 'предмет', olds: [] }; KB.list.push(p); POS[p.code] = p; } });
    Object.keys(d.pos).forEach(function (code) { var p = POS[code], o = d.pos[code]; if (!p) return; Object.keys(o).forEach(function (f) { p[f] = f === 'rooms' || f === 'olds' ? o[f].slice() : o[f]; }); });
    KB.list.forEach(function (p) { if (p.slot == null) p.slot = defSlot(p); });
    Object.keys(d.rooms).forEach(function (code) { var r = KB.rooms.filter(function (x) { return x[0] === code; })[0]; if (r && d.rooms[code].type) r[2] = d.rooms[code].type; });
  }
  applyDict();
  function log(table, row, field, from, to) { dict().log.unshift({ table: table, row: row, field: field, from: String(from == null ? '' : from), to: String(to == null ? '' : to), by: ROLE.who, at: new Date().toISOString() }); }
  function usedIn(code) { var n = 0; (st.caps || []).forEach(function (c) { DC.LEVELS.forEach(function (l) { (DC.rowsFor(c.code, l[0]) || []).forEach(function (r) { if (r.pos === code) n++; }); }); }); return n; }
  function shareSum(f) { var a = String(f.shares || '').split(';').map(function (x) { return Number(x.trim().replace(',', '.')); }).filter(function (x) { return !isNaN(x); }); return a.length ? Math.round(a.reduce(function (s, x) { return s + x; }, 0) * 1000) / 1000 : null; }
  function formatErr(f) {
    var n = String(f.rooms || '').split(',').filter(function (x) { return x.trim(); }).length, sh = String(f.shares || '').split(';').filter(function (x) { return x.trim(); }).length, s = shareSum(f);
    if (!n) return 'не заполнен';
    if (sh !== n) return 'долей ' + sh + ', а комнат ' + n;
    if (s !== 1) return 'сумма долей ' + DC.ruNum(s) + ', должна быть 1';
    return '';
  }
  var DT = [['rooms', 'Комнаты'], ['pos', 'Позиции'], ['formats', 'Форматы квартир'], ['slots', 'Слоты доски'], ['log', 'Журнал правок']];
  DC.sections.dicts = function () {
    var d = dict(), tab = st.dTab || 'rooms', h = head('Справочники', 'Общие для всех капсул. Каждая правка попадает в журнал.');
    var tabs = '<div class="da-chips of-dt">' + DT.map(function (t) { return DC.chip('d-tab', t[0], t[1] + (t[0] === 'log' ? ' · ' + d.log.length : ''), tab === t[0]); }).join('') + '</div>', body = '';
    if (tab === 'rooms') body = '<div class="da-issues">' + KB.rooms.map(function (r) { return '<button type="button" class="da-issue" data-act="d-room" data-code="' + r[0] + '"><span><b>' + esc(r[1]) + '</b><span>' + esc(r[0]) + ' · ' + esc(r[2]) + '</span></span><span class="da-cap__ch">' + ic('chevron') + '</span></button>'; }).join('') + '</div>';
    else if (tab === 'pos') {
      var q = DC.S.fmt ? (st.dQ || '') : '', list = KB.list.filter(function (p) { return !q || (p.name + ' ' + p.cat + ' ' + p.code).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
      body = '<input class="input" id="of-dq" placeholder="Найти позицию" value="' + esc(q) + '" autocomplete="off"><div class="da-issues">' + list.map(function (p) {
        return '<button type="button" class="da-issue' + (p.hidden ? ' is-hidden' : '') + '" data-act="d-pos" data-code="' + p.code + '"><span><b>' + esc(p.name) + (p.hidden ? ' · скрыта' : '') + '</b><span>' + esc(p.cat) + ' · ' + esc(p.rule) + ', ' + esc(p.unit) + (p.work ? ' · ' + esc(p.work) : ' · без кода работы') + '</span></span><span class="da-cap__ch">' + ic('chevron') + '</span></button>';
      }).join('') + '</div><button type="button" class="btn btn--ghost btn--small da-add" data-act="d-pos-new">＋ позиция</button>';
    } else if (tab === 'formats') body = '<div class="da-issues">' + d.formats.map(function (f, i) { var e = formatErr(f); return '<button type="button" class="da-issue" data-act="d-format" data-i="' + i + '"><span><b>' + esc(f.name) + '</b><span>' + (f.rooms ? esc(f.rooms) : 'состав комнат не указан') + '</span>' + (e ? '<span class="of-err">! ' + esc(e) + '</span>' : '<span class="of-ok">✓ сумма долей 1</span>') + '</span><span class="da-cap__ch">' + ic('chevron') + '</span></button>'; }).join('') + '</div><p class="da-sub">В гугл-таблице заполнен только пример для Евро-3 — остальные форматы пустые.</p>';
    else if (tab === 'slots') body = '<div class="da-issues">' + SLOTS.map(function (s) { var ps = KB.list.filter(function (p) { return p.slot === s[0]; }); return '<div class="rv-d"><b>' + s[0] + ' · ' + esc(s[1]) + '</b><span>' + (ps.length ? esc(ps.map(function (p) { return p.name; }).join(', ')) : 'позиций нет') + '</span></div>'; }).join('') + '</div><p class="da-sub">Слот меняется в карточке позиции. Раскладку по умолчанию я сделала по смыслу названий — проверьте.</p>';
    else body = d.log.length ? '<div class="da-issues">' + d.log.slice(0, 100).map(function (l) { return '<div class="rv-d"><b>' + esc(l.table) + ' · ' + esc(l.row) + ' · ' + esc(l.field) + '</b><span><s>' + esc(l.from || 'пусто') + '</s> → ' + esc(l.to || 'пусто') + '</span><span>' + esc(l.by) + ' · ' + new Date(l.at).toLocaleString('ru-RU') + '</span></div>'; }).join('') + '</div>' : okBox('Правок пока не было.');
    return h + tabs + body;
  };
  DC.acts['d-tab'] = function (b) { st.dTab = b.getAttribute('data-v'); DC.paint(); };
  function sel(id, label, opts, cur) { return '<div class="field"><label for="' + id + '">' + label + '</label><select class="input" id="' + id + '">' + opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>'; }
  DC.acts['d-room'] = function (b) {
    var r = KB.rooms.filter(function (x) { return x[0] === b.getAttribute('data-code'); })[0];
    DC.sheet({ title: r[1], html: '<p class="small muted">Код ' + esc(r[0]) + ' постоянный — на него ссылаются капсулы.</p>' + sel('of-rt', 'Тип', ['жилая', 'мокрая', 'общая'], r[2]), actions: [{ label: 'Сохранить', kind: 'primary', onClick: function (ev, api) {
      var v = api.el.querySelector('#of-rt').value; if (v !== r[2]) { log('Комнаты', r[1], 'тип', r[2], v); dict().rooms[r[0]] = { type: v }; r[2] = v; DC.saveStore(); DC.paint(); }
    } }] });
  };
  var PF = [['name', 'Название'], ['cat', 'Категория сметы'], ['rule', 'Правило количества'], ['unit', 'Единица'], ['work', 'Работа по умолчанию (код)'], ['layer', 'Слой'], ['slot', 'Слот доски']];
  function posForm(p) {
    var cats = []; KB.list.forEach(function (x) { if (cats.indexOf(x.cat) < 0) cats.push(x.cat); });
    return DC.field('of-name', 'Название', p.name) + sel('of-cat', 'Категория сметы', cats, p.cat) +
      '<div class="field"><span class="of-lbl">Где бывает</span><div class="dr-rchecks">' + DC.ROOM_NAMES.map(function (r) { return '<label class="dr-check"><input type="checkbox" data-room="' + esc(r) + '"' + (p.rooms.indexOf(r) >= 0 ? ' checked' : '') + '> ' + esc(r) + '</label>'; }).join('') + '</div></div>' +
      sel('of-rule', 'Правило количества', DC.RULE_LIST, p.rule) + DC.field('of-unit', 'Единица', p.unit) + DC.field('of-work', 'Работа по умолчанию (код)', p.work, 'нет в прайсе') + sel('of-layer', 'Слой', ['материал', 'предмет'], p.layer) +
      sel('of-slot', 'Слот доски', [[0, 'нет']].concat(SLOTS.map(function (s) { return [s[0], s[0] + ' · ' + s[1]]; })), p.slot || 0) + DC.field('of-olds', 'Старые названия (через «;»)', (p.olds || []).join('; '));
  }
  function readPos(api) {
    var v = function (id) { return api.el.querySelector('#' + id).value.trim(); };
    return { name: v('of-name'), cat: v('of-cat'), rooms: Array.prototype.map.call(api.el.querySelectorAll('.dr-rchecks input:checked'), function (i) { return i.getAttribute('data-room'); }), rule: v('of-rule'), unit: v('of-unit'), work: v('of-work'), layer: v('of-layer'), slot: Number(v('of-slot')), olds: v('of-olds').split(';').map(function (x) { return x.trim(); }).filter(Boolean) };
  }
  DC.acts['d-pos'] = function (b) {
    var p = POS[b.getAttribute('data-code')], used = usedIn(p.code), d = dict(), isNew = (d.added || []).some(function (a) { return a.code === p.code; });
    DC.sheet({ title: p.name, html: '<p class="small muted">Код ' + esc(p.code) + ' · в капсулах: ' + DC.plural(used, 'строка', 'строки', 'строк') + '</p>' + posForm(p), actions: [
      { label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) {
        var n = readPos(api); if (!n.name) { ui.toast('Напишите название', 'error'); return; }
        var o = d.pos[p.code] = d.pos[p.code] || {};
        Object.keys(n).forEach(function (f) { var a = Array.isArray(p[f]) ? p[f].join(', ') : p[f], c = Array.isArray(n[f]) ? n[f].join(', ') : n[f], same = Array.isArray(n[f]) ? (p[f] || []).slice().sort().join('|') === n[f].slice().sort().join('|') : String(a == null ? '' : a) === String(c); if (!same) { log('Позиции', p.name, (PF.filter(function (x) { return x[0] === f; })[0] || [f, f === 'rooms' ? 'Где бывает' : 'Старые названия'])[1], a, c); o[f] = n[f]; p[f] = n[f]; } });
        DC.saveStore(); api.close(); DC.paint(); ui.toast('Позиция сохранена');
      } },
      { label: p.hidden ? 'Вернуть в справочник' : 'Скрыть', kind: 'ghost', onClick: function () { log('Позиции', p.name, 'скрыта', p.hidden ? 'да' : 'нет', p.hidden ? 'нет' : 'да'); (d.pos[p.code] = d.pos[p.code] || {}).hidden = !p.hidden; p.hidden = !p.hidden; DC.saveStore(); DC.paint(); } },
      { label: 'Удалить', kind: 'link', close: false, onClick: function (ev, api) {
        if (used) { ui.toast('Удалить нельзя: позиция стоит в капсулах (' + DC.plural(used, 'строка', 'строки', 'строк') + '). Можно только скрыть.', 'error'); return; }
        if (!isNew) { ui.toast('Удалить можно только позицию, добавленную здесь. Эту можно скрыть.', 'error'); return; }
        log('Позиции', p.name, 'удалена', p.name, ''); d.added = d.added.filter(function (a) { return a.code !== p.code; }); delete d.pos[p.code]; KB.list.splice(KB.list.indexOf(p), 1); delete POS[p.code]; DC.saveStore(); api.close(); DC.paint();
      } }] });
  };
  DC.acts['d-pos-new'] = function () {
    var blank = { name: '', cat: 'Мебель покупная', rooms: [], rule: 'шт на комнату', unit: 'шт', work: '', layer: 'предмет', slot: 0, olds: [] };
    DC.sheet({ title: 'Новая позиция', html: posForm(blank), actions: [{ label: 'Добавить', kind: 'primary', close: false, onClick: function (ev, api) {
      var n = readPos(api); if (!n.name) { ui.toast('Напишите название', 'error'); return; } if (!n.rooms.length) { ui.toast('Отметьте, где позиция бывает', 'error'); return; }
      n.code = 'x_' + Date.now().toString(36); dict().added.push(n); log('Позиции', n.name, 'добавлена', '', n.name); applyDict(); DC.saveStore(); api.close(); DC.paint(); ui.toast('Позиция добавлена');
    } }] });
  };
  DC.acts['d-format'] = function (b) {
    var f = dict().formats[Number(b.getAttribute('data-i'))];
    DC.sheet({ title: f.name, html: DC.field('of-fr', 'Состав комнат (через запятую)', f.rooms, 'Кухня-гостиная, Спальня, Санузел, Прихожая') + DC.field('of-fs', 'Доля площади каждой комнаты (через «;»)', f.shares, '0,40; 0,30; 0,10; 0,20') + DC.field('of-fw', 'Число окон (через «;»)', f.windows, '1; 1; 0; 0') + '<p class="field__error" id="of-fe" hidden></p>',
      actions: [{ label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) {
        var v = function (id) { return api.el.querySelector('#' + id).value.trim(); }, n = { rooms: v('of-fr'), shares: v('of-fs'), windows: v('of-fw') }, e = formatErr(n), err = api.el.querySelector('#of-fe');
        if (e) { err.textContent = 'Ошибка: ' + e; err.hidden = false; return; }
        [['rooms', 'состав комнат'], ['shares', 'доли площади'], ['windows', 'окна']].forEach(function (k) { if (f[k[0]] !== n[k[0]]) { log('Форматы квартир', f.name, k[1], f[k[0]], n[k[0]]); f[k[0]] = n[k[0]]; } });
        DC.saveStore(); api.close(); DC.paint(); ui.toast('Формат сохранён');
      } }] });
  };

  /* поля выбора и правки в разделах (select / input вне шторок) */
  var root = document.getElementById('da-root');
  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.getAttribute('data-of') === 'ucap') { st.uCap = t.value; DC.LEVELS.forEach(function (l) { DC.loadTable(t.value, l[0]); }); DC.paint(); return; }
    var f = t.getAttribute('data-u'); if (!f) return;
    var key = t.getAttribute('data-key'), val = t.value.trim();
    if (f === 'share') { val = Number(val.replace(',', '.')); if (!(val > 0)) { ui.toast('Доля — число больше нуля', 'error'); DC.paint(); return; } }
    withCap(st.uCap, function () { DC.patchRow(st.uCap, st.uLevel || 'база', key, (function () { var o = {}; o[f] = val; return o; })()); });
    DC.meta(st.uCap).qtyApproved = false; DC.saveMeta(); DC.paint();
  });
  root.addEventListener('input', function (e) { if (e.target.id !== 'of-dq') return; st.dQ = e.target.value; DC.paint(); var i = document.getElementById('of-dq'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } });
  DC.paint();
})();
