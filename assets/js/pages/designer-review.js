/* Кабинет дизайнера, шаг 5: «Проверка» (обязательное и предупреждения), очередь и ревью главного дизайнера с замечаниями, «Что изменилось» у версии 2+. */
(function () {
  var DC = window.SOVE_DC; if (!DC) return;
  var st = DC.st, ROLE = DC.ROLE, esc = DC.esc, ui = DC.ui, ic = DC.ic, POS = DC.POS;

  /* ── проверка ── */
  var KINDS = [['norender', 'Нет рендера у комнаты'], ['noplan', 'Нет планировки'], ['nodna', 'Нет ДНК'], ['empty', 'Состав пустой'], ['nozone', 'Материал без зон'], ['noprod', 'Позиция без товара'], ['noprem', 'Нет Премиума'], ['flatempty', '«Зависит от квартиры» без товара'], ['share', 'Доли в зоне больше 1'], ['noroom', 'Строка без комнаты'], ['nopos', 'Нет позиции'], ['badzone', 'Позиция в зоне, где её не бывает'], ['dup', 'Повтор основной строки'], ['noprice', 'Цена 0 или пусто'],
    ['nophoto', 'Нет фото'], ['same', 'Премиум = База'], ['cheaper', 'Премиум дешевле Базы'], ['partner', 'Партнёров METOD меньше 70%'], ['link', 'Товар ссылкой'], ['repeat', 'Повтор строки в таблице']];
  var MUST = { norender: 1, noplan: 1, nodna: 1, empty: 1, noprod: 1, noroom: 1, nopos: 1, dup: 1, noprice: 1, nozone: 1, noprem: 1, flatempty: 1, share: 1 };
  function other(l) { return l === 'база' ? 'премиум' : 'база'; }
  DC.check = function (code, level) {
    var rows = DC.rowsFor(code, level); if (!rows) return [];
    var out = [], m = st.meta[code] || {};
    function add(kind, title, text, go) { out.push({ kind: kind, must: !!MUST[kind], title: title, text: text, go: go || {} }); }
    (DC.roomsNoRender ? DC.roomsNoRender(code) : []).forEach(function (r) { add('norender', r, 'добавьте рендер или подпишите комнатой один из загруженных', { tab: 'passport' }); });
    if (!(m.plan && m.plan.file)) add('noplan', 'Планировка', 'загрузите файл планировки во вкладке «Интерьер»', { tab: 'passport' });
    if (!(m.dna && m.dna.length === 7)) add('nodna', 'ДНК', 'соберите 7 цветов по рендерам во вкладке «Интерьер»', { tab: 'passport' });
    var sm = DC.slotsMissing ? DC.slotsMissing(code) : []; if (sm.length) add('nodna', 'Материалы ДНК', 'не заполнено ' + sm.length + ' из 12: ' + sm.join(', '), { tab: 'passport' });
    if (!rows.length) add('empty', DC.LEVELS.filter(function (l) { return l[0] === level; })[0][1], 'в составе нет ни одной позиции', { tab: 'rows' });
    /* состав проверяется по карточкам материалов; построчная проверка ниже — запасная, пока карточки не собраны */
    var mi = DC.matIssues ? DC.matIssues(code, level) : null;
    if (mi) { mi.forEach(function (i) { out.push({ kind: i.kind, must: !!MUST[i.kind], title: i.title, text: i.text, go: i.go }); }); return out; }
    var oth = {}; (DC.rowsFor(code, other(level)) || []).forEach(function (r) { oth[r.key] = r; });
    var seen = {}, mains = 0, partner = 0;
    rows.forEach(function (r) {
      var p = r.product, name = (r.pos && POS[r.pos] ? POS[r.pos].name : r.title) + (r.room ? ' · ' + r.room : ''), go = { tab: 'rows', key: r.key };
      if (!r.pos) add('nopos', r.title, 'нет в справочнике позиций — выберите позицию или попросите главного дизайнера добавить', go);
      if (!r.room) add('noroom', name, 'строка записана на всю квартиру — разнесите по комнатам («В другие комнаты»)', go);
      if (r.dup) add('repeat', name, 'в таблице строка «' + r.title + '» повторяется — считаю её заменой, проверьте', go);
      if (r.role === 'alt') return;
      mains++;
      if (r.pos && r.room && r.variant) { var k = r.room + '|' + r.pos + '|' + r.variant.by + '|' + r.variant.value; if (seen[k]) add('dup', name, 'два основных товара для варианта «' + DC.variantLabel(r.variant, r.room) + '»', go); seen[k] = 1; }
      if (!p) { add('noprod', name, 'товар не выбран — в бюджет уйдёт 0 ₽', go); return; }
      if (!DC.price(p)) add('noprice', name, (p.name || 'товар') + ' — цены нет, в бюджет уйдёт 0 ₽', go);
      if (!p.img) add('nophoto', name, (p.name || 'товар') + ' — карточка клиента без картинки', go);
      if (p.source === 'link') add('link', name, (p.name || 'товар') + ' — цена по ссылке не обновляется сама', go);
      if (p.price_metod > 0 && p.price_retail > p.price_metod) partner++;
      var o = oth[r.key];
      if (level === 'премиум' && o && o.product) {
        if (DC.sameProduct(p, o.product)) add('same', name, 'тот же товар, что в Базе', go);
        else if (DC.price(p) && DC.price(o.product) && DC.price(p) < DC.price(o.product)) add('cheaper', name, 'Премиум ' + DC.F.rub(DC.price(p)) + ' дешевле Базы ' + DC.F.rub(DC.price(o.product)), go);
      }
    });
    if (mains && partner / mains < 0.7) add('partner', Math.round(partner / mains * 100) + '% позиций с ценой METOD ниже розницы', 'для публикации нужно не меньше 70%', { tab: 'rows' });
    return out;
  };
  /* обязательные замечания по обоим уровням (паспортные — один раз) */
  DC.blockers = function (code) {
    var out = [], seen = {};
    DC.LEVELS.forEach(function (l) { DC.check(code, l[0]).forEach(function (i) { if (!i.must) return; var k = i.go.mat ? i.kind + i.go.mat + i.text : i.go.key ? l[0] + i.kind + i.go.key : i.kind + i.title; if (!seen[k]) { seen[k] = 1; out.push(i); } }); });
    return out;
  };
  DC.checkAll = function (code) {
    var out = [], seen = {};
    DC.LEVELS.forEach(function (l) { DC.check(code, l[0]).forEach(function (i) { var k = i.go.mat ? i.kind + i.go.mat + i.text : i.go.key ? l[0] + i.kind + i.go.key : i.kind + i.title + i.text; if (seen[k]) return; seen[k] = 1; var x = {}; Object.keys(i).forEach(function (q) { x[q] = i[q]; }); if (/^(noprem|same|cheaper)$/.test(i.kind) || (l[0] === 'премиум' && i.go.key)) x.title = 'Премиум · ' + i.title; out.push(x); }); });
    return out;
  };
  DC.viewCheckV2 = function (code, level) {
    var ok = DC.tkey(code, other(level)); if (!st.tables[ok] && !st.errs[ok]) DC.loadTable(code, other(level));
    var iss = DC.checkAll(code), must = iss.filter(function (i) { return i.must; }), warn = iss.filter(function (i) { return !i.must; });
    function group(list) {
      return KINDS.map(function (kd) {
        var l = list.filter(function (i) { return i.kind === kd[0]; }); if (!l.length) return '';
        return '<section class="da-group"><div class="da-group__h"><b>' + kd[1] + '</b><span>' + l.length + '</span></div><div class="da-issues">' + l.map(function (i) {
          return '<button type="button" class="da-issue" data-act="cgoto" data-tab="' + (i.go.tab || 'rows') + '" data-key="' + esc(i.go.key || '') + '" data-mat="' + esc(i.go.mat || '') + '"><span><b>' + esc(i.title) + '</b><span>' + esc(i.text) + '</span></span><span class="da-cap__ch">' + ic('chevron') + '</span></button>';
        }).join('') + '</div></section>';
      }).join('');
    }
    var lv = DC.LEVELS.filter(function (l) { return l[0] === level; })[0][1];
    if (!iss.length) return '<div class="da-issues"><div class="da-ok">Замечаний нет — уровень «' + lv + '» готов.</div></div>';
    return '<p class="da-sub">Уровень «' + lv + '». Нажмите строку — открою место, где это правится.</p>' +
      (must.length ? '<h2 class="rv-h rv-h--must">Обязательно · ' + must.length + '<span>без этого капсулу не отправить и не опубликовать</span></h2>' + group(must) : '<div class="da-issues"><div class="da-ok">Обязательное исправлено.</div></div>') +
      (warn.length ? '<h2 class="rv-h">Предупреждения · ' + warn.length + '<span>отправке не мешают</span></h2>' + group(warn) : '');
  };
  DC.capTabs.check = function (code, level) { return DC.viewCheckV2(code, level); };
  DC.acts.cgoto = function (b) {
    var code = st.cap, tab = b.getAttribute('data-tab'), key = b.getAttribute('data-key'), m = st.meta[code] || {};
    var mid = b.getAttribute('data-mat'); if (mid && DC.openMaterial) { DC.openMaterial(code, mid, mid && !(DC.matById(code, mid) || { zones: [1] }).zones.length ? { focus: 'zones' } : null); return; } /* замечание по карточке — открываем карточку поверх Проверки */
    if (m.wizard) { m.wizard = tab === 'passport' ? 1 : 3; DC.saveMeta(); }
    st.tab = tab;
    if (key) { var r = (DC.rowsFor(code, st.level) || []).filter(function (x) { return x.key === key; })[0]; if (r) { st.room = DC.rowRoom(code, r); st.open[st.room] = true; st.fCat = ''; var c = DC.roomCells(code, st.level, st.room).filter(function (x) { return x.rows.some(function (y) { return y.key === key; }); })[0]; st.flash = c && c.main ? c.main.key : key; } }
    DC.paint(); if (!key) window.scrollTo(0, 0);
  };
  /* отправка и публикация — только без обязательных замечаний */
  function gate(code, word) { var n = DC.blockers(code).length; if (!n) return true; st.tab = 'check'; DC.paint(); ui.toast('Нельзя ' + word + ': ' + DC.plural(n, 'обязательное замечание', 'обязательных замечания', 'обязательных замечаний'), 'error'); return false; }
  DC.acts['st-send'] = function () { if (gate(st.cap, 'отправить')) DC.setStatus(st.cap, 'review', 'Отправлено на проверку'); };
  DC.acts['st-pub'] = function () { var code = st.cap; if (!gate(code, 'опубликовать')) return; snapshot(code); review(code).comments = []; DC.setStatus(code, 'pub', 'Капсула опубликована'); };
  DC.acts['st-fix'] = function () { var code = st.cap; if (!review(code).comments.length) { ui.toast('Оставьте хотя бы одно замечание — нажмите на комнату, позицию или блок паспорта', 'error'); return; } DC.setStatus(code, 'fix', 'Капсула возвращена дизайнеру с замечаниями'); };
  DC.acts['wz-send'] = function () { var code = st.cap; if (DC.blockers(code).length) { ui.toast('Сначала исправьте обязательное', 'error'); return; } DC.meta(code).wizard = null; DC.setStatus(code, 'review', 'Капсула отправлена на проверку'); };

  /* ── замечания главного дизайнера ── */
  function review(code) { var m = DC.meta(code); if (!m.review) m.review = { comments: [] }; return m.review; }
  function notes(code, target, ref) { var m = st.meta[code]; return m && m.review ? m.review.comments.filter(function (c) { return c.target === target && c.ref === ref; }) : []; }
  function notesHtml(list) { return list.map(function (c) { return '<div class="da-note"><b>Замечание главного дизайнера</b><span>' + esc(c.text) + '</span></div>'; }).join(''); }
  DC.reviewMode = function () { return ROLE.chief && st.sec === 'review' && !!st.cap && DC.statusOf(st.cap) === 'review'; };
  DC.readOnly = function (code) { return ROLE.chief && st.sec === 'review' && st.cap === code; }; /* ревью — только чтение и замечания; править главный может из «Все капсулы» */
  DC.noteBlock = function (code, target, ref, label) {
    return notesHtml(notes(code, target, ref)) + (DC.reviewMode() ? '<button type="button" class="dr-sbtn rv-add" data-act="rv-note" data-target="' + target + '" data-ref="' + esc(ref) + '" data-label="' + esc(label) + '">Оставить замечание</button>' : '');
  };
  DC.roomExtra = function (code, room) { return room ? DC.noteBlock(code, 'room', room, 'Комната «' + room + '»') : ''; };
  DC.cellNote = function (cell) { var n = notes(st.cap, 'item', cell.room + '|' + cell.pos).length; return n ? '<span class="dr-b dr-b--note">замечание' + (n > 1 ? ' · ' + n : '') + '</span>' : ''; };
  DC.itemNotes = function (code, room, pos) { return notesHtml(notes(code, 'item', room + '|' + pos)); };
  DC.commentSheet = function (target, ref, label) {
    var code = st.cap, list = notes(code, target, ref);
    DC.sheet({ title: 'Замечание', html: '<p class="small muted">' + esc(label) + '</p>' + (list.length ? '<div class="rv-list">' + list.map(function (c) { return '<div class="da-note"><span>' + esc(c.text) + '</span><button type="button" class="rv-del" data-id="' + c.id + '">Убрать</button></div>'; }).join('') + '</div>' : '') +
      '<div class="field"><label for="rv-text">Что поправить</label><textarea class="input" id="rv-text" rows="3"></textarea></div>',
      actions: [{ label: 'Оставить замечание', kind: 'primary', close: false, onClick: function (ev, api) {
        var t = api.el.querySelector('#rv-text').value.trim(); if (!t) { ui.toast('Напишите замечание', 'error'); return; }
        review(code).comments.push({ id: Date.now().toString(36), target: target, ref: ref, text: t, by: ROLE.who, at: new Date().toISOString() }); DC.saveMeta(); api.close(); DC.paint(); ui.toast('Замечание оставлено');
      } }, { label: 'Закрыть', kind: 'link' }] }).el.addEventListener('click', function (e) {
      var d = e.target.closest('.rv-del'); if (!d) return; var r = review(code); r.comments = r.comments.filter(function (c) { return c.id !== d.getAttribute('data-id'); }); DC.saveMeta(); d.closest('.da-note').remove(); DC.paint();
    });
  };
  DC.acts['rv-note'] = function (b) { DC.commentSheet(b.getAttribute('data-target'), b.getAttribute('data-ref'), b.getAttribute('data-label')); };

  /* ── версии: снимок опубликованного и «Что изменилось» ── */
  function rowSnap(r) { var p = r.product; return { t: (r.pos && POS[r.pos] ? POS[r.pos].name : r.title), room: r.room || '', role: r.role, p: p ? (p.name || '') : '', id: p ? (p.id || '') : '' }; }
  function snapshot(code) {
    var s = { levels: {}, renders: (DC.meta(code).renders || []).map(function (r) { return r.url; }), hasRenders: !!DC.meta(code).renders };
    DC.LEVELS.forEach(function (l) { var o = {}; (DC.rowsFor(code, l[0]) || []).forEach(function (r) { o[r.key] = rowSnap(r); }); s.levels[l[0]] = o; });
    DC.meta(code).pubSnap = s;
  }
  /* база сравнения: снимок последней публикации; если его нет (капсула опубликована до кабинета) — состав из таблицы без правок */
  function baseline(code, level) {
    var m = st.meta[code] || {}; if (m.pubSnap && m.pubSnap.levels[level]) return m.pubSnap.levels[level];
    var t = st.tables[DC.tkey(code, level)], o = {}; if (t) t.rows.forEach(function (r) { o[r.key] = rowSnap(r); }); return o;
  }
  function diff(code, level) {
    var base = baseline(code, level), cur = {}, out = { added: [], removed: [], replaced: [] };
    (DC.rowsFor(code, level) || []).forEach(function (r) { cur[r.key] = rowSnap(r); });
    Object.keys(cur).forEach(function (k) { var a = base[k], b = cur[k]; if (!a) out.added.push(b); else if (a.p !== b.p || a.id !== b.id) out.replaced.push({ a: a, b: b }); else if (a.room !== b.room) out.replaced.push({ a: a, b: b, moved: true }); });
    Object.keys(base).forEach(function (k) { if (!cur[k]) out.removed.push(base[k]); });
    return out;
  }
  DC.extraTabs = function (code) { return DC.versionOf(code) > 1 ? [['diff', 'Что изменилось']] : []; };
  DC.capTabs.diff = function (code, level) {
    var d = diff(code, level), m = st.meta[code] || {}, snapR = m.pubSnap && m.pubSnap.hasRenders ? m.pubSnap.renders : null, curR = m.renders ? m.renders.map(function (r) { return r.url; }) : null;
    var rAdd = curR && snapR ? curR.filter(function (u) { return snapR.indexOf(u) < 0; }).length : curR && !snapR ? null : 0, rDel = curR && snapR ? snapR.filter(function (u) { return curR.indexOf(u) < 0; }).length : 0;
    function li(x) { return '<div class="rv-d"><b>' + esc(x.t) + (x.room ? ' · ' + esc(x.room) : '') + (x.role === 'alt' ? ' · замена' : '') + '</b><span>' + esc(x.p || 'без товара') + '</span></div>'; }
    function sec(t, cls, list, fn) { return list.length ? '<section class="da-group"><div class="da-group__h"><b class="' + cls + '">' + t + '</b><span>' + list.length + '</span></div><div class="da-issues">' + list.map(fn).join('') + '</div></section>' : ''; }
    var body = sec('Добавлено', 'rv-plus', d.added, li) + sec('Удалено', 'rv-minus', d.removed, li) +
      sec('Заменено', '', d.replaced, function (x) { return '<div class="rv-d"><b>' + esc(x.b.t) + (x.b.room ? ' · ' + esc(x.b.room) : '') + '</b><span>' + (x.moved ? 'комната: ' + esc(x.a.room || 'без комнаты') + ' → ' + esc(x.b.room || 'без комнаты') : '<s>' + esc(x.a.p || 'без товара') + '</s> → ' + esc(x.b.p || 'без товара')) + '</span></div>'; });
    var rend = rAdd === null ? '<p class="da-sub">Рендеры: набор изменён после публикации.</p>' : (rAdd || rDel) ? '<p class="da-sub">Рендеры: добавлено ' + rAdd + ', убрано ' + rDel + '.</p>' : '<p class="da-sub">Рендеры не менялись.</p>';
    return '<p class="da-sub">Версия ' + DC.versionOf(code) + ' против версии ' + (DC.pubVersionOf(code) || DC.versionOf(code) - 1) + ' на витрине, уровень «' + DC.LEVELS.filter(function (l) { return l[0] === level; })[0][1] + '».</p>' + (body || '<div class="da-issues"><div class="da-ok">В составе этого уровня изменений нет.</div></div>') + rend;
  };

  /* ── очередь главного дизайнера ── */
  function waitText(iso) { if (!iso) return ''; var d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5); return d < 1 ? 'ждёт меньше дня' : 'ждёт ' + DC.plural(d, 'день', 'дня', 'дней'); }
  DC.waitText = waitText;
  DC.reviewQueue = function () { return (st.caps || []).filter(function (c) { return DC.statusOf(c.code) === 'review'; }).sort(function (a, b) { return String((st.meta[a.code] || {}).sentAt || '').localeCompare(String((st.meta[b.code] || {}).sentAt || '')); }); };
  DC.sections.review = function () {
    var q = DC.reviewQueue(), h = '<div class="da-head"><div class="stack stack--1"><h1 class="h1 h1--sm da-title">Проверка</h1><p class="da-sub">Капсулы, которые дизайнеры отправили на проверку. Самая давняя — первой.</p></div></div>';
    if (!st.caps) return h + '<div class="da-issues"><div class="da-ok">Загружаю…</div></div>';
    if (!q.length) return h + '<div class="da-issues"><div class="da-ok">Очередь пуста — на проверке ничего нет.</div></div>';
    return h + '<div class="rv-q">' + q.map(function (c) {
      var m = st.meta[c.code] || {}, rd = DC.readiness(c.code), warn = 0; DC.LEVELS.forEach(function (l) { warn += DC.check(c.code, l[0]).filter(function (i) { return !i.must; }).length; });
      return '<button type="button" class="rv-qi" data-act="open" data-cap="' + esc(c.code) + '"><span class="rv-qi__pic"' + (DC.cover(c.code) ? ' style="background-image:' + esc(DC.cssUrl(DC.cover(c.code))) + '"' : '') + '></span>' +
        '<span class="rv-qi__b"><b>' + esc(DC.capName(c.code)) + '</b><span>' + esc(DC.designerOf(c.code)) + ' · версия ' + DC.versionOf(c.code) + '</span><span>' + (m.sentAt ? 'отправлена ' + new Date(m.sentAt).toLocaleDateString('ru-RU') + ' · ' + waitText(m.sentAt) : '') + '</span>' +
        '<span class="rv-qi__m">' + DC.MARKS.map(function (mk) { var r = rd[mk[0]]; return '<i class="' + (r.ok ? 'is-ok' : 'is-warn') + '">' + (r.ok ? '✓' : '!') + ' ' + mk[1] + '</i>'; }).join('') + '</span><span>' + DC.plural(warn, 'предупреждение', 'предупреждения', 'предупреждений') + '</span></span></button>';
    }).join('') + '</div>';
  };
  DC.paint();
})();
