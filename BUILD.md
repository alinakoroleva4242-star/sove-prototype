# SOVE — прототип сайта, вариант 1. Памятка сборщику страниц

Статический сайт-прототип (HTML + CSS + обычный JS, без сборки и без библиотек).
Корень: `~/Desktop/sove/site-mockup-v1/`. Сервер уже запущен: http://localhost:4400/
Это макет для согласования с командой: он должен выглядеть и вести себя как настоящий сайт,
но сервер не нужен — состояние живёт в браузере через `window.SOVE`.

## Жёсткие правила

1. **Не менять общие файлы:** `assets/css/site.css`, `assets/js/site.js`, `assets/js/data.js`, `index.html`, `tools/*`, `BUILD.md`.
   Чего-то не хватает в общем слое — сделай у себя в файлах страницы и напиши об этом в отчёте («просьба к общему слою»).
2. **Трогать только свои файлы:** `<page>.html`, `assets/css/pages/<page>.css`, `assets/js/pages/<page>.js`. Чужие страницы не править.
3. **Ничего вне папки сайта не менять.** Репозиторий `~/sove/sove-platform` — только читать (и только если нужно). Никакого git, сети, серверов, установки пакетов.
4. Русский язык интерфейса. Тексты от лица пользователя: кнопка называет действие («Найти товары · 10 токенов»), ошибка говорит, что случилось, списались ли токены и что делать.
5. Без эмодзи, без градиентов, без скруглений (углы прямые), без теней. Иконки — только простой inline SVG со stroke, и только где нужны.
6. Не выдумывать цифры про бизнес (статистику, отзывы, сроки, цены тарифов). Все числа — из `SOVE.data`. Нет данных — пиши «уточняется» или не показывай.
7. Доступность: настоящие `<button>`, `<a href>`, `<input>` с `<label for>`; область нажатия от 44 px; видимый фокус уже есть; у картинок `alt`; один `<h1>` на странице.
8. Адаптив: страница обязана нормально выглядеть на 390, 1440 и 2560 px. Горизонтальной прокрутки быть не должно. Используй `.wrap`, `.grid--N`, `.split` — они уже адаптивные.

## Каркас страницы (копировать как есть, поменять title, data-page, data-nav, файлы страницы)

```html
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Название — SOVE</title>
<link rel="icon" href="assets/img/logo-sg.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="assets/css/site.css">
<link rel="stylesheet" href="assets/css/pages/PAGE.css">
</head>
<body data-page="PAGE" data-nav="NAVKEY">
<a class="skip" href="#main">К содержанию</a>
<div id="site-header"></div>
<main id="main"> … </main>
<div id="site-footer"></div>
<script src="assets/js/data.js"></script>
<script src="assets/js/site.js"></script>
<script src="assets/js/pages/PAGE.js"></script>
</body>
</html>
```

`data-nav` подсвечивает пункт меню: `ai | capsules | scout | market | metod | adept | track`. Для кабинета `data-page="account"`, для генераций `data-page="generations"` (подсветка в нижнем меню телефона: `home | account | market | generations`).
Шапку, нижнее меню и подвал рисует `site.js` сам. Образец живой страницы — `index.html` + `assets/css/pages/home.css`.

## Стиль (кратко)

Палитра из StyleGuide дизайнеров: `--ink #1d1d1d`, `--graphite #515151`, `--stone #c3c2c0`, `--line #dbdbdb`, `--paper #f7f7f7` (фон), `--white`, акцент терракота `--accent #a05035` — **только на главном действии экрана и активных состояниях**, `--green #2f6b4a` — только цена METOD и «успех», `--danger`.
Шрифт Manrope (замена Vela Sans). Заголовки лёгкие (300), крупные; цифры крупные и лёгкие. Фирменный мотив — чертёж: размерные линии `.dim`, тонкие линейки `.rule-top`, штриховка `.hatch` для пустых мест.
Один главный акцент на экран. Остальное спокойное. Не всё подряд в карточки: группировать линейками и отступами.

## Классы общего слоя (site.css)

Раскладка: `.wrap` (центр, макс. 1200), `.wrap--narrow` (760), `.section` / `.section--tight` / `.section--top`, `.stack` (+ `--2 --3 --6 --8 --10`), `.row` (+ `--between --end --top --nowrap`), `.grow`, `.grid` + `.grid--2|3|4|5` (+ `.grid--gap-lg`), `.split` с детьми `.col-3…col-9` (на телефоне в столбик), `.sticky`.
Текст: `.eyebrow`, `.h1 .h2 .h3 .h4`, `.lead`, `.text`, `.small`, `.tiny`, `.muted`, `.num` (табличные цифры, без переноса), `.big-num`, `.mid-num`, `.accent`, `.green`, `.strike`, `.crumbs`, `.page-head`.
Кнопки: `.btn` + `--primary | --dark | --ghost | --light | --link`, `--sm`, `--lg`, `--block`, `[disabled]`, `.is-loading`; `.link`, `.arrow-link`.
Поверхности: `.card` (+ `--pad`, `--link`), `.dark`, `.banner`, `.notice` (+ `--ok`, `--error`), `.rule-top`, `.hatch`, `.ph` (заглушка фото), `.dim > span` (размерная линия), `.photo-tile` (+ `__body`, `__title`).
Формы: `.field` (+ `.is-error`, `.field__error`, `.field__hint`), `.input`, `.select`, `.input--num`, `.check`, `.search`, `.segmented` (кнопки с `.is-active`, внутри можно `<small>`), `.option` (+ `.is-active`, `__title`, `__note`).
Метки: `.badge` (+ `--green --accent --line`), `.chip` (+ `.is-active`), `.tag` (+ `--exact`), `.marker` (квадрат с номером).
Цена: `.price` > `.price__metod` + `.price__retail` + `.badge--green`; `.price--lg`; `.price__note`.
Карточки: `.product-card` (готовый HTML даёт `SOVE.ui.productCard(p, {tag})`), `.capsule-card` (`SOVE.ui.capsuleCard(c)`).
Списки: `.rows` (строки с линейками, `--tight`), `.bar > i` (полоса доли, ширина в %), `.steps` (шаги: детям `.is-done` / `.is-current`, внутри `<b>ШАГ 1</b><span>Название</span>`, задать `style="--n:5"`).
Загрузка: `.uploader` (внутри `input[type=file]`, `.uploader__title`), `.progress > i`, `.stages > li` (`.is-done` / `.is-now`).
Состояния: `.empty` (+ `__title`), `.skeleton`, `.error-screen`.
Окна: делать через `SOVE.ui.modal(...)`, тосты через `SOVE.ui.toast(text, 'ok'|'error')`.
Сравнение до/после: `.ba` (+ `.ba__after`, `input[type=range]`, CSS-переменная `--pos`).

## API общего слоя (`window.SOVE`)

- `SOVE.data` — данные: `capsules`, `capsule(id)`, `products`, `product(id)`, `categories`, `costs {photo:5, render:10}`, `demoLimit 3`, `gift {tokens:50, days:30}`, `tokenPacks`, `metodPlans`, `singleAccess` (null = цена не задана), `scout {states, stages, kitShares, retailMarkup, formats, samplePlan}`, `ai {renderSample, photoSample, emptySample}`, `adept.packages`.
- `SOVE.fmt` — `num, rub, area, date, dateLong, tokens (склоняет), phone (маскирует), esc`.
- `SOVE.auth` — `user(), isIn(), login(phone) → {gifted}, logout(), require(returnTo)`.
- `SOVE.tokens` — `balance(), history(), giftExpires(), canAfford(cost), reserve(cost, reason, ref) → opId|null, commit(opId), refund(opId, why), credit(amount, reason, ref)`.
  Правило: при запуске платной операции — `reserve`; при успехе — `commit`; при ошибке, таймауте и пустом результате — `refund`.
- `SOVE.demo` — `left(), use(), giveBack()` — пробные запуски гостя.
- `SOVE.metod` — `active(), until(), daysLeft(), activate(months), hasContact(productId), grantContact(productId)`.
- `SOVE.projects` — `list(), get(id), create({name, capsuleId, area, scout}), update(id, patch), addProduct(id, productId), remove(id)`.
- `SOVE.scout` — доступ к просчёту Скаута по правилам платформы (оплата РУБЛЯМИ по счёту, не токенами): `access({capsuleId, level:'base'|'premium', stateId, area, rooms, bathrooms, formatId}) → {kind, price, request?}`, где kind: `repeat` (такой расчёт уже есть — открыть его, без счёта), `opened` (пара уже открыта — пересчёт бесплатный), `recalc-paid`, `first-free` (первый расчёт бесплатно, один раз на клиента), `metod` (бесплатно по подписке), `paid` (счёт на price ₽), `unavailable` (цены нет — предложить METOD); `register(params, result, basis) → заявка {number,...}`, `isOpened(capsuleId, level)`, `freeUsed()`, `price(capsuleId, level)`, `open(capsuleId, level)`, `requests()`, `basisLabel(basis)`. Цены в `SOVE.data.scoutAccess` — ПРИМЕРЫ (`pricesAreExamples`), рядом с ценой ставь пометку «пример цены». Оплата: `SOVE.pay.create({kind:'scout', id, title, price, capsuleId, level}, returnTo)` — после подтверждения пара открывается.
- `SOVE.gens` — `list(), get(id), add({kind:'photo'|'render', title, src, status, cost, opId, result, projectId}), update(id, patch), attach(id, projectId)`.
- `SOVE.favs` — `has(id), toggle(id), list()`. `SOVE.leads` — `add({product:'adept'|'track'|'partner', ...}), list()`.
- `SOVE.pay` — `create(item, returnTo) → payment, get(id), list(), confirm(id), fail(id, status)`. `item = {kind:'pack'|'metod'|'contact', id, title, price, tokens?, months?, productId?}`.
- `SOVE.draft` — `set(key, value), get(key), clear(key)` — сохранить контекст перед уходом на вход или оплату.
- `SOVE.ui` — `toast, modal({eyebrow,title,html|text,actions:[{label,kind,href?,onClick?,close?}]}) → {close, el}, confirm, needTokens(cost, returnTo), needAuth(why, returnTo), pickProject(onPick), productCard(p,{tag:'exact'|'near'}), capsuleCard(c, href), qs(name)`.
- `SOVE.onChange(fn)` — перерисовать своё при изменении состояния (баланс, вход).

## Общие правила сценариев (из согласуемого документа)

- Стоимость в токенах видна ДО действия, остаток — ПОСЛЕ («Списано 10 токенов · остаток 30»).
- Любое действие дольше 2 секунд показывает статус; дольше 15 секунд — этапы и фразу «можно уйти со страницы, результат появится в Генерациях».
- Контекст (фото, параметры, шаг) не теряется при уходе на вход или оплату: `SOVE.draft` + `returnTo` в адресе.
- У каждого экрана с данными есть состояния: загрузка, пусто, ошибка, успех.
- Гость может смотреть всё. Вход нужен, когда он хочет сохранить, оплатить или кончились демо-запуски.

## Проверка своей работы (обязательно)

```bash
cd ~/Desktop/sove/site-mockup-v1
NODE_PATH=/Users/valeriaislamova/sove/sove-platform/apps/web/node_modules node tools/shot.cjs <имя-папки> "<page>.html" ["<page>.html?param=…"] --widths=390,1440 --seed=guest|user|rich
```
`seed`: `guest` — чистый браузер; `user` — вошёл, 50 подарочных токенов; `rich` — вошёл, 330 токенов, METOD активен, есть проект «Квартира на Лесной», 3 генерации, избранное, платёж.
Смотри `shots/<имя-папки>/report.json` (ошибки консоли, `overflowX`, битые картинки, мёртвые ссылки, мелкие области нажатия) и **открой PNG инструментом Read** — посмотри глазами на 390 и 1440. Высокие скриншоты режь через Python PIL на куски по ~1500 px, иначе не разглядеть.
Исправляй, пока: нет ошибок консоли, нет `overflowX`, нет битых картинок, текст не обрезан и не наезжает, на телефоне всё читается и нажимается.
Ссылки на страницы, которые делают другие (см. карту ниже), считаются нормальными, даже если файла ещё нет.

## Карта сайта

`index.html` главная · `ai.html` SOVE AI (поиск по фото и рендеру) · `generations.html` лента генераций · `generation.html?id=` результат ·
`capsules.html` каталог капсул · `capsule.html?id=k1…k6` капсула · `scout.html` Скаут (`?capsule=k4`, `?project=<id>`) ·
`market.html` каталог (`?q=&category=&capsule=&discount=&sort=`) · `product.html?id=101` товар ·
`metod.html` подписка · `tokens.html` пополнение (`?returnTo=`, `?plan=m1|m3|m6`, `?pack=p300`) · `pay.html?id=<paymentId>` оплата и возврат ·
`auth.html?returnTo=` вход · `account.html` кабинет (`#projects #tokens #favorites #leads`) · `project.html?id=` проект ·
`adept.html` · `track.html` · `about.html` (`#docs`) · `partner.html` стать партнёром · `404.html`.
