/* Админ SOVEAPP по партнёрам (ТЗ ред. 2): заявки на подключение (как раньше), тип поставщика и ставка комиссии
   по брендам, заявки партнёров (продвижение, менеджер). Данные — этого браузера. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui, O = S.orders, X = S.pext;
  var modState = 'pending';
  var root = document.getElementById('pa-root'); if (!root) return;
  var section = 'applications', f = { cat: 'all', region: 'all', src: 'all' };
  var CATS = ['Мебель', 'Освещение', 'Отделка', 'Сантехника', 'Текстиль и декор'], REGIONS = ['Москва и область', 'Вся Россия'], SRC = ['анкета партнёра', 'заявка клиента', 'чат'];
  var STATUS = { new: 'новая', answered: 'отвечена', scheduled: 'запланировано', published: 'опубликовано', rejected: 'отклонено' };

  function rows() {
    return (S.leads.list() || []).map(function (l, i) { return { id: l.id, ts: l.ts, name: l.name || 'без имени', phone: l.phone || '', product: l.product || 'заявка', cat: CATS[i % CATS.length], region: REGIONS[i % REGIONS.length], src: /partner/i.test(l.product || '') ? 'анкета партнёра' : SRC[i % SRC.length], status: l.status || 'Заявка принята' }; });
  }
  function chips(name, all, list) { return '<div class="lane co-chips">' + ['all'].concat(list).map(function (v) { return '<button type="button" class="chip' + (f[name] === v ? ' is-on' : '') + '" data-f="' + name + '" data-v="' + esc(v) + '">' + (v === 'all' ? all : esc(v)) + '</button>'; }).join('') + '</div>'; }
  var extraBrands = [];
  function allBrands() { var set = {}; D.products.forEach(function (p) { set[O.supplierOf(p)] = true; }); return Object.keys(set).sort(); }
  /* показываем бренды с заказами или настроенным профилем; остальные — через поле «добавить бренд» */
  function brandList() {
    var set = {}; O.profiles.brands().forEach(function (b) { set[b] = true; }); extraBrands.forEach(function (b) { set[b] = true; });
    return Object.keys(set).sort();
  }
  function secApplications() {
    var list = rows().filter(function (r) { return (f.cat === 'all' || r.cat === f.cat) && (f.region === 'all' || r.region === f.region) && (f.src === 'all' || r.src === f.src); });
    return '<div class="stack stack--3"><span class="small muted">Категория</span>' + chips('cat', 'Все', CATS) + '<span class="small muted">Регион</span>' + chips('region', 'Все', REGIONS) + '<span class="small muted">Источник</span>' + chips('src', 'Все', SRC) + '</div>' +
      (list.length ? '<div class="pb-list">' + list.map(function (r) { return '<div class="pb-item"><b>' + esc(r.name) + '<br><span class="small muted">' + esc(r.phone) + '</span></b><span>' + esc(r.product) + ' · ' + esc(r.cat) + '<br>' + esc(r.region) + ' · ' + esc(r.src) + '<br>' + esc(r.status) + '</span></div>'; }).join('') + '</div>' : '<p class="fav-empty">Заявок нет. В прототипе сюда попадают заявки, оставленные в этом браузере.</p>');
  }
  function secProfiles() {
    var scns = O.scenarios();
    var list = brandList();
    return '<p class="small muted">' + (O.single ? '' : 'Тип задаёт путь заказа у поставщика и покупателя. ') + 'Ставка комиссии индивидуальна; изменение действует для новых заказов, в оплаченном заказе ставка не меняется.</p>' +
      '<div class="row"><input class="input" id="pa-brand" list="pa-brands" placeholder="Добавить бренд из каталога"><datalist id="pa-brands">' + allBrands().map(function (b) { return '<option value="' + esc(b) + '">'; }).join('') + '</datalist><button type="button" class="btn btn--ghost btn--small" id="pa-add">Добавить</button></div>' +
      (list.length ? '' : '<p class="small muted">Профилей пока нет: они появляются с первым заказом или после добавления бренда.</p>') +
      list.map(function (b) { var p = O.profiles.get(b); return '<div class="card--my"><b>' + esc(b) + '</b>' + (O.single ? '' : '<div class="q-chips">' + scns.map(function (s) { return '<button type="button" class="q-chip' + (p.scenario === s.key ? ' is-on' : '') + '" data-scn="' + s.key + '" data-brand="' + esc(b) + '">' + esc(s.short) + '</button>'; }).join('') + '</div>') + '<div class="row"><input class="input" style="max-width:110px" inputmode="decimal" value="' + p.commissionPct + '" data-comm-in="' + esc(b) + '"><span class="small muted">% комиссии' + (p.commissionSet ? '' : ' (по умолчанию)') + '</span><button type="button" class="btn btn--primary btn--small" data-comm="' + esc(b) + '">Сохранить</button></div></div>'; }).join('');
  }
  function secRequests() {
    var list = O.requests.list(), P = O.promotion;
    return list.length ? list.map(function (r) { var s = r.service && P.services.filter(function (x) { return x.key === r.service; })[0]; return '<div class="card--my"><b>' + (r.kind === 'promotion' ? 'Продвижение · ' + esc(s ? s.title : r.service) : r.kind === 'manager' ? 'Менеджеру · ' + esc(r.topic) : 'Капсула') + ' · ' + STATUS[r.status] + '</b><span class="small muted">' + esc(r.brand || '') + ' · ' + new Date(r.ts).toLocaleString('ru-RU') + (r.dates ? ' · ' + esc(r.dates) : '') + '</span>' + (r.text ? '<span class="line">' + esc(r.text) + '</span>' : '') + (r.reply ? '<span class="line" style="color:var(--accent-ink)">Ответ: ' + esc(r.reply) + '</span>' : '') + '<input class="input" data-rin="' + r.id + '" placeholder="Ответ партнёру"><div class="row"><button type="button" class="btn btn--primary btn--small" data-rq="' + r.id + '" data-st="answered">Ответить</button>' + (r.kind !== 'manager' ? '<button type="button" class="btn btn--ghost btn--small" data-rq="' + r.id + '" data-st="scheduled">Запланировать</button>' : '') + '<button type="button" class="btn btn--ghost btn--small" data-rq="' + r.id + '" data-st="rejected">Отклонить</button></div></div>'; }).join('') : '<p class="small muted">Заявок от партнёров пока нет.</p>';
  }
  /* правки товаров поставщиков: одобрить → витрина, отклонить → снять с витрины */
  function secModeration() {
    var list = X.edits.list().filter(function (e) { return modState === 'all' || e.state === modState; });
    return '<div class="pc-tabs">' + [['pending', 'На проверке'], ['approved', 'Опубликованные'], ['rejected', 'Отклонённые'], ['all', 'Все']].map(function (x) { return '<button type="button" class="' + (modState === x[0] ? 'is-on' : '') + '" data-mod="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      (list.length ? list.map(function (e) { var p = !e.own && D.product(Number(e.ref.replace('cat:', ''))); return '<div class="card--my"><b>' + esc(e.name || e.ref) + ' · ' + X.REVIEW[e.state] + (e.published ? ' · в витрине' : '') + '</b><span class="small muted">' + esc(e.brand || '') + ' · ' + (e.own ? 'новый товар партнёра' + (e.source === 'yml' ? ' · из YML-фида' : '') : 'каталог #' + e.ref.replace('cat:', '')) + ' · ' + new Date(e.submittedAt).toLocaleString('ru-RU') + '</span>' +
        (p ? '<span class="line">Сейчас в витрине: ' + esc(p.name) + ' · розница ' + F.rub(p.retail) + ' · SOVEAPP ' + F.rub(p.metod) + '</span>' : '') +
        '<span class="line" style="color:var(--accent-ink)">Предлагает: ' + esc(e.name || '—') + ' · розница ' + (e.priceRetail != null ? F.rub(e.priceRetail) : '—') + ' · SOVEAPP ' + (e.priceSove != null ? F.rub(e.priceSove) : '—') + ' · ' + (X.STATUS[e.status] || '—') + (e.own ? ' · ' + [e.article ? 'арт. ' + e.article : null, e.category].filter(Boolean).map(esc).join(' · ') : '') + '</span>' +
        (e.note ? '<span class="line">Комментарий: ' + esc(e.note) + '</span>' : '') + '<input class="input" data-mod-note="' + esc(e.ref) + '" placeholder="Комментарий партнёру (необязательно)"><div class="row"><button type="button" class="btn btn--primary btn--small" data-decide="' + esc(e.ref) + '" data-ok="1">Одобрить · в витрину</button><button type="button" class="btn btn--ghost btn--small" data-decide="' + esc(e.ref) + '" data-ok="0">Отклонить · снять с витрины</button></div></div>'; }).join('') : '<p class="small muted">Правок в этом списке нет. Партнёр правит цены и наличие в «Товары и цены» — они появятся здесь.</p>');
  }
  function paint() {
    root.innerHTML = '<div class="stack stack--3"><span class="eyebrow">ЛК команды</span><h1 class="h1">Партнёры</h1></div>' +
      '<div class="pc-tabs">' + [['applications', 'Заявки на подключение'], ['moderation', 'Правки товаров'], ['profiles', O.single ? 'Комиссия' : 'Тип и комиссия'], ['requests', 'Заявки партнёров']].map(function (x) { return '<button type="button" class="' + (section === x[0] ? 'is-on' : '') + '" data-sec="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      ({ applications: secApplications, moderation: secModeration, profiles: secProfiles, requests: secRequests })[section]() + '<a class="btn btn--ghost btn--block" href="team.html">Рабочий кабинет команды</a>';
    root.querySelectorAll('[data-sec]').forEach(function (b) { b.addEventListener('click', function () { section = b.getAttribute('data-sec'); paint(); }); });
    root.querySelectorAll('[data-mod]').forEach(function (b) { b.addEventListener('click', function () { modState = b.getAttribute('data-mod'); paint(); }); });
    root.querySelectorAll('[data-decide]').forEach(function (b) { b.addEventListener('click', function () { var ref = b.getAttribute('data-decide'), ok = b.getAttribute('data-ok') === '1'; X.edits.decide(ref, ok, root.querySelector('[data-mod-note="' + ref + '"]').value); ui.toast(ok ? 'Опубликовано в витрине' : 'Отклонено и снято с витрины', 'ok'); paint(); }); });
    root.querySelectorAll('[data-f]').forEach(function (b) { b.addEventListener('click', function () { f[b.getAttribute('data-f')] = b.getAttribute('data-v'); paint(); }); });
    var add = root.querySelector('#pa-add'); if (add) add.addEventListener('click', function () { var v = root.querySelector('#pa-brand').value.trim(); if (!v) return; if (extraBrands.indexOf(v) < 0) extraBrands.push(v); paint(); });
    root.querySelectorAll('[data-scn]').forEach(function (b) { b.addEventListener('click', function () { O.profiles.set(b.getAttribute('data-brand'), { scenario: b.getAttribute('data-scn') }); paint(); }); });
    root.querySelectorAll('[data-comm]').forEach(function (b) { b.addEventListener('click', function () { var br = b.getAttribute('data-comm'), v = Number(root.querySelector('[data-comm-in="' + br + '"]').value.replace(',', '.')); if (!(v >= 0 && v <= 100)) return ui.toast('Комиссия 0–100 %', 'error'); O.profiles.set(br, { commissionPct: v }); ui.toast('Ставка сохранена, действует для новых заказов', 'ok'); paint(); }); });
    root.querySelectorAll('[data-rq]').forEach(function (b) { b.addEventListener('click', function () { var id = b.getAttribute('data-rq'); O.requests.reply(id, root.querySelector('[data-rin="' + id + '"]').value.trim(), b.getAttribute('data-st')); paint(); }); });
  }
  paint();
})();
