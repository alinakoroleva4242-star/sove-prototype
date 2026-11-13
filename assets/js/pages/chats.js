/* Чаты — как в мессенджере (Валерия 05.11: «сделай чат с поставщиком красивее, ничего не понятно»).
   chats.html — список диалогов: поддержка, поставщики, с кем уже переписывались, дизайнер, команда ремонта.
   chats.html?kind=… — переписка: шапка с аватаркой и кто это, заказ с этим поставщиком, сообщения пузырями со временем,
   быстрые вопросы в пустом чате, поле ввода со скрепкой. Ссылки ?kind=partner&partner=<id>&name=<имя> открывают переписку сразу.
   Вся переписка с поставщиком — внутри SOVEAPP, в мессенджер не уходит (Вика 05.11: «чаты все у нас»).
   Чаты услуг (дизайнер, команда) открываются после оформления — до этого показываем, что за ними стоит. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var root = document.getElementById('ch-root'); if (!root) return;
  var KEY = 'sove.proto.chats';
  var LIST = (D.chats || []).slice();
  var kindQ = S.ui.qs('kind'), partnerId = S.ui.qs('partner'), partnerName = S.ui.qs('name');
  var QUICK = {
    partner: ['Есть в наличии?', 'Когда сможете привезти?', 'Нужен замер', 'Пришлите предложение'],
    support: ['Где мой заказ?', 'Как вернуть генерации?', 'Как оплатить?']
  };
  var SVG = function (d, w) { return '<svg viewBox="0 0 24 24" width="' + (w || 20) + '" height="' + (w || 20) + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; };
  var IC = { clip: SVG('<path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.4 3.4 0 0 1 4.8 4.8l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4l7.9-7.9"/>'),
    send: SVG('<path d="M12 19V5M6 11l6-6 6 6"/>', 18), box: SVG('<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>') };
  var SUB = { support: 'Поддержка · ответим в рабочее время', partner: 'Поставщик · отвечает здесь, в SOVEAPP', designer: 'Дизайн-проект', team: 'Ремонт под ключ' };

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function threadKey(c, pid) { return c.kind === 'partner' && pid ? 'partner:' + pid : c.kind; }
  function slug(n) { return String(n || '').toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/^-+|-+$/g, '') || 'partner'; }
  function chan(kind) { return LIST.filter(function (c) { return c.kind === kind; })[0] || null; }

  /* услуга оформлена — значит и чат по ней открыт */
  function unlocked(c) {
    var leads = (S.leads && S.leads.list) ? S.leads.list() : [];
    if (c.kind === 'designer') return leads.some(function (l) { return /adept/i.test(l.product || ''); });
    if (c.kind === 'team') return leads.some(function (l) { return /track/i.test(l.product || ''); });
    return true;
  }
  function messages(key) { return (load()[key] || []).slice(); }
  function push(key, msg, name) {
    var st = load(); st[key] = (st[key] || []).concat([Object.assign({ ts: Date.now() }, msg)]);
    if (name) { st._names = st._names || {}; st._names[key] = name; }
    save(st);
  }
  function time(ts) { return ts ? new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''; }
  function initials(name) { var w = String(name || '').replace(/[«»"]/g, '').trim().split(/\s+/).filter(function (x) { return /[a-zа-яё0-9]/i.test(x); }); return ((w[0] || '?')[0] + (w[1] ? w[1][0] : '')).toUpperCase(); }
  var AVA = { support: 'S', designer: 'Д', team: 'Р' }, NAME = { designer: 'Дизайнер', team: 'Команда ремонта', partner: 'Поставщик' };   /* в списке и шапке — коротко */
  function ava(kind, name) { return '<span class="chx-ava chx-ava--' + kind + '" aria-hidden="true">' + esc(AVA[kind] || initials(name)) + '</span>'; }
  function lastOf(key, c) {
    var all = (c && c.seed ? c.seed.map(function (m) { return { me: m.me, text: m.text }; }) : []).concat(messages(key));
    return all[all.length - 1] || null;
  }

  /* ── список диалогов ── */
  function rowHTML(href, kind, name, sub, key, c, locked) {
    var last = key ? lastOf(key, c) : null;
    return '<a class="chx-row" href="' + href + '">' + ava(kind, name) +
      '<span class="chx-row__b"><b>' + esc(name) + '</b><span>' + esc(last && !locked ? (last.me ? 'Вы: ' : '') + (last.file ? 'файл ' + last.file : last.text) : sub) + '</span></span>' +
      '<span class="chx-row__r">' + (locked ? '<small class="chx-lock">после оформления</small>' : last && last.ts ? '<small>' + time(last.ts) + '</small>' : '') + '</span></a>';
  }
  /* Алина 10.11 (задача 27): чаты с поставщиками, дизайнером и командой — под замком «скоро», пустых строк нет; работает только поддержка.
     Контакт поставщика пока отдаём сразу в заказе (саммари 09.11) */
  var SOON = { partner: 1, designer: 1, team: 1 };
  function viewList() {
    var sup = chan('support'), rows = [];
    if (sup) rows.push(rowHTML('chats.html?kind=support', 'support', sup.title, SUB.support, 'support', sup));
    rows.push('<span class="chx-row chx-row--soon">' + ava('partner', 'Поставщик') + '<span class="chx-row__b"><b>Поставщики, дизайнер и команда ремонта</b><small>чаты откроем после запуска</small></span>' +
      '<span class="chx-row__r"><small class="chx-lock">скоро</small></span></span>');
    return '<div class="chx"><header class="chx-top"><h1 class="chx-h1">Чаты</h1><p>Пока здесь только поддержка SOVEAPP. Контакты поставщика — в заказе.</p></header>' +
      '<div class="chx-list">' + rows.join('') + '</div>' +
      '<p class="chx-hint">Вопрос по товару или заказу — напишите в поддержку, ответим в рабочее время.</p></div>';
  }
  function viewSoon(c) {
    var what = c.kind === 'partner' ? 'Чат с поставщиком' : c.kind === 'designer' ? 'Чат с дизайнером' : 'Чат с командой ремонта';
    return '<div class="chx"><header class="chx-top"><h1 class="chx-h1">' + what + ' — скоро</h1><p>Переписку в SOVEAPP откроем после запуска.' +
      (c.kind === 'partner' ? ' Пока контакты поставщика приходят сразу в заказе.' : '') + '</p></header>' +
      '<div class="chx-locked"><p>Вопрос сейчас — напишите в поддержку SOVEAPP, ответим в рабочее время.</p>' +
      '<a class="chx-cta" href="chats.html?kind=support">Написать в поддержку</a>' +
      (c.kind === 'partner' ? '<a class="chx-cta chx-cta--ghost" href="my.html?v=orders">Мои заказы</a>' : '') + '</div></div>';
  }

  /* ── переписка ── */
  function orderWith(name) {
    var O = S.orders; if (!O || !name) return null;
    return O.mine().filter(function (o) { return o.brand === name || (o.seller && o.seller.name === name); }).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); })[0] || null;
  }
  function logHTML(c, key) {
    var seed = (c.seed || []).map(function (m) { return { me: m.me, text: m.text }; }), all = seed.concat(messages(key));
    if (!all.length) {
      var q = QUICK[c.kind] || [];
      return '<div class="chx-empty"><b>' + (c.kind === 'partner' ? 'Напишите поставщику' : 'Напишите нам') + '</b><p>' +
        (c.kind === 'partner' ? 'Ответ придёт сюда, переписка сохранится вместе с заказом.' : 'Ответим здесь же.') + '</p>' +
        (q.length ? '<div class="chx-quick">' + q.map(function (t) { return '<button type="button" class="chx-chip" data-quick="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>' : '') + '</div>';
    }
    return '<div class="chx-log" id="chx-log"><span class="chx-day">Сегодня</span>' + all.map(function (m) {
      return '<div class="chx-msg' + (m.me ? ' is-me' : '') + '">' + (m.file ? '<span class="chx-file">' + IC.clip + esc(m.file) + '</span>' : esc(m.text)) +
        (m.ts ? '<small>' + time(m.ts) + '</small>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function viewChat(c) {
    var key = threadKey(c, partnerId), name = c.kind === 'partner' && partnerName ? partnerName : NAME[c.kind] || c.title, open = unlocked(c);
    var o = c.kind === 'partner' ? orderWith(partnerName) : null, f = o && o.items && o.items[0];
    return '<div class="chx chx--conv"><a class="chx-back" href="chats.html">‹ Все чаты</a>' +
      '<header class="chx-head">' + ava(c.kind, name) + '<span class="chx-head__b"><b>' + esc(name) + '</b><small>' + esc(SUB[c.kind] || c.sub || '') + '</small></span></header>' +
      (o ? '<a class="chx-order" href="my.html?v=order&id=' + encodeURIComponent(o.id) + '">' + (f && f.img ? '<img src="' + esc(f.img) + '" alt="">' : '<i>' + IC.box + '</i>') +
        '<span><small>Заказ с этим поставщиком</small><b>' + esc(f ? f.name : 'Заказ') + (o.items.length > 1 ? ' и ещё ' + (o.items.length - 1) : '') + '</b></span><em>' + esc(o.statusLabel || '') + '</em></a>' : '') +
      (open
        ? logHTML(c, key) +
          '<form class="chx-composer" id="chx-form">' +
            (c.kind === 'partner' ? '<label class="chx-clip" aria-label="Прикрепить файл"><input type="file" hidden id="chx-file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">' + IC.clip + '</label>' : '') +
            '<input class="chx-input" id="chx-text" placeholder="Сообщение" maxlength="400" autocomplete="off" aria-label="Сообщение">' +
            '<button type="submit" class="chx-send" aria-label="Отправить">' + IC.send + '</button></form>'
        : '<div class="chx-locked"><p>' + esc((c.seed && c.seed[0] && c.seed[0].text) || 'Чат открывается после оформления услуги.') + '</p>' +
          '<a class="chx-cta" href="' + (c.kind === 'designer' ? 'adept.html' : 'track.html') + '">' + (c.kind === 'designer' ? 'Оформить дизайн-проект' : 'Узнать про ремонт под ключ') + '</a></div>') +
      '</div>';
  }

  function paint() {
    var c = kindQ ? chan(kindQ) : null;
    if (c && SOON[c.kind]) { root.innerHTML = viewSoon(c); return; }
    root.innerHTML = c ? viewChat(c) : viewList();
    var log = document.getElementById('chx-log'); if (log) log.lastElementChild && log.lastElementChild.scrollIntoView({ block: 'nearest' });
    if (!c) return;
    var key = threadKey(c, partnerId), name = c.kind === 'partner' ? partnerName : null;
    function send(msg) {
      var first = !messages(key).some(function (m) { return !m.me; });
      push(key, Object.assign({ me: true }, msg), name); paint();
      var reply = c.kind === 'support' ? 'Приняли вопрос, ответим в рабочее время.'
        : c.kind === 'partner' && first ? 'Здравствуйте! Это ' + (partnerName || 'поставщик') + '. Получили сообщение — ответим здесь в течение часа.' : '';
      if (reply) setTimeout(function () { push(key, { me: false, text: reply }, name); paint(); }, 900);
    }
    /* заявка со страницы бренда «На заказ»: первое сообщение переписки, следом чертёж (?file=), один раз — ?req= и ?file= убираем из адреса, перезагрузка не отправит их снова */
    var reqQ = c.kind === 'partner' ? S.ui.qs('req') : null;
    if (reqQ) {
      var fileQ = S.ui.qs('file'), url = new URL(location.href); url.searchParams.delete('req'); url.searchParams.delete('file');
      try { history.replaceState(null, '', url.pathname + url.search); } catch (e) {}
      if (!S.ui.qs('req')) {
        if (fileQ) { push(key, { me: true, text: reqQ }, name); send({ file: fileQ, text: '' }); } else send({ text: reqQ });
        return;
      }
    }
    var form = document.getElementById('chx-form');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault(); var inp = document.getElementById('chx-text'), text = inp.value.trim(); if (!text) return; send({ text: text });
      var again = document.getElementById('chx-text'); if (again) again.focus();
    });
    root.querySelectorAll('[data-quick]').forEach(function (b) { b.addEventListener('click', function () { send({ text: b.getAttribute('data-quick') }); }); });
    var fi = document.getElementById('chx-file');
    if (fi) fi.addEventListener('change', function () { var f = fi.files && fi.files[0]; if (!f) return; if (f.size > 20 * 1048576) { S.ui.toast('Файл больше 20 МБ'); return; } send({ file: f.name, text: '' }); });
  }
  paint();
})();
