/* Блок «Планировка», сценарий 1 «3D + мебель» (ТЗ-planirovka, эталоны A1–A4):
   A1 какой план есть → A2 чтение плана → A3 проверь план → A4 вопросы по плану → расстановка (arrange.html).
   Разметку своего плана делает POST /ai/plan/markup; пример ЖК PRIDE показываем готовым, без вызова.
   Вопросы строятся по найденному в плане: чего в плане нет — не спрашиваем, варианты отсекаем по метражу. */
(function () {
  var S = window.SOVE, F = S.fmt, esc = F.esc, FLOW = window.SOVE_FLOW, D = S.data;
  var root = document.getElementById('pd-root'); if (!root) return;
  var P3 = window.SOVE_PLAN3D || { ok: false };
  var SRC = window.SOVE_ARRANGE || { rooms: [], flat: '' };
  var KIND = new URLSearchParams(location.search).get('scn') === 'project' ? 'project' : 'flow';

  /* пример ЖК PRIDE: комнаты из arrange-data.js, гостиная в плане — кухня-гостиная */
  var SAMPLE_ROOMS = SRC.rooms.filter(function (r) { return !r.part_of; })
    .map(function (r) { return { name: r.type === 'гостиная' ? 'Кухня-гостиная' : r.name, m2: r.m2 }; })
    .sort(function (a, b) { return b.m2 - a.m2; });
  var PLAN_IMG = 'assets/img/sove-ai/g-domik.jpg';
  /* подписи на плане примера: комнаты и техническая разметка (п. A3), координаты — в долях картинки */
  var SAMPLE_TAGS = [
    { t: 'Спальня · 14,4 м²', x: 24, y: 25 }, { t: 'Санузел · 5,6', x: 68, y: 22 },
    { t: 'Кухня-гостиная · 21,5 м²', x: 38, y: 74 }, { t: 'Прихожая · 5,5', x: 80, y: 57 },
    { t: '▮ несущая', x: 12, y: 50, k: 'wall' }, { t: '● стояк', x: 86, y: 12, k: 'riser' },
    { t: '▦ вентшахта', x: 60, y: 58, k: 'riser' }, { t: '◫ окно', x: 40, y: 94, k: 'win' }, { t: '⇥ вход', x: 92, y: 68, k: 'door' }
  ];
  /* что нашли в плане примера: ширина стены у стояка, проход у кровати, ниша, место под ванну */
  var SAMPLE_FACTS = { bedMax: '160×200', bedWhy: 'не останется прохода 70 см', kitchenWall: 3.1, kitchenWide: false, niche: true, bathBoth: false, dineZone: 8 };

  var SOURCES = [
    { k: 'developer', t: 'План застройщика', d: 'из договора или с сайта ЖК', tag: 'бюджет примерно' },
    { k: 'measure', t: 'Обмерный план', d: 'после замера, точные размеры', tag: 'бюджет точнее' }
    /* «Дизайн-проект» и «Плана нет» с первого экрана убраны (Алина 24.10): проект загружают в Мой ремонт — ссылка внизу экрана */
  ];
  var ACCURACY = { developer: 'примерно', measure: 'точнее', project: 'точно', none: 'примерно' };

  var saved = FLOW.load();
  var st = { view: 'idle', source: 'developer', fileName: null, live: null, error: null, typical: null,
             noplan: { m2: '', rooms: 2 }, answers: {}, interior: null, state: null, mode: '3d', geo: null,
             rp: { purpose: null, who: '2', guests: 'не нужно', add: [] } };

  var READ_STAGES = ['Стены: несущие и перегородки', 'Комнаты и площади', 'Двери, окна, вход', 'Стояки и вентшахты'];
  var STEP = { idle: 'plan', upload: 'plan', zk: 'plan', noplan: 'plan', error: 'plan', reading: 'read', rooms: 'check', brief: 'questions', placing: 'questions' };
  var Q = new URLSearchParams(location.search);
  var ZK = window.SOVE_ZK || null;

  function head() { return FLOW.blockHead(KIND, STEP[st.view] || 'plan'); }
  function title(t, sub) { return '<div class="pz-title"><h2>' + esc(t) + '</h2>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '</div>'; }
  function flatName() { return st.live ? (st.fileName || 'твой план') : st.typical ? 'типовой план · ' + F.area(st.typical.m2) : 'ЖК PRIDE · 47,3 м²'; }

  /* ── Первый экран — итог 18.0 (эталон etalon-StFinal.html): цветной пример с ценниками и бюджетом, «Загрузить план»,
     «Найди свой план у застройщика» (база — assets/js/kb/zk.js). Полосы шагов здесь нет: шаг 1 начинается с загрузки ── */
  var CAT = window.SOVE_ARRANGE_CATALOG || {};
  function plural(n, a, b, c) { var x = n % 100, y = n % 10; return x > 10 && x < 20 ? c : y === 1 ? a : y >= 2 && y <= 4 ? b : c; }
  function mln(v) { return v === null || v === undefined ? '[сумма]' : (Math.round(v / 1e5) / 10).toFixed(1).replace('.', ','); }
  function num(v) { return F.rub(v).replace(/\s*₽$/, ''); }
  function headNoBar() { return head().replace(/<div class="pz-bar"[\s\S]*?<\/div>/, ''); }
  /* пример — ЖК PRIDE 2-комн 47,3 м² + «Изумрудная неоклассика»; бюджет считает Скаут (SOVE_ZK.budgetExample) */
  function example() {
    var x = ZK && ZK.layout('pride-2k-47'); if (!x) return null;
    return { zk: x.zk, l: x.layout, b: ZK.budgetExample(x.layout), lay: ZK.layoutOf(x.layout), geo: ZK.markupOf(x.layout) };
  }
  /* ценники: предметы расстановки примера, цены — каталог Маркета (arrange-catalog.js); одинаковые — одной плашкой «×2»;
     не больше 8, самые дорогие. Координаты — в пикселях плана примера (те же, что у картинки 3D 730×610) */
  function heroTags(E) {
    if (!E || !E.lay) return [];
    var by = {};
    E.lay.furniture.forEach(function (it) {
      var p = (CAT[it.label] || [])[0]; if (!p || !p.metod) return;
      var b = it.box, t = by[it.label] || (by[it.label] = { label: it.label, p: p, n: 0, x: 0, y: 0, box: b });
      t.n++; t.x += (b[0] + b[2]) / 2; t.y += (b[1] + b[3]) / 2;
    });
    var ppm = E.geo && E.geo.px_per_m || 76.8;
    return Object.keys(by).map(function (k) {
      var t = by[k], b = t.box, name = t.label;
      if (/^Кровать$/.test(name)) name += ' ' + Math.round((b[2] - b[0]) / ppm * 100) + '×' + Math.round((b[3] - b[1]) / ppm * 100);
      if (t.n > 1) name += ' ×' + t.n;
      return { name: name, p: t.p, sum: t.p.metod * t.n, x: t.x / t.n, y: t.y / t.n };
    }).sort(function (a, b) { return b.sum - a.sum; }).slice(0, 8);
  }
  function hero(E) {
    var b = E && E.b, tags = heroTags(E);
    return '<div class="pz-hero" id="pd-hero">' +
      '<img src="assets/img/demo/1-domik-vsya-kvartira.jpg" alt="Пример: 2-комнатная квартира 47 м² в 3D с мебелью, вид сверху">' +
      '<span class="pz-hero__k">ПРИМЕР · 2-КОМН · 47 М²</span>' +
      tags.map(function (t, i) {
        return '<button type="button" class="pz-price" data-tag="' + i + '" data-x="' + t.x + '" data-y="' + t.y + '"><i></i><small>' + esc(t.name) + '</small><b>' + num(t.sum) + '</b></button>';
      }).join('') +
      '<div class="pz-hero__bud"><span><small>РЕМОНТ ПОД КЛЮЧ</small><em>мебель ' + mln(b && b.furniture) + ' · материалы ' + mln(b && b.materials) + ' · работы ' + mln(b && b.works) + ' млн</em></span>' +
        '<b>≈ ' + mln(b && b.total) + ' млн ₽</b></div></div>';
  }
  /* ценники на своих местах: картинка лежит «cover» — пересчитываем координаты под фактический размер */
  function placeTags() {
    var el = document.getElementById('pd-hero'); if (!el) return;
    var W = el.clientWidth, H = el.clientHeight, k = Math.max(W / 730, H / 610), ox = (W - 730 * k) / 2, oy = (H - 610 * k) / 2;
    var placed = [];                                   /* не даём ценникам налезать друг на друга и на полосу бюджета */
    el.querySelectorAll('.pz-price').forEach(function (t) {
      var w = t.offsetWidth, h = t.offsetHeight, x = ox + (+t.dataset.x) * k, y = oy + (+t.dataset.y) * k;
      var l = Math.max(4, Math.min(W - w - 4, x - w / 2)), top = Math.max(34, Math.min(H - 84 - h, y - h / 2));
      for (var i = 0; i < placed.length; i++) {
        var q = placed[i];
        if (l < q.l + q.w + 4 && q.l < l + w + 4 && top < q.t + q.h + 4 && q.t < top + h + 4) { top = q.t + q.h + 4; i = -1; }
      }
      t.hidden = top > H - 84 - h;                     /* места нет — ценник не показываем */
      t.style.left = l + 'px'; t.style.top = top + 'px'; if (!t.hidden) placed.push({ l: l, t: top, w: w, h: h });
    });
  }
  /* карточка товара по ценнику: ♡ / 🛒 */
  function tagSheet(t) {
    var p = t.p, R = S.repair;
    if (R && R.registerProduct) R.registerProduct(p);
    var m = S.ui.modal({ eyebrow: t.name, title: p.name, html: '<div class="pz-tagsheet">' + (p.img ? '<img src="' + esc(p.img) + '" alt="">' : '') +
        '<span><b>' + F.rub(p.metod) + '</b>' + (p.retail ? '<s>' + F.rub(p.retail) + '</s>' : '') + '<small>' + esc(p.brand || '') + ' · цена METOD</small></span></div>',
      actions: [{ label: '♡ В избранное', kind: 'ghost', onClick: function () { if (R) { R.flats.ensure(); if (!R.fav.has(p.id)) R.fav.toggle(p.id, true); R.flats.update(R.flats.active().id, {}); S.ui.toast('В избранном', 'ok'); } } },
                { label: '🛒 В корзину', onClick: function () { if (R) { R.flats.ensure(); if (!R.cart.has(p.id)) R.cart.add(p.id, 'market', true); R.flats.update(R.flats.active().id, {}); S.ui.toast('В корзине', 'ok'); } } }] });
    return m;
  }
  function zkSearch() {
    return '<b class="pz-or">ИЛИ НАЙДИ СВОЙ ПЛАН У ЗАСТРОЙЩИКА</b>' +
      '<form class="pz-zks" id="pd-zks" role="search"><span aria-hidden="true">⌕</span><input id="pd-zkq" type="search" placeholder="ЖК, застройщик или адрес" autocomplete="off" aria-label="ЖК, застройщик или адрес" value="' + esc(st.zkQ || '') + '"></form>' +
      '<div id="pd-zkres" aria-live="polite">' + zkResults() + '</div>';
  }
  function zkResults() {
    if (!ZK || (st.zkQ || '').trim().length < 2) return '';
    var r = ZK.search(st.zkQ);
    if (!r.length) return '<section class="pz-card pz-zkno"><b>Такого ЖК пока нет</b>' +
      '<label class="pz-link pz-link--left"><input type="file" class="pd-file2" accept="image/*" hidden>Загрузи план — добавим ЖК ›</label></section>';
    return '<div class="pz-zklist">' + r.map(function (z) {
      var n = z.layouts.filter(ZK.ready).length;
      return '<button type="button" class="pz-zkrow" data-zk="' + esc(z.id) + '"><span><b>' + esc(z.name) + '</b><small>' + esc([z.developer, z.city, z.address].join(' · ')) + '</small></span>' +
        '<em>' + (n ? n + ' в 3D' : 'скоро в 3D') + ' ›</em></button>';
    }).join('') + '</div>';
  }
  /* лента: в карточке план квартиры (чертёж), чёрно-белый (уточнение Алины 24.10) */
  function zkFeed() {
    if (!ZK) return '';
    var cards = [];
    ZK.list.forEach(function (z) { if (z.published) z.layouts.forEach(function (l) { if (l.planImg) cards.push({ z: z, l: l }); }); });
    if (!cards.length) return '';
    return '<div class="pz-zkfeed">' + cards.map(function (c) {
      return '<button type="button" class="pz-zkcard" data-zk="' + esc(c.z.id) + '"><span style="background-image:url(' + esc(c.l.planImg) + ')"></span>' +
        '<b>' + esc(c.z.name) + '</b><small>' + esc(c.l.type + (c.l.m2 ? ' · ' + F.area(Math.round(c.l.m2)) : '')) + '</small></button>';
    }).join('') + '</div>';
  }
  function viewIdle() {
    return headNoBar() + title('План → 3D → бюджет', 'загрузи план — за 20 секунд увидишь квартиру и сколько стоит ремонт') + hero(example()) +
      '<button type="button" class="pz-btn pz-btn--up" data-act="upload">⇪ Загрузить план</button>' +
      zkSearch() + zkFeed() +
      '<small class="pz-note pz-c">бесплатно · 20 секунд · есть дизайн-проект? <a href="my.html#sec-plan">загрузи в Мой ремонт ›</a></small>';
  }
  /* ── Шаг 1 · Загрузи план (прежний A1): план застройщика / обмерный → загрузка → сканер ── */
  function viewUpload() {
    return head() + title('Загрузи план — покажем в 3D с мебелью', 'бесплатно · 20 секунд') +
      '<div class="pz-src">' + SOURCES.map(function (s) {
        return '<button type="button" class="pz-src__i' + (st.source === s.k ? ' is-on' : '') + '" data-src="' + s.k + '">' +
          '<span><b>' + esc(s.t) + '</b><small>' + esc(s.d) + '</small></span><em>' + esc(s.tag) + '</em></button>';
      }).join('') + '</div>' +
      '<label class="pz-btn"><input type="file" id="pd-file" accept="image/*,application/pdf,.dwg" hidden>Загрузить план</label>' +
      '<small class="pz-note pz-c">PNG, JPG, PDF, DWG · до 20 МБ</small>' +
      '<button type="button" class="pz-link" data-act="sample">Взять пример: ЖК PRIDE, 47,3 м²</button>';
  }

  /* ── ЖК → его планировки (18.2) ── */
  function viewZk() {
    var z = ZK && ZK.get(st.zk); if (!z) { st.view = 'idle'; return viewIdle(); }
    var n = z.layouts.filter(ZK.ready).length;
    return headNoBar() + '<button type="button" class="pz-link pz-link--left" data-act="again">← К поиску</button>' +
      title(z.name, [z.city, z.address].join(' · ') + ' · ' + n + ' ' + plural(n, 'планировка', 'планировки', 'планировок') + ' уже в 3D') +
      '<div class="pz-zklays">' + z.layouts.map(function (l) {
        var ok = ZK.ready(l);
        return '<button type="button" class="pz-zklay' + (ok ? '' : ' is-off') + '"' + (ok ? ' data-zl="' + esc(l.id) + '"' : ' disabled') + '>' +
          '<span class="pz-zklay__img"' + (l.planImg ? ' style="background-image:url(' + esc(l.planImg) + ')"' : '') + '></span>' +
          '<span class="pz-zklay__t"><b>' + esc(l.type + (l.m2 ? ' · ' + F.area(l.m2) : '')) + '</b>' +
          '<small>этажи ' + esc(l.floors || '[этажи]') + (l.count ? ' · ' + l.count + ' квартир' : '') + '</small>' +
          '<em' + (ok ? '' : ' class="is-off"') + '>' + (ok ? '✓ готово в 3D с мебелью' : 'скоро в 3D') + '</em></span>' + (ok ? '<i>›</i>' : '') + '</button>';
      }).join('') + '</div>' +
      '<label class="pz-note pz-c pz-zkadd"><input type="file" class="pd-file2" accept="image/*" hidden>Нет твоей планировки? <u>Загрузи план ›</u> — добавим её в ЖК для всех соседей</label>';
  }
  /* выбрал планировку → сразу 3D с мебелью, без загрузки, сканера и «Проверь план» (18.2) */
  function pickLayout(id) {
    var x = ZK.layout(id); if (!x || !ZK.ready(x.layout)) return;
    var z = x.zk, l = x.layout, m = ZK.markupOf(l);
    var rooms = (m.rooms || []).filter(function (r) { return !r.part_of; }).map(function (r) { return { name: r.type === 'гостиная' ? 'Кухня-гостиная' : r.name, m2: r.m2 }; });
    FLOW.save({ zk: { id: z.id, layout: l.id, name: z.name, type: l.type, m2: l.m2 }, zkFound: true, source: 'developer', accuracy: ACCURACY.developer,
      state: ZK.FINISH_STATE[z.finish] || null, flat: z.name + ' · ' + F.area(l.m2), rooms: rooms, typical: false, live: null,
      answers: {}, brief: null, wallVariant: null, layoutHints: null, plan: 0, step: 5 });
    /* планировка из конвейера zk-admin — своя разметка и расстановка, экран мебели открываем как для своего плана */
    var own = l.layout !== 'arrange';
    if (own) FLOW.save({ live: { layout: l.layout, not_placed: l.notPlaced || [], ready: true, flat: z.name + ' · ' + l.type + ' · ' + F.area(l.m2), labeled: null, name: 'zk:' + l.id } });
    st.view = 'placing'; render();
    setTimeout(function () { location.href = 'arrange.html?v=panel&plan=0&flow=1&anim=1' + (own ? '&live=1' : ''); }, 700);
  }

  /* «Плана нет»: площадь и число комнат → типовой план → сразу вопросы */
  function viewNoplan() {
    return head() + title('Плана нет — соберём типовой', 'площадь и комнаты · бюджет примерно') +
      '<section class="pz-card"><label class="pz-field"><b>Площадь, м²</b>' +
        '<input class="input" id="pd-m2" type="number" inputmode="decimal" min="15" max="300" placeholder="например, 47" value="' + esc(st.noplan.m2) + '"></label>' +
        '<div class="pz-q__h"><b>Комнат</b></div><div class="pz-chips">' + ['студия', '1', '2', '3', '4+'].map(function (o, i) {
          return '<button type="button" class="pz-chip' + (st.noplan.rooms === i ? ' is-on' : '') + '" data-rooms="' + i + '">' + o + '</button>';
        }).join('') + '</div></section>' +
      '<button type="button" class="pz-btn" data-act="typical">Дальше</button>' +
      '<button type="button" class="pz-link" data-act="again">Назад</button>';
  }
  function typicalRooms(m2, n) {
    var r = [{ name: n === 0 ? 'Комната-студия' : 'Кухня-гостиная', m2: m2 * (n === 0 ? .62 : .4) }];
    var beds = Math.min(n, 4), bedShare = n === 0 ? 0 : .34;
    for (var i = 0; i < beds; i++) r.push({ name: i === 0 ? 'Спальня' : i === 1 && n >= 3 ? 'Детская' : 'Комната ' + (i + 1), m2: m2 * bedShare / beds });
    r.push({ name: 'Санузел', m2: Math.max(3.5, m2 * .1) }, { name: 'Прихожая', m2: Math.max(3.5, m2 * .1) });
    return r.map(function (x) { return { name: x.name, m2: Math.round(x.m2 * 10) / 10 }; });
  }

  /* ── A2 · Чтение плана ── */
  function viewReading() {
    return head() + title('Читаю твой план', flatName()) +
      '<div class="pz-plan pz-plan--scan"><img src="' + (st.live ? st.live.src : PLAN_IMG) + '" alt=""><i class="pz-scan"></i></div>' +
      '<div class="pz-prog"><i id="pd-bar"></i></div>' +
      '<ul class="pz-stages" id="pd-stages">' + READ_STAGES.map(function (t, i) {
        return '<li class="' + (i === 0 ? 'is-now' : '') + '"><i>' + (i === 0 ? '◌' : '·') + '</i>' + esc(t) + '</li>';
      }).join('') + '</ul>';
  }
  function setStage(i) {
    var bar = document.getElementById('pd-bar'); if (bar) bar.style.width = Math.min(100, (i + 1) * 25) + '%';
    document.querySelectorAll('#pd-stages li').forEach(function (li, k) {
      li.className = k < i ? 'is-done' : k === i ? 'is-now' : '';
      li.querySelector('i').textContent = k < i ? '✓' : k === i ? '◌' : '·';
    });
  }

  function viewError() {
    return head() + title('Не получилось разметить', st.fileName || '') +
      '<section class="pz-card"><b>' + esc(st.error) + '</b>' +
      '<p class="pz-note">Подойдёт чёткий план из договора или с сайта застройщика: стены тёмные, комнаты подписаны. ' +
      'Фото под углом и скан с тенями читаются хуже.</p></section>' +
      '<button type="button" class="pz-btn" data-act="again">Другой файл</button>' +
      '<button type="button" class="pz-link" data-act="sample">Взять пример: ЖК PRIDE, 47,3 м²</button>';
  }

  /* ── A3 · Проверь план ── */
  function liveRooms() {
    return (st.live.res.rooms || []).filter(function (r) { return r.seeded !== false && r.box_2d; })
      .map(function (r) { return { name: r.label || FLOW.RU[r.type] || r.type || 'Помещение', m2: r.area_m2 || 0, recess: !!r.recess }; });
  }
  function rooms() {
    var base = st.live ? liveRooms() : st.typical ? st.typical.rooms : SAMPLE_ROOMS;
    return base.map(function (r, i) { return st.names && st.names[i] ? Object.assign({}, r, { name: st.names[i] }) : r; });
  }
  /* рамка квартиры в долях 0–1000: по найденным комнатам с полем 3% — план этажа, подписи
     и стрелки застройщика вокруг квартиры обрезаем */
  function liveCrop() {
    var bs = (st.live.res.rooms || []).filter(function (r) { return r.seeded !== false && r.box_2d; }).map(function (r) { return r.main_box_2d || r.box_2d; });
    if (!bs.length || !st.live.w) return null;
    var pad = 30, y1 = Math.max(0, Math.min.apply(null, bs.map(function (b) { return b[0]; })) - pad), x1 = Math.max(0, Math.min.apply(null, bs.map(function (b) { return b[1]; })) - pad);
    var y2 = Math.min(1000, Math.max.apply(null, bs.map(function (b) { return b[2]; })) + pad), x2 = Math.min(1000, Math.max.apply(null, bs.map(function (b) { return b[3]; })) + pad);
    return { x: x1, y: y1, w: (x2 - x1) / 1000, h: (y2 - y1) / 1000, x1: x1, y1: y1 };
  }
  /* разметка в долях 0–1000: комнаты [y1, x1, y2, x2], проёмы — точка [y, x] */
  function liveTags() {
    var res = st.live.res, names = rooms(), k = 0, out = [];
    (res.rooms || []).forEach(function (r) {
      if (r.seeded === false || !r.box_2d) return;
      var b = r.main_box_2d || r.box_2d, nm = (names[k] || {}).name || r.label; k++;
      out.push({ t: nm + (r.area_m2 ? ' · ' + F.area(r.area_m2) : ''), x: (b[1] + b[3]) / 20, y: (b[0] + b[2]) / 20 });
    });
    (res.openings || []).forEach(function (o) {
      var p = o.point_2d || (o.span_2d ? [(o.span_2d[0][0] + o.span_2d[1][0]) / 2, (o.span_2d[0][1] + o.span_2d[1][1]) / 2] : null);
      if (!p) return;
      if (o.kind === 'window') out.push({ t: '◫ окно', x: p[1] / 10, y: p[0] / 10, k: 'win' });
      if (o.kind === 'entrance') out.push({ t: '⇥ вход', x: p[1] / 10, y: p[0] / 10, k: 'door' });
    });
    var c = liveCrop();
    if (c) out.forEach(function (t) { t.x = (t.x * 10 - c.x1) / (c.w * 10); t.y = (t.y * 10 - c.y1) / (c.h * 10); });
    /* плашки не вылезают за край плана */
    return out.map(function (t) { return Object.assign(t, { x: Math.max(12, Math.min(88, t.x)), y: Math.max(4, Math.min(96, t.y)) }); });
  }
  function plural(n, one, few, many) { var a = n % 100, b = n % 10; return a > 10 && a < 20 ? many : b === 1 ? one : b >= 2 && b <= 4 ? few : many; }
  function viewRooms() {
    var rs = rooms(), total = rs.reduce(function (a, r) { return a + (r.m2 || 0); }, 0);
    /* свой план — как пример: серый план клиента и плашки поверх (комнаты, окна, вход) по координатам разметки,
       а не картинка с подписями от API */
    var tags = st.live ? liveTags() : SAMPLE_TAGS, c = st.live ? liveCrop() : null;
    var plan2d = '<div class="pz-plan' + (c ? ' pz-plan--live' : '') + '"' + (c ? ' style="aspect-ratio:' + Math.round(c.w * st.live.w) + ' / ' + Math.round(c.h * st.live.h) + '"' : '') + '>' +
      '<img src="' + (st.live ? st.live.src : PLAN_IMG) + '" alt="План с разметкой комнат"' + (c ? ' style="width:' + (100000 / c.w / 1000) + '%;height:' + (100000 / c.h / 1000) +
        '%;left:' + (-c.x / (c.w * 10)) + '%;top:' + (-c.y / (c.h * 10)) + '%"' : '') + '>' + tags.map(function (t) {
        return '<span class="pz-tag' + (t.k ? ' pz-tag--' + t.k : '') + '" style="left:' + t.x + '%;top:' + t.y + '%">' + esc(t.t) + '</span>';
      }).join('') + seg() + '</div>';
    /* после чтения квартира сразу в 3D (правки 13:40, п. 1); 2D — дополнительная кнопка */
    var plan = st.mode === '2d' || !P3.ok ? plan2d : '<div class="pz-plan pz-plan--3d"><div class="pz-3dslot"></div>' + seg() + '</div>';
    /* свой план: API пока отдаёт только комнаты, окна и двери — техническую разметку не показываем */
    var legend = st.live
      ? '<span><b>◫ окна</b> — у жилой комнаты обязательно</span><span><b>⇥ вход и двери</b> — отмечены на плане</span>'
      : '<span><b>▮ несущие</b> — не двигаем</span><span><b class="is-blue">● ▦ стояки, шахты</b> — кухня и санузел у них</span>' +
        '<span><b>┆ перегородки</b> — можно двигать</span><span><b>◫ окна</b> — у жилой комнаты обязательно</span>';
    return head() + title('Проверь план', rs.length + ' ' + plural(rs.length, 'помещение', 'помещения', 'помещений') + ' · ' + total.toFixed(1).replace('.', ',') + ' м²' + ' · названия можно исправить') +
      plan + '<div class="pz-legend">' + legend + '</div>' +
      '<section class="pz-card pz-rooms">' + rs.map(function (r, i) {
        return '<div><input class="input" data-room="' + i + '" value="' + esc(r.name) + '" aria-label="Название помещения"><b>' + (r.m2 ? F.area(r.m2) : '— м²') + '</b></div>';
      }).join('') + '</section>' +
      '<button type="button" class="pz-btn" data-act="ok">Всё верно</button>' +
      '<button type="button" class="pz-link" data-act="again">Другой план</button>';
  }
  function seg() {
    if (!P3.ok) return '';
    var d3 = st.mode !== '2d';
    return '<div class="pz-seg" role="group" aria-label="Вид плана"><button type="button" data-mode="3d" aria-pressed="' + d3 + '">3D</button>' +
      '<button type="button" data-mode="2d" aria-pressed="' + !d3 + '">2D</button></div>';
  }

  /* В1 «Что сейчас в квартире?» (анкета v2): первый вопрос A4, обязательный; меняет строки бюджета (раздел 12).
     У примера ЖК PRIDE состояние есть в документах застройщика — выбираем сами, с меткой. */
  var STATES = [
    { k: 'concrete_free', t: 'Бетон, стен нет', d: 'свободная планировка — перегородки построим где нужно' },
    { k: 'concrete_walls', t: 'Бетон, стены стоят', d: 'черновые работы полностью' },
    { k: 'whitebox', t: 'Предчистовая (white box)', d: 'стены и стяжка есть — черновых почти нет' },
    { k: 'finished', t: 'С отделкой / вторичка', d: 'нужен демонтаж и вывоз' }
  ];
  /* В1 (TZ-anketa): данные из документов застройщика есть только у примера ЖК PRIDE — «без отделки» */
  function docsState() { return !st.live && !st.typical ? { k: 'concrete_walls', t: 'без отделки' } : null; }
  function stateBlock() {
    var docs = docsState();
    return '<section class="pz-card pz-state"><div class="pz-q__h"><b>Что сейчас в квартире?</b>' + (docs ? '<em class="pz-why">в документах: ' + esc(docs.t) + '</em>' : '') + '</div>' +
      STATES.map(function (x) {
        return '<button type="button" class="pz-state__i' + (st.state === x.k ? ' is-on' : '') + '" data-state="' + x.k + '" aria-pressed="' + (st.state === x.k) + '"><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small></button>';
      }).join('') + '</section>';
  }

  /* геометрия для 3D: пример — из arrange-data.js, свой план — рамка из разметки, «плана нет» — типовая */
  function geo() {
    if (st.geo) return st.geo;
    if (st.live && st.live.res) st.geo = FLOW.frameFromMarkup(st.live.res, st.live.w, st.live.h);
    else if (st.typical) st.geo = P3.typicalGeo(st.typical.rooms);
    else st.geo = SRC;
    return st.geo;
  }
  /* подписи в 3D: комнаты (с исправленными названиями) и техническая разметка примера */
  function tags3d() {
    var g = geo(), base = rooms(), used = [], out = [];
    g.rooms.filter(function (r) { return !r.part_of; }).forEach(function (r) {
      var i = -1; base.forEach(function (x, k) { if (i < 0 && used.indexOf(k) < 0 && Math.abs((x.m2 || 0) - (r.m2 || r.doc_m2 || 0)) < .05) i = k; });
      if (i >= 0) used.push(i);
      var nm = i >= 0 ? base[i].name : r.name, m2 = i >= 0 ? base[i].m2 : (r.m2 || r.doc_m2);
      out.push({ t: esc(nm) + (m2 ? ' · ' + F.area(m2) : ''), px: [(r.box[0] + r.box[2]) / 2, (r.box[1] + r.box[3]) / 2] });
    });
    var W = .25 * g.px_per_m, all = g.rooms.map(function (r) { return r.box; });
    var minX = Math.min.apply(null, all.map(function (b) { return b[0]; }));
    (g.windows || []).slice(0, 1).forEach(function (w) { out.push({ t: '◫ окно', k: 'win', px: [(w.box[0] + w.box[2]) / 2, (w.box[1] + w.box[3]) / 2] }); });
    (g.doors || []).filter(function (d) { return d.kind === 'entrance'; }).forEach(function (d) { out.push({ t: '⇥ вход', k: 'door', px: [(d.box[0] + d.box[2]) / 2, (d.box[1] + d.box[3]) / 2] }); });
    if (!st.live && !st.typical) {
      /* пример ЖК PRIDE: несущая — наружная стена слева, стояк — угол санузла, вентшахта — у прихожей */
      var bath = g.rooms.filter(function (r) { return r.type === 'санузел'; })[0], hall = g.rooms.filter(function (r) { return r.type === 'прихожая' && !r.part_of; })[0];
      out.push({ t: '▮ несущая', k: 'wall', px: [minX - W / 2, (all[0][3] + all[all.length - 1][1]) / 2] });
      if (bath) out.push({ t: '● стояк', k: 'riser', px: [bath.box[2] - 50, bath.box[1] + 55] });
      if (hall) out.push({ t: '▦ вентшахта', k: 'riser', px: [hall.box[0] + 20, hall.box[3] - 10] });
    }
    return out;
  }
  var view3d = null;
  function mount3d() {
    var slot = root.querySelector('.pz-3dslot'); if (!slot) return;
    /* «Проверь план»: стандартный белый домик в изометрии — и для примера, и для своего плана */
    var opts = { geo: geo(), tags: tags3d(), items: [], height: 300, style: 'neutral',
      photo: null };                              /* интерьер ещё не выбран — стандартный белый домик (Алина 24.10) */
    if (!view3d) view3d = P3.create(slot, opts); else { view3d.mount(slot); view3d.update(opts); }
  }

  /* ── A4 · Вопросы по твоему плану ── */
  function find(re) { var r = rooms().filter(function (x) { return re.test(x.name.toLowerCase()); }); return r[0] || null; }
  function facts() {
    if (!st.live && !st.typical) return SAMPLE_FACTS;
    var bed = find(/спал/), bath = find(/сан|ванн/), live = st.live && liveRooms().some(function (r) { return r.recess; });
    var bm = bed ? bed.m2 : 0;
    return { bedMax: bm >= 13 ? '180×200' : bm >= 10 ? '160×200' : '140×200', bedWhy: 'не останется прохода 70 см',
      kitchenWall: null, niche: !!live, bathBoth: !!(bath && bath.m2 >= 6) };
  }
  /* таблица A4 ТЗ: показываем вопрос, только если в плане есть комната; варианты отсекаем по метражу.
     Площадь не пришла из разметки — ничего не отсекаем: не знаем — не решаем за человека */
  function area(r) { return r && r.m2 > 0 ? r.m2 : null; }
  function where(r) { return r.name.toLowerCase() + (area(r) ? ' ' + F.area(r.m2) : ''); }
  function questions() {
    var fx = facts(), bed = find(/спал/), liv = find(/гост|студ/), kit = find(/кух|студ/), bath = find(/сан|ванн/), q = [];
    var ORDER = ['140×200', '160×200', '180×200'];
    if (bed) {
      var max = (area(bed) || !st.live) ? fx.bedMax : '180×200', cut = ORDER.slice(ORDER.indexOf(max) + 1);
      q.push({ k: 'bed', t: 'Кровать', why: where(bed), rows: [ORDER.slice(0, ORDER.indexOf(max) + 1)], def: ['160×200'],
        note: cut.length ? cut.map(function (o) { return o.split('×')[0]; }).join(', ') + ' не предлагаем — ' + fx.bedWhy : '' });
    }
    /* угловой — если есть угол ≥ 2,2 м: в прототипе — гостиная от 16 м² */
    /* раздел 5: «сдавать» → раскладной по умолчанию; гости 1–2 → раскладной обязательно */
    var rent = st.rp.purpose === 'сдавать', guest = st.rp.guests === '1' || st.rp.guests === '2';
    if (liv) {
      var corner = !area(liv) || liv.m2 >= 16, sleeperWhy = rent && guest ? 'раскладной — потому что сдаёшь и нужен гость' : guest ? 'раскладной — потому что нужен гость' : rent ? 'раскладной — потому что сдаёшь' : '';
      q.push({ k: 'sofa', t: 'Диван', why: where(liv), rows: [corner ? ['прямой', 'угловой'] : ['прямой'], guest ? ['раскладной'] : ['раскладной', 'нет']], def: ['прямой', rent || guest ? 'раскладной' : 'нет'],
        note: [corner ? '' : 'угловой не предлагаем — нет угла 2,2 м', sleeperWhy].filter(Boolean).join(' · ') });
    }
    /* на 6 — если обеденная зона ≥ 9 м²: у кухни-гостиной зона — половина комнаты, у отдельной кухни — вся кухня */
    var dineRoom = kit || liv;
    if (dineRoom) {
      var zone = fx.dineZone !== undefined ? fx.dineZone : area(dineRoom) ? (/гост|студ/.test(dineRoom.name.toLowerCase()) ? dineRoom.m2 / 2 : dineRoom.m2) : null;
      var six = zone === null || zone >= 9, who = st.rp.who;
      /* раздел 5: 1 → на 2; 2 + ребёнок → на 4; 3+ → на 6, если влезает, иначе на 4 */
      var tdef = who === '1' ? 'на 2' : who === '3+' && six ? 'на 6' : 'на 4';
      q.push({ k: 'table', t: 'Обеденный стол', why: dineRoom.name.toLowerCase(), rows: [six ? ['на 2', 'на 4', 'на 6'] : ['на 2', 'на 4']], def: [tdef],
        note: six ? '' : 'на 6 не предлагаем — зона меньше 9 м²' });
    }
    /* П и остров — по ширине кухни; длину гарнитура считаем сами по стене у стояка */
    if (kit) {
      var wide = fx.kitchenWide !== undefined ? fx.kitchenWide : (!area(kit) || kit.m2 >= 12);
      q.push({ k: 'kitchen', t: 'Кухня', why: fx.kitchenWall ? 'стена у стояка ' + String(fx.kitchenWall).replace('.', ',') + ' м' : where(kit),
        rows: [wide ? ['прямая', 'Г-образная', 'П-образная', 'с островом'] : ['прямая', 'Г-образная'], ['холодильник встроенный', 'отдельный']], def: ['Г-образная', 'холодильник встроенный'],
        note: wide ? '' : 'П-образную и остров не предлагаем — кухня узкая' });
    }
    if (bath && fx.bathBoth) q.push({ k: 'bath', t: 'Санузел', why: where(bath), rows: [['душ', 'ванна']], def: ['душ'] });
    var wash = ['в санузле']; if (fx.niche) wash.push('колонна в нише прихожей'); wash.push('на кухне', 'в шкафу');
    if ((st.rp.add || []).indexOf('постирочная') >= 0) wash.push('отдельная постирочная');
    q.push({ k: 'wash', t: 'Стирка', why: bath ? where(bath) : 'план', rows: [wash], def: [fx.niche ? 'колонна в нише прихожей' : 'в санузле'] });
    return q;
  }
  /* плашка «Не спрашиваем» — не больше 2 строк: только то, что сняли по этому плану (эталон A4) */
  function skipped() {
    var fx = facts(), bath = find(/сан|ванн/), out = [];
    if (bath && !fx.bathBoth) out.push('душ или ванна — только душ по размерам');
    if (fx.niche) out.push('ниша в прихожей — шкаф ставим сами');
    return out.slice(0, 2);
  }
  function answer(q, row) {
    var pick = (st.answers[q.k] || [])[row];
    return pick !== undefined && q.rows[row].indexOf(pick) >= 0 ? pick : q.def[row];
  }
  /* анкета v2 (TZ-anketa-planirovka, 24.10 15:31): 4 группы, 12 вопросов строго по порядку; В1–В3 обязательные */
  function group(t) { return '<b class="pz-group">' + esc(t) + '</b>'; }
  function lifeQ(k, t, hint, opts, multi, sub, k2, opts2) {
    return '<section class="pz-card pz-q"><div class="pz-q__h pz-q__h--base"><b>' + esc(t) + '</b>' + (hint ? '<small class="pz-note">' + esc(hint) + '</small>' : '') + '</div>' +
      chips(k, opts, multi) + (sub ? '<small class="pz-rq__sub">' + esc(sub) + '</small>' + chips(k2, opts2) : '') + '</section>';
  }
  function required() { return !!st.state && !!st.rp.purpose && !!st.rp.who; }
  function viewBrief() {
    var qs = questions(), sk = skipped(), it = st.interior, rp = FLOW.replanOn(), ok = required();
    return head() + title('Вопросы по твоему плану', '12 вопросов · больше половины уже заполнили по плану — проверь') +
      group('О квартире и жизни') + stateBlock() +
      lifeQ('purpose', 'Для чего ремонт', '', ['для себя', 'сдавать', 'продать']) +
      lifeQ('who', 'Кто живёт', '', ['1', '2', '2 + ребёнок', '3+'], 0, 'Место для гостей', 'guests', ['не нужно', '1', '2']) +
      lifeQ('add', 'Что важно', 'до 3', ['спальня отдельно', 'рабочее место', 'детская', 'гардеробная', 'постирочная', 'больше хранения'], 3) +
      group('Что ставим') +
      /* заполнено по плану — свёрнуто одной карточкой, «проверить ›» раскрывает вопросы */
      (!st.fitOpen ? '<section class="pz-card pz-q"><div class="pz-q__h"><b>Заполнили по плану</b><button type="button" class="pz-link pz-link--in" data-act="fit-open">развернуть ›</button></div>' +
        '<small class="pz-note">' + esc(qs.map(function (q) { return q.t + ' — ' + q.rows.map(function (r, ri) { return answer(q, ri); }).filter(function (v) { return v && v !== 'нет'; }).join(', '); }).join(' · ')) + '</small></section>' :
      qs.map(function (q) {
        return '<section class="pz-card pz-q"><div class="pz-q__h"><b>' + esc(q.t) + '</b><em class="pz-why">в плане: ' + esc(q.why) + '</em></div>' +
          q.rows.map(function (row, ri) {
            return '<div class="pz-chips">' + row.map(function (o) {
              return '<button type="button" class="pz-chip' + (answer(q, ri) === o ? ' is-on' : '') + '" data-q="' + q.k + '" data-row="' + ri + '" data-o="' + esc(o) + '">' + esc(o) + '</button>';
            }).join('') + '</div>';
          }).join('') + (q.note ? '<small class="pz-note">' + esc(q.note) + '</small>' : '') + '</section>';
      }).join('')) +
      group('Интерьер') +
      '<section class="pz-card pz-q"><div class="pz-q__h"><b>Какой интерьер?</b><small class="pz-note">по нему подберём мебель</small></div>' +
        FLOW.interiorTiles(it) +
        '<small class="pz-note">свой интерьер: загрузи фото или рендер — найдём похожую мебель в Маркете</small>' +
        '<button type="button" class="pz-link pz-link--left' + (it ? '' : ' is-on') + '" data-act="later" aria-pressed="' + !it + '">Выберу позже — расставь по размерам</button></section>' +
      group('Стены') + replanBlock(rp) +
      (sk.length ? '<div class="pz-skip"><b>Не спрашиваем:</b> ' + esc(sk.join(' · ')) + '</div>' : '') +
      (ok ? '' : '<small class="pz-note pz-c">Ответь на 3 вопроса сверху</small>') +
      '<button type="button" class="pz-btn" data-act="go"' + (ok ? '' : ' disabled') + '>' + (rp ? 'Показать варианты стен · ' + FLOW.priceTxt() : 'Расставить мебель') + '</button>' +
      (rp ? '' : '<button type="button" class="pz-link" data-act="skip">Пропустить — расставит SOVE</button>');
  }

  /* ── В12 «Поменять стены?» — переключатель; дополнительных вопросов под ним нет (анкета v2) ── */
  function chips(k, opts, multi) {
    var cur = st.rp[k];
    return '<div class="pz-chips">' + opts.map(function (o) {
      var on = multi ? cur.indexOf(o) >= 0 : cur === o;
      return '<button type="button" class="pz-chip' + (on ? ' is-on' : '') + '" data-rp="' + k + '" data-o="' + esc(o) + '"' + (multi ? ' data-multi="' + multi + '"' : '') + ' aria-pressed="' + on + '">' + esc(o) + '</button>';
    }).join('') + '</div>';
  }
  function replanBlock(on) {
    return '<label class="pz-toggle' + (on ? ' is-on' : '') + '"><span><b>Поменять стены? · ' + FLOW.priceTxt() + '</b><small>кабинет, гардероб, ещё спальня · несущие и мокрые зоны не трогаем</small></span>' +
        '<input type="checkbox" data-replan' + (on ? ' checked' : '') + '><i></i></label>';
  }
  function sheet() { commit(); FLOW.save({ replanAnswers: st.rp }); FLOW.replanSheet(function () { go(true); }, function () { go(false); }); }

  function viewPlacing() {
    return head() + title('Расставляю мебель по нормам проходов', 'мебель встанет в твою 3D-квартиру') +
      '<div class="pz-prog"><i class="pz-prog__run"></i></div><small class="pz-note">Проверяю проходы, двери и окна…</small>';
  }
  function render() {
    var V = { reading: viewReading, rooms: viewRooms, brief: viewBrief, error: viewError, placing: viewPlacing, noplan: viewNoplan, zk: viewZk, upload: viewUpload };
    root.innerHTML = (V[st.view] || viewIdle)();
    if (st.view === 'rooms') mount3d();
    if (st.view === 'idle') {
      placeTags(); var hi = root.querySelector('#pd-hero img'); if (hi && !hi.complete) hi.addEventListener('load', placeTags);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeTags);   /* шрифт догрузился — ширина ценников другая */
    }
    /* лента «Выбери интерьер» (раздел 14): на A3 — да, на A1, A2, A4 — нет */
    FLOW.interiorStrip({ show: st.view === 'rooms', chosen: !!st.interior, onPick: function (it) { st.interior = it; render(); } });
    bind();
  }

  /* все ответы A4 + интерьер → состояние сценария; ответы переиспользуют другие блоки (п. 9 ТЗ) */
  function answersOut() {
    var out = {}; questions().forEach(function (q) { out[q.k] = q.rows.map(function (r, i) { return answer(q, i); }); });
    return out;
  }
  /* sove.answers[flatId] — формат TZ-anketa-planirovka («Данные»); квартиры ещё может не быть — ключ draft */
  function saveAnswers(a) {
    var R = S.repair, fid = (R && R.flats.active() || {}).id || 'draft', all = {};
    try { all = JSON.parse(localStorage.getItem('sove.answers') || '{}') || {}; } catch (e) {}
    delete all.plan; delete all.ts;                    /* старый формат первой версии анкеты — убираем */
    function first(k) { return (a[k] || [])[0]; }
    var K = { 'прямая': 'straight', 'Г-образная': 'L', 'П-образная': 'U', 'с островом': 'island' };
    var L = { 'в санузле': 'bathroom', 'колонна в нише прихожей': 'niche', 'на кухне': 'kitchen', 'в шкафу': 'closet', 'отдельная постирочная': 'room' };
    var IMP = { 'спальня отдельно': 'bedroom', 'рабочее место': 'workplace', 'детская': 'kids', 'гардеробная': 'wardrobe', 'постирочная': 'laundry', 'больше хранения': 'storage' };
    var on = FLOW.replanOn(), rp = st.rp;
    all[fid] = {
      state: st.state,
      bed: a.bed ? first('bed').split('×')[0] : null,
      sofa: a.sofa ? { shape: a.sofa[0] === 'угловой' ? 'corner' : 'straight', sleeper: a.sofa[1] !== 'нет' } : null,
      table: a.table ? +first('table').replace(/\D/g, '') : null,
      kitchen: a.kitchen ? { shape: K[a.kitchen[0]] || 'L', fridge: a.kitchen[1] === 'отдельный' ? 'free' : 'built-in' } : null,
      bath: a.bath ? (first('bath') === 'ванна' ? 'bath' : 'shower') : null,
      laundry: a.wash ? L[first('wash')] || 'bathroom' : null,
      interior: st.interior || null,
      replan: on,
      /* анкета v2: «О квартире и жизни» — всегда, не только для вариантов стен */
      purpose: rp.purpose ? { 'для себя': 'self', 'сдавать': 'rent', 'продать': 'sale' }[rp.purpose] : null,
      people: rp.who ? rp.who.replace(' + ребёнок', '+1') : null,
      guests: rp.guests ? (rp.guests === 'не нужно' ? 0 : +rp.guests) : null,
      important: (rp.add || []).slice(0, 3).map(function (x) { return IMP[x] || x; })
    };
    try { localStorage.setItem('sove.answers', JSON.stringify(all)); } catch (e) {}
  }
  function commit() {
    var a = answersOut();
    var brief = { bed: (a.bed || [])[0], sofa: (a.sofa || [])[0], table: (a.table || [])[0], kitchen: (a.kitchen || []).join(' · '),
      bath: (a.bath || ['душ'])[0], wash: (a.wash || [])[0], work: 'нет' };
    saveAnswers(a);
    FLOW.save({ brief: brief, answers: a, interior: st.interior, source: st.source, accuracy: ACCURACY[st.source], state: st.state,
      flat: flatName(), rooms: rooms(), typical: !!st.typical, plan: 0, step: 5 });
    return brief;
  }

  /* свой план: читаем размер, шлём на разметку, показываем подписанный план */
  function startLive(file) {
    FLOW.save({ zk: null });                         /* свой план — уже не планировка из базы ЖК */
    st.fileName = file.name; st.error = null; st.typical = null; st.live = { file: file, src: URL.createObjectURL(file) }; st.geo = null; st.state = null; if (!/replan=1/.test(location.search)) FLOW.setReplan(false);
    st.view = 'reading'; render();
    var i = 0, tick = setInterval(function () { i = Math.min(i + 1, READ_STAGES.length - 1); setStage(i); }, 1500);
    FLOW.imageSize(file).then(function (size) {
      st.live.w = size.w; st.live.h = size.h;
      return FLOW.apiMarkup(file);
    }).then(function (res) {
      clearInterval(tick);
      st.live.res = res;
      st.live.labeled = 'data:image/png;base64,' + res.labeled_png_base64;
      st.view = 'rooms'; render();
    }).catch(function (e) {
      clearInterval(tick);
      st.error = e.status === 429 ? 'Дневной лимит разметок исчерпан — попробуйте завтра или возьмите пример.'
        : e.status === 415 ? 'Нужна картинка: PNG или JPG. PDF и DWG пока не принимаем.'
        : (e.message || 'сервер не ответил');
      st.view = 'error'; render();
    });
  }

  /* свой план: рамка из разметки + ответы → расстановка на сервере → экран 5 */
  function goLive(brief, tail) {
    st.view = 'placing'; render();
    var live = st.live, res = JSON.parse(JSON.stringify(live.res)), k = 0;
    (res.rooms || []).forEach(function (r) { if (r.seeded !== false && r.box_2d) { if (st.names && st.names[k]) r.label = st.names[k]; k++; } });
    var frame = FLOW.frameFromMarkup(res, live.w, live.h);
    FLOW.apiAuto(frame, FLOW.briefFromAnswers(brief)).then(function (out) {
      var total = frame.rooms.filter(function (r) { return !r.part_of; }).reduce(function (a, r) { return a + (r.doc_m2 || 0); }, 0);
      FLOW.save({ live: {
        layout: out.layout, not_placed: out.not_placed || [], ready: out.ready_for_render,
        flat: 'Твой план · ' + F.area(total) + ' · ' + frame.rooms.filter(function (r) { return !r.part_of; }).length + ' помещения',
        labeled: live.labeled, name: st.fileName } });
      location.href = 'arrange.html?v=panel&flow=1&live=1' + (tail || '');
    }).catch(function (e) {
      st.error = 'Расстановка не удалась: ' + (e.message || 'сервер не ответил'); st.view = 'error'; render();
    });
  }

  function startReading() {
    st.view = 'reading'; render();
    var i = 0;
    var tick = setInterval(function () {
      i++; setStage(i);
      if (i >= READ_STAGES.length) { clearInterval(tick); st.view = 'rooms'; render(); }
    }, 700);
  }

  /* walls — после списания идём на «Варианты стен», иначе сразу на мебель */
  /* раздел 5 анкеты: ответы меняют расстановку и без перепланировки */
  function layoutFromAnswers() {
    var imp = st.rp.add || [];
    return {
      plan: imp.indexOf('рабочее место') >= 0 ? 2 : (imp.indexOf('больше хранения') >= 0 || imp.indexOf('гардеробная') >= 0) ? 1 : 0,
      roomHint: imp.indexOf('детская') >= 0 || imp.indexOf('спальня отдельно') >= 0,      /* подсказка «Хочешь отдельную комнату?» */
      sturdy: st.rp.purpose === 'сдавать'                                                      /* флаг для подбора в Маркете: мебель прочнее */
    };
  }
  /* 0.1: «Расставить мебель» → лоадер «Расставляю мебель по нормам проходов» → мебель встаёт в ту же 3D-квартиру */
  function go(walls) {
    var brief = commit(), lay = layoutFromAnswers();
    FLOW.save({ replanAnswers: st.rp, wallVariant: null, layoutHints: lay, plan: lay.plan });
    var tail = (walls ? '&walls=1' : '') + '&anim=1';
    if (st.live && st.live.res) { goLive(brief, tail); return; }
    FLOW.save({ live: null });
    st.view = 'placing'; render();
    setTimeout(function () { location.href = 'arrange.html?v=panel&plan=' + lay.plan + '&flow=1' + tail; }, 700);
  }

  function bind() {
    var file = document.getElementById('pd-file');
    root.querySelectorAll('.pd-file2').forEach(function (f2) { f2.addEventListener('change', function () { var f = f2.files && f2.files[0]; if (f) startLive(f); }); });
    var zf = document.getElementById('pd-zks'), zq = document.getElementById('pd-zkq');
    function zkBind() {
      root.querySelectorAll('#pd-zkres [data-zk]').forEach(function (b) { b.addEventListener('click', function () { st.zk = b.dataset.zk; st.view = 'zk'; render(); window.scrollTo(0, 0); }); });
      root.querySelectorAll('#pd-zkres .pd-file2').forEach(function (f2) { f2.addEventListener('change', function () { var f = f2.files && f2.files[0]; if (f) startLive(f); }); });
      root.querySelectorAll('#pd-zkres [data-act="noplan"]').forEach(function (b) { b.addEventListener('click', function () { st.source = 'none'; st.view = 'noplan'; render(); }); });
    }
    if (zq) zq.addEventListener('input', function () { st.zkQ = zq.value; document.getElementById('pd-zkres').innerHTML = zkResults(); zkBind(); });
    var tags = heroTags(example());
    root.querySelectorAll('[data-tag]').forEach(function (b) { b.addEventListener('click', function () { tagSheet(tags[+b.dataset.tag]); }); });
    if (zf) zf.addEventListener('submit', function (e) { e.preventDefault(); st.zkQ = zq.value; var r = ZK ? ZK.search(st.zkQ) : [];
      if (r.length === 1) { st.zk = r[0].id; st.view = 'zk'; render(); window.scrollTo(0, 0); return; }
      document.getElementById('pd-zkres').innerHTML = zkResults(); zkBind(); });
    zkBind();
    root.querySelectorAll('.pz-zkfeed [data-zk]').forEach(function (b) { b.addEventListener('click', function () { st.zk = b.dataset.zk; st.view = 'zk'; render(); window.scrollTo(0, 0); }); });
    root.querySelectorAll('[data-zl]').forEach(function (b) { b.addEventListener('click', function () { pickLayout(b.dataset.zl); }); });
    if (file) file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type || '')) { st.fileName = f.name; st.error = 'Нужна картинка: PNG или JPG. PDF и DWG пока не принимаем.'; st.view = 'error'; render(); return; }
      startLive(f);
    });
    /* дизайн-проект — свой вход (раздел 5 ТЗ), «плана нет» — площадь и комнаты */
    root.querySelectorAll('[data-src]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.source = b.dataset.src;
        if (st.source === 'project') { location.href = FLOW.SCN.project.href; return; }
        if (st.source === 'none') { st.view = 'noplan'; }
        render();
      });
    });
    root.querySelectorAll('[data-rooms]').forEach(function (b) {
      b.addEventListener('click', function () { var m = document.getElementById('pd-m2'); st.noplan.m2 = m ? m.value : ''; st.noplan.rooms = +b.dataset.rooms; render(); });
    });
    root.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === 'sample') { FLOW.save({ zk: null }); if (!/replan=1/.test(location.search)) FLOW.setReplan(false); st.geo = null; st.live = null; st.typical = null; st.error = null; st.names = null; st.fileName = null; if (st.source === 'none') st.source = 'developer'; st.state = 'concrete_walls'; startReading(); }
        if (a === 'upload') { st.view = 'upload'; render(); window.scrollTo(0, 0); }
        if (a === 'again') { st.view = 'idle'; st.live = null; st.typical = null; st.error = null; st.names = null; if (st.source === 'none') st.source = 'developer'; render(); }
        if (a === 'typical') {
          var m2 = parseFloat(String((document.getElementById('pd-m2') || {}).value || '').replace(',', '.'));
          if (!(m2 >= 15 && m2 <= 300)) { var inp = document.getElementById('pd-m2'); if (inp) { inp.focus(); inp.setCustomValidity('Площадь от 15 до 300 м²'); inp.reportValidity(); } return; }
          st.noplan.m2 = m2; st.live = null; st.names = null;
          st.typical = { m2: m2, rooms: typicalRooms(m2, st.noplan.rooms) }; st.geo = null; st.state = null;
          st.view = 'brief'; render();
        }
        if (a === 'ok') {
          st.names = {};
          root.querySelectorAll('[data-room]').forEach(function (inp) { st.names[+inp.dataset.room] = inp.value.trim(); });
          st.view = 'brief'; render(); window.scrollTo(0, 0);
        }
        
        if (a === 'later') { st.interior = null; render(); }
        if (a === 'fit-open') { st.fitOpen = true; render(); }
        if (a === 'go') {
          if (!required()) { S.ui.toast('Ответь на 3 вопроса сверху'); return; }
          if (FLOW.replanOn()) sheet(); else go(false);
        }
        if (a === 'skip') {
          st.answers = {}; st.rp.purpose = st.rp.purpose || 'для себя'; st.rp.who = st.rp.who || '2'; st.rp.guests = st.rp.guests || 'не нужно';
          st.state = st.state || (docsState() || { k: 'concrete_walls' }).k; go(false);
        }
      });
    });
    root.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { st.mode = b.dataset.mode; render(); });
    });
    root.querySelectorAll('[data-state]').forEach(function (b) {
      b.addEventListener('click', function () {
        var was = st.state; st.state = b.dataset.state;
        /* «Бетон, стен нет» включает «Варианты стен» сам (ТЗ 4.1), можно выключить */
        if (st.state === 'concrete_free' && was !== 'concrete_free') FLOW.setReplan(true);
        FLOW.save({ state: st.state }); render();
      });
    });
    root.querySelectorAll('[data-replan]').forEach(function (b) {
      b.addEventListener('change', function () { FLOW.setReplan(b.checked); render(); });
    });
    root.querySelectorAll('[data-rp]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.rp, o = b.dataset.o, max = +b.dataset.multi || 0;
        if (max) { var l = st.rp[k], i = l.indexOf(o); if (i >= 0) l.splice(i, 1); else if (l.length < max) l.push(o); else { S.ui.toast('Можно выбрать до ' + max); return; } }
        else st.rp[k] = o;
        FLOW.save({ replanAnswers: st.rp }); render();
      });
    });
    root.querySelectorAll('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () {
        var q = questions().filter(function (x) { return x.k === b.dataset.q; })[0];
        var a = st.answers[q.k] || (st.answers[q.k] = []); a[+b.dataset.row] = b.dataset.o; render();
      });
    });
    root.querySelectorAll('[data-cap]').forEach(function (b) {
      b.addEventListener('click', function () { st.interior = FLOW.capsuleInterior(b.dataset.cap); render(); });
    });
    root.querySelectorAll('[data-own-open]').forEach(function (b) {
      b.addEventListener('click', function () { FLOW.ownSheet(function (it) { st.interior = it; render(); }); });
    });
  }
  if (saved.interior && saved.step >= 4) st.interior = saved.interior;
  if (saved.state && /replan=1/.test(location.search)) st.state = saved.state;
  if (saved.replanAnswers) st.rp = saved.replanAnswers;
  /* вход «Перепланировка» (?replan=1): переключатель включён; план есть — сразу вопросы (ТЗ, п. 2) */
  if (new URLSearchParams(location.search).get('replan') === '1') { FLOW.setReplan(true); if (saved.rooms && saved.rooms.length) st.view = 'brief'; }
  /* «Подстроить под тебя» с экрана мебели (?tune=1): анкета v2 по квартире из базы ЖК, без сканера; состояние — из «как сдаётся» */
  if (Q.get('tune') === '1' && saved.zk) { st.state = saved.state || st.state; st.interior = saved.interior || null; st.view = 'brief'; }
  render();
})();
