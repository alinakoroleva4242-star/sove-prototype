/* Экран 3 сценария: 3D-домик всей квартиры и кадры комнат по расстановке клиента в капсуле.
   В бою — POST /ai/plan/dollhouse и POST /ai/zone/generate (≈ 7 ₽ за картинку, 20–25 с);
   здесь готовые кадры пилота 16.10 по той же квартире, чтобы пройти сценарий без оплаты. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, FLOW = window.SOVE_FLOW;
  var root = document.getElementById('rs-root'); if (!root) return;
  var COST = (D.ai && D.ai.costs && D.ai.costs.render) || 10;

  var ROOMS = [
    { id: 'bed', t: 'Спальня', img: '2-spalnya', fixed: '6-spalnya-pravka-komandoy',
      note: 'кровать у северной стены с тумбами, шкаф на востоке, стол у окна' },
    { id: 'liv', t: 'Кухня-гостиная', img: '3-kuhnya-gostinaya', note: 'кухня Г у восточной стены, диван на юге, ТВ напротив' },
    { id: 'bath', t: 'Санузел', img: '4-sanuzel', note: 'душ в дальнем углу, подвесной унитаз, стирка за дверцей' },
    { id: 'hall', t: 'Прихожая', img: '5-prihozhaya', note: 'встроенный шкаф в нише, рифлёное бронзовое стекло' }
  ];
  var flow = FLOW.load();
  var LIVE = (S.ui.qs('live') && flow.live && flow.live.layout) ? flow.live : null;
  var st = { busy: {}, ver: {}, cmd: {}, fixed: {}, spent: COST * (1 + ROOMS.length), capsule: flow.capsule || 'К2 · Изумрудная неоклассика в орехе' };

  function head() {
    return '<div class="df-head"><h1 class="h2">Ваша квартира в интерьере</h1>' +
      '<p class="small muted">' + esc(st.capsule) + ' · по вашей расстановке</p></div>';
  }
  function house() {
    return '<section class="df-house"><img src="assets/img/demo/1-domik-vsya-kvartira.jpg" alt="3D-домик всей квартиры">' +
      '<p class="small muted">3D-домик: все комнаты на своих местах, ниша со шкафом, угол вне квартиры, двери и вход как на плане.</p></section>';
  }
  function card(r) {
    var busy = st.busy[r.id], src = 'assets/img/demo/' + (st.fixed[r.id] && r.fixed ? r.fixed : r.img) + '.jpg';
    return '<article class="df-card" id="rc-' + r.id + '">' +
      '<div class="df-card__img' + (busy ? ' is-busy' : '') + '"><img src="' + src + '" alt="' + esc(r.t) + '">' +
        (busy ? '<div class="df-wait"><i></i><span>' + esc(busy) + '</span></div>' : '') +
        (st.ver[r.id] ? '<span class="df-ver">v' + st.ver[r.id] + '</span>' : '') + '</div>' +
      '<div class="df-card__body"><b>' + esc(r.t) + '</b><p class="small muted">' + esc(r.note) + '</p>' +
        '<div class="lane df-actions">' +
          '<button type="button" class="chip" data-regen="' + r.id + '"' + (busy ? ' disabled' : '') + '>↻ Перегенерировать · ' + F.tokens(COST) + '</button>' +
          '<button type="button" class="chip" data-cmd="' + r.id + '"' + (busy ? ' disabled' : '') + '>Поправить командой</button>' +
        '</div>' +
        (S.repair && !busy ? S.repair.saveButton('render', { room: r.t, src: src }, 'Сохранить в Мой ремонт', 'btn btn--ghost btn--sm btn--block') : '') +
        (st.cmd[r.id] !== undefined ? '<div class="df-cmd"><input class="input" data-cmd-in="' + r.id + '" placeholder="Например: убери консоль у двери" value="' + esc(st.cmd[r.id]) + '">' +
          '<button type="button" class="btn btn--primary btn--sm" data-cmd-go="' + r.id + '">Применить · ' + F.tokens(COST) + '</button></div>' : '') +
      '</div></article>';
  }
  function foot() {
    return '<section class="pb df-sum"><span class="pb__k">Потрачено</span><b class="pb__t">' + F.tokens(st.spent) + ' · домик и ' + ROOMS.length + ' комнаты</b>' +
      '<p class="small muted">Одна картинка — ' + F.tokens(COST) + ' ≈ 7 ₽ себестоимости, 20–25 секунд. Первые 50 токенов — в подарок.</p></section>' +
      '<div class="df-foot"><a class="btn btn--ghost" href="arrange.html?v=panel&flow=1">Изменить расстановку</a>' +
      '<a class="btn btn--primary" href="market.html">Собрать комплектацию</a></div>';
  }
  /* свой план: картинки интерьера — платный шаг (≈7 ₽ за кадр), на демо не запускаем.
     Показываем, что именно уйдёт в генерацию, и честную цену. */
  function liveView() {
    var rooms = (LIVE.layout.rooms || []).filter(function (r) { return !r.part_of; });
    var n = rooms.length, cost = COST * (1 + n);
    return head() +
      '<section class="df-house"><img src="' + LIVE.labeled + '" alt="Ваш план с разметкой">' +
      '<p class="small muted">' + esc(LIVE.flat) + ' · расстановка: ' + (LIVE.layout.furniture || []).length + ' предметов' +
      (LIVE.ready ? ' · проверка норм пройдена' : ' · есть замечания к расстановке') + '</p></section>' +
      '<section class="pb"><span class="pb__k">Что сгенерируем</span><b class="pb__t">3D-домик и ' + n + ' кадра комнат · ' + F.tokens(cost) + '</b>' +
      '<ul class="df-list">' + rooms.map(function (r) { return '<li>' + esc(r.name) + ' <span>' + F.area(r.doc_m2 || 0) + '</span></li>'; }).join('') + '</ul>' +
      '<p class="text">Кадры рисуются по вашей расстановке и выбранной капсуле: ровно те предметы на тех местах. ' +
      'Одна картинка — ' + F.tokens(COST) + ' ≈ 7 ₽, 20–25 секунд.</p>' +
      '<button type="button" class="btn btn--primary btn--block" disabled>Сгенерировать · ' + F.tokens(cost) + '</button>' +
      '<p class="small muted">На демо-стенде генерация выключена: это платный вызов. Пример готового результата — на плане ЖК PRIDE.</p>' +
      '<a class="btn btn--link btn--sm" href="plan-demo.html">Посмотреть пример PRIDE</a></section>' +
      '<div class="df-foot"><a class="btn btn--ghost" href="arrange.html?v=panel&flow=1&live=1">Изменить расстановку</a>' +
      '<a class="btn btn--primary" href="market.html">Собрать комплектацию</a></div>';
  }
  function render() {
    if (LIVE) { root.innerHTML = liveView(); return; }
    root.innerHTML = head() + house() + '<div class="df-cards">' + ROOMS.map(card).join('') + '</div>' + foot();
    bind();
  }
  /* имитация генерации: три подписи по 1,2 с — столько же ступеней показывает и боевой маршрут */
  function wait(id, stages, done) {
    var i = 0;
    st.busy[id] = stages[0]; render();
    var t = setInterval(function () {
      i++;
      if (i < stages.length) { st.busy[id] = stages[i]; var el = document.querySelector('#rc-' + id + ' .df-wait span'); if (el) el.textContent = stages[i]; return; }
      clearInterval(t); delete st.busy[id]; done(); render();
      var card = document.getElementById('rc-' + id); if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 1200);
  }
  function bind() {
    root.querySelectorAll('[data-regen]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.regen;
        wait(id, ['Беру вырез домика…', 'Собираю промпт по расстановке…', 'Рисую кадр…'], function () {
          st.ver[id] = (st.ver[id] || 1) + 1; st.spent += COST;
        });
      });
    });
    root.querySelectorAll('[data-cmd]').forEach(function (b) {
      b.addEventListener('click', function () { var id = b.dataset.cmd; st.cmd[id] = st.cmd[id] === undefined ? '' : undefined; render();
        var inp = document.querySelector('[data-cmd-in="' + id + '"]'); if (inp) inp.focus(); });
    });
    root.querySelectorAll('[data-cmd-in]').forEach(function (i) {
      i.addEventListener('input', function () { st.cmd[i.dataset.cmdIn] = i.value; });
      i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var go = document.querySelector('[data-cmd-go="' + i.dataset.cmdIn + '"]'); if (go) go.click(); } });
    });
    root.querySelectorAll('[data-cmd-go]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.cmdGo, text = (st.cmd[id] || '').trim();
        if (!text) { var inp = document.querySelector('[data-cmd-in="' + id + '"]'); if (inp) inp.focus(); return; }
        delete st.cmd[id];
        wait(id, ['Понимаю команду: «' + text.slice(0, 40) + '»…', 'Меняю только это, остальное как есть…', 'Рисую кадр…'], function () {
          st.fixed[id] = true; st.ver[id] = (st.ver[id] || 1) + 1; st.spent += COST;
        });
      });
    });
  }
  FLOW.save({ step: 3 });
  render();
})();
