/* «Поставщикам» (/partner): короткий экран «зачем» → мастер из четырёх шагов
   тип → анкета → товары и скидка → оферта → «на модерации». Тип (Retail · Materials · Custom,
   PDF Алины 19.10) задаёт путь заказа и вид кабинета. Вход для партнёра — ссылкой в шапке экрана. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, ui = S.ui, O = S.orders;
  var root = document.getElementById('pt-root'); if (!root) return;
  var LEAD_KEY = 'sove.proto.partnerLead';

  var STEPS = ['Тип', 'Анкета', 'Товары', 'Оферта'];
  var TYPES = (O && !O.single) ? O.scenarios().map(function (s) { return O.typeInfo(s.key); }) : [];
  /* одной фразой — как пойдёт заказ; сроки ответа — из «единой обработки обращений» в референсах Вики */
  var ONE = {
    stock: ['Продаёте готовое по артикулу', 'Подтверждаете наличие и отправляете. Ответ клиенту — в тот же день.', 'сантехника, свет, мебель, декор, техника'],
    materials: ['Считаете по площади', 'Клиент присылает м², вы — расчёт, упаковки и КП. Ответ — до 2 дней.', 'плитка, ламинат, паркет, краска, обои'],
    custom: ['Делаете под заказ', 'Заявка, замер, КП, изготовление и монтаж. КП — до 3 дней.', 'кухни, шкафы, двери, лестницы']
  };
  var BENEFITS = [
    ['Клиенты с ремонтом в руках', 'Товар видят внутри готовых интерьеров — капсул, которые собирают покупатели. 3000+ в клубе METOD.'],
    ['0 % комиссии с продажи', 'Сделка напрямую между вами и клиентом. SOVEAPP зарабатывает на доступе к контакту.'],
    ['Одно условие', 'Скидка от РРЦ для клуба METOD — закрытая цена участников.']
  ];
  var DOCS = {
    offer: ['Оферта партнёра SOVEAPP', 'Финальный юридический текст оферты ещё не утверждён. До запуска здесь будут зафиксированы условия участия, порядок публикации и обновления товаров, ответственность сторон и прекращение размещения.'],
    privacy: ['Политика обработки данных', 'Финальный текст политики ещё не утверждён. В документе будут описаны цели и основания обработки данных партнёра, сроки хранения, внешние обработчики и порядок отзыва согласия.'],
    rules: ['Регламент работы', 'Финальный регламент ещё не утверждён. В нём будут закреплены требования к каталогу, РРЦ и скидке METOD, сроки обновления данных, порядок модерации и правила взаимодействия с клиентами.']
  };
  var IC = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>', check: '<path d="M5 12l4 4L19 6"/>', users: '<path d="M17 21a5 5 0 0 0-10 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21a4 4 0 0 0-3-3.9M3 21a4 4 0 0 1 3-3.9"/>',
    pct: '<path d="M19 5L5 19M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>', tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM7.5 7.5h.01"/>'
  };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }

  var st = {
    view: 'landing', step: 1, sent: false, err: '', type: null, showPath: false,
    form: { company: '', person: '', phone: '', tg: '', category: '', region: '', delivery: '' },
    goods: { source: 'link', link: '', file: '', discount: '', rrc: '24 900' },
    agree: false
  };
  var preset = ui.qs('type'); if (preset && TYPES.some(function (t) { return t.key === preset; })) { st.type = preset; st.view = 'wizard'; }
  if (ui.qs('step')) st.view = 'wizard';
  function typeOf() { return TYPES.filter(function (t) { return t.key === st.type; })[0] || null; }

  function money(v) { var n = Number(String(v).replace(/\D/g, '')); return isFinite(n) ? n : 0; }
  function metodPrice() { var rrc = money(st.goods.rrc), d = Number(st.goods.discount) || 0; return Math.max(0, Math.round(rrc * (1 - d / 100))); }
  function formOk() { var f = st.form; return f.company.trim() && f.person.trim() && f.phone.replace(/\D/g, '').length >= 11 && f.category.trim() && f.region.trim(); }
  function goodsOk() { var g = st.goods; return (g.source === 'link' ? g.link.trim() : g.file.trim()) && Number(g.discount) > 0; }
  function err() { return st.err ? '<p class="field__error">' + esc(st.err) + '</p>' : ''; }
  function field(id, label, value, ph, type) {
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><input class="input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(value) + '" placeholder="' + esc(ph) + '"></div>';
  }
  /* шапка экрана: надзаголовок слева, вход для партнёра справа */
  function topbar(eyebrow) {
    return '<div class="pl-top"><span class="eyebrow">' + esc(eyebrow) + '</span><a class="pl-top__login" href="partner-cabinet.html">Войти в кабинет ' + ic('arrow', 16) + '</a></div>';
  }

  /* ---------- экран «зачем» ---------- */
  function viewLanding() {
    var icons = ['users', 'pct', 'tag'];
    return topbar('Поставщикам') +
      '<div class="stack stack--3"><h1 class="h1">Ваш товар — внутри готовых интерьеров</h1>' +
      '<p class="text">Клиенты собирают ремонт по капсулам и покупают у партнёров по закрытым ценам METOD.</p></div>' +
      '<div class="pl-list">' + BENEFITS.map(function (b, i) { return '<div class="pl-item"><span class="pl-item__ic">' + ic(icons[i], 20) + '</span><div><b>' + esc(b[0]) + '</b><span>' + esc(b[1]) + '</span></div></div>'; }).join('') + '</div>' +
      (TYPES.length ? '<span class="my-sec">Как пойдёт заказ</span><div class="pl-list pl-list--how">' + TYPES.map(function (t) { var o = ONE[t.key] || [t.label, '', '']; return '<div class="pl-item"><span class="pl-item__n">' + esc(t.typeLabel.replace(/^Тип\s*/, '').split(' · ')[0]) + '</span><div><b>' + esc(o[0]) + '</b><span>' + esc(o[1]) + '</span></div></div>'; }).join('') + '</div>' : '') +
      '<div class="stack stack--3"><button type="button" class="btn btn--primary btn--block btn--lg" data-start>Стать партнёром</button>' +
      '<p class="small muted" style="text-align:center">Заявка — 4 шага, 5 минут. Менеджер подключается на модерации.</p></div>';
  }

  /* ---------- мастер ---------- */
  function progress() {
    return '<div class="pt-prog"><div class="pt-prog__row"><b>Шаг ' + st.step + ' из ' + STEPS.length + '</b><span>' + esc(STEPS[st.step - 1]) + '</span></div><div class="pt-prog__bar"><i style="width:' + Math.round(st.step / STEPS.length * 100) + '%"></i></div></div>';
  }
  function head(title, text) { return '<div class="stack stack--2"><h1 class="h1 h1--sm">' + esc(title) + '</h1>' + (text ? '<p class="text">' + esc(text) + '</p>' : '') + '</div>'; }
  function back(to, label) { return '<button type="button" class="btn btn--link" data-go="' + to + '">' + esc(label || 'Назад') + '</button>'; }

  function typeCard(t) {
    var on = st.type === t.key, o = ONE[t.key] || [t.label, '', ''];
    return '<button type="button" class="pt-type' + (on ? ' is-on' : '') + '" data-type="' + t.key + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
      '<span class="pt-type__chk">' + ic('check', 14) + '</span><span class="pt-type__body"><span class="pt-type__k">' + esc(t.typeLabel) + '</span><b>' + esc(o[0]) + '</b><span class="pt-type__ex">' + esc(o[1]) + '</span><span class="pt-type__ex pt-type__ex--f">Например: ' + esc(o[2]) + '</span></span></button>';
  }
  function viewType() {
    var t = typeOf();
    return head('Что вы продаёте?', 'От типа зависит путь заказа и вид кабинета. Несколько типов — добавит менеджер.') +
      '<div class="stack stack--2">' + TYPES.map(typeCard).join('') + '</div>' +
      (t ? '<button type="button" class="pt-path__t" data-path>' + (st.showPath ? 'Скрыть путь заказа' : 'Как пойдёт заказ: ' + t.path.length + ' шагов') + '</button>' + (st.showPath ? '<p class="pt-path">' + esc(t.path.join(' → ')) + '</p>' : '') : '') + err() +
      '<button type="button" class="btn btn--primary btn--block" data-go="2">' + (t ? 'Дальше: анкета' : 'Выберите тип') + '</button>' + back(0, 'К условиям');
  }
  function viewForm() {
    return head('Анкета', 'Минимум данных для старта. Категория задаёт раздел маркетплейса.') +
      '<form class="stack stack--4" id="pt-form">' +
        field('pt-company', 'Компания / ИП', st.form.company, 'Например, ООО «Пол и Дом»') +
        field('pt-person', 'ФИО контакта', st.form.person, 'Анна Смирнова') +
        field('pt-phone', 'Телефон', st.form.phone, '+7 999 000-00-00', 'tel') +
        field('pt-tg', 'Telegram', st.form.tg, '@company') +
        field('pt-cat', 'Категория товара', st.form.category, 'Например, ламинат') +
        field('pt-region', 'Регион отгрузки', st.form.region, 'Москва и Московская область') +
        field('pt-delivery', 'Условия доставки', st.form.delivery, 'Сроки, минимальная сумма, самовывоз') +
      '</form>' + err() +
      '<button type="button" class="btn btn--primary btn--block" data-go="3">Дальше: товары</button>' + back(1);
  }
  function viewGoods() {
    var g = st.goods;
    return head('Товары и скидка', 'Ссылка на каталог — основной способ. Прайс нужен, когда каталога по ссылке нет.') +
      '<div class="lane co-chips">' +
        '<button type="button" class="chip' + (g.source === 'link' ? ' is-on' : '') + '" data-src="link">Ссылка на каталог</button>' +
        '<button type="button" class="chip' + (g.source === 'file' ? ' is-on' : '') + '" data-src="file">Прайс XLSX / CSV</button></div>' +
      (g.source === 'link' ? field('pt-link', 'Ссылка на сайт или раздел с товарами', g.link, 'https://partner.ru/catalog')
        : '<label class="pl-drop"><input type="file" id="pt-file" accept=".xlsx,.csv" hidden><b>Загрузить прайс</b><span>XLSX или CSV · до 20 МБ</span>' + (g.file ? '<span class="pt-file">' + esc(g.file) + '</span>' : '') + '</label>') +
      '<div class="pt-two">' + field('pt-disc', 'Скидка от РРЦ, %', g.discount, '15') + field('pt-rrc', 'Пример РРЦ', g.rrc, '24 900') + '</div>' +
      '<section class="pt-prev"><span class="pt-prev__k">Так увидит клиент в METOD</span><div class="pt-prev__card"><span class="pt-prev__brand">' + esc(st.form.company || 'Ваш бренд') + '</span><b>Название товара из каталога</b>' +
        '<span class="pt-prev__price"><i>' + F.rub(metodPrice()) + '</i><s>' + F.rub(money(g.rrc)) + '</s></span><span class="pt-prev__note">Цена METOD · артикул и наличие обновятся из источника</span></div></section>' + err() +
      '<button type="button" class="btn btn--primary btn--block" data-go="4">Дальше: оферта</button>' + back(2);
  }
  function summary() {
    var f = st.form, g = st.goods, t = typeOf();
    return '<div class="pb-list">' + [['Тип', t ? t.typeLabel + ' · ' + (ONE[t.key] || [t.label])[0] : '—'], ['Компания', f.company], ['Контакт', f.person + (f.phone ? ' · ' + f.phone : '')], ['Telegram', f.tg || '—'],
      ['Категория', f.category], ['Регион', f.region], ['Доставка', f.delivery || '—'], ['Товары', g.source === 'link' ? (g.link || '—') : (g.file || 'файл не выбран')], ['Скидка METOD', (g.discount || 0) + ' %']]
      .map(function (r) { return '<div class="pb-item"><b>' + esc(r[0]) + '</b><span>' + esc(String(r[1] || '—')) + '</span></div>'; }).join('') + '</div>';
  }
  function viewOffer() {
    return head('Проверьте заявку', 'После отправки менеджер проверит анкету и ассортимент. Публикация — после одобрения.') + summary() +
      '<div class="stack stack--2">' + Object.keys(DOCS).map(function (k) { return '<button type="button" class="pt-doc" data-doc="' + k + '"><span>' + esc(DOCS[k][0]) + '</span><i>черновик юриста</i></button>'; }).join('') + '</div>' +
      '<label class="pt-agree"><input type="checkbox" id="pt-agree"' + (st.agree ? ' checked' : '') + '><span>Принимаю юридические условия партнёрства</span></label>' + err() +
      '<button type="button" class="btn btn--primary btn--block" data-act="send">Отправить на модерацию</button>' + back(3);
  }
  function viewSent() {
    var t = typeOf();
    return '<div class="pl-done"><span class="pl-done__ic">' + ic('check', 26) + '</span><h1 class="h1 h1--sm">Заявка на модерации</h1><p class="text">Менеджер проверит анкету и ассортимент за 1–2 рабочих дня и свяжется по указанному телефону.</p></div>' +
      '<div class="pl-list">' +
        '<div class="pl-item"><span class="pl-item__n">1</span><div><b>Пока ждёте</b><span>Подготовьте фото товаров и актуальный прайс — менеджер запросит их при подключении.</span></div></div>' +
        '<div class="pl-item"><span class="pl-item__n">2</span><div><b>После одобрения</b><span>Откроется кабинет' + (t ? ' типа «' + esc(t.label) + '»' : '') + ': заказы, товары, продвижение и выплаты.</span></div></div>' +
        '<div class="pl-item"><span class="pl-item__n">3</span><div><b>Вход</b><span>По телефону из анкеты, код придёт в SMS.</span></div></div></div>' +
      summary() +
      '<a class="btn btn--primary btn--block" href="partner-cabinet.html">Войти в кабинет партнёра</a><a class="btn btn--link" href="market.html">Посмотреть маркетплейс</a>';
  }

  function paint() {
    root.innerHTML = st.view === 'landing' ? viewLanding()
      : st.sent ? viewSent()
      : topbar('Стать партнёром') + progress() + (st.step === 2 ? viewForm() : st.step === 3 ? viewGoods() : st.step === 4 ? viewOffer() : viewType());
    bind();
  }
  function readForm() {
    var map = { 'pt-company': 'company', 'pt-person': 'person', 'pt-phone': 'phone', 'pt-tg': 'tg', 'pt-cat': 'category', 'pt-region': 'region', 'pt-delivery': 'delivery' };
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) st.form[map[id]] = el.value; });
    var l = document.getElementById('pt-link'); if (l) st.goods.link = l.value;
    var d = document.getElementById('pt-disc'); if (d) st.goods.discount = d.value;
    var r = document.getElementById('pt-rrc'); if (r) st.goods.rrc = r.value;
  }
  function go(to) {
    readForm();
    if (to === 0) { st.view = 'landing'; st.err = ''; paint(); window.scrollTo(0, 0); return; }
    if (to >= 2 && TYPES.length && !st.type) { st.err = 'Выберите тип: от него зависит путь заказа и вид кабинета.'; paint(); return; }
    if (to === 3 && !formOk()) { st.err = 'Проверьте обязательные поля анкеты.'; paint(); return; }
    if (to === 4 && !goodsOk()) { st.err = 'Добавьте источник товаров и обязательную скидку.'; paint(); return; }
    st.err = ''; st.step = to; paint(); window.scrollTo(0, 0);
  }
  function bind() {
    var start = root.querySelector('[data-start]'); if (start) start.addEventListener('click', function () { st.view = 'wizard'; st.step = TYPES.length ? 1 : 2; paint(); window.scrollTo(0, 0); });
    root.querySelectorAll('[data-type]').forEach(function (b) { b.addEventListener('click', function () { st.type = b.getAttribute('data-type'); st.err = ''; paint(); }); });
    var pth = root.querySelector('[data-path]'); if (pth) pth.addEventListener('click', function () { st.showPath = !st.showPath; paint(); });
    root.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { go(Number(b.getAttribute('data-go'))); }); });
    root.querySelectorAll('[data-src]').forEach(function (b) { b.addEventListener('click', function () { readForm(); st.goods.source = b.getAttribute('data-src'); paint(); }); });
    var file = document.getElementById('pt-file'); if (file) file.addEventListener('change', function () { var f = file.files && file.files[0]; if (!f) return; st.goods.file = f.name; paint(); });
    ['pt-disc', 'pt-rrc'].forEach(function (id) { var el = document.getElementById(id); if (!el) return; el.addEventListener('input', function () { readForm(); var price = root.querySelector('.pt-prev__price'); if (price) price.innerHTML = '<i>' + F.rub(metodPrice()) + '</i><s>' + F.rub(money(st.goods.rrc)) + '</s>'; }); });
    root.querySelectorAll('[data-doc]').forEach(function (b) { b.addEventListener('click', function () { var d = DOCS[b.getAttribute('data-doc')]; ui.modal({ eyebrow: 'Черновик юриста', title: d[0], text: d[1], actions: [ { label: 'Понятно', kind: 'primary' } ] }); }); });
    var ag = document.getElementById('pt-agree'); if (ag) ag.addEventListener('change', function () { st.agree = ag.checked; });
    var send = root.querySelector('[data-act="send"]');
    if (send) send.addEventListener('click', function () {
      readForm();
      if (!st.agree) { st.err = 'Согласие обязательно для отправки заявки на модерацию.'; paint(); return; }
      var t = typeOf();
      S.leads.add({ product: 'partner', name: st.form.person, phone: st.form.phone, note: st.form.company + (t ? ' · ' + t.label : '') + ' · ' + st.form.category + ' · скидка ' + st.goods.discount + ' %' });
      try { localStorage.setItem(LEAD_KEY, JSON.stringify({ company: st.form.company, type: t ? t.key : null, category: st.form.category, region: st.form.region, delivery: st.form.delivery, goods: st.goods.source === 'link' ? st.goods.link : st.goods.file, ts: Date.now() })); } catch (e) {}
      if (O && t && st.form.company.trim()) O.profiles.set(st.form.company.trim(), { scenario: t.key });
      st.sent = true; st.err = ''; paint(); window.scrollTo(0, 0); ui.toast('Заявка отправлена на модерацию');
    });
  }
  paint();
})();
