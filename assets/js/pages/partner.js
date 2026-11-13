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
    pct: '<path d="M19 5L5 19M7.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16.5 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/>', tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9zM7.5 7.5h.01"/>',
    chev: '<path d="M6 9l6 6 6-6"/>'
  };
  /* выбор списком вместо свободного ввода (Валерия 12.11): категория — разделы Маркета (один), регион — зоны доставки
     (как в partner-extra.js, можно несколько), условия доставки — способы (несколько) + уточнение; везде есть «Другое» */
  var PICK = {
    category: { title: 'Категория товара', hint: 'Задаёт раздел маркетплейса. Несколько категорий добавит менеджер.', multi: false, other: 'Другая категория', options: (D.categories || []).slice() },
    region: { title: 'Регион отгрузки', hint: 'Откуда отправляете. Можно выбрать несколько.', multi: true, other: 'Другой город', options: ['Москва', 'Московская область', 'Санкт-Петербург', 'Ленинградская область', 'Вся Россия — транспортной компанией'] },
    delivery: { title: 'Условия доставки', hint: 'Как доставляете. Можно выбрать несколько.', multi: true, other: 'Другое условие', note: 'Сроки, минимальная сумма — по желанию', options: ['Курьером по городу', 'Транспортной компанией по России', 'Самовывоз со склада', 'Доставка включена в цену', 'Бесплатно от суммы заказа'] }
  };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 20) + '" height="' + (s || 20) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }

  var st = {
    view: 'landing', step: 1, sent: false, sending: false, appId: '', err: '', type: null, showPath: false,
    form: { company: '', person: '', phone: '', tg: '', category: '', region: '', delivery: '' },
    /* выбранное в списках: массивы подписей + «Другое» + уточнение; строки формы собираются из них (pickText) */
    pick: { category: [], region: [], delivery: [], other: { category: '', region: '', delivery: '' }, note: { delivery: '' } },
    goods: { source: 'link', link: '', file: '', discount: '', rrc: '24 900' },
    agree: false, consent: false
  };
  function pickText(key) {
    var p = st.pick, parts = p[key].slice(); if (p.other[key].trim()) parts.push(p.other[key].trim());
    var s = parts.join(', '); if (p.note && p.note[key] && p.note[key].trim()) s += (s ? ' · ' : '') + p.note[key].trim();
    return s;
  }
  var preset = ui.qs('type'); if (preset && TYPES.some(function (t) { return t.key === preset; })) { st.type = preset; st.view = 'wizard'; }
  if (ui.qs('step')) st.view = 'wizard';
  /* сервер заявок: тот же /api, что у расчёта (budget-api.js); с file:// — только в памяти браузера */
  var API = /^https?:$/.test(location.protocol) ? '/api' : null;
  /* дизайнеры и строители — пока заглушки (Валерия 12.11: кабинетов нет; Алина: анкеты будут у всех) */
  var STUB = {
    designer: ['Дизайнерам', 'Анкета для дизайнеров появится скоро', 'Пока — напишите нам: расскажем, как разместить вашу капсулу в каталоге интерьеров SOVEAPP.'],
    builder: ['Строителям', 'Анкета для строителей появится скоро', 'Пока — напишите нам: расскажем, как подключить бригаду к объектам и управлению ремонтом.']
  };
  var who = ui.qs('who'); if (!STUB[who]) who = null;
  function typeOf() { return TYPES.filter(function (t) { return t.key === st.type; })[0] || null; }

  function money(v) { var n = Number(String(v).replace(/\D/g, '')); return isFinite(n) ? n : 0; }
  function metodPrice() { var rrc = money(st.goods.rrc), d = Number(st.goods.discount) || 0; return Math.max(0, Math.round(rrc * (1 - d / 100))); }
  /* телефон: цифры; 10 цифр с 9 → +7…, 8 в начале → 7; годен, если 11 цифр и начинается с 7 */
  function phoneDigits(s) { var d = String(s || '').replace(/\D/g, ''); if (d.length === 10 && d[0] === '9') d = '7' + d; if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1); return d; }
  function phoneOk(s) { var d = phoneDigits(s); return d.length === 11 && d[0] === '7'; }
  var REQ = [['company', 'Компания'], ['person', 'ФИО контакта'], ['phone', 'Телефон (11 цифр)'], ['category', 'Категория товара'], ['region', 'Регион отгрузки']];
  /* чего не хватает в анкете — чтобы ошибка называла поля, а не говорила «проверьте» */
  function missing() { var f = st.form; return REQ.filter(function (r) { return r[0] === 'phone' ? !phoneOk(f.phone) : !String(f[r[0]] || '').trim(); }); }
  function formOk() { return missing().length === 0; }
  function goodsOk() { var g = st.goods; return (g.source === 'link' ? g.link.trim() : g.file.trim()) && Number(g.discount) > 0; }
  function err() { return st.err ? '<p class="field__error">' + esc(st.err) + '</p>' : ''; }
  var bad = {};  /* поля, которых не хватило при переходе дальше — подсвечиваем до следующей попытки */
  function req(key) { return bad[key] ? ' is-bad' : ''; }
  function star(key) { return REQ.some(function (r) { return r[0] === key; }) ? ' <i class="req" aria-hidden="true">*</i>' : ''; }
  function field(id, label, value, ph, type) {
    var key = id.replace('pt-', '').replace('cat', 'category');
    return '<div class="field"><label for="' + id + '">' + esc(label) + star(key) + '</label><input class="input' + req(key) + '" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(value) + '" placeholder="' + esc(ph) + '"' + (key === 'phone' ? ' inputmode="tel" autocomplete="tel"' : '') + '></div>';
  }
  /* поле-кнопка: выглядит как поле ввода, открывает шторку со списком */
  function selField(key, label, ph) {
    var v = pickText(key);
    return '<div class="field"><label id="pt-l-' + key + '">' + esc(label) + star(key) + '</label><button type="button" class="input pt-sel' + req(key) + '" data-pick="' + key + '" aria-haspopup="dialog" aria-labelledby="pt-l-' + key + '">' +
      '<span class="pt-sel__v' + (v ? '' : ' is-ph') + '">' + esc(v || ph) + '</span>' + ic('chev', 18) + '</button></div>';
  }
  /* шторка выбора: список пунктов с галочками, «Другое» со своим полем, для доставки — уточнение; один выбор закрывает сразу */
  function openPick(key) {
    readForm();
    var cfg = PICK[key], p = st.pick, sel = p[key].slice(), other = p.other[key], note = (p.note && p.note[key]) || '';
    var rows = cfg.options.map(function (o, i) { var on = sel.indexOf(o) >= 0; return '<button type="button" class="pt-opt" data-opt="' + i + '" aria-pressed="' + on + '"><span>' + esc(o) + '</span><i class="pt-opt__ok">' + ic('check', 16) + '</i></button>'; }).join('');
    var html = (cfg.hint ? '<p class="small muted pt-pick__hint">' + esc(cfg.hint) + '</p>' : '') + '<div class="pt-opts">' + rows +
      '<button type="button" class="pt-opt" data-opt="other" aria-pressed="' + !!other + '"><span>' + esc(cfg.other) + '</span><i class="pt-opt__ok">' + ic('check', 16) + '</i></button></div>' +
      '<div class="field pt-pick__other"' + (other ? '' : ' hidden') + '><input class="input" id="pt-other" value="' + esc(other) + '" placeholder="Напишите свой вариант"></div>' +
      (cfg.note ? '<div class="field"><label for="pt-note">' + esc(cfg.note) + '</label><input class="input" id="pt-note" value="' + esc(note) + '" placeholder="Например: 3–5 дней, от 10 000 ₽"></div>' : '');
    var m = ui.modal({ title: cfg.title, html: html, actions: [{ label: 'Готово', kind: 'primary', onClick: apply }] });
    m.el.classList.add('pt-sheet');
    var box = m.el;
    function apply() {
      var inp = box.querySelector('#pt-other'), nt = box.querySelector('#pt-note');
      p[key] = sel; p.other[key] = inp && !inp.closest('[hidden]') ? inp.value.trim() : '';
      if (cfg.note) p.note[key] = nt ? nt.value.trim() : '';
      st.form[key] = pickText(key); st.err = ''; paint();
    }
    box.querySelectorAll('[data-opt]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.getAttribute('data-opt'), otherBox = box.querySelector('.pt-pick__other');
        if (v === 'other') { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); otherBox.hidden = !on; if (on) { if (!cfg.multi) { sel = []; box.querySelectorAll('[data-opt]:not([data-opt="other"])').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); }); } var i = box.querySelector('#pt-other'); if (i) i.focus(); } return; }
        var o = cfg.options[Number(v)];
        if (cfg.multi) { var k = sel.indexOf(o); if (k >= 0) sel.splice(k, 1); else sel.push(o); b.setAttribute('aria-pressed', k < 0); return; }
        sel = [o]; box.querySelector('[data-opt="other"]').setAttribute('aria-pressed', 'false'); otherBox.hidden = true; apply(); m.close();
      });
    });
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
    return head('Анкета', 'Минимум данных для старта: поля со звёздочкой обязательны. Категория задаёт раздел маркетплейса.') +
      '<form class="stack stack--4" id="pt-form">' +
        field('pt-company', 'Компания / ИП', st.form.company, 'Например, ООО «Пол и Дом»') +
        field('pt-person', 'ФИО контакта', st.form.person, 'Анна Смирнова') +
        field('pt-phone', 'Телефон', st.form.phone, '+7 999 000-00-00', 'tel') +
        field('pt-tg', 'Telegram', st.form.tg, '@company') +
        selField('category', 'Категория товара', 'Выберите раздел') +
        selField('region', 'Регион отгрузки', 'Выберите регион') +
        selField('delivery', 'Условия доставки', 'Выберите способы доставки') +
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
  function canSend() { return st.agree && st.consent && !st.sending; }
  function viewOffer() {
    return head('Проверьте заявку', 'После отправки менеджер проверит анкету и ассортимент. Публикация — после одобрения.') + summary() +
      '<div class="stack stack--2">' + Object.keys(DOCS).map(function (k) { return '<button type="button" class="pt-doc" data-doc="' + k + '"><span>' + esc(DOCS[k][0]) + '</span><i>черновик юриста</i></button>'; }).join('') + '</div>' +
      '<label class="pt-agree"><input type="checkbox" id="pt-agree"' + (st.agree ? ' checked' : '') + '><span>Принимаю юридические условия партнёрства</span></label>' +
      /* обязательное согласие на обработку ПДн (Валерия 12.11): без него заявка не отправляется */
      '<label class="pt-agree"><input type="checkbox" id="pt-consent"' + (st.consent ? ' checked' : '') + '><span>Даю согласие на обработку персональных данных — <button type="button" class="btn btn--link pt-agree__doc" data-doc="privacy">политика</button></span></label>' + err() +
      '<button type="button" class="btn btn--primary btn--block" data-act="send"' + (canSend() ? '' : ' disabled') + '>' + (st.sending ? 'Отправляем…' : 'Отправить на модерацию') + '</button>' +
      '<p class="small muted" id="pt-hint" style="text-align:center"' + (st.agree && st.consent ? ' hidden' : '') + '>Отметьте оба согласия, чтобы отправить заявку</p>' + back(3);
  }
  function viewSent() {
    var t = typeOf();
    return '<div class="pl-done"><span class="pl-done__ic">' + ic('check', 26) + '</span><h1 class="h1 h1--sm">Заявка принята</h1><p class="text">Ответим за 1–2 рабочих дня по указанному телефону.' + (st.appId ? ' Номер заявки: ' + esc(st.appId) + '.' : '') + '</p></div>' +
      '<div class="pl-list">' +
        '<div class="pl-item"><span class="pl-item__n">1</span><div><b>Пока ждёте</b><span>Подготовьте фото товаров и актуальный прайс — менеджер запросит их при подключении.</span></div></div>' +
        '<div class="pl-item"><span class="pl-item__n">2</span><div><b>После одобрения</b><span>Откроется кабинет' + (t ? ' типа «' + esc(t.label) + '»' : '') + ': заказы, товары, продвижение и выплаты.</span></div></div>' +
        '<div class="pl-item"><span class="pl-item__n">3</span><div><b>Вход</b><span>По телефону из анкеты — код для входа пришлёт менеджер при подключении.</span></div></div></div>' +
      summary() +
      '<a class="btn btn--primary btn--block" href="partner-cabinet.html">Войти в кабинет партнёра</a><a class="btn btn--link" href="market.html">Посмотреть маркетплейс</a>';
  }
  /* заглушка для ролей без кабинета */
  /* личные кабинеты дизайнеров (Алина 12.11): главный дизайнер видит все капсулы, дизайнер — свои; вход прототипный, без пароля */
  var DESIGNERS = [['Татьяна Тюрина', 'Главный дизайнер · все капсулы и все дизайнеры', 'role=chief'], ['Диана Первакова', 'Дизайнер · 6 капсул', 'role=designer&who=' + encodeURIComponent('Диана')],
    ['Дарья Старикова', 'Дизайнер · 2 капсулы', 'role=designer&who=' + encodeURIComponent('Дарья')], ['Роман Ахмадулин', 'Дизайнер · 1 капсула', 'role=designer&who=' + encodeURIComponent('Роман')]];
  function viewDesigners() {
    return '<div class="pl-top"><span class="eyebrow">Дизайнерам</span></div>' +
      '<div class="stack stack--1"><h1 class="h1 h1--sm">Кабинеты дизайнеров</h1><p class="text">Выберите, кто вы, — откроются ваши капсулы.</p></div>' +
      '<div class="pl-cabs">' + DESIGNERS.map(function (d) {
        return '<a class="pl-cab" href="designer-admin.html?noframe=1&proto=1&' + d[2] + '"><span class="pl-cab__ic">' + esc(d[0].charAt(0)) + '</span><span class="pl-cab__b"><b>' + esc(d[0]) + '</b><span>' + esc(d[1]) + '</span></span>' + ic('arrow', 16) + '</a>';
      }).join('') + '</div>' +
      '<div class="stack stack--2"><a class="btn btn--link" href="partner.html">Я поставщик — к анкете</a><a class="btn btn--link" href="index.html">На главную</a></div>';
  }
  function viewStub() {
    if (who === 'designer') return viewDesigners();
    var s = STUB[who];
    return topbar(s[0]) +
      '<div class="pl-done"><span class="pl-done__ic">' + ic('users', 26) + '</span><h1 class="h1 h1--sm">' + esc(s[1]) + '</h1><p class="text">' + esc(s[2]) + '</p></div>' +
      '<div class="stack stack--2"><a class="btn btn--primary btn--block" href="chats.html?kind=support">Написать в поддержку</a>' +
      '<a class="btn btn--link" href="partner.html">Я поставщик — к анкете</a><a class="btn btn--link" href="index.html">На главную</a></div>';
  }

  function paint() {
    root.innerHTML = who ? viewStub()
      : st.view === 'landing' ? viewLanding()
      : st.sent ? viewSent()
      : topbar('Стать партнёром') + progress() + (st.step === 2 ? viewForm() : st.step === 3 ? viewGoods() : st.step === 4 ? viewOffer() : viewType());
    bind();
  }
  /* заявка на сервер: обязательные — компания, контакт, телефон, категория, регион, согласие; остальное по желанию */
  function payload() {
    var t = typeOf(), f = st.form, g = st.goods;
    return { role: 'supplier', type: t ? t.key : null, company: f.company.trim(), contact: f.person.trim(), phone: '+' + phoneDigits(f.phone), telegram: f.tg.trim(),
      category: f.category.trim(), region: f.region.trim(), delivery: f.delivery.trim(), source: g.source === 'link' ? 'catalog' : 'file',
      catalogUrl: g.source === 'link' ? g.link.trim() : null, priceFileName: g.source === 'file' ? g.file : null,
      discountPct: Number(g.discount) || null, rrp: money(g.rrc) || null, consent: !!st.consent };
  }
  function submit() {
    var t = typeOf();
    function done(id) {
      st.appId = id || '';
      S.leads.add({ product: 'partner', name: st.form.person, phone: st.form.phone, note: st.form.company + (t ? ' · ' + t.label : '') + ' · ' + st.form.category + ' · скидка ' + st.goods.discount + ' %' + (id ? ' · ' + id : '') });
      try { localStorage.setItem(LEAD_KEY, JSON.stringify({ company: st.form.company, type: t ? t.key : null, category: st.form.category, region: st.form.region, delivery: st.form.delivery, goods: st.goods.source === 'link' ? st.goods.link : st.goods.file, appId: id || '', ts: Date.now() })); } catch (e) {}
      if (O && t && st.form.company.trim()) O.profiles.set(st.form.company.trim(), { scenario: t.key });
      st.sent = true; st.sending = false; st.err = ''; paint(); window.scrollTo(0, 0); ui.toast('Заявка отправлена');
    }
    if (!API) { done(''); return; }
    st.sending = true; st.err = ''; paint();
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
    fetch(API + '/partners/apply', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload()), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
      .then(function (r) {
        if (timer) clearTimeout(timer);
        if (r.ok && r.body && r.body.id) { done(r.body.id); return; }
        st.sending = false;
        st.err = r.status === 422 ? 'Сервер не принял заявку: ' + (r.body && r.body.detail ? String(r.body.detail) : 'проверьте поля анкеты') : 'Не удалось отправить заявку (сервер ответил ' + r.status + '). Попробуйте ещё раз.';
        paint();
      })
      .catch(function () { if (timer) clearTimeout(timer); st.sending = false; st.err = 'Нет связи с сервером. Проверьте интернет и нажмите «Отправить» ещё раз — заполненное сохранено.'; paint(); });
  }
  function readForm() {
    var map = { 'pt-company': 'company', 'pt-person': 'person', 'pt-phone': 'phone', 'pt-tg': 'tg' };
    Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) st.form[map[id]] = el.value; });
    ['category', 'region', 'delivery'].forEach(function (k) { st.form[k] = pickText(k); });
    var l = document.getElementById('pt-link'); if (l) st.goods.link = l.value;
    var d = document.getElementById('pt-disc'); if (d) st.goods.discount = d.value;
    var r = document.getElementById('pt-rrc'); if (r) st.goods.rrc = r.value;
  }
  /* «<» в шапке: в анкете — на предыдущий шаг, с первого — к условиям; с условий — site.js уводит со страницы */
  window.SOVE.backStep = function () { if (st.view !== 'wizard') return false; go(st.step > 1 ? st.step - 1 : 0); return true; };
  function go(to) {
    readForm();
    if (to === 0) { st.view = 'landing'; st.err = ''; paint(); window.scrollTo(0, 0); return; }
    if (to >= 2 && TYPES.length && !st.type) { st.err = 'Выберите тип: от него зависит путь заказа и вид кабинета.'; paint(); return; }
    if (to === 3) {
      var miss = missing(); bad = {};
      if (miss.length) { miss.forEach(function (r) { bad[r[0]] = true; }); st.err = 'Заполните: ' + miss.map(function (r) { return r[1]; }).join(', ') + '.'; paint(); return; }
    }
    if (to === 4 && !goodsOk()) { st.err = 'Добавьте источник товаров и обязательную скидку.'; paint(); return; }
    st.err = ''; st.step = to; paint(); window.scrollTo(0, 0);
  }
  function bind() {
    var start = root.querySelector('[data-start]'); if (start) start.addEventListener('click', function () { st.view = 'wizard'; st.step = TYPES.length ? 1 : 2; paint(); window.scrollTo(0, 0); });
    root.querySelectorAll('[data-type]').forEach(function (b) { b.addEventListener('click', function () { st.type = b.getAttribute('data-type'); st.err = ''; paint(); }); });
    var pth = root.querySelector('[data-path]'); if (pth) pth.addEventListener('click', function () { st.showPath = !st.showPath; paint(); });
    root.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { go(Number(b.getAttribute('data-go'))); }); });
    root.querySelectorAll('[data-pick]').forEach(function (b) { b.addEventListener('click', function () { openPick(b.getAttribute('data-pick')); }); });
    root.querySelectorAll('[data-src]').forEach(function (b) { b.addEventListener('click', function () { readForm(); st.goods.source = b.getAttribute('data-src'); paint(); }); });
    var file = document.getElementById('pt-file'); if (file) file.addEventListener('change', function () { var f = file.files && file.files[0]; if (!f) return; st.goods.file = f.name; paint(); });
    ['pt-disc', 'pt-rrc'].forEach(function (id) { var el = document.getElementById(id); if (!el) return; el.addEventListener('input', function () { readForm(); var price = root.querySelector('.pt-prev__price'); if (price) price.innerHTML = '<i>' + F.rub(metodPrice()) + '</i><s>' + F.rub(money(st.goods.rrc)) + '</s>'; }); });
    root.querySelectorAll('[data-doc]').forEach(function (b) { b.addEventListener('click', function () { var d = DOCS[b.getAttribute('data-doc')]; ui.modal({ eyebrow: 'Черновик юриста', title: d[0], text: d[1], actions: [ { label: 'Понятно', kind: 'primary' } ] }); }); });
    var send = root.querySelector('[data-act="send"]');
    function syncSend() { if (!send) return; send.disabled = !canSend(); var hint = document.getElementById('pt-hint'); if (hint) hint.hidden = !!(st.agree && st.consent); }
    var ag = document.getElementById('pt-agree'); if (ag) ag.addEventListener('change', function () { st.agree = ag.checked; syncSend(); });
    var cs = document.getElementById('pt-consent'); if (cs) cs.addEventListener('change', function () { st.consent = cs.checked; syncSend(); });
    if (send) send.addEventListener('click', function () {
      readForm();
      if (!st.agree || !st.consent) { st.err = 'Для отправки нужны оба согласия: условия партнёрства и обработка персональных данных.'; paint(); return; }
      if (st.sending) return;
      submit();
    });
  }
  paint();
})();
