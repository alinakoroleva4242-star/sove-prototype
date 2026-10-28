/* Чаты — перенос экрана /chats: поддержка, партнёр, дизайнер (Дизайн-проект), команда (Управление ремонтом).
   Партнёрский чат — «первое касание» внутри SOVEAPP, дальше переписка уходит в мессенджер.
   Чаты услуг открываются после оформления: без оформления показываем, что за ними стоит. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var root = document.getElementById('ch-root'); if (!root) return;
  var KEY = 'sove.proto.chats';
  var LIST = (D.chats || []).slice();
  var partnerId = S.ui.qs('partner'), partnerName = S.ui.qs('name');
  var openKind = S.ui.qs('kind') || 'support';

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }
  function save(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  function threadKey(c) { return c.kind === 'partner' && partnerId ? 'partner:' + partnerId : c.kind; }

  /* услуга оформлена — значит и чат по ней открыт */
  function unlocked(c) {
    var leads = (S.leads && S.leads.list) ? S.leads.list() : [];
    if (c.kind === 'designer') return leads.some(function (l) { return /adept/i.test(l.product || ''); });
    if (c.kind === 'team') return leads.some(function (l) { return /track/i.test(l.product || ''); });
    return true;
  }

  function title(c) { return c.kind === 'partner' && partnerName ? 'Партнёр · ' + partnerName : c.title; }

  function messages(c) {
    var st = load(), key = threadKey(c);
    return (st[key] || []).slice();
  }
  function push(c, text, me) {
    var st = load(), key = threadKey(c);
    st[key] = (st[key] || []).concat([{ me: !!me, text: text, ts: Date.now() }]);
    save(st);
  }

  function bubbles(c) {
    var seed = (c.seed || []).map(function (m) { return { me: m.me, text: m.text, seed: true }; });
    var mine = messages(c);
    var all = seed.concat(mine);
    if (!all.length) {
      return '<p class="ch__empty">' + (c.kind === 'partner'
        ? 'Первых касаний с этим партнёром ещё не было. Напишите — сообщение уйдёт менеджеру партнёра через SOVEAPP.'
        : 'Сообщений пока нет — напишите первым.') + '</p>';
    }
    return '<div class="ch__log">' + all.map(function (m) {
      return '<span class="ch__msg' + (m.me ? ' ch__msg--me' : '') + '">' + esc(m.text) + '</span>';
    }).join('') + '</div>';
  }

  function paint() {
    var cur = LIST.filter(function (c) { return c.kind === openKind; })[0] || LIST[0];
    var open = unlocked(cur);
    root.innerHTML =
      '<div class="stack stack--3"><span class="eyebrow">Переписка</span><h1 class="h1">Чаты</h1>' +
      '<p class="text">Вопросы по платформе — в поддержку. С партнёром, дизайнером и бригадой переписка привязана к вашему заказу.</p></div>' +
      '<div class="lane ch-tabs">' + LIST.map(function (c) {
        return '<button type="button" class="chip' + (c.kind === cur.kind ? ' is-on' : '') + '" data-kind="' + c.kind + '">' +
          esc(c.kind === 'partner' && partnerName ? partnerName : c.title) + '</button>';
      }).join('') + '</div>' +
      '<section class="ch" style="--accent:' + esc(cur.accent || '#6FA8C9') + '">' +
        '<div class="ch__head"><b>' + esc(title(cur)) + '</b><span>' + esc(cur.sub) + '</span></div>' +
        (cur.kind === 'partner' ? '<p class="ch__note"><b>Первое касание</b> — сообщение уходит через SOVEAPP. Дальше партнёр продолжит в своём мессенджере.</p>' : '') +
        (open ? bubbles(cur) : '<p class="ch__locked">' + esc((cur.seed && cur.seed[0] && cur.seed[0].text) || 'Чат открывается после оформления услуги.') + '</p>') +
        (open
          ? '<form class="ch__form" id="ch-form"><input class="input" id="ch-text" placeholder="Написать сообщение" maxlength="400" autocomplete="off">' +
            '<button type="submit" class="btn btn--primary btn--sm">Отправить</button></form>' +
            (cur.kind === 'partner' ? '<button type="button" class="btn btn--ghost btn--block" id="ch-handoff">Передать в мессенджер</button>' : '')
          : '<a class="btn btn--primary btn--block" href="' + (cur.kind === 'designer' ? 'adept.html' : 'track.html') + '">' +
            (cur.kind === 'designer' ? 'Оформить дизайн-проект' : 'Узнать про ремонт под ключ') + '</a>') +
      '</section>' +
      '<p class="small muted">Прототип: сообщения сохраняются только в этом браузере и никуда не уходят.</p>';

    root.querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () { openKind = b.getAttribute('data-kind'); paint(); });
    });
    var form = document.getElementById('ch-form');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var inp = document.getElementById('ch-text'), text = inp.value.trim();
      if (!text) return;
      push(cur, text, true);
      if (cur.kind === 'support') setTimeout(function () { push(cur, 'Приняли вопрос, ответим в рабочее время.'); paint(); }, 600);
      paint();
    });
    var ho = document.getElementById('ch-handoff');
    if (ho) ho.addEventListener('click', function () {
      S.ui.modal({ eyebrow: 'Партнёр', title: 'Переписка уходит в мессенджер',
        text: 'Мы передали партнёру ваш вопрос и контакт. Дальше он напишет вам сам — в прототипе это только показ сценария.',
        actions: [ { label: 'Понятно', kind: 'primary' } ] });
    });
  }
  paint();
})();
