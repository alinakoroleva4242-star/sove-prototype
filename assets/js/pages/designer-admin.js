/* Каркас админки дизайнера (Алина 12.11: «создай каркас, передай — дальше всё сделаю»): капсулы и состав — с нашего сервера (только чтение),
   правки — только в этом браузере (localStorage), «Контракт» — JSON для приёма из админки сайта. Вход, роли и сохранение на сервер — не здесь. */
(function () {
  /* справочник позиций (87): название, категория сметы, где бывает, правило количества, единица */
  var POSITIONS = [["Стены","Отделка","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Гардеробная, Прихожая","м² стен","м²"],["Техническая покраска","Отделка","Общее","м² стен","м²"],["Акцентная стена","Отделка","Кухня-гостиная, Гостиная, Спальня, Детская, Кабинет, Прихожая, Гардеробная","м² стен","м²"],["Потолок","Отделка","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Гардеробная, Прихожая","м² пола","м²"],["Пол","Отделка","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Гардеробная, Прихожая","м² пола","м²"],["Пол плитка","Отделка","Санузел, Прихожая, Кухня, Постирочная","м² пола","м²"],["Стены санузла","Отделка","Санузел, Постирочная","м² стен","м²"],["Фартук","Отделка","Кухня, Кухня-гостиная","п.м. по проекту","м²"],["Столешница","Отделка","Кухня, Кухня-гостиная, Санузел","п.м. по проекту","п.м."],["Затирка","Отделка","Санузел, Кухня, Кухня-гостиная, Прихожая, Постирочная","м² пола","кг"],["Плинтус","Отделка","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Гардеробная, Прихожая","п.м. периметра","п.м."],["Потолочный карниз","Отделка","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Гардеробная, Прихожая","п.м. периметра","п.м."],["Молдинги","Отделка","Кухня-гостиная, Гостиная, Спальня, Детская, Кабинет, Прихожая","п.м. периметра","п.м."],["Декоративная розетка","Отделка","Гостиная, Кухня-гостиная, Спальня","шт на комнату","шт"],["Зеркало под ключ","Отделка","Санузел, Прихожая","шт на комнату","м²"],["Радиатор","Отделка","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет","шт на окно","шт"],["Электрокарниз","Отделка","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет","шт на окно","п.м."],["ТВ-подиум","Отделка","Гостиная, Кухня-гостиная","шт на комнату","м²"],["Встроенный свет","Освещение","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Гардеробная, Прихожая","м² пола","шт"],["Влагозащищённый свет","Освещение","Санузел, Постирочная","м² пола","шт"],["Люстра","Освещение","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Прихожая, Санузел","шт на комнату","шт"],["Подвесной свет","Освещение","Кухня-гостиная, Гостиная, Кухня, Спальня, Прихожая","шт на комнату","шт"],["Свет над островом","Освещение","Кухня-гостиная, Кухня, Гостиная","шт на комнату","шт"],["Бра","Освещение","Кухня-гостиная, Гостиная, Спальня, Детская, Прихожая, Санузел","шт на комнату","шт"],["Торшер","Освещение","Кухня-гостиная, Гостиная, Спальня, Кабинет","шт на комнату","шт"],["Настольная лампа","Освещение","Спальня, Кабинет, Детская","шт на комнату","шт"],["Трековый свет","Освещение","Кухня-гостиная, Гостиная, Кухня, Прихожая","шт на комнату","шт"],["Световое полотно","Освещение","Гостиная, Кухня-гостиная, Санузел","шт на комнату","шт"],["Розетки","Выключатели и розетки","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Санузел, Прихожая, Гардеробная, Постирочная","шт на комнату","шт"],["Выключатели","Выключатели и розетки","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Санузел, Прихожая, Гардеробная, Постирочная","шт на комнату","шт"],["Переключатели","Выключатели и розетки","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Санузел, Прихожая, Гардеробная, Постирочная","шт на комнату","шт"],["Слаботочные розетки","Выключатели и розетки","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет","шт на комнату","шт"],["Рамки","Выключатели и розетки","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет, Санузел, Прихожая, Гардеробная, Постирочная","шт на комнату","шт"],["Терморегулятор","Выключатели и розетки","Санузел, Кухня, Прихожая","шт на комнату","шт"],["Ванна","Сантехника","Санузел","шт на комнату","шт"],["Душевая система","Сантехника","Санузел","шт на комнату","шт"],["Душевое ограждение","Сантехника","Санузел","шт на комнату","шт"],["Трап","Сантехника","Санузел","шт на комнату","шт"],["Унитаз","Сантехника","Санузел","шт на комнату","шт"],["Инсталляция","Сантехника","Санузел","шт на комнату","шт"],["Кнопка смыва","Сантехника","Санузел","шт на комнату","шт"],["Раковина","Сантехника","Санузел","шт на комнату","шт"],["Смеситель раковины","Сантехника","Санузел","шт на комнату","шт"],["Тумба под раковину","Сантехника","Санузел","шт на комнату","шт"],["Зеркало санузла","Сантехника","Санузел","шт на комнату","шт"],["Гигиенический душ","Сантехника","Санузел","шт на комнату","шт"],["Полотенцесушитель","Сантехника","Санузел","шт на комнату","шт"],["Кухонная мойка","Сантехника","Кухня, Кухня-гостиная","шт на комнату","шт"],["Смеситель кухни","Сантехника","Кухня, Кухня-гостиная","шт на комнату","шт"],["Холодильник","Техника","Кухня, Кухня-гостиная","шт на комнату","шт"],["Посудомойка","Техника","Кухня, Кухня-гостиная","шт на комнату","шт"],["Духовой шкаф","Техника","Кухня, Кухня-гостиная","шт на комнату","шт"],["СВЧ","Техника","Кухня, Кухня-гостиная","шт на комнату","шт"],["Варочная панель","Техника","Кухня, Кухня-гостиная","шт на комнату","шт"],["Вытяжка","Техника","Кухня, Кухня-гостиная","шт на комнату","шт"],["Стиральная машина","Техника","Санузел, Постирочная","шт на комнату","шт"],["Телевизор","Техника","Гостиная, Кухня-гостиная","шт на комнату","шт"],["Диван","Мебель покупная","Гостиная, Кухня-гостиная","шт на комнату","шт"],["Кресло","Мебель покупная","Гостиная, Кухня-гостиная, Спальня","шт на комнату","шт"],["Журнальный стол","Мебель покупная","Гостиная, Кухня-гостиная","шт на комнату","шт"],["ТВ-тумба","Мебель покупная","Гостиная, Кухня-гостиная","шт на комнату","шт"],["Обеденный стол","Мебель покупная","Кухня, Кухня-гостиная","шт на комнату","шт"],["Стулья","Мебель покупная","Кухня, Кухня-гостиная, Спальня, Кабинет","шт на комнату","шт"],["Барные стулья","Мебель покупная","Кухня, Кухня-гостиная, Гостиная","шт на комнату","шт"],["Кровать","Мебель покупная","Спальня, Детская","шт на комнату","шт"],["Прикроватная тумба","Мебель покупная","Спальня, Детская","шт на комнату","шт"],["Консоль","Мебель покупная","Прихожая, Спальня","шт на комнату","шт"],["Пуф","Мебель покупная","Прихожая, Спальня","шт на комнату","шт"],["Зеркало","Мебель покупная","Прихожая, Спальня","шт на комнату","шт"],["Крючки","Мебель покупная","Прихожая","шт на комнату","шт"],["Стеллаж","Мебель покупная","Гостиная, Кухня-гостиная, Кабинет, Детская","шт на комнату","шт"],["Кухня","Мебель заказная","Кухня, Кухня-гостиная","п.м. по проекту","п.м."],["Шкаф","Мебель заказная","Прихожая, Спальня, Гардеробная, Детская","п.м. по проекту","п.м."],["Тумба санузла","Мебель заказная","Санузел","п.м. по проекту","п.м."],["ТВ-зона / рабочее место","Мебель заказная","Гостиная, Кухня-гостиная, Кабинет","п.м. по проекту","п.м."],["Межкомнатная дверь","Двери и перегородки","Общее","компл. на квартиру","шт"],["Двустворчатая дверь","Двери и перегородки","Общее","компл. на квартиру","шт"],["Дверная фурнитура","Двери и перегородки","Общее","компл. на квартиру","шт"],["Стеклянная перегородка","Двери и перегородки","Общее","компл. на квартиру","шт"],["Шторы","Текстиль и декор","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет","шт на окно","компл."],["Жалюзи","Текстиль и декор","Кухня-гостиная, Гостиная, Кухня, Спальня, Детская, Кабинет","шт на окно","компл."],["Ковёр","Текстиль и декор","Кухня-гостиная, Гостиная, Спальня, Детская","шт на комнату","шт"],["Картина","Текстиль и декор","Кухня-гостиная, Гостиная, Спальня, Прихожая","шт на комнату","шт"],["Декор","Текстиль и декор","Кухня-гостиная, Гостиная, Спальня","шт на комнату","шт"],["Плед","Текстиль и декор","Гостиная, Кухня-гостиная, Спальня","шт на комнату","шт"],["Растение","Текстиль и декор","Гостиная, Кухня-гостиная","шт на комнату","шт"],["Камин","Текстиль и декор","Гостиная, Кухня-гостиная","шт на комнату","шт"]];

  var S = window.SOVE, F = S.fmt, esc = F.esc, ui = S.ui;
  var root = document.getElementById('da-root'); if (!root) return;
  var API = /^https?:$/.test(location.protocol) ? '/api' : null;
  var LS = 'sove.proto.designerAdmin.v1';
  var LS2 = 'sove.proto.designerAdmin.v2', STORE = null;
  var LEVELS = [['база', 'База'], ['премиум', 'Премиум']];
  var TABS = [['passport', 'Интерьер'], ['rows', 'Материалы'], ['check', 'Проверка'], ['contract', 'Контракт']];
  var ROOMS = ['Гардеробная', 'Гостиная', 'Детская', 'Кабинет', 'Кухня', 'Кухня-гостиная', 'Общее', 'Постирочная', 'Прихожая', 'Санузел', 'Спальня'];
  var ROOM_RE = /\s(КУХНЯ-ГОСТИНАЯ|ГОСТИНАЯ|СПАЛЬНЯ|КУХНЯ|САНУЗЕЛ|ПРИХОЖАЯ|ДЕТСКАЯ|КАБИНЕТ|ГАРДЕРОБНАЯ|ПОСТИРОЧНАЯ)\b/;
  /* v2 (Алина 12.11): дизайнеры капсул, статусы, роли прототипа (?role=designer&who=Дарья | ?role=chief) */
  var DESIGNER = { 'К1': 'Диана Первакова', 'К2': 'Диана Первакова', 'К3': 'Диана Первакова', 'К4': 'Диана Первакова', 'К5': 'Диана Первакова', 'К6': 'Диана Первакова', 'К7': 'Дарья Старикова', 'К8': 'Дарья Старикова', 'К9': 'Роман Ахмадулин' };
  var CHIEF = 'Татьяна Тюрина';
  var STATUSES = [['draft', 'Черновик'], ['review', 'На проверке'], ['fix', 'Нужны правки'], ['pub', 'Опубликована'], ['hidden', 'Скрыта'], ['archive', 'Архив']];
  var LS_META = 'sove.proto.designerAdmin.meta.v1';
  var ROLE = (function () { var q = new URLSearchParams(location.search), r = q.get('role'), who = (q.get('who') || '').trim(); if (who) Object.keys(DESIGNER).forEach(function (k) { var d = DESIGNER[k]; if (d.toLowerCase() === who.toLowerCase() || d.split(' ')[0].toLowerCase() === who.toLowerCase()) who = d; });
    return r === 'designer' ? { chief: false, who: who } : { chief: true, who: CHIEF }; })();
  /* кабинеты (ТЗ «Кабинеты дизайнеров», шаг 1): разделы дизайнера и главного дизайнера; раздел — в адресе (?s=) */
  var NAV_D = [['home', 'Профиль', 'user'], ['caps', 'Интерьеры', 'grid'], ['catalog', 'Каталог', 'search'], ['projects', 'Проекты', 'case'], ['prices', 'Цены', 'tag'], ['money', 'Выплаты', 'wallet'], ['docs', 'Документы', 'doc'], ['profile', 'Профиль', 'user']];
  var NAV_C = [['home', 'Главная', 'home'], ['review', 'Проверка', 'check'], ['allcaps', 'Все капсулы', 'grid', 'Капсулы'], ['usage', 'Расход и работы', 'chart', 'Расход'], ['allprojects', 'Все проекты', 'case', 'Проекты'], ['designers', 'Дизайнеры', 'users'], ['dicts', 'Справочники', 'book'], ['quality', 'Качество данных', 'alert']];
  var NAV_MY = NAV_D.map(function (n) { return ['my-' + n[0], n[1], n[2]]; });
  var SOON = ['Заявки и чат', 'Аналитика', 'Продвижение', 'Реферальная программа', 'Уведомления'];
  /* пустые разделы: что здесь будет и на каком шаге появится */
  var STUBS = {
    home: ['До пяти карточек «что сделать сейчас», ниже — последние капсулы и ближайшие проекты.', 8],
    projects: ['Проекты клиентов и личные: шесть этапов АДЕПТ, дедлайны, файлы.', 8],
    prices: ['Ваши ставки ₽/м² по тарифам, сроки и дополнительные услуги.', 8],
    money: ['Начисления и выплаты по месяцам.', 8],
    docs: ['Договор с SOVE, акты, чеки, реквизиты, регламент капсулы.', 8],
    profile: ['Фото, о себе, города, стили, портфолио и загруженность — так вас увидит клиент.', 8],
    review: ['Очередь капсул на проверку: замечания, «Вернуть с замечаниями», «Опубликовать».', 5],
    usage: ['Правило, доля и код работы по каждой позиции капсулы, расход на эталонной квартире.', 6],
    allprojects: ['Проекты всех дизайнеров: этап, дедлайн, просрочка.', 8],
    designers: ['Дизайнеры: капсулы, проекты, загруженность, цены.', 8],
    dicts: ['Комнаты, позиции, форматы квартир, слоты доски и журнал правок.', 7],
    quality: ['Ошибки данных по всем капсулам: цена 0, нет фото, строка без комнаты или позиции, повтор, Премиум дешевле Базы.', 6]
  };
  STUBS.chiefHome = ['На проверке, горящие проекты, ошибки данных и загрузка дизайнеров.', 8];
  /* «Профиль» и «Цены» — на Главной дизайнера, в меню их нет, чтобы не было дублей (адреса ?s=profile / ?s=prices работают) */
  var NAV_HIDE = { profile: 1, prices: 1, 'my-profile': 1, 'my-prices': 1 };
  function shown(n) { return !NAV_HIDE[n[0]]; }
  function navAll() { return ROLE.chief ? NAV_C.concat(NAV_MY) : NAV_D; }
  function secLabel(id) { var n = navAll().filter(function (x) { return x[0] === id; })[0]; return n ? n[1] : ''; }
  function isCapsSec(id) { return id === 'caps' || id === 'allcaps' || id === 'my-caps'; }
  function mineOnly() { return !ROLE.chief || st.sec === 'my-caps'; }
  document.body.setAttribute('data-title', ROLE.chief ? 'Кабинет главного дизайнера' : 'Кабинет дизайнера');
  /* общий слой для модулей кабинета (designer-passport.js, designer-review.js, designer-office.js): разделы, вкладки капсулы и действия регистрируются сюда */
  var DC = window.SOVE_DC = { sections: {}, capTabs: {}, acts: {} };
  var KINDS = [['none', 'Товар не выбран'], ['noprice', 'Нет цены'], ['nophoto', 'Нет фото'], ['noname', 'Нет названия'], ['same', 'Премиум = База'], ['cheaper', 'Премиум дешевле Базы']];
  var IC = { search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>', home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    'case': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>', tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.4"/>', wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h2M3 10h18"/>',
    doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>', check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>', chart: '<path d="M4 20V4M4 20h16M9 16v-5M13 16V8M17 16v-3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M16 5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 4 6"/>', book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 0 2 0h13"/>', alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>', back: '<path d="M19 12H5M11 18l-6-6 6-6"/>', chevron: '<path d="M9 6l6 6-6 6"/>', photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-9 8"/>' };
  function ic(n, s) { return '<svg viewBox="0 0 24 24" width="' + (s || 18) + '" height="' + (s || 18) + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  function num(v) { var n = Number(v); return isFinite(n) && n > 0 ? n : 0; }
  function money(v) { var n = Number(String(v || '').replace(/[^\d.,]/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? Math.round(n) : 0; }
  function plural(n, a, b, c) { var m = n % 100, d = n % 10; return n + ' ' + (m > 10 && m < 20 ? c : d === 1 ? a : d > 1 && d < 5 ? b : c); }
  function tkey(code, level) { return code + '|' + level; }
  function lvlLabel(level) { return (LEVELS.filter(function (l) { return l[0] === level; })[0] || LEVELS[0])[1]; }
  function otherLevel(level) { return level === 'база' ? 'премиум' : 'база'; }
  function price(p) { return p ? (p.price_metod > 0 ? p.price_metod : num(p.price_retail)) : 0; }

  /* справочник позиций → правило количества, единица, комната (если у позиции она одна) */
  var REF = POSITIONS.map(function (r) { var rooms = String(r[2] || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean); return { name: r[0], cat: r[1], rooms: rooms, rule: r[3], unit: r[4], n: norm(r[0]) }; });
  var RULES = []; REF.forEach(function (r) { if (r.rule && RULES.indexOf(r.rule) < 0) RULES.push(r.rule); });
  function norm(s) { return String(s || '').toLowerCase().replace(/\s(кухня-гостиная|гостиная|спальня|кухня|санузел|прихожая|детская|кабинет|гардеробная|постирочная)\b/g, '').replace(/[^a-zа-яё0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function refFor(position) {
    var n = norm(position); if (!n) return null;
    var hit = REF.filter(function (r) { return r.n && (n === r.n || n.indexOf(r.n + ' ') === 0 || r.n.indexOf(n + ' ') === 0); })[0];
    if (hit) return hit;
    var w = n.split(' ')[0]; if (w.length < 5) return null;
    var stem = w.slice(0, w.length - 2);
    return REF.filter(function (r) { var f = r.n.split(' ')[0]; return f.length >= 5 && f.indexOf(stem) === 0; })[0] || null;
  }
  function roomOf(position) { var m = String(position || '').match(ROOM_RE); return m ? m[1].charAt(0) + m[1].slice(1).toLowerCase() : ''; }
  function cleanQuery(position) { return String(position || '').replace(ROOM_RE, '').replace(/\(.*?\)/g, '').replace(/\bтип\s*\d+/i, '').replace(/[+\/,;:.«»"']+/g, ' ').replace(/\s+/g, ' ').trim().split(' ')[0] || ''; } /* каталог ищет по всем словам сразу — начинаем с первого, дизайнер уточнит */

  /* состояние: экран, капсула, уровень, вкладка — в адресе, чтобы перезагрузка и «Назад» не теряли место */
  var st = { room: null, d: 1, proto: false, fCat: '', open: {}, sec: 'home', meta: loadMeta(), live: {}, fWho: '', fStatus: '', screen: 'list', cap: null, level: 'база', tab: 'rows', caps: null, capsErr: '', capNames: {}, tables: {}, loading: {}, errs: {}, edits: loadEdits(), flash: null };
  function readUrl() {
    var q = new URLSearchParams(location.search), cap = q.get('cap'), tab = q.get('tab');
    st.d = /^[123]$/.test(q.get('d') || '') ? Number(q.get('d')) : 1; st.proto = q.get('proto') === '1';
    var sec = q.get('s'); st.sec = navAll().some(function (n) { return n[0] === sec; }) ? sec : cap ? (ROLE.chief ? 'allcaps' : 'caps') : 'home';
    if (cap && !isCapsSec(st.sec)) st.sec = ROLE.chief ? 'allcaps' : 'caps';
    st.screen = cap ? 'cap' : 'list'; st.cap = cap || null; st.level = q.get('level') === 'премиум' ? 'премиум' : 'база';
    st.tab = TABS.some(function (t) { return t[0] === tab; }) || tab === 'diff' ? tab : 'passport';
  }
  function syncUrl(push) {
    var p = new URLSearchParams(location.search); ['cap', 'level', 'tab', 's', 'd'].forEach(function (k) { p.delete(k); });
    if (st.sec !== 'home') p.set('s', st.sec); if (st.d !== 1) p.set('d', st.d);
    if (st.screen === 'cap' && st.cap) { p.set('cap', st.cap); if (st.level !== 'база') p.set('level', st.level); if (st.tab !== 'passport') p.set('tab', st.tab); }
    var qs = p.toString(), url = location.pathname + (qs ? '?' + qs : '');
    if (url === location.pathname + location.search) return;
    history[push ? 'pushState' : 'replaceState'](null, '', url);
  }

  /* правки только этого браузера: { 'К1|база': { rows: { key: patch }, added: [row] } } */
  /* хранилище v2: один ключ { edits, capsules }; правки из ключей v1 подхватываются при первом открытии */
  function store() {
    if (STORE) return STORE;
    try { var d = JSON.parse(localStorage.getItem(LS2) || 'null'); if (d && d.edits) return (STORE = { edits: d.edits, capsules: d.capsules || {}, extra: d.extra || {} }); } catch (e) { /* читаем v1 ниже */ }
    STORE = { edits: {}, capsules: {}, extra: {} };
    try { STORE.edits = JSON.parse(localStorage.getItem(LS) || '{}') || {}; STORE.capsules = JSON.parse(localStorage.getItem(LS_META) || '{}') || {}; } catch (e) { /* пусто */ }
    return STORE;
  }
  function saveStore() { try { localStorage.setItem(LS2, JSON.stringify({ edits: st.edits, capsules: st.meta, extra: store().extra })); } catch (e) { /* приватный режим — правки живут до перезагрузки */ } }
  function loadEdits() { return store().edits; }
  function saveEdits() { saveStore(); }
  /* статус и паспорт капсулы — тоже только в этом браузере: { 'К1': { status: 'review' } } */
  function loadMeta() { return store().capsules; }
  function saveMeta() { saveStore(); }
  /* версия: «Внести изменения» у опубликованной создаёт следующую версию-черновик, на витрине остаётся pubVersion */
  function versionOf(code) { var m = st.meta[code]; return (m && m.version) || 1; }
  function pubVersionOf(code) { var m = st.meta[code]; if (m && m.pubVersion) return m.pubVersion; return statusOf(code) === 'pub' ? versionOf(code) : 0; }
  function mineCap(code) { return designerOf(code) === ROLE.who; }
  /* кто может править: архив — никто; главный — любую; дизайнер — свою в «Черновике» и «Нужны правки» */
  function canEdit(code) { var s = statusOf(code); if (s === 'archive') return false; if (DC.readOnly && DC.readOnly(code)) return false; if (ROLE.chief) return true; return mineCap(code) && (s === 'draft' || s === 'fix'); }
  function setStatus(code, to, msg) {
    var m = meta(code), from = statusOf(code);
    if (to === 'pub') { m.pubVersion = versionOf(code); m.reviewNote = null; }
    if (to === 'next') { m.pubVersion = pubVersionOf(code) || versionOf(code); m.version = versionOf(code) + 1; to = 'draft'; }
    if (to === 'review') m.sentAt = new Date().toISOString();
    m.prev = from; m.status = to; saveMeta(); paint(); if (msg) ui.toast(msg);
  }
  /* удалить черновик: только свой интерьер, которого ещё не было на витрине. Проект в портфолио остаётся */
  function delDraft(code) {
    var m = st.meta[code] || {}; if (!m.custom || m.pubVersion || !mineCap(code)) return;
    sheet({ title: 'Удалить черновик?', html: '<p class="small muted">«' + esc(m.name || 'Новый интерьер') + '» удалится вместе с рендерами и материалами. Вернуть будет нельзя.' + (m.fromPortfolio ? ' Проект в портфолио останется.' : '') + '</p>',
      actions: [{ label: 'Удалить черновик', kind: 'primary', onClick: function () {
        delete st.meta[code]; LEVELS.forEach(function (l) { delete st.edits[tkey(code, l[0])]; delete st.tables[tkey(code, l[0])]; });
        st.caps = (st.caps || []).filter(function (c) { return c.code !== code; });
        var profs = ((store().extra.desk || {}).profiles) || {}; Object.keys(profs).forEach(function (k) { (profs[k].works || []).forEach(function (w) { if (w.cap === code) w.cap = null; }); });
        saveStore(); st.screen = 'list'; st.cap = null; paint(true); window.scrollTo(0, 0); ui.toast('Черновик удалён');
      } }, { label: 'Оставить', kind: 'link' }] });
  }
  DC.delDraft = delDraft;
  function statusBar(code) {
    var s = statusOf(code), v = versionOf(code), pv = pubVersionOf(code), m = st.meta[code] || {}, note = '', btns = [];
    function btn(act, label, kind) { btns.push('<button type="button" class="btn btn--' + (kind || 'ghost') + ' btn--small" data-act="' + act + '">' + label + '</button>'); }
    if (ROLE.chief) {
      if (s === 'review') { btn('st-pub', 'Опубликовать', 'primary'); btn('st-fix', 'Вернуть с замечаниями'); }
      else if (s === 'pub') { btn('st-hide', 'Скрыть'); btn('st-archive', 'В архив'); }
      else if (s === 'hidden') btn('st-show', 'Вернуть на витрину');
      else if (s === 'archive') note = 'В архиве — только просмотр.';
      else note = 'В работе у дизайнера. Опубликовать можно после того, как дизайнер отправит капсулу на проверку.';
    } else {
      if (s === 'draft') btn('st-send', 'Отправить на проверку', 'primary');
      if ((s === 'draft' || s === 'fix') && m.custom && !m.pubVersion) btn('st-del', 'Удалить черновик'); /* свой интерьер, который ещё не был на витрине */
      else if (s === 'review') { note = 'На проверке у главного дизайнера — правки закрыты.'; btn('st-recall', 'Отозвать'); }
      else if (s === 'fix') btn('st-send', 'Отправить снова', 'primary');
      else if (s === 'pub') { note = 'Опубликована — правки закрыты. «Внести изменения» создаст версию ' + (v + 1) + ' в черновике, клиенты останутся на версии ' + v + '.'; btn('st-next', 'Внести изменения'); }
      else if (s === 'hidden') note = 'Скрыта главным дизайнером — только просмотр.';
      else note = 'В архиве — только просмотр.';
    }
    /* дизайнер: понятная плашка — что с интерьером сейчас и что делать */
    if (!ROLE.chief) {
      var bl = DC.blockers ? DC.blockers(code).length : 0, sent = m.sentAt ? new Date(m.sentAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '';
      var big = s === 'draft' ? ['Черновик', bl ? 'Ещё не на витрине. Исправьте ' + bl + ' — потом «Отправить на публикацию».' : 'Всё заполнено. Нажмите «Отправить на публикацию» — главный дизайнер проверит и опубликует.']
        : s === 'fix' ? ['Вернули на правки', 'Исправьте замечания и снова нажмите «Отправить на публикацию».']
        : s === 'review' ? ['На проверке', 'Отправлено' + (sent ? ' ' + sent : '') + '. Главный дизайнер проверит и опубликует — правки закрыты, пока идёт проверка.']
        : s === 'pub' ? ['На витрине', 'Опубликована, клиенты её видят. Чтобы поменять — «Внести изменения», потом снова «Отправить на публикацию».']
        : null;
      if (big) {
        var sb = s === 'draft' || s === 'fix' ? '<button type="button" class="btn btn--primary btn--small" data-act="' + (bl ? 'tab" data-tab="check' : 'st-send') + '">' + (bl ? 'Что исправить · ' + bl : 'Отправить на публикацию') + '</button>' : '';
        /* путь к витрине: 1 заполнить · 2 проверка у главного дизайнера · 3 на витрине */
        var stepN = s === 'review' ? 2 : s === 'pub' ? 3 : 1;
        /* шаги без текста: пройденные — серая ✓, текущий — тёмный; подпись только у текущего шага, где есть что делать */
        var curSub = stepN === 1 ? (s === 'fix' ? 'вернули на правки' : bl ? 'осталось ' + bl : 'готово к отправке') : stepN === 2 ? 'у главного дизайнера' : '';
        var steps = '<ol class="da-path">' + ['Заполнить', 'Проверка', 'На витрине'].map(function (x, i) { var n = i + 1; return '<li class="' + (n < stepN ? 'is-done' : n === stepN ? 'is-cur' : '') + '"><b>' + (n < stepN ? '✓' : n) + '</b><span>' + x + (n === stepN && curSub ? '<i>' + curSub + '</i>' : '') + '</span></li>'; }).join('') + '</ol>';
        btns = btns.filter(function (b) { return b.indexOf('st-send') < 0; }); if (sb) btns.unshift(sb);
        return '<div class="da-status da-status--' + s + '">' + steps + '<span class="da-ver">версия ' + v + (pv && pv !== v ? ' · на витрине версия ' + pv : '') + '</span>' +
          (btns.length ? '<div class="da-status__acts">' + btns.join('') + '</div>' : '') + '</div>' + (s === 'fix' && m.reviewNote ? '<div class="da-note"><b>Замечание главного дизайнера</b><span>' + esc(m.reviewNote.text) + '</span></div>' : '');
      }
    }
    var fix = s === 'fix' && m.reviewNote ? '<div class="da-note"><b>Замечание главного дизайнера</b><span>' + esc(m.reviewNote.text) + '</span></div>' : '';
    return '<div class="da-status"><div class="da-status__l"><span class="da-st da-st--' + s + '">' + esc(statusLabel(s)) + '</span><span class="da-ver">версия ' + v + (pv && pv !== v ? ' · на витрине версия ' + pv : '') + '</span></div>' +
      (note ? '<p class="da-sub">' + esc(note) + '</p>' : '') + (btns.length ? '<div class="da-status__acts">' + btns.join('') + '</div>' : '') + '</div>' + fix;
  }
  function openFix(code) {
    sheet({ title: 'Вернуть с замечаниями', html: '<p class="small muted">' + esc(capName(code)) + ' · дизайнер увидит замечание в капсуле</p><div class="field"><label for="da-fix">Что поправить</label><textarea class="input" id="da-fix" rows="4"></textarea></div><p class="field__error" id="da-fix-err" hidden></p>',
      actions: [{ label: 'Вернуть дизайнеру', kind: 'primary', close: false, onClick: function (ev, api) {
        var t = api.el.querySelector('#da-fix').value.trim(), err = api.el.querySelector('#da-fix-err');
        if (!t) { err.textContent = 'Напишите хотя бы одно замечание'; err.hidden = false; return; }
        meta(code).reviewNote = { text: t, by: ROLE.who, at: new Date().toISOString() }; api.close(); setStatus(code, 'fix', 'Капсула возвращена дизайнеру');
      } }] });
  }
  function meta(code) { return st.meta[code] || (st.meta[code] = {}); }
  /* по умолчанию все капсулы, и К9, — «Опубликована» (Алина 12.11) */
  function statusOf(code) { var m = st.meta[code]; if (m && m.status) return m.status; return 'draft'; } /* Алина 13.11: все интерьеры — «Заполнить», в данных много ошибок; на витрину — через проверку */
  function statusLabel(id) { return (STATUSES.filter(function (x) { return x[0] === id; })[0] || STATUSES[0])[1]; }
  function designerOf(code) { var m = st.meta[code]; return (m && m.designer) || DESIGNER[code] || ''; }
  function visibleCaps(mine) { return (st.caps || []).filter(function (c) { return !mine || designerOf(c.code) === ROLE.who; }); }
  function ed(code, level) { var k = tkey(code, level); return st.edits[k] || (st.edits[k] = { rows: {}, added: [] }); }
  function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }
  function patch(code, level, key, p) {
    var e = ed(code, level);
    if (key.indexOf('add|') === 0) { e.added = e.added.map(function (r) { return r.key === key ? merge(r, p) : r; }); }
    else e.rows[key] = merge(e.rows[key] || {}, p);
    saveEdits();
  }
  function hasEdits(code) { return LEVELS.some(function (l) { var e = st.edits[tkey(code, l[0])]; return e && (Object.keys(e.rows).length || e.added.length); }); }

  /* данные с сервера */
  function getJSON(url) { return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }); }
  function loadCaps() {
    if (!API) { st.capsErr = 'Страница работает только со стенда или через локальный мост к серверу.'; paint(); return; }
    st.caps = null; st.capsErr = ''; paint();
    getJSON(API + '/capsules/live').then(function (d) { (d.capsules || []).forEach(function (c) { st.live[c.code] = { name: c.name || '', images: c.images || [], style: c.style || '', about: c.for_whom || '', description: c.concept || '' }; }); paint(); }).catch(function () { /* без обложек — список работает и так */ });
    getJSON(API + '/budget/capsules').then(function (d) {
      var list = (d.capsules || []).map(function (c) { return { code: c.code, name: c.name || '' }; });
      if (!list.some(function (c) { return c.code === 'К9'; })) list.push({ code: 'К9', name: '', note: 'нет количеств — в расчёт бюджета не входит' });
      Object.keys(st.meta).forEach(function (k) { if (st.meta[k].custom && !list.some(function (c) { return c.code === k; })) list.push({ code: k, name: st.meta[k].name || '' }); });
      st.caps = list; paint();
      visibleCaps(!ROLE.chief).forEach(function (c) { LEVELS.forEach(function (l) { loadTable(c.code, l[0]); }); });
    }).catch(function (e) { st.capsErr = 'Сервер не ответил (' + e.message + ').'; paint(); });
  }
  function loadTable(code, level, force) {
    var k = tkey(code, level); if (st.tables[k] || (st.loading[k] && !force)) return;
    if (st.meta[code] && st.meta[code].custom) { st.tables[k] = { name: '', stale: false, rows: [] }; return; } /* новая капсула: состава на сервере нет */
    st.loading[k] = true; delete st.errs[k];
    getJSON(API + '/capsule/' + encodeURIComponent(code) + '/table?level=' + encodeURIComponent(level)).then(function (d) {
      st.tables[k] = normalize(d); st.loading[k] = false; if (d.name) st.capNames[code] = d.name; paint();
    }).catch(function (e) { st.loading[k] = false; st.errs[k] = e.message; paint(); });
  }
  /* ── модель v2: строка таблицы → позиция справочника, комната, вариант, роль ── */
  var KB = (window.SOVE_KB && window.SOVE_KB.positions) || { list: [], rooms: [], oldRoom: {}, k9: {} };
  var POS = {}; KB.list.forEach(function (p) { POS[p.code] = p; });
  var ROOM_NAMES = KB.rooms.map(function (r) { return r[1]; });
  var RULE_CODES = { 'м² пола': 'floor_m2', 'м² стен': 'wall_m2', 'п.м. периметра': 'perimeter_m', 'шт на комнату': 'per_room', 'шт на окно': 'per_window', 'п.м. по проекту': 'project_m', 'компл. на квартиру': 'per_flat' };
  var RULE_LIST = Object.keys(RULE_CODES);
  var SIZE_RE = /(\d+(?:[-–]\d+)?\s*[xх]\s*\d+(?:\s*см)?|\d+(?:[-–]\d+)?\s*(?:см|мм|м2|м²|")|\bd\s?\d+(?:[-–]\d+)?)/i;
  var COLOR_RE = /(бел[а-яё]+|зел[её]н[а-яё]+|бордов[а-яё]+|винн[а-яё]+|терракотов[а-яё]+|красн[а-яё]+|коричнев[а-яё]+|светл[а-яё]+|бежев[а-яё]+)/i;
  var ROOM_UP = /(?:^|\s)(КУХНЯ-ГОСТИНАЯ|ГОСТИН[А-ЯЁ]*Я|СПАЛЬНЯ|КУХНЯ|САНУЗЕЛ|ВАННАЯ|СУ|ПРИХОЖАЯ|ДЕТСКАЯ|КАБИНЕТ|ГАРДЕРОБНАЯ|ПОСТИРОЧНАЯ)(?=$|[\s,])/;
  var ROOM_TAIL = /\s(гостиная|спальня|сп|сан)$/i;
  function roomName(tok) {
    var t = String(tok || '').trim().toLowerCase(); if (!t) return '';
    if (/^гостин/.test(t)) return 'Гостиная'; if (t === 'су' || t === 'сан' || t === 'ванная') return 'Санузел'; if (t === 'сп') return 'Спальня';
    return ROOM_NAMES.filter(function (r) { return r.toLowerCase() === t; })[0] || '';
  }
  /* комната из названия: «Люстра СПАЛЬНЯ, тип 2» → Спальня; возвращает и название без комнаты */
  function fixLat(t) { return String(t || '').replace(/C(?=[А-ЯЁ])/g, 'С').replace(/c(?=м)/g, 'с').replace(/_/g, ' '); } /* латинские «C»/«c» в русских словах и подчёркивания из старых ключей */
  function splitRoom(title) {
    var t = fixLat(title), m = t.match(ROOM_UP) || t.match(ROOM_TAIL);
    if (!m || !roomName(m[1])) return { room: '', rest: t };
    return { room: roomName(m[1]), rest: (t.slice(0, m.index) + ' ' + t.slice(m.index + m[0].length)).trim() };
  }
  function tnorm(s) {
    return fixLat(s).toLowerCase().replace(/ё/g, 'е').replace(/\(.*?\)/g, ' ').replace(/дополнительн[а-я]*/g, ' ').replace(/,?\s*тип\s*\d+/g, ' ').replace(new RegExp(SIZE_RE.source, 'gi'), ' ')
      .replace(/(^|\s)см(?=$|\s)/g, ' ').replace(/[,;:.«»"']+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  /* старое название → коды позиций (лист «Старые типы → позиция»); совпадения разводятся по комнате и категории */
  var OLDMAP = {};
  KB.list.forEach(function (p) {
    p.olds.concat([p.name]).forEach(function (o) { var k = tnorm(splitRoom(o).rest); if (!k) return; (OLDMAP[k] = OLDMAP[k] || []); if (OLDMAP[k].indexOf(p.code) < 0) OLDMAP[k].push(p.code); });
  });
  function resolvePos(title, room, cat) {
    var n = tnorm(splitRoom(title).rest), c = OLDMAP[n];
    if (c && c.length) {
      if (c.length === 1) return c[0];
      var byRoom = c.filter(function (x) { return room && POS[x].rooms.indexOf(room) >= 0; }); if (byRoom.length === 1) return byRoom[0];
      var pool = byRoom.length ? byRoom : c, byCat = pool.filter(function (x) { return norm(POS[x].cat) === norm(cat); });
      return (byCat[0] || pool[0]);
    }
    return KB.k9[n + '@' + String(room || '').toLowerCase()] || KB.k9[n] || '';
  }
  /* не нашлось целиком — пробуем без последних слов («Стол овальный белый» → «Стол»); такая позиция помечается «проверить позицию» */
  function guessPos(title, room, cat) {
    var w = tnorm(splitRoom(title).rest).split(' ');
    while (w.length > 1) { w.pop(); var hit = resolvePos(w.join(' '), room, cat); if (hit) return hit; }
    return '';
  }
  /* ЕДИНСТВЕННОЕ МЕСТО, где включаются поля сервера: когда /api/capsule/{код}/table начнёт отдавать position_code, work_code, share, color, size, for_flats —
     они берутся отсюда (origin: 'table'). Сейчас приходит только room, и только у части строк К9. */
  function serverFields(it) {
    return { rooms: String(it.room || '').split(',').map(roomName).filter(Boolean), pos: POS[it.position_code] ? it.position_code : '', work: it.work_code || '', share: Number(it.share) > 0 ? Number(it.share) : 0,
      color: it.color || '', size: it.size || '', for_flats: it.for_flats || null };
  }
  function normalize(d) {
    var rows = [], seen = {};
    (d.categories || []).forEach(function (c) {
      (c.items || []).forEach(function (it) {
        var title = String(it.position || it.name || '').trim(), base = c.category + '|' + title, n = seen[base] = (seen[base] || 0) + 1;
        var sv = serverFields(it), sr = splitRoom(title), origin = '', room = '';
        if (sv.rooms.length) { room = sv.rooms[0]; origin = 'table'; }
        else if (sr.room) { room = sr.room; origin = 'title'; }
        else if (KB.oldRoom[title]) { room = KB.oldRoom[title]; origin = 'old'; }
        var pos = sv.pos || resolvePos(title, room, c.category), guess = false; if (!pos) { pos = guessPos(title, room, c.category); guess = !!pos; } var P = POS[pos] || null;
        if (!room && P && P.rooms.length === 1) { room = P.rooms[0]; origin = 'dict'; }
        var tm = title.match(/тип\s*(\d+)/i), sm = sv.size || (fixLat(title).match(SIZE_RE) || [])[1] || '', cm = sv.color || (sr.rest.match(COLOR_RE) || [])[1] || '';
        var variant = tm ? { by: 'room_index', value: tm[1] } : sm ? { by: 'size', value: sm.replace(/\s+/g, ' ').trim() } : null;
        var has = it.name || num(it.price_metod) || num(it.price_retail) || it.img;
        var row = { key: base + '|' + n, category: c.category, title: title || 'без названия', position: title || 'без названия', pos: pos, room: room, origin: origin, variant: variant, color: cm.toLowerCase(),
          posGuess: guess, dup: n > 1, role: /дополнительн/i.test(title) || n > 1 ? 'alt' : 'main', /* повтор строки с тем же названием — замена первой */ unit: it.unit || (P ? P.unit : ''), qty_rule: P ? P.rule : '', share: sv.share || 1, work_code: sv.work || (P ? P.work : ''),
          product: has ? { source: 'table', id: it.id, name: it.name || '', brand: it.brand || '', price_metod: num(it.price_metod), price_retail: num(it.price_retail), img: it.img || '' } : null };
        rows.push(row);
        sv.rooms.slice(1).forEach(function (r2, i) { rows.push(merge(row, { key: row.key + '|r' + (i + 2), room: r2 })); }); /* «Прихожая, санузел» — строка на каждую комнату */
      });
    });
    /* комната из справочника старых типов («холодильник → Кухня»): если в капсуле кухня-гостиная, а отдельной кухни или гостиной нет — ставим в кухню-гостиную */
    var real = {}; rows.forEach(function (r) { if (r.origin === 'table' || r.origin === 'title') real[r.room] = 1; });
    rows.forEach(function (r) { if (r.origin !== 'old') return; if (real['Кухня-гостиная'] && !real[r.room] && (r.room === 'Кухня' || r.room === 'Гостиная')) r.room = 'Кухня-гостиная'; r.origin = 'title'; });
    /* замена без комнаты («Торшер ДОПОЛНИТЕЛЬНЫЙ») встаёт туда, где стоит основная строка той же позиции, если такая комната одна */
    rows.forEach(function (r) {
      if (r.role !== 'alt' || r.room || !r.pos) return;
      var rs = []; rows.forEach(function (x) { if (x.role !== 'alt' && x.pos === r.pos && x.room && rs.indexOf(x.room) < 0) rs.push(x.room); });
      if (rs.length === 1) { r.room = rs[0]; r.origin = 'title'; }
    });
    return { name: d.name || '', stale: !!d.stale, updated: d.updated_at || '', rows: rows };
  }
  function rowsFor(code, level) {
    var t = st.tables[tkey(code, level)]; if (!t) return null;
    var e = st.edits[tkey(code, level)] || { rows: {}, added: [] }, out = [];
    t.rows.forEach(function (r) {
      var p = e.rows[r.key]; if (p && p.removed) return;
      var m = merge(r, p || {}); m.edited = !!p; m.orig = r.product; if (p && p.room != null && p.room !== r.room) m.origin = 'manual'; out.push(m);
    });
    (e.added || []).forEach(function (a) { var P = POS[a.pos]; out.push(merge({ title: a.position || (P && P.name) || '', role: 'main', share: 1, variant: null, color: '', origin: 'manual', work_code: P ? P.work : '' }, merge(a, { edited: true, added: true }))); });
    return out;
  }
  /* замены: у каждой позиции с товаром минимум 3; недостающие подтягиваются из каталога по названию позиции (не сохраняются, пока дизайнер не нажмёт «Оставить») */
  var ALT_MIN = 3, AUTO_KEY = 'sove.dc.autoalt.v1', autoQ = [], autoRun = 0, autoTimer = null;
  st.autoAlt = (function () { try { return JSON.parse(localStorage.getItem(AUTO_KEY) || '{}'); } catch (e) { return {}; } })();
  function autoAlts(room, pos, have, need) {
    var list = st.autoAlt[pos];
    if (!list) { if (autoQ.indexOf(pos) < 0) { autoQ.push(pos); autoPump(); } return []; }
    if (!list.length) return [];
    return list.filter(function (p) { return !have.some(function (r) { return sameProduct(r.product, p); }); }).slice(0, need).map(function (p, i) {
      return { key: 'auto|' + pos + '|' + room + '|' + i, pos: pos, room: room, role: 'alt', alt_source: 'catalog', origin: 'auto', title: p.name, product: p, share: 1, variant: null };
    });
  }
  function autoPump() {
    while (autoRun < 3 && autoQ.length) {
      var pos = autoQ.shift(); if (!POS[pos]) { st.autoAlt[pos] = []; continue; }
      autoRun++;
      (function (pos) {
        getJSON(API + '/marketplace/search?q=' + encodeURIComponent(POS[pos].name) + '&page_size=12').then(function (d) {
          var its = (d.items || []).filter(function (x) { return x.img && (num(x.price_metod) || num(x.price_retail) || num(x.price)); });
          st.autoAlt[pos] = its.slice(0, 8).map(function (x) { var p = catProduct(x); if (!p.price_metod && !p.price_retail) p.price_retail = num(x.price); return p; });
        }, function () { st.autoAlt[pos] = []; }).then(function () {
          autoRun--; try { localStorage.setItem(AUTO_KEY, JSON.stringify(st.autoAlt)); } catch (e) { /* хранилище полное — живём без кэша */ }
          clearTimeout(autoTimer); autoTimer = setTimeout(function again() { var a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { autoTimer = setTimeout(again, 1500); return; } paint(); }, 400); autoPump();
        });
      })(pos);
    }
  }
  /* ячейка = комната × позиция: основные материалы (slots), варианты, замены */
  function buildCell(room, pos, rows) {
    var mains = rows.filter(function (r) { return r.role !== 'alt'; }), alts = rows.filter(function (r) { return r.role === 'alt'; });
    var variants = mains.filter(function (r) { return r.variant; }), slots = mains.filter(function (r) { return !r.variant; });
    if (slots.length > 1) { /* несколько строк без размера и «типа», но разного цвета — варианты по цвету */
      var cols = slots.map(function (r) { return r.color; });
      if (cols.every(function (c, i) { return c && cols.indexOf(c) === i; })) { variants = variants.concat(slots.map(function (r) { return merge(r, { variant: { by: 'color', value: r.color } }); })); slots = []; }
    }
    var main0 = slots[0] || variants[0] || null;
    if (main0 && pos && alts.length < ALT_MIN) alts = alts.concat(autoAlts(room, pos, [main0].concat(alts), ALT_MIN - alts.length));
    return { room: room, pos: pos, rows: rows, slots: slots, variants: variants, alts: alts, main: main0 || alts[0] || null };
  }
  /* комнаты капсулы без строк «без комнаты»: из строк с комнатой, плана и рендеров */
  function baseRooms(code) {
    var have = {};
    LEVELS.forEach(function (l) { (rowsFor(code, l[0]) || []).forEach(function (r) { if (r.room) have[r.room] = 1; }); });
    var pl = (st.meta[code] || {}).plan; if (pl && pl.rooms) pl.rooms.forEach(function (r) { if (r.type) have[r.type] = 1; });
    if (DC.renders) DC.renders(code).forEach(function (r) { if (r.room) have[r.room] = 1; }); /* зона с рендером — тоже комната капсулы (у К9 гардеробная есть только на рендере) */
    /* зона, которую дизайнер добавил в карточке материала (Детская, Кабинет…), — тоже комната капсулы */
    var ov = ((store().extra.mats || {})[code]) || null;
    if (ov) { Object.keys(ov.patch || {}).forEach(function (k) { (ov.patch[k].zones || []).forEach(function (z) { if (z.room && z.room !== 'Общее') have[z.room] = 1; }); }); (ov.added || []).forEach(function (m) { (m.zones || []).forEach(function (z) { if (z.room && z.room !== 'Общее') have[z.room] = 1; }); }); }
    return have;
  }
  /* строка без комнаты: если позиция бывает только в одной комнате капсулы — туда, иначе в «Общее» (отдельной группы «Без комнаты» нет) */
  function rowRoom(r, have) {
    if (r.room) return r.room;
    var P = r.pos && POS[r.pos], hit = P ? P.rooms.filter(function (x) { return x !== 'Общее' && have[x]; }) : [];
    return hit.length === 1 ? hit[0] : 'Общее';
  }
  DC.rowRoom = function (code, r) { return rowRoom(r, baseRooms(code)); };
  function capRooms(code) {
    var have = baseRooms(code);
    have['Общее'] = 1;
    return ROOM_NAMES.filter(function (r) { return have[r]; });
  }
  /* позиции комнаты: все из справочника, которые в ней бывают, + то, что уже стоит */
  function roomCells(code, level, room) {
    var have = baseRooms(code), rows = (rowsFor(code, level) || []).filter(function (r) { return rowRoom(r, have) === room; }), by = {}, nopos = [];
    rows.forEach(function (r) { if (r.pos && POS[r.pos]) (by[r.pos] = by[r.pos] || []).push(r); else nopos.push(r); });
    var cells = [];
    /* материал, заданный в «Общее», виден в каждой комнате, куда он идёт: в комнате не выглядит пустым, меняется сразу на всю квартиру */
    var gen = {}; if (room && room !== 'Общее') (rowsFor(code, level) || []).forEach(function (r) { if (r.pos && POS[r.pos] && rowRoom(r, have) === 'Общее') (gen[r.pos] = gen[r.pos] || []).push(r); });
    KB.list.forEach(function (p) {
      if (by[p.code]) cells.push(buildCell(room, p.code, by[p.code]));
      else if (room && p.rooms.indexOf(room) >= 0 && gen[p.code]) cells.push(merge(buildCell(room, p.code, gen[p.code]), { shared: true }));
      else if (room && !p.hidden && p.rooms.indexOf(room) >= 0) cells.push(buildCell(room, p.code, [])); /* скрытые в справочнике позиции пустыми не предлагаются */
    });
    nopos.forEach(function (r) { cells.push(merge(buildCell(room, '', [r]), { nopos: true })); });
    return cells;
  }
  /* список комнат и счётчики плиток читают карточки материалов (designer-material.js); пока таблицы грузятся — строки */
  function cellsOf(code, level, room) { return (DC.matCells && DC.matCells(code, level, room)) || roomCells(code, level, room); }
  function roomFill(code, level, room) { var c = cellsOf(code, level, room).filter(function (x) { return !x.nopos; }); return { n: c.filter(function (x) { return x.main; }).length, m: c.length }; }
  function roomLabel(r) { return r || 'Общее'; }
  function variantLabel(v, room) { return !v ? '' : v.by === 'room_index' ? (room || 'Комната') + ' № ' + v.value : v.by === 'color' ? 'Цвет: ' + v.value : 'Размер: ' + v.value; }
  function itemKey(code, level, r, slot) { return [code, r.room || '', r.pos || '', level === 'премиум' ? 'premium' : 'base', slot || 1, r.variant ? r.variant.value : ''].join('|'); }
  function ruNum(n) { return String(Math.round(n * 100) / 100).replace('.', ','); }
  function qtyText(r) { if (r.qty != null) return 'вручную: ' + ruNum(r.qty) + ' ' + qtyUnit(r.qty_rule); var q = planQty(st.cap, r); if (q != null) return 'по планировке: ' + ruNum(q) + ' ' + qtyUnit(r.qty_rule); return r.qty_rule ? '≈ ' + ruNum(r.share || 1) + ' × ' + r.qty_rule : 'количество не задано'; }
  function qtyUnit(rule) { return /^м² /.test(rule) ? 'м²' : /^п\.м\./.test(rule) ? 'п.м.' : /^компл/.test(rule) ? 'компл.' : 'шт'; }
  /* количество по планировке / дизайн-проекту: после загрузки план читается в комнаты с площадью и окнами — считаем сами.
     Комната считается квадратной, высота стен 2,7 м. Гостиная и Кухня капсулы в плане «Кухня-гостиная» делят её площадь пополам (допущение). */
  function planQty(code, r, plan) {
    var pl = plan || (code && (st.meta[code] || {}).plan), prs = pl && pl.rooms ? pl.rooms.filter(function (x) { return x.type && Number(x.floor_m2) > 0; }) : [];
    var rule = r.qty_rule, share = r.share || 1; if (!prs.length || !rule || rule === 'п.м. по проекту') return null;
    if (rule === 'компл. на квартиру') return share;
    var room = rowRoom(r, baseRooms(code)), P = r.pos && POS[r.pos], hit = [];
    prs.forEach(function (x) {
      var k = 0;
      if (room === 'Общее') k = P && (P.rooms.indexOf(x.type) >= 0 || (x.type === 'Кухня-гостиная' && (P.rooms.indexOf('Гостиная') >= 0 || P.rooms.indexOf('Кухня') >= 0))) ? 1 : 0;
      else if (x.type === room) k = 1;
      else if (x.type === 'Кухня-гостиная' && (room === 'Гостиная' || room === 'Кухня')) k = 0.5;
      else if (room === 'Кухня-гостиная' && (x.type === 'Гостиная' || x.type === 'Кухня')) k = 1;
      if (k) hit.push([x, k]);
    });
    if (!hit.length) return null;
    return share * hit.reduce(function (sum, h) {
      var S = Number(h[0].floor_m2) * h[1], per = 4 * Math.sqrt(S);
      return sum + (rule === 'м² пола' ? S : rule === 'м² стен' ? per * 2.7 : rule === 'п.м. периметра' ? per : rule === 'шт на окно' ? (Number(h[0].windows) || 0) * h[1] : h[1] >= 1 ? 1 : 0.5);
    }, 0);
  }
  /* эталонная квартира для «≈ N ед.»: Евро-2, 45 м². ДОПУЩЕНИЕ: доли площади и окна — из примера в шапке листа «Форматы квартир» (сам лист пустой),
     комната считается квадратной, высота стен 2,7 м. Заменить, когда Диана заполнит форматы. */
  /* Алина 13.11: эталон — Евро-2, 45 м² (кухня-гостиная, спальня, санузел, прихожая). Доли площади — прежние, приведённые к 100 %: ДОПУЩЕНИЕ */
  var ETALON = { area: 45, name: 'Евро-2', rooms: { 'Кухня-гостиная': [0.49, 1], 'Спальня': [0.27, 1], 'Санузел': [0.10, 0], 'Прихожая': [0.14, 0] } };
  function etalonQty(r) {
    var share = r.share || 1, e = ETALON.rooms[r.room], rule = r.qty_rule;
    if (rule === 'компл. на квартиру') return share;
    if (!e || !rule || rule === 'п.м. по проекту') return null;
    var S = ETALON.area * e[0], per = 4 * Math.sqrt(S);
    return share * (rule === 'м² пола' ? S : rule === 'м² стен' ? per * 2.7 : rule === 'п.м. периметра' ? per : rule === 'шт на окно' ? e[1] : 1);
  }
  function findRow(code, level, key) { return (rowsFor(code, level) || []).filter(function (r) { return r.key === key; })[0] || null; }
  function removedCount(code, level) { var e = st.edits[tkey(code, level)]; if (!e) return 0; return Object.keys(e.rows).filter(function (k) { return e.rows[k].removed; }).length; }
  function stats(rows) {
    var s = { total: rows.length, withProduct: 0, noPrice: 0, noPhoto: 0, edited: 0 };
    rows.forEach(function (r) { var p = r.product; if (r.edited) s.edited++; if (!p) return; s.withProduct++; if (!price(p)) s.noPrice++; if (!p.img) s.noPhoto++; });
    return s;
  }
  function sameProduct(a, b) { if (!a || !b) return false; if (a.source === b.source && a.id && a.id === b.id) return true; return !!a.name && norm(a.name) === norm(b.name); }
  function issues(code, level) {
    var rows = rowsFor(code, level); if (!rows) return null;
    var other = {}; (rowsFor(code, otherLevel(level)) || []).forEach(function (r) { other[r.key] = r; });
    var list = [];
    rows.forEach(function (r) {
      var p = r.product;
      if (!p) { list.push({ kind: 'none', key: r.key, title: r.position, text: 'в бюджет уйдёт 0 ₽' }); return; }
      if (!p.name) list.push({ kind: 'noname', key: r.key, title: r.position, text: 'у товара нет названия — в карточке клиента пусто' });
      if (!price(p)) list.push({ kind: 'noprice', key: r.key, title: r.position, text: (p.name || 'товар') + ' — цены нет, в бюджет уйдёт 0 ₽' });
      if (!p.img) list.push({ kind: 'nophoto', key: r.key, title: r.position, text: (p.name || 'товар') + ' — карточка клиента без картинки' });
      var o = other[r.key];
      if (level === 'премиум' && o && o.product) {
        if (sameProduct(p, o.product)) list.push({ kind: 'same', key: r.key, title: r.position, text: 'тот же товар, что в Базе — клиент с Премиумом получит базовый вариант' });
        else if (price(p) && price(o.product) && price(p) < price(o.product)) list.push({ kind: 'cheaper', key: r.key, title: r.position, text: 'Премиум ' + F.rub(price(p)) + ' дешевле Базы ' + F.rub(price(o.product)) });
      }
    });
    return list;
  }
  function capName(code) { var c = (st.caps || []).filter(function (x) { return x.code === code; })[0], l = st.live[code], mm = st.meta[code]; return (mm && mm.name) || (l && l.name) || st.capNames[code] || (c && c.name) || ''; }
  function cover(code) { var m = st.meta[code], l = st.live[code]; return (m && m.cover) || (l && l.images && l.images[0]) || (DC.localCover ? DC.localCover(code) : '') || ''; }

  /* 4 отметки готовности: Паспорт · Комнаты · Товары · Количество. ok: true ✓ / false ! / null — ещё грузится */
  function readiness(code) {
    var pass = DC.passportIssues ? DC.passportIssues(code) : ['паспорт не заполнен'];
    var out = { passport: { ok: !pass.length, why: pass.join(', ') } };
    var all = [], wait = false;
    LEVELS.forEach(function (l) { var r = rowsFor(code, l[0]); if (r) all = all.concat(r); else if (!st.errs[tkey(code, l[0])]) wait = true; });
    if (wait) { out.rooms = out.goods = out.qty = { ok: null, why: 'загружаю состав…' }; return out; }
    if (!all.length) { out.rooms = out.goods = out.qty = { ok: false, why: 'в составе пусто' }; return out; }
    var noRoom = 0, noPos = 0, noProd = 0, noPrice = 0, noPhoto = 0, noRule = 0;
    all.forEach(function (r) {
      if (!r.room) noRoom++; if (!r.pos) noPos++; if (!r.qty_rule) noRule++;
      if (r.role === 'alt') return; var p = r.product;
      if (!p) noProd++; else { if (!price(p)) noPrice++; if (!p.img) noPhoto++; }
    });
    function why(parts) { return parts.filter(function (x) { return x[0]; }).map(function (x) { return x[0] + ' ' + x[1]; }).join(', '); }
    out.rooms = { ok: !noRoom && !noPos, why: why([[noRoom, 'без комнаты'], [noPos, 'без позиции']]) };
    out.goods = { ok: !noProd && !noPrice && !noPhoto, why: why([[noProd, 'без товара'], [noPrice, 'без цены'], [noPhoto, 'без фото']]) };
    var appr = !!(st.meta[code] || {}).qtyApproved; /* «Количество ✓» ставит главный дизайнер: «Расход и работы» → «Утвердить расход» */
    out.qty = { ok: appr, why: noRule ? why([[noRule, 'без правила']]) : 'расход не утверждён' };
    return out;
  }
  var MARKS = [['passport', 'Паспорт'], ['rooms', 'Комнаты'], ['goods', 'Товары'], ['qty', 'Количество']];

  /* контракт: то, что админка сайта будет присылать вместо таблиц */
  function contract(code, level) {
    var m = st.meta[code] || {}, items = [], cards = DC.materials && DC.materials(code);
    /* строки капсулы получаются из карточек материалов (expand); карточки без зон в капсулу не входят */
    if (cards) DC.matRows(code, level, null).forEach(function (r) {
      var p = r.product, prod = p ? { source: p.source || 'table', id: p.id || null, name: p.name || null, brand: p.brand || null, url: p.url || null, img: p.img || null, price_retail: p.price_retail || null, price_metod: p.price_metod || null, unit: r.unit || null } : null;
      items.push({ capsule: code, version: versionOf(code), room: r.room || null, position: r.position || null, level: r.level, slot: r.slot, variant: r.variant || null, role: r.role, product: prod, qty_rule: RULE_CODES[r.qty_rule] || null, share: r.share || 1, work_code: r.work_code || null, origin: r.origin || null, material: r.material });
    });
    if (!cards)
    capRooms(code).forEach(function (room) {
      roomCells(code, level, room).forEach(function (c) {
        if (c.shared) return; /* общий материал квартиры уже выгружен в «Общее» */
        function push(r, slot) {
          var p = r.product, prod = null;
          if (p) prod = { source: p.source || 'table', id: p.id || null, name: p.name || null, brand: p.brand || null, url: p.url || null, img: p.img || null, price_retail: p.price_retail || null, price_metod: p.price_metod || null, unit: r.unit || null };
          items.push({ capsule: code, version: versionOf(code), room: r.room || null, position: r.pos || null, level: level === 'премиум' ? 'premium' : 'base', slot: slot, variant: r.variant || null, role: r.role === 'alt' ? 'alt' : 'main',
            alt_source: r.role === 'alt' ? (r.alt_source || 'designer') : null, product: prod, qty_rule: RULE_CODES[r.qty_rule] || null, share: r.share || 1, work_code: r.work_code || null, origin: r.origin || null, edited_by: r.edited_by || null,
            key: itemKey(code, level, r, slot), source_title: r.title || null });
        }
        c.slots.forEach(function (r, i) { push(r, i + 1); }); c.variants.forEach(function (r) { push(r, 1); }); c.alts.forEach(function (r, i) { push(r, i + 1); });
      });
    });
    return { exported_at: new Date().toISOString(), source: 'SOVEAPP · кабинет дизайнера (прототип)',
      capsule: { code: code, name: capName(code), designer: designerOf(code), status: statusOf(code), version: versionOf(code), dna: m.dna || [], style: m.style || null, cover: cover(code) || null, about: m.about || null, description: m.description || (st.live[code] || {}).description || null,
        plan: m.plan || null, renders: m.renders || [], drive_folder: m.drive_folder || null },
      materials: (cards || []).filter(function (x) { return x.zones.length; }), items: items };
  }
  var ENDPOINTS = [
    ['GET /api/budget/capsules', 'список капсул К1–К8 (К9 в расчёт не входит — нет количеств)'],
    ['GET /api/capsule/{код}/table?level=база|премиум', 'состав капсулы из таблиц дизайнеров — так сайт считает сейчас'],
    ['GET /api/marketplace/search?q=…&page_size=…', 'поиск по каталогу Маркета: цены METOD и розница, фото; контактов продавца нет'],
    ['GET /api/marketplace/product/{id}', 'карточка товара каталога'],
    ['POST /api/capsules/{код}/composition', 'приём состава из админки сайта, тело — JSON выше. Предложение: маршрута пока нет, согласовать']
  ];

  /* экраны */
  function skel(w) { return '<span class="da-skel" style="width:' + w + '%"></span>'; }
  function viewList() {
    var mine = mineOnly();
    var h = '<div class="da-head"><div class="stack stack--1"><h1 class="h1 h1--sm da-title">' + (mine ? 'Интерьеры' : 'Все капсулы') + '</h1><p class="da-sub">' + (mine ? 'Ваши капсулы. Готовую — отправьте на проверку.' : 'Капсулы всех дизайнеров. Проверяете и публикуете вы.') + ' Правки остаются в этом браузере.</p></div>' +
      (mine ? '<button type="button" class="btn btn--primary btn--small da-new" data-act="new">＋ Новая капсула</button>' : '') + '</div>';
    if (st.capsErr) return h + '<div class="da-err">' + esc(st.capsErr) + '<button type="button" class="btn btn--ghost btn--small" data-act="reload">Повторить</button></div>';
    if (!st.caps) return h + '<div class="da-grid">' + [1, 2, 3].map(function () { return '<div class="da-card"><span class="da-card__cover"></span><span class="da-card__b">' + skel(40) + skel(80) + skel(60) + '</span></div>'; }).join('') + '</div>';
    var caps = visibleCaps(mine);
    if (ROLE.chief && mine && !caps.length) return h + '<div class="da-issues"><div class="da-ok">Своих капсул у вас пока нет.</div></div>';
    if (!ROLE.chief && !caps.length) return h + '<div class="da-err">' + (ROLE.who ? 'У дизайнера «' + esc(ROLE.who) + '» нет капсул.' : 'Не указан дизайнер: добавьте в адрес <code>&amp;who=Имя</code>.') + '</div>';
    var bar = '';
    if (!mine) {
      var whos = []; caps.forEach(function (c) { var d = designerOf(c.code); if (d && whos.indexOf(d) < 0) whos.push(d); });
      bar = '<div class="da-filters"><div class="da-chips" role="group" aria-label="Дизайнер">' + [['', 'Все дизайнеры']].concat(whos.map(function (w) { return [w, w]; })).map(function (o) { return chip('f-who', o[0], o[1], st.fWho === o[0]); }).join('') + '</div>' +
        '<div class="da-chips" role="group" aria-label="Статус">' + [['', 'Все статусы']].concat(STATUSES).map(function (o) { return chip('f-status', o[0], o[1], st.fStatus === o[0]); }).join('') + '</div>' +
        '<div class="da-chips">' + chip('f-err', st.fErr ? '' : '1', 'Есть ошибки', !!st.fErr) + '</div></div>';
      if (st.fErr && DC.blockers) caps = caps.filter(function (c) { return DC.blockers(c.code).length > 0; });
      caps = caps.filter(function (c) { return (!st.fWho || designerOf(c.code) === st.fWho) && (!st.fStatus || statusOf(c.code) === st.fStatus); });
    } else {
      bar = '<div class="da-chips" role="group" aria-label="Статус">' + [['', 'Все']].concat(STATUSES).map(function (o) { return chip('f-status', o[0], o[1], st.fStatus === o[0]); }).join('') + '</div>';
      caps = caps.filter(function (c) { return !st.fStatus || statusOf(c.code) === st.fStatus; });
    }
    var body = caps.length ? '<div class="da-grid">' + caps.map(mine ? capCard : function (c) { return '<div class="da-cardw">' + capCard(c) + (DC.cardActs ? DC.cardActs(c.code) : '') + '</div>'; }).join('') + '</div>' : '<div class="da-issues"><div class="da-ok">Под фильтр ничего не подошло.</div></div>';
    return h + bar + body;
  }
  function listHref() { var p = new URLSearchParams(location.search); ['cap', 'level', 'tab'].forEach(function (k) { p.delete(k); }); var q = p.toString(); return location.pathname + (q ? '?' + q : ''); }
  function chip(act, v, label, on) { return '<button type="button" class="da-chip' + (on ? ' is-on' : '') + '" aria-pressed="' + on + '" data-act="' + act + '" data-v="' + esc(v) + '">' + esc(label) + '</button>'; }
  function capCard(c) {
    var img = cover(c.code), rd = readiness(c.code), stt = statusOf(c.code);
    var marks = MARKS.map(function (mk) {
      var r = rd[mk[0]], cls = r.ok === null ? 'is-wait' : r.ok ? 'is-ok' : 'is-warn';
      return '<span class="da-mark ' + cls + '"><b>' + (r.ok === null ? '…' : r.ok ? '✓' : '!') + ' ' + mk[1] + '</b>' + (r.ok ? '' : '<span>' + esc(r.why) + '</span>') + '</span>';
    }).join('');
    return '<button type="button" class="da-card" data-act="open" data-cap="' + esc(c.code) + '">' +
      '<span class="da-card__cover"' + (img ? ' style="background-image:' + esc(cssUrl(img)) + '"' : '') + '>' + (img ? '' : '<span>нет обложки</span>') + '</span>' +
      '<span class="da-card__b"><span class="da-card__top"><span class="da-st da-st--' + stt + '">' + esc(statusLabel(stt)) + '</span><span class="da-ver">версия ' + versionOf(c.code) + (pubVersionOf(c.code) && pubVersionOf(c.code) !== versionOf(c.code) ? ' · на витрине ' + pubVersionOf(c.code) : '') + '</span></span>' +
      '<b class="da-card__name">' + esc(capName(c.code) || 'название в таблице') + '</b>' +
      (function () { var r = DC.matReady && DC.matReady(c.code); return r && r.total ? '<span class="da-card__rd' + (r.done === r.total ? ' is-ok' : '') + '">Материалы: ' + r.done + ' из ' + r.total + '</span>' : ''; })() +
      (mineOnly() && !c.note ? '' : '<span class="da-card__who">' + (mineOnly() ? '' : esc(designerOf(c.code) || 'дизайнер не назначен')) + (c.note ? (mineOnly() ? '' : ' · ') + '<i>' + esc(c.note) + '</i>' : '') + '</span>') +
      '<span class="da-marks">' + marks + '</span></span></button>';
  }
  /* пустой раздел: название, что здесь будет */
  function viewSection() {
    if (isCapsSec(st.sec)) return viewList();
    if (DC.sections[st.sec]) return DC.sections[st.sec]();
    var id = st.sec.replace(/^my-/, ''), stub = (ROLE.chief && st.sec === 'home' ? STUBS.chiefHome : STUBS[id]) || ['', 0];
    return '<div class="da-head"><div class="stack stack--1"><h1 class="h1 h1--sm da-title">' + esc(secLabel(st.sec)) + '</h1><p class="da-sub">' + esc(stub[0]) + '</p></div></div>' +
      '<div class="da-issues"><div class="da-ok">Раздел пока пустой — наполню на шаге ' + stub[1] + '.</div></div>';
  }
  function secHref(id) { var p = new URLSearchParams(location.search); ['cap', 'level', 'tab', 's'].forEach(function (k) { p.delete(k); }); if (id !== 'home') p.set('s', id); var q = p.toString(); return location.pathname + (q ? '?' + q : ''); }
  function navLink(n, short) { var on = n[0] === st.sec; return '<a href="' + esc(secHref(n[0])) + '" data-sec="' + n[0] + '"' + (on ? ' class="is-active" aria-current="page"' : '') + '>' + ic(n[2], 22) + '<span>' + esc(short && n[3] ? n[3] : n[1]) + '</span></a>'; }
  function soonHtml() { return SOON.map(function (t) { return '<span class="dc-soon" aria-disabled="true">' + esc(t) + '<small>скоро</small></span>'; }).join(''); }
  /* меню кабинета: десктоп — слева, телефон — 5 пунктов снизу и «Ещё»; меню приложения на этой странице скрыто стилями */
  var navHost = document.createElement('div'); navHost.id = 'dc-nav'; document.body.appendChild(navHost);
  function paintNav() {
    var main = (ROLE.chief ? NAV_C : NAV_D).filter(shown), bottom = main.slice(0, ROLE.chief ? 5 : 4), restOn = !bottom.some(function (n) { return n[0] === st.sec; });
    navHost.innerHTML = '<aside class="side dc-side" aria-label="Меню кабинета"><div class="dc-who"><b>' + esc(ROLE.who || 'Дизайнер') + '</b><span>' + (ROLE.chief ? 'Главный дизайнер' : 'Дизайнер') + '</span></div>' +
      '<nav class="side__nav">' + main.map(function (n) { return navLink(n); }).join('') + '</nav>' +
      (ROLE.chief ? '<div class="side__group"><span class="side__cap">Мой кабинет</span><nav class="side__nav">' + NAV_MY.filter(shown).map(function (n) { return navLink(n); }).join('') + '</nav></div>' : '') +
      '<div class="side__group"><span class="side__cap">Скоро</span>' + soonHtml() + '</div></aside>' +
      '<nav class="tabbar dc-tabbar" aria-label="Разделы кабинета">' + bottom.map(function (n) { return navLink(n, true); }).join('') +
      '<a href="#" data-more' + (restOn ? ' class="is-active"' : '') + '>' + ic('more', 22) + '<span>Ещё</span></a></nav>';
  }
  function goSec(id) { st.sec = id; st.screen = 'list'; st.cap = null; paint(true); window.scrollTo(0, 0); }
  function openMore() {
    var main = (ROLE.chief ? NAV_C : NAV_D).filter(shown).slice(ROLE.chief ? 5 : 4), row = function (n) { return '<button type="button" class="dc-more__row' + (n[0] === st.sec ? ' is-on' : '') + '" data-sec="' + n[0] + '">' + ic(n[2], 20) + '<span>' + esc(n[1]) + '</span></button>'; };
    var m = sheet({ title: 'Ещё', html: '<div class="dc-more">' + main.map(row).join('') + '</div>' +
      (ROLE.chief ? '<div class="dc-more__cap">Мой кабинет</div><div class="dc-more">' + NAV_MY.filter(shown).map(row).join('') + '</div>' : '') +
      '<div class="dc-more__cap">Скоро</div><div class="dc-more">' + soonHtml() + '</div>', actions: [] });
    m.el.querySelectorAll('[data-sec]').forEach(function (b) { b.addEventListener('click', function () { m.close(); goSec(b.getAttribute('data-sec')); }); });
  }
  navHost.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return; e.preventDefault();
    if (a.hasAttribute('data-more')) openMore(); else goSec(a.getAttribute('data-sec'));
  });
  /* карусель интерьеров сверху: быстро перейти в соседний, вкладка остаётся та же */
  function capCarousel(code) {
    var list = visibleCaps(!ROLE.chief || /^my-/.test(st.sec)); if (list.length < 2) return '';
    return '<div class="da-caro" role="group" aria-label="Интерьеры">' + list.map(function (c) {
      var img = cover(c.code), on = c.code === code;
      return '<button type="button" class="da-caro__i' + (on ? ' is-on' : '') + '" data-act="cap-go" data-cap="' + esc(c.code) + '" aria-pressed="' + on + '"><span class="da-caro__pic"' + (img ? ' style="background-image:' + esc(cssUrl(img)) + '"' : '') + '></span><b>' + esc(capName(c.code) || 'Интерьер') + '</b></button>';
    }).join('') + '</div>';
  }
  function viewCap() {
    var code = st.cap, level = st.level, k = tkey(code, level), rows = rowsFor(code, level), t = st.tables[k], s = rows ? stats(rows) : null, iss = issues(code, level);
    var stat = s ? '<div class="da-stat"><span><b>' + plural(s.total, 'позиция', 'позиции', 'позиций') + '</b></span><span>' + s.withProduct + ' с товаром</span>' + (s.noPrice ? '<span class="is-warn">' + s.noPrice + ' без цены</span>' : '') + (s.noPhoto ? '<span>' + s.noPhoto + ' без фото</span>' : '') +
      (s.edited ? '<span>' + s.edited + ' изменено здесь</span>' : '') + (removedCount(code, level) ? '<span>' + removedCount(code, level) + ' убрано</span>' : '') + (t && t.stale ? '<span class="is-warn">таблица давно не обновлялась</span>' : '') + '</div>' : '';
    if ((st.meta[code] || {}).wizard && DC.wizard) return DC.wizard(code);
    if (!ROLE.chief && !mineCap(code)) return '<a class="da-back" href="' + esc(listHref()) + '" data-act="list">' + ic('back', 16) + 'Капсулы</a><div class="da-err">Это капсула другого дизайнера — в вашем кабинете её нет.</div>';
    var html = '<a class="da-back" href="' + esc(listHref()) + '" data-act="list">' + ic('back', 16) + esc(secLabel(st.sec) || 'Капсулы') + '</a>' + capCarousel(code) +
      '<div class="da-cap-top' + (canEdit(code) ? '' : ' is-ro') + '"><div class="da-head"><h1 class="h1 h1--sm da-title">' + esc(capName(code) || 'Капсула') + '</h1>' + (hasEdits(code) && canEdit(code) ? '<button type="button" class="btn btn--link" data-act="reset">Сбросить к таблице</button>' : '') + '</div>' +
      (true ? '' : '<div class="da-seg" role="tablist" aria-label="Уровень">' + LEVELS.map(function (l) { return '<button type="button" role="tab" aria-selected="' + (l[0] === level) + '" class="' + (l[0] === level ? 'is-on' : '') + '" data-act="level" data-level="' + l[0] + '">' + l[1] + '</button>'; }).join('') + '</div>') + statusBar(code) + stat +
      '<div class="pc-tabs2">' + TABS.concat(DC.extraTabs ? DC.extraTabs(code) : []).filter(function (tb) { return ROLE.chief || tb[0] !== 'contract'; }).map(function (tb) { var n = tb[0] === 'check' && iss ? ' · ' + (DC.checkAll ? DC.checkAll(code).length : iss.length) : ''; return '<button type="button" class="' + (tb[0] === st.tab ? 'is-on' : '') + '" data-act="tab" data-tab="' + tb[0] + '">' + tb[1] + n + '</button>'; }).join('') + '</div></div>';
    if (st.errs[k]) return html + '<div class="da-err">Состав не загрузился (' + esc(st.errs[k]) + ').' + '' + '<button type="button" class="btn btn--ghost btn--small" data-act="retry">Повторить</button></div>';
    if (!rows) return html + '<div class="da-rows">' + [1, 2, 3, 4, 5].map(function () { return '<div class="da-row"><span class="da-row__pic"></span><span class="da-row__b">' + skel(45) + skel(75) + '</span></div>'; }).join('') + '</div>';
    return html + '<div class="' + (canEdit(code) ? '' : 'is-ro') + '">' + (DC.capTabs[st.tab] ? DC.capTabs[st.tab](code, level) : st.tab === 'check' ? viewCheck(code, level, iss) : st.tab === 'contract' && ROLE.chief ? viewContract(code, level) : (DC.rowsTop ? DC.rowsTop(code) : '') + viewRooms(code, level) + (DC.budgetStrip ? DC.budgetStrip(code) : '')) + '</div>';
  }
  /* ── вкладка «Комнаты»: три варианта дизайна (?d=1|2|3, переключатель при ?proto=1) ── */
  var D_NAMES = { 1: 'Список', 2: 'Плитка', 3: 'Гармошка' };
  function badges(cell) {
    var b = [], r = cell.main;
    if (cell.variants.length > 1) b.push('<span class="dr-b">' + plural(cell.variants.length, 'вариант', 'варианта', 'вариантов') + '</span>');
    if (cell.slots.length > 1) b.push('<span class="dr-b">' + plural(cell.slots.length, 'материал', 'материала', 'материалов') + '</span>');
    if (cell.alts.length) b.push('<span class="dr-b">⇄ ' + plural(cell.alts.length, 'замена', 'замены', 'замен') + '</span>');
    if (r && r.origin === 'title') b.push('<span class="dr-b dr-b--warn">проверить комнату</span>');
    if (cell.room === 'Общее' && cell.pos && POS[cell.pos]) { var have = baseRooms(st.cap), on = POS[cell.pos].rooms.filter(function (x) { return x !== 'Общее' && have[x]; }); if (on.length) b.push('<span class="dr-b">' + esc(on.length === Object.keys(have).filter(function (x) { return x !== 'Общее'; }).length ? 'во всех комнатах' : on.join(' · ')) + '</span>'); } /* общее — видно, в какие комнаты идёт */
    if (DC.cellNote) b.push(DC.cellNote(cell));
    if (r && r.origin === 'gen') b.push('<span class="dr-b dr-b--warn">сгенерировано · проверить</span>');
    if (r && r.origin === 'import') b.push('<span class="dr-b dr-b--edit">из таблицы</span>');
    if (r && r.origin === 'spec') b.push('<span class="dr-b dr-b--edit">из спецификации</span>');
    if (r && r.posGuess) b.push('<span class="dr-b dr-b--warn">проверить позицию</span>');
    if (r && r.edited) b.push('<span class="dr-b dr-b--edit">' + (r.edited_by === 'chief' ? 'изменено главным дизайнером' : 'изменено') + '</span>');
    return b.join('');
  }
  function priceHtml(p) { return !p ? '' : price(p) ? '<em>' + F.rub(price(p)) + '</em>' + (p.price_metod > 0 && p.price_retail > p.price_metod ? '<s>' + F.rub(p.price_retail) + '</s>' : '') + (p.source === 'link' ? '<s>по ссылке</s>' : '') : '<span class="is-none">нет цены</span>'; }
  function cellName(cell) { return cell.pos ? POS[cell.pos].name : (cell.main ? cell.main.title : ''); }
  function cellAttrs(cell) { if (cell.mat) return ' data-act="mat" data-id="' + esc(cell.mat) + '"'; return ' data-act="cell" data-room="' + esc(cell.room) + '" data-pos="' + esc(cell.pos) + '" data-key="' + esc(cell.main ? cell.main.key : '') + '"'; }
  function cellRow(cell) {
    var r = cell.main, p = r && r.product;
    if (!r) return '<button type="button" class="da-row dr-row is-empty"' + cellAttrs(cell) + '><span class="da-row__pic">' + ic('photo') + '</span><span class="da-row__b"><b>' + esc(cellName(cell)) + '</b><span class="dr-empty">не заполнено' + (canEdit(st.cap) ? ' · <u>Подобрать</u>' : '') + '</span></span></button>';
    var prod = p ? '<span class="da-row__p' + (p.name ? '' : ' is-empty') + '">' + (p.name ? (p.brand ? esc(p.brand) + ' · ' : '') + esc(p.name) : 'У товара нет названия') + '</span>' : '<span class="da-row__p is-empty">Товар не выбран</span>';
    return '<button type="button" class="da-row dr-row"' + cellAttrs(cell) + '><span class="da-row__pic">' + (p && p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy">' : ic('photo')) + '</span>' +
      '<span class="da-row__b"><b>' + esc(cellName(cell)) + (cell.nopos ? ' <span class="dr-b dr-b--warn">нет позиции</span>' : '') + '</b>' + prod + '<span class="dr-qty">' + esc(qtyText(r)) + '</span><span class="dr-bs">' + badges(cell) + '</span></span>' +
      '<span class="da-row__r">' + priceHtml(p) + '</span></button>';
  }
  function cellTile(cell) {
    var r = cell.main, p = r && r.product;
    if (!r) return '<button type="button" class="dr-tile is-empty"' + cellAttrs(cell) + '><span class="dr-tile__pic">' + ic('photo', 22) + '</span><b>' + esc(cellName(cell)) + '</b><span class="dr-empty">не заполнено' + (canEdit(st.cap) ? ' · <u>Подобрать</u>' : '') + '</span></button>';
    return '<button type="button" class="da-row dr-tile"' + cellAttrs(cell) + '><span class="dr-tile__pic"' + (p && p.img ? ' style="background-image:' + esc(cssUrl(p.img)) + '"' : '') + '>' + (p && p.img ? '' : ic('photo', 22)) + '</span>' +
      '<b>' + esc(cellName(cell)) + '</b><span class="da-row__p">' + (p ? esc((p.brand ? p.brand + ' · ' : '') + (p.name || 'без названия')) : 'Товар не выбран') + '</span>' +
      '<span class="da-row__r">' + priceHtml(p) + '</span><span class="dr-qty">' + esc(qtyText(r)) + '</span><span class="dr-bs">' + badges(cell) + '</span></button>';
  }
  /* позиции комнаты по категориям сметы */
  function cellGroups(cells, tile) {
    var groups = [], idx = {};
    cells.forEach(function (c) { var cat = c.pos ? POS[c.pos].cat : 'Без позиции в справочнике', g = idx[cat]; if (!g) { g = idx[cat] = { name: cat, cells: [] }; groups.push(g); } g.cells.push(c); });
    return groups.map(function (g) {
      var filled = g.cells.filter(function (c) { return c.main; }).length;
      return '<section class="da-group"><div class="da-group__h"><b>' + esc(g.name) + '</b><span>' + filled + ' из ' + g.cells.length + '</span></div><div class="' + (tile ? 'dr-tiles' : 'da-rows') + '">' + g.cells.map(tile ? cellTile : cellRow).join('') + '</div></section>';
    }).join('');
  }
  function addBtn(room) { return canEdit(st.cap) && room && !/ \d+$/.test(room) ? '<button type="button" class="btn btn--ghost btn--small da-add" data-act="add" data-room="' + esc(room) + '">Добавить позицию</button>' : ''; }
  function looseNote(room) { return room ? '' : '<p class="da-sub">Эти строки в таблице записаны на всю квартиру. Откройте позицию и разнесите её по комнатам — «В другие комнаты».</p>'; }
  /* «Материалы» — один простой вид (список): комнаты → заполненные позиции по категориям → «Не заполнено» свёрнуто */
  function warnOf(cell) {
    var r = cell.main, p = r && r.product;
    if (p && !price(p)) return 'нет цены';
    if (r && (r.origin === 'gen' || r.origin === 'title' || r.posGuess)) return 'проверить';
    return '';
  }
  function simpleRow(cell) {
    var r = cell.main, p = r && r.product, w = warnOf(cell), note = DC.cellNote ? DC.cellNote(cell) : '';
    var meta = [esc(qtyText(r))]; if (cell.alts.length) meta.push('⇄ ' + cell.alts.length); if (cell.shared) meta.push('на всю квартиру'); if (cell.dep) meta.push('зависит от квартиры');
    return '<button type="button" class="da-row dr-row dr-srow"' + cellAttrs(cell) + '><span class="da-row__pic">' + (p && p.img ? '<img src="' + esc(p.img) + '" alt="" loading="lazy">' : ic('photo')) + '</span>' +
      '<span class="da-row__b"><b>' + esc(cellName(cell)) + '</b><span class="da-row__p' + (p && p.name ? '' : ' is-empty') + '">' + (p ? esc((p.brand ? p.brand + ' · ' : '') + (p.name || 'без названия')) : 'Товар не выбран') + '</span>' +
      '<span class="dr-qty">' + meta.join(' · ') + '</span>' + (w || note ? '<span class="dr-bs">' + (w ? '<span class="dr-b dr-b--warn">' + w + '</span>' : '') + note + '</span>' : '') + '</span>' +
      '<span class="da-row__r">' + priceHtml(p) + '</span></button>';
  }
  function viewRooms(code, level) {
    var rooms = DC.aptRooms ? DC.aptRooms(code) : capRooms(code);
    if (st.zone && rooms.indexOf(st.zone) < 0) st.zone = '';
    if (st.zone) st.room = st.zone; else if (rooms.indexOf(st.room) < 0) st.room = rooms[0];
    var nav = '<div class="dr-rooms" role="tablist" aria-label="Комнаты">' + rooms.map(function (room) {
      var f = roomFill(code, level, room), on = room === st.zone;
      return '<button type="button" role="tab" aria-selected="' + on + '" class="dr-room' + (on ? ' is-on' : '') + (f.m && f.n === f.m ? ' is-full' : '') + '" data-act="zone" data-room="' + esc(room) + '"><b>' + esc(roomLabel(room)) + '</b><span>' + f.n + ' из ' + f.m + '</span></button>';
    }).join('') + '</div>';
    /* вкладка «Материалы»: плитки зон → список всех карточек; тап по плитке открывает экран зоны */
    if (!st.zone && DC.matListView) return '<div class="dr-layout">' + nav + DC.matListView(code, level) + '</div>';
    /* экран зоны: все позиции справочника, которые бывают в зоне, по категориям. Заполненная — тап открывает карточку;
       пустая — «Подобрать» (＋ Материал с этой зоной и позицией) или «Взять из другой зоны». Здесь ничего не редактируется напрямую */
    var cells = cellsOf(code, level, st.room), groups = [], idx = {}, can = canEdit(code), virtual = / \d+$/.test(st.zone || ''), ms = (DC.materials && DC.materials(code)) || [], zroom = String(st.zone || '').replace(/ \d+$/, '');
    cells.forEach(function (c) { var cat = c.pos ? POS[c.pos].cat : 'Без позиции в справочнике', g = idx[cat]; if (!g) { g = idx[cat] = { name: cat, cells: [] }; groups.push(g); } g.cells.push(c); });
    function emptyRow(c) {
      var donors = ms.filter(function (m) { return m.position === c.pos && m.zones.length && !m.zones.some(function (z) { return z.room === zroom; }); }).length;
      return '<div class="mt-empty"><span class="mt-empty__b"><b>' + esc(cellName(c)) + '</b><span>не заполнено</span></span>' + (can && !virtual ? '<span class="dr-btns"><button type="button" class="dr-sbtn" data-act="zone-pick" data-pos="' + esc(c.pos) + '">Подобрать</button>' + (donors ? '<button type="button" class="dr-sbtn is-quiet" data-act="zone-take" data-pos="' + esc(c.pos) + '">Взять из другой зоны</button>' : '') + '</span>' : '') + '</div>';
    }
    var list = groups.map(function (g) {
      var full = g.cells.filter(function (c) { return c.main; });
      return '<section class="da-group"><div class="da-group__h"><b>' + esc(g.name) + '</b><span>' + full.length + ' из ' + g.cells.length + '</span></div><div class="da-rows">' + g.cells.map(function (c) { return c.main ? simpleRow(c) : emptyRow(c); }).join('') + '</div></section>';
    }).join('') || '<div class="da-issues"><div class="da-ok">В этой зоне пока нет позиций.</div></div>';
    var zhead = '<div class="mt-zhead"><button type="button" class="da-back" data-act="zone" data-room="">' + ic('back', 16) + 'Все материалы</button><h2>' + esc(roomLabel(st.zone)) + '</h2>' + (virtual ? '<p class="da-sub">Вторая комната получает те же материалы, что первая. Отличия задаются в карточке материала — «Для второй и следующих комнат».</p>' : '') + '</div>';
    return '<div class="dr-layout"><div class="dr-main">' + zhead + (DC.roomExtra ? DC.roomExtra(code, st.room) : '') + list + '</div></div>';
  }
  function viewCheck(code, level, iss) {
    var ok = tkey(code, otherLevel(level)); if (!st.tables[ok] && !st.errs[ok]) loadTable(code, otherLevel(level));
    var out = '<p class="da-sub">' + (level === 'премиум' ? 'Проверяю Премиум и сравниваю с Базой.' : 'Проверяю Базу. Сравнение уровней («тот же товар», «дешевле Базы») — на уровне Премиум.') + ' Нажмите строку — покажу её в составе.</p>';
    if (!iss.length) return out + '<div class="da-issues"><div class="da-ok">Замечаний нет: у всех позиций есть товар, цена и фото.</div></div>';
    return out + KINDS.map(function (kd) {
      var list = iss.filter(function (i) { return i.kind === kd[0]; }); if (!list.length) return '';
      return '<section class="da-group"><div class="da-group__h"><b>' + kd[1] + '</b><span>' + list.length + '</span></div><div class="da-issues">' + list.map(function (i) {
        return '<button type="button" class="da-issue" data-act="goto" data-key="' + esc(i.key) + '"><span><b>' + esc(i.title) + '</b><span>' + esc(i.text) + '</span></span><span class="da-cap__ch">' + ic('chevron') + '</span></button>';
      }).join('') + '</div></section>';
    }).join('');
  }
  function viewContract(code, level) {
    var json = JSON.stringify(contract(code, level), null, 2);
    return '<p class="da-sub">Капсула «' + esc(capName(code)) + '», уровень ' + lvlLabel(level) + ', с правками этого браузера — в том виде, в каком его можно принимать из админки сайта вместо таблиц. У товара три источника: <code>catalog</code> — товар каталога по id (цена обновляется сама), <code>table</code> — строка таблицы дизайнера как сейчас, <code>link</code> — ссылка на сайт продавца, цена руками.</p>' +
      '<div class="row"><button type="button" class="btn btn--primary btn--small" data-act="download">Скачать JSON</button><button type="button" class="btn btn--ghost btn--small" data-act="copy">Скопировать</button></div>' +
      '<pre class="da-code" tabindex="0">' + esc(json) + '</pre>' +
      '<div class="stack stack--2"><b>Для разработчика</b><div class="da-ep">' + ENDPOINTS.map(function (e) { return '<span><code>' + esc(e[0]) + '</code> — ' + esc(e[1]) + '</span>'; }).join('') + '</div></div>';
  }

  /* ── шторки ── */
  function sheet(o) { var m = ui.modal(o); m.el.classList.add('pt-sheet'); return m; }
  function field(id, label, value, ph, mode) { return '<div class="field"><label for="' + id + '">' + esc(label) + '</label><input class="input" id="' + id + '" value="' + esc(value == null ? '' : value) + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : '') + (mode ? ' inputmode="' + mode + '"' : '') + ' autocomplete="off"></div>'; }
  function cssUrl(u) { return 'url("' + String(u).replace(/["\\]/g, '') + '")'; }
  function catProduct(p) { var o = { source: 'catalog', id: p.id, name: p.name || '', brand: p.brand || '', price_metod: num(p.price_metod), price_retail: num(p.price_retail), img: p.img || '' }; if (p.position) o.cpos = p.position; if (p.category) o.ccat = p.category; if (p.subcat && p.subcat !== p.category) o.csub = p.subcat; return o; } /* cpos/ccat — позиция и категория товара в каталоге: по ним материал встаёт в категорию бюджета */
  /* поиск по каталогу: onPick(product). limit 5 — «Подобрать» для пустой позиции */
  function openSearch(title, sub, query, onPick, limit) {
    /* каталог везде; если товара нет в каталоге — «Указать ссылкой» прямо отсюда */
    var m = sheet({ title: title, html: '<p class="small muted">' + esc(sub) + '</p><div class="da-search"><input class="input" id="da-q" value="' + esc(query) + '" placeholder="Название, бренд или категория" autocomplete="off"><div class="da-opts" id="da-res" aria-live="polite"></div></div>', actions: [{ label: 'Нет в каталоге — указать ссылкой', kind: 'ghost', onClick: function () { openLink(sub, null, onPick); } }, { label: 'Отмена', kind: 'link' }] });
    var inp = m.el.querySelector('#da-q'), res = m.el.querySelector('#da-res'), timer = null, seq = 0, size = limit || 12;
    function run() {
      var qv = inp.value.trim(); if (qv.length < 2) { res.innerHTML = '<div class="da-empty">Введите хотя бы две буквы</div>'; return; }
      var my = ++seq; res.innerHTML = '<div class="da-empty">Ищу…</div>';
      getJSON(API + '/marketplace/search?q=' + encodeURIComponent(qv) + '&page_size=' + size).then(function (d) {
        if (my !== seq) return; var items = (d.items || []).slice(0, size);
        if (!items.length) { res.innerHTML = '<div class="da-empty">Ничего не нашлось. Попробуйте другое слово или укажите товар ссылкой.</div>'; return; }
        res.innerHTML = items.map(function (p, i) {
          return '<button type="button" class="da-opt" data-i="' + i + '"><span class="da-opt__pic"' + (p.img ? ' style="background-image:' + esc(cssUrl(p.img)) + '"' : '') + '></span><span class="da-opt__b"><b>' + esc(p.name) + '</b><span>' + esc([p.brand, p.category].filter(Boolean).join(' · ')) + '</span>' + (function () { var pc = DC.posOfProduct ? DC.posOfProduct(catProduct(p)) : ''; return pc && POS[pc] ? '<i class="da-opt__pos">' + esc(POS[pc].name) + '</i>' : '<i class="da-opt__pos is-none">позиция не указана</i>'; })() + '</span>' +
            '<span class="da-opt__pr">' + (price(p) ? F.rub(price(p)) : '—') + (p.price_metod > 0 && p.price_retail > p.price_metod ? '<s>' + F.rub(p.price_retail) + '</s>' : '') + '</span></button>';
        }).join('') + (d.total > items.length ? '<div class="da-empty">Первые ' + items.length + ' из ' + F.num(d.total) + ' — уточните запрос</div>' : '');
        res.querySelectorAll('[data-i]').forEach(function (b) { b.addEventListener('click', function () { m.close(); onPick(catProduct(items[Number(b.getAttribute('data-i'))])); }); });
      }).catch(function (e) { if (my === seq) res.innerHTML = '<div class="da-empty">Каталог не ответил (' + esc(e.message) + '). Попробуйте ещё раз.</div>'; });
    }
    inp.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 350); });
    run();
  }
  function openLink(sub, cur, onSave) {
    var p = cur && cur.source === 'link' ? cur : {};
    sheet({ title: 'Указать товар ссылкой', html: '<p class="small muted">' + esc(sub) + ' · цена по ссылке не обновляется сама</p>' + field('da-l-name', 'Название товара', p.name, 'Как увидит клиент') + field('da-l-url', 'Ссылка на товар', p.url, 'https://…', 'url') + field('da-l-brand', 'Бренд или продавец', p.brand) +
      '<div class="row">' + field('da-l-retail', 'Розница, ₽', p.price_retail || '', '', 'decimal') + field('da-l-metod', 'Цена METOD, ₽', p.price_metod || '', '', 'decimal') + '</div>' + field('da-l-img', 'Ссылка на фото', p.img, 'https://…', 'url') + '<p class="field__error" id="da-l-err" hidden></p>',
      actions: [{ label: 'Сохранить', kind: 'primary', close: false, onClick: function (ev, api) {
        var v = function (id) { return api.el.querySelector('#' + id).value.trim(); }, name = v('da-l-name'), err = api.el.querySelector('#da-l-err');
        if (!name) { err.textContent = 'Напишите название товара'; err.hidden = false; api.el.querySelector('#da-l-name').focus(); return; }
        api.close(); onSave({ source: 'link', name: name, url: v('da-l-url'), brand: v('da-l-brand'), price_retail: money(v('da-l-retail')), price_metod: money(v('da-l-metod')), img: v('da-l-img') });
      } }] });
  }
  /* правки строк; правка главного дизайнера помечается */
  function stamp(p) { if (ROLE.chief) p.edited_by = 'chief'; return p; }
  function patchRow(code, level, key, p) { patch(code, level, key, stamp(p)); }
  function addRow(code, level, f) {
    var P = POS[f.pos] || {}, key = 'add|' + Date.now() + '|' + Math.round(Math.random() * 1e4);
    ed(code, level).added.push(stamp(merge({ key: key, category: P.cat || 'Без позиции', position: P.name || '', pos: '', room: '', role: 'main', variant: null, share: 1, qty_rule: P.rule || '', unit: P.unit || '', work_code: P.work || '', origin: 'manual', product: null }, f)));
    saveEdits(); return key;
  }
  function removeRow(code, level, key) { var ex = ed(code, level); if (key.indexOf('add|') === 0) ex.added = ex.added.filter(function (r) { return r.key !== key; }); else ex.rows[key] = merge(ex.rows[key] || {}, { removed: true }); saveEdits(); }
  function sameCount(code, level, product) { return (rowsFor(code, level) || []).filter(function (r) { return sameProduct(r.product, product); }).length; }
  /* замена товара; everywhere — во всех строках уровня, где стоял тот же товар (один товар во многих комнатах правится разом) */
  function setProduct(code, level, row, product, everywhere) {
    var keys = [row.key];
    if (everywhere && row.product) (rowsFor(code, level) || []).forEach(function (r) { if (r.key !== row.key && sameProduct(r.product, row.product)) keys.push(r.key); });
    keys.forEach(function (k) { patchRow(code, level, k, { product: product }); });
    return keys.length;
  }
  function pickFor(code, level, room, pos, f, done) {
    var P = POS[pos] || {};
    openSearch('Подобрать товар', (P.name || 'Позиция') + ' · ' + roomLabel(room), P.name || '', function (product) { var k = addRow(code, level, merge({ pos: pos, room: room, product: product }, f || {})); done(k); }, 5);
  }
  function prodMini(r) {
    var p = r.product;
    return '<span class="dr-mini"><span class="da-opt__pic"' + (p && p.img ? ' style="background-image:' + esc(cssUrl(p.img)) + '"' : '') + '></span><span class="da-opt__b"><b>' + (p ? esc(p.name || 'без названия') : 'Товар не выбран') + '</b><span>' + (p ? esc(p.brand || '') : '') + '</span></span><span class="da-opt__pr">' + (p && price(p) ? F.rub(price(p)) : '—') + '</span></span>';
  }
  /* шторка позиции: товар · ещё материал · варианты · замены · количество · другие комнаты */
  function openCell(room, pos, key) {
    var code = st.cap, level = st.level, P = POS[pos] || null, can = canEdit(code), vform = false, advOpen = null;
    function cell() { var c = roomCells(code, level, room).filter(function (x) { return pos ? x.pos === pos : (x.main && x.main.key === key); })[0]; return c || buildCell(room, pos, []); }
    var m = sheet({ title: P ? P.name : 'Позиция без справочника', html: '<div id="dr-sheet"></div>', actions: [{ label: 'Готово', kind: 'primary' }] });
    var box = m.el.querySelector('#dr-sheet');
    function sbtn(s, label, k, extra) { return '<button type="button" class="dr-sbtn' + (extra || '') + '" data-s="' + s + '"' + (k ? ' data-k="' + esc(k) + '"' : '') + '>' + label + '</button>'; }
    function sec(t, body, n) { return '<section class="dr-sec"><h3>' + t + (n ? '<span>' + n + '</span>' : '') + '</h3>' + body + '</section>'; }
    function render() {
      var c = cell(), r = c.main, h = '<p class="small muted">' + esc(roomLabel(room)) + (P ? ' · ' + esc(P.cat) : '') + (can ? '' : ' · только просмотр') + '</p>' + (DC.itemNotes ? DC.itemNotes(code, room, pos) : '');
      if (!r) { box.innerHTML = h + '<div class="da-ok">Позиция не заполнена.</div>' + (can ? '<div class="dr-btns">' + sbtn('pick', 'Подобрать из каталога') + sbtn('pick-link', 'Ссылкой') + '</div>' : ''); return; }
      var first = c.slots[0] || r, nSame = first.product ? sameCount(code, level, first.product) : 0;
      /* 1 — основной товар */
      h += sec('Основной товар', prodMini(first) + (c.shared ? '<p class="dr-hint">Материал на всю квартиру — замена поменяет его во всех комнатах.</p>' : '') + (first.origin === 'title' ? '<p class="dr-hint is-warn">Комната взята из названия строки («' + esc(first.title) + '») — проверьте.</p>' : '') +
        (can ? '<div class="dr-btns">' + sbtn('replace', 'Заменить', first.key) + sbtn('link', 'Ссылкой', first.key) + sbtn('remove', 'Убрать', first.key, ' is-quiet') + '</div>' +
          (nSame > 1 ? '<label class="dr-check"><input type="checkbox" id="dr-all" checked> Менять этот товар везде, где он стоит (' + plural(nSame, 'строка', 'строки', 'строк') + ')</label>' : '') : ''));
      var adv = '';
      /* 4 — замены */
      h += sec('Замены', (c.alts.length ? '<div class="dr-list">' + c.alts.map(function (a) { return '<div class="dr-li">' + (a.dup ? '<span class="dr-li__t">повтор строки в таблице</span>' : a.origin === 'auto' ? '<span class="dr-li__t">подобрано из каталога</span>' : '') + prodMini(a) + (can ? (a.origin === 'auto' ? sbtn('alt-keep', 'Оставить', a.key) : sbtn('remove', '✕', a.key, ' is-x')) : '') + '</div>'; }).join('') + '</div>' : '<p class="dr-hint">Товары, на которые клиент может заменить основной. Минимум 3, до 10 — недостающие подбираются из каталога.</p>') +
        (can ? '<div class="dr-btns">' + (c.alts.length < 10 ? sbtn('alt', '＋ замена') : '<span class="dr-hint">Добавлено 10 из 10</span>') + '</div>' : ''), c.alts.length + ' из 10');
      /* 2 — ещё материал с долей */
      var extra = c.slots.slice(1);
      adv += sec('Ещё материал', (extra.length ? '<div class="dr-list">' + c.slots.map(function (s, i) {
        return '<div class="dr-li">' + prodMini(s) + '<label class="dr-share">доля <input class="input" inputmode="decimal" data-share="' + esc(s.key) + '" value="' + ruNum(s.share || 1) + '"' + (can ? '' : ' disabled') + '></label>' + (can && i ? sbtn('remove', '✕', s.key, ' is-x') : '') + '</div>';
      }).join('') + '</div>' : '<p class="dr-hint">Второй материал в той же позиции — например, краска и обои на стенах. У каждого своя доля.</p>') + (can ? '<div class="dr-btns">' + sbtn('slot', '＋ ещё материал') + '</div>' : ''), extra.length ? c.slots.length : '');
      /* 3 — варианты */
      adv += sec('Варианты', (c.variants.length ? '<div class="dr-list">' + c.variants.map(function (v) {
        return '<div class="dr-li"><span class="dr-li__t">' + esc(variantLabel(v.variant, room)) + '</span>' + prodMini(v) + (can ? sbtn('replace', 'Заменить', v.key) + sbtn('remove', '✕', v.key, ' is-x') : '') + '</div>';
      }).join('') + '</div>' : '<p class="dr-hint">Разный товар для второй спальни, для комнаты другого размера или другого цвета.</p>') +
        (can ? (vform ? '<div class="dr-vform"><select class="input" id="dr-vby"><option value="room_index">По номеру комнаты</option><option value="size">По размеру комнаты</option><option value="color">По цвету</option></select><input class="input" id="dr-vval" placeholder="Например: 2, 140 см, белый">' + sbtn('variant-go', 'Подобрать товар') + '</div>' : '<div class="dr-btns">' + sbtn('variant', '＋ вариант') + '</div>') : ''), c.variants.length || '');
      /* 5 — количество */
      var eq = planQty(code, first); if (eq == null) eq = etalonQty(first); var unit = first.unit || (P && P.unit) || '';
      adv += sec('Количество', '<div class="dr-kv"><span>Правило</span>' + (ROLE.chief && can ? '<select class="input" id="dr-rule">' + RULE_LIST.map(function (x) { return '<option' + (x === first.qty_rule ? ' selected' : '') + '>' + x + '</option>'; }).join('') + '</select>' : '<b>' + esc(first.qty_rule || 'не задано') + '</b>') + '</div>' +
        '<div class="dr-kv"><span>Доля</span><input class="input" inputmode="decimal" data-share="' + esc(first.key) + '" value="' + ruNum(first.share || 1) + '"' + (can ? '' : ' disabled') + '></div>' +
        (ROLE.chief ? '<div class="dr-kv"><span>Код работы</span><input class="input" id="dr-work" value="' + esc(first.work_code || '') + '" placeholder="нет в прайсе"' + (can ? '' : ' disabled') + '></div>' : '') +
        '<p class="dr-hint">' + (eq === null ? 'На эталонной квартире не считается: ' + (first.qty_rule === 'п.м. по проекту' ? 'длина берётся из проекта.' : !first.qty_rule ? 'нет правила.' : 'такой комнаты в эталоне нет.') : 'Итог: ≈ ' + ruNum(eq) + ' ' + esc(unit) + ' на эталонной квартире (' + ETALON.area + ' м²).') + '</p>');
      /* 6 — в другие комнаты */
      var others = capRooms(code).filter(function (x) { return x && x !== room; });
      if (P) P.rooms.forEach(function (x) { if (x !== room && others.indexOf(x) < 0) others.push(x); }); /* и комнаты, где позиция бывает по справочнику, — так в капсуле появляется новая комната */
      if (can && P && first.product && others.length) {
        adv += sec('В другие комнаты', '<div class="dr-rchecks">' + others.map(function (o) {
          var has = (rowsFor(code, level) || []).some(function (x) { return x.room === o && x.pos === pos && sameProduct(x.product, first.product); });
          return '<label class="dr-check"><input type="checkbox" data-room="' + esc(o) + '"' + (has ? ' checked disabled' : '') + '> ' + esc(o) + (has ? ' <small>уже стоит</small>' : '') + '</label>';
        }).join('') + '</div><div class="dr-btns">' + sbtn('copy', room ? 'Поставить в отмеченные' : 'Разнести по отмеченным') + '</div>');
      }
      if (advOpen === null) advOpen = c.slots.length > 1 || c.variants.length > 0;
      /* в карточке дизайнера — только товар и замены; количество приходит из таблиц и показывается строкой. Правила, доли, варианты и разнос по комнатам — у главного дизайнера, свёрнуто */
      h += '<p class="dr-qline"><span>Количество</span><b>' + esc(qtyText(first)) + '</b></p>';
      if (ROLE.chief) h += '<details class="dr-adv"' + (advOpen ? ' open' : '') + '><summary>Настройки позиции<span>ещё материал · варианты · правило количества · другие комнаты</span></summary>' + adv + '</details>';
      box.innerHTML = h;
    }
    function after(msg) { paint(); render(); if (msg) ui.toast(msg); }
    box.addEventListener('toggle', function (e) { if (e.target.classList && e.target.classList.contains('dr-adv')) advOpen = e.target.open; }, true);
    box.addEventListener('change', function (e) {
      var t = e.target, k = t.getAttribute('data-share');
      if (k) { var n = Number(String(t.value).replace(',', '.')); if (!(n > 0)) { ui.toast('Доля — число больше нуля, например 0,25', 'error'); render(); return; } patchRow(code, level, k, { share: n }); after(); }
      else if (t.id === 'dr-rule') { patchRow(code, level, cell().main.key, { qty_rule: t.value }); after(); }
      else if (t.id === 'dr-work') { patchRow(code, level, cell().main.key, { work_code: t.value.trim() }); after(); }
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-s]'); if (!b) return;
      var s = b.getAttribute('data-s'), k = b.getAttribute('data-k'), c = cell(), row = k ? c.rows.filter(function (x) { return x.key === k; })[0] : c.main, sub = (P ? P.name : (row && row.title) || '') + ' · ' + roomLabel(room);
      var all = function () { var el = box.querySelector('#dr-all'); return !!(el && el.checked && row === (c.slots[0] || c.main)); };
      if (s === 'pick') pickFor(code, level, room, pos, null, function () { after('Товар поставлен'); });
      else if (s === 'pick-link') openLink(sub, null, function (product) { addRow(code, level, { pos: pos, room: room, product: product }); after('Товар поставлен'); });
      else if (s === 'replace') { var ev = all(); openSearch('Заменить из каталога', sub, P ? P.name : cleanQuery(row.title), function (product) { var n = setProduct(code, level, row, product, ev); after(n > 1 ? 'Товар заменён в ' + plural(n, 'строке', 'строках', 'строках') : 'Товар заменён'); }); }
      else if (s === 'link') { var ev2 = all(); openLink(sub, row.product, function (product) { setProduct(code, level, row, product, ev2); after('Товар сохранён'); }); }
      else if (s === 'remove') { removeRow(code, level, k); after('Убрано'); }
      else if (s === 'slot') pickFor(code, level, room, pos, { share: 0.5 }, function () { after('Материал добавлен — проверьте доли'); });
      else if (s === 'variant') { vform = true; render(); }
      else if (s === 'variant-go') {
        var val = box.querySelector('#dr-vval').value.trim(), by = box.querySelector('#dr-vby').value;
        if (!val) { ui.toast('Напишите значение варианта', 'error'); return; }
        vform = false; pickFor(code, level, room, pos, { variant: { by: by, value: val }, color: by === 'color' ? val : '' }, function () { after('Вариант добавлен'); });
      }
      else if (s === 'alt-keep') { addRow(code, level, { pos: pos, room: room, role: 'alt', alt_source: 'catalog', product: row.product }); after('Замена сохранена'); }
      else if (s === 'alt') pickFor(code, level, room, pos, { role: 'alt', alt_source: 'designer' }, function () { after('Замена добавлена'); });
      else if (s === 'copy') {
        var picked = Array.prototype.filter.call(box.querySelectorAll('.dr-rchecks input:checked:not(:disabled)'), function () { return true; }).map(function (i) { return i.getAttribute('data-room'); });
        if (!picked.length) { ui.toast('Отметьте комнаты', 'error'); return; }
        var src = c.slots[0] || c.main, firstRoom = picked[0];
        if (!room) { patchRow(code, level, src.key, { room: picked[0] }); picked = picked.slice(1); } /* строка «на всю квартиру» сама переезжает в первую отмеченную */
        picked.forEach(function (o) { addRow(code, level, { pos: pos, room: o, product: src.product, share: src.share || 1, qty_rule: src.qty_rule, unit: src.unit, work_code: src.work_code }); });
        if (!room) { m.close(); st.room = firstRoom; st.open[firstRoom] = true; paint(); ui.toast('Позиция разнесена по комнатам'); } else after('Товар поставлен в ' + plural(picked.length, 'комнату', 'комнаты', 'комнат'));
      }
    });
    render();
  }
  /* «Добавить позицию» — позиция справочника, которой в этой комнате по умолчанию нет */
  function openAdd(code, level, room) {
    var have = {}; roomCells(code, level, room).forEach(function (c) { if (c.pos) have[c.pos] = 1; });
    var m = sheet({ title: 'Добавить позицию', html: '<p class="small muted">' + esc(roomLabel(room)) + ' · из справочника позиций (' + KB.list.length + ')</p><div class="da-search"><input class="input" id="da-aq" placeholder="Найти позицию" autocomplete="off"><div class="da-opts" id="da-ares"></div></div>', actions: [{ label: 'Отмена', kind: 'link' }] });
    var inp = m.el.querySelector('#da-aq'), res = m.el.querySelector('#da-ares');
    function draw() {
      var qv = norm(inp.value), list = KB.list.filter(function (p) { return !have[p.code] && (!qv || norm(p.name).indexOf(qv) >= 0 || norm(p.cat).indexOf(qv) >= 0); });
      res.innerHTML = list.length ? list.map(function (p) { return '<button type="button" class="da-opt" data-c="' + p.code + '"><span class="da-opt__b"><b>' + esc(p.name) + '</b><span>' + esc(p.cat + ' · обычно: ' + p.rooms.join(', ')) + '</span></span><span class="da-opt__pr">' + esc(p.rule) + '<s>' + esc(p.unit) + '</s></span></button>'; }).join('') : '<div class="da-empty">Такой позиции в справочнике нет</div>';
      res.querySelectorAll('[data-c]').forEach(function (b) { b.addEventListener('click', function () { var pc = b.getAttribute('data-c'); m.close(); pickFor(code, level, room, pc, null, function (k) { st.flash = k; paint(); ui.toast('Позиция добавлена'); }); }); });
    }
    inp.addEventListener('input', draw); draw();
  }
  function download(code, level) {
    var a = document.createElement('a'), blob = new Blob([JSON.stringify(contract(code, level), null, 2)], { type: 'application/json' });
    a.href = URL.createObjectURL(blob); a.download = 'capsule-' + code + '-' + level + '.json'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }

  function rowEl(key) { return Array.prototype.filter.call(root.querySelectorAll('.da-row[data-key]'), function (el) { return el.getAttribute('data-key') === key; })[0] || null; }
  /* подсветка строки переживает перерисовки (состав других капсул догружается в фоне) */
  function paint(push) {
    root.innerHTML = st.screen === 'cap' && st.cap ? viewCap() : viewSection(); paintNav();
    syncUrl(push);
    var f = st.flash; if (!f) return;
    if (typeof f === 'string') f = st.flash = { key: f, until: Date.now() + 1800, scrolled: false };
    if (Date.now() > f.until) { st.flash = null; return; }
    var el = rowEl(f.key); if (!el) return;
    el.classList.add('is-flash');
    if (!f.scrolled) { f.scrolled = true; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); setTimeout(function () { var x = rowEl(f.key); if (x) x.classList.remove('is-flash'); if (st.flash === f) st.flash = null; }, 1800); }
  }
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b || !root.contains(b)) return;
    var act = b.getAttribute('data-act'), key = b.getAttribute('data-key'), cap = st.cap, lvl = st.level;
    if (b.tagName === 'A') e.preventDefault();
    if (DC.acts[act]) { DC.acts[act](b, e); return; }
    if (/^(add|reset)$/.test(act) && !canEdit(cap)) { ui.toast('Правки закрыты: ' + statusLabel(statusOf(cap)).toLowerCase()); return; }
    if (act === 'reload') loadCaps();
    else if (act === 'new') { if (DC.newCapsule) DC.newCapsule(); }
    else if (act === 'st-send') setStatus(cap, 'review', 'Отправлено на проверку');
    else if (act === 'st-recall') setStatus(cap, (st.meta[cap] && st.meta[cap].prev === 'fix') ? 'fix' : 'draft', 'Капсула отозвана с проверки');
    else if (act === 'st-del') delDraft(cap);
    else if (act === 'st-next') setStatus(cap, 'next', 'Создана версия ' + (versionOf(cap) + 1) + ' — черновик');
    else if (act === 'st-pub') setStatus(cap, 'pub', 'Капсула опубликована');
    else if (act === 'st-fix') openFix(cap);
    else if (act === 'st-hide') setStatus(cap, 'hidden', 'Капсула скрыта с витрины');
    else if (act === 'st-show') setStatus(cap, 'pub', 'Капсула снова на витрине');
    else if (act === 'st-archive') ui.confirm({ title: 'Отправить в архив?', text: 'Капсула останется только для просмотра.', ok: 'В архив', onOk: function () { setStatus(cap, 'archive', 'Капсула в архиве'); } });
    else if (act === 'f-who') { st.fWho = b.getAttribute('data-v'); paint(); }
    else if (act === 'f-status') { st.fStatus = b.getAttribute('data-v'); paint(); }
    else if (act === 'f-err') { st.fErr = !!b.getAttribute('data-v'); paint(); }
    else if (act === 'cap-go') { st.cap = b.getAttribute('data-cap'); st.room = null; paint(true); LEVELS.forEach(function (l) { loadTable(st.cap, l[0]); }); }
    else if (act === 'open') { st.screen = 'cap'; st.cap = b.getAttribute('data-cap'); st.tab = 'passport'; paint(true); window.scrollTo(0, 0); LEVELS.forEach(function (l) { loadTable(st.cap, l[0]); }); }
    else if (act === 'list') { st.screen = 'list'; st.cap = null; paint(true); window.scrollTo(0, 0); }
    else if (act === 'level') { st.level = b.getAttribute('data-level'); paint(); loadTable(cap, st.level); }
    else if (act === 'tab') { st.tab = b.getAttribute('data-tab'); paint(); }
    else if (act === 'retry') { loadTable(cap, lvl, true); paint(); }
    else if (act === 'room') { st.room = b.getAttribute('data-room'); paint(); }
    else if (act === 'emp') { st.empOpen = !st.empOpen; paint(); }
    else if (act === 'zone-pick') { if (DC.matNew) DC.matNew({ position: b.getAttribute('data-pos'), zones: [String(st.zone).replace(/ \d+$/, '')] }); }
    else if (act === 'zone-take') {
      var zp = b.getAttribute('data-pos'), zr = String(st.zone).replace(/ \d+$/, ''), don = (DC.materials(cap) || []).filter(function (m) { return m.position === zp && m.zones.length && !m.zones.some(function (z) { return z.room === zr; }); });
      var zs = sheet({ title: 'Взять из другой зоны', html: '<p class="small muted">' + esc(POS[zp].name) + ' · материалы капсулы на этой позиции. Нажмите — зона «' + esc(zr) + '» добавится в карточку.</p><div class="da-opts">' + don.map(function (m, i) { var p = m.base || {}; return '<button type="button" class="da-opt" data-i="' + i + '"><span class="da-opt__pic"' + (p.img ? ' style="background-image:' + esc(cssUrl(p.img)) + '"' : '') + '></span><span class="da-opt__b"><b>' + esc(p.name || m.title) + '</b><span>' + esc(m.zones.map(function (z) { return z.room; }).join(', ')) + '</span></span><span class="da-opt__pr">' + (price(p) ? F.rub(price(p)) : '—') + '</span></button>'; }).join('') + '</div>', actions: [{ label: 'Отмена', kind: 'link' }] });
      zs.el.addEventListener('click', function (e) { var o = e.target.closest('[data-i]'); if (!o) return; var m = don[Number(o.getAttribute('data-i'))]; DC.matPatch(cap, m.id, { zones: m.zones.concat([{ room: zr, share: 1 }]) }); zs.close(); paint(); ui.toast('«' + (m.title || 'Материал') + '» теперь стоит и в зоне «' + zr + '»'); });
    }
    else if (act === 'zone') { st.zone = b.getAttribute('data-room') || ''; paint(); if (st.zone) window.scrollTo(0, 0); }
    else if (act === 'acc') { var ar = b.getAttribute('data-room'); st.open[ar] = !st.open[ar]; paint(); }
    else if (act === 'd') { st.d = Number(b.getAttribute('data-d')); paint(); }
    else if (act === 'f-cat') { st.fCat = b.getAttribute('data-v'); paint(); }
    else if (act === 'cell') {
      var croom = b.getAttribute('data-room'), cpos = b.getAttribute('data-pos');
      if (DC.reviewMode && DC.reviewMode()) DC.commentSheet('item', croom + '|' + cpos, (cpos && POS[cpos] ? POS[cpos].name : 'Позиция') + ' · ' + roomLabel(croom));
      else if (!key && cpos) { if (canEdit(cap)) pickFor(cap, lvl, croom, cpos, null, function (k) { st.flash = k; paint(); ui.toast('Товар поставлен'); }); }
      else openCell(croom, cpos, key);
    }
    else if (act === 'add') openAdd(cap, lvl, b.getAttribute('data-room'));
    else if (act === 'goto') {
      var gr = findRow(cap, lvl, key), groom = gr ? DC.rowRoom(cap, gr) : st.room, gc = gr ? roomCells(cap, lvl, groom).filter(function (c) { return c.rows.some(function (x) { return x.key === key; }); })[0] : null;
      st.tab = 'rows'; st.room = groom; st.open[groom] = true; st.fCat = ''; st.flash = gc && gc.main ? gc.main.key : key; paint();
    }
    else if (act === 'download') download(cap, lvl);
    else if (act === 'copy') { navigator.clipboard.writeText(JSON.stringify(contract(cap, lvl), null, 2)).then(function () { ui.toast('JSON скопирован'); }, function () { ui.toast('Не удалось скопировать — выделите текст руками', 'error'); }); }
    else if (act === 'reset') ui.confirm({ title: 'Сбросить правки капсулы?', text: 'Замены, ссылки, убранные и добавленные позиции обоих уровней в этом браузере пропадут — состав снова будет как в таблице.', ok: 'Сбросить', onOk: function () { LEVELS.forEach(function (l) { delete st.edits[tkey(cap, l[0])]; }); saveEdits(); paint(); } });
  });
  window.addEventListener('popstate', function () { readUrl(); paint(); if (st.cap) LEVELS.forEach(function (l) { loadTable(st.cap, l[0]); }); });

  [['st', st], ['ROLE', ROLE], ['S', S], ['F', F], ['esc', esc], ['ui', ui], ['ic', ic], ['IC', IC], ['sheet', sheet], ['field', field], ['paint', paint], ['meta', meta], ['saveMeta', saveMeta], ['saveEdits', saveEdits], ['store', store], ['saveStore', saveStore],
    ['capName', capName], ['cover', cover], ['designerOf', designerOf], ['statusOf', statusOf], ['statusLabel', statusLabel], ['versionOf', versionOf], ['pubVersionOf', pubVersionOf], ['canEdit', canEdit], ['setStatus', setStatus], ['mineCap', mineCap],
    ['rowsFor', rowsFor], ['roomCells', roomCells], ['capRooms', capRooms], ['roomFill', roomFill], ['roomLabel', roomLabel], ['POS', POS], ['KB', KB], ['ROOM_NAMES', ROOM_NAMES], ['RULE_LIST', RULE_LIST], ['readiness', readiness], ['MARKS', MARKS], ['visibleCaps', visibleCaps],
    ['chip', chip], ['plural', plural], ['price', price], ['cssUrl', cssUrl], ['LEVELS', LEVELS], ['STATUSES', STATUSES], ['DESIGNER', DESIGNER], ['CHIEF', CHIEF], ['issues', issues], ['viewRooms', viewRooms], ['viewCheck', viewCheck], ['listHref', listHref],
    ['secLabel', secLabel], ['goSec', goSec], ['addRow', addRow], ['patchRow', patchRow], ['getJSON', getJSON], ['API', API], ['catProduct', catProduct], ['sameProduct', sameProduct], ['etalonQty', etalonQty], ['planQty', planQty], ['ETALON', ETALON], ['ruNum', ruNum], ['qtyText', qtyText],
    ['tkey', tkey], ['merge', merge], ['money', money], ['num', num], ['skel', skel], ['statusBar', statusBar], ['cellName', cellName], ['variantLabel', variantLabel], ['loadTable', loadTable], ['resolvePos', resolvePos], ['guessPos', guessPos], ['splitRoom', splitRoom], ['roomName', roomName], ['openSearch', openSearch], ['openLink', openLink], ['itemKey', itemKey], ['openCell', openCell], ['stats', stats]
  ].forEach(function (x) { DC[x[0]] = x[1]; });
  DC.db = function (name, def) { var e = store().extra; if (e[name] == null) e[name] = def; return e[name]; };
  readUrl(); paint(); loadCaps();
})();
