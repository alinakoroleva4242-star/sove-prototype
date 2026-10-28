/* Главная приложения: расчёт, плитки услуг, разделы каталога с витриной, интерьеры */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;

  /* ---------- расчёт ---------- */
  var areaEl = document.getElementById('q-area'), rangeEl = document.getElementById('q-range');
  var statesEl = document.getElementById('q-states'), totalEl = document.getElementById('q-total');
  var perEl = document.getElementById('q-per'), goEl = document.getElementById('q-go'), noteEl = document.getElementById('q-note');
  var my = S.my.get();
  var st = { area: my.area || 45, stateId: my.stateId || 'finish' };
  var caps = D.capsules.filter(function (c) { return !c.soon && !c.designer && c.pricePerM2; });
  var minKit = Math.min.apply(null, caps.map(function (c) { return c.pricePerM2; }));
  var maxKit = Math.max.apply(null, caps.map(function (c) { return c.pricePerM2; }));
  function mln(n) { return (Math.round(n / 100000) / 10).toFixed(1).replace('.', ','); }
  function clampArea(v) { return Math.min(200, Math.max(20, Math.round(Number(v) || 45))); }
  function renderStates() {
    statesEl.innerHTML = D.scout.states.map(function (s) {
      var on = s.id === st.stateId;
      return '<button type="button" class="quick__opt' + (on ? ' is-active' : '') + '" data-state="' + s.id + '" aria-pressed="' + on + '"><b>' + esc(s.name) + '</b><span>' + esc(s.note) + '</span></button>';
    }).join('');
  }
  function calc() {
    var s = D.scout.states.filter(function (x) { return x.id === st.stateId; })[0], a = clampArea(st.area);
    totalEl.textContent = 'от ' + mln((s.rate + minKit) * a) + ' до ' + mln((s.rate + maxKit) * a) + ' млн ₽';
    perEl.textContent = 'работы ' + F.rub(s.rate) + '/м², наполнение от ' + F.rub(minKit) + '/м²';
    goEl.href = 'scout.html?area=' + a + '&state=' + s.id;
    noteEl.textContent = 'Оценка для ' + F.area(a) + '. Точная сумма зависит от интерьера и плана квартиры.';
  }
  function setArea(v, from) { st.area = v; if (from !== 'num') areaEl.value = v; if (from !== 'range') rangeEl.value = clampArea(v); calc(); }
  areaEl.addEventListener('input', function () { setArea(areaEl.value, 'num'); });
  areaEl.addEventListener('blur', function () { setArea(clampArea(areaEl.value)); });
  rangeEl.addEventListener('input', function () { setArea(Number(rangeEl.value), 'range'); });
  statesEl.addEventListener('click', function (e) { var b = e.target.closest('[data-state]'); if (!b) return; st.stateId = b.getAttribute('data-state'); renderStates(); calc(); });
  document.getElementById('quick').addEventListener('submit', function (e) { e.preventDefault(); location.href = goEl.href; });
  goEl.addEventListener('click', function () { S.my.set({ area: clampArea(st.area), stateId: st.stateId }); });
  renderStates(); setArea(st.area);

  /* ---------- услуги ---------- */
  var adeptFrom = Math.min.apply(null, D.adept.packages.map(function (p) { return p.rate; }));
  var lamp = D.products.filter(function (p) { return p.white && p.subcat === 'Люстры'; })[0];
  var SVC = [
    { href: 'metod.html', name: 'METOD', text: 'Подписка: цены партнёров ниже розницы и их контакты', price: 'от ' + F.rub(D.metodPlans[0].price) + ' в месяц', img: lamp ? lamp.img : 'assets/img/capsules/k1-living.jpg', white: !!lamp },
    { href: 'adept.html', name: 'Дизайн-проект', text: 'Дизайн-проект по выбранному интерьеру', price: 'от ' + F.rub(adeptFrom) + '/м²', img: 'assets/img/capsules/k1-living.jpg' },
    { href: 'sove-ai.html', name: 'Генерации', text: 'Поиск по фото и рендер вашей квартиры', price: 'первые попытки бесплатно', img: 'assets/img/capsules/k4-main-1.jpg' },
    { href: 'track.html', name: 'Управление ремонтом', text: 'Ремонт под ключ с контролем этапов', price: 'от ' + F.rub(Math.min.apply(null, D.scout.states.map(function (s) { return s.rate; }))) + '/м²', img: 'assets/img/capsules/k2-main-1.jpg' }
  ];
  document.getElementById('home-svc').innerHTML = SVC.map(function (x) {
    return '<a class="svc-tile' + (x.white ? ' svc-tile--white' : '') + '" href="' + x.href + '"><img src="' + x.img + '" alt="" loading="lazy"><span class="svc-tile__body"><b>' + esc(x.name) + '</b><span>' + esc(x.text) + '</span><small>' + esc(x.price) + '</small></span></a>';
  }).join('');

  /* ---------- каталог ---------- */
  var WHITE = D.products.filter(function (p) { return p.white; });
  function link(params) { return 'market.html?' + new URLSearchParams(params).toString(); }
  var subs = [], seen = {};
  WHITE.forEach(function (p) { if (!seen[p.subcat]) { seen[p.subcat] = 1; subs.push({ name: p.subcat, img: p.img }); } });
  document.getElementById('home-rail').innerHTML = subs.map(function (x) {
    return '<a class="rail__item" href="' + link({ sub: x.name }) + '"><span class="rail__pic"><img src="' + x.img + '" alt="" loading="lazy"></span><span class="rail__name">' + esc(x.name) + '</span></a>';
  }).join('');
  var cats = D.categories.filter(function (c) { return WHITE.some(function (p) { return p.category === c; }); });
  var tabsEl = document.getElementById('home-tabs'), shelfEl = document.getElementById('home-shelf'), allEl = document.getElementById('home-shelf-all'), tab = cats[0];
  function mix(cat) {
    var list = WHITE.filter(function (p) { return p.category === cat; }), first = [], rest = [], had = {};
    list.forEach(function (p) { if (!had[p.subcat]) { had[p.subcat] = 1; first.push(p); } else rest.push(p); });
    return first.concat(rest).slice(0, 4);
  }
  function renderTabs() {
    tabsEl.innerHTML = cats.map(function (c) { var on = c === tab; return '<button type="button" role="tab" class="tab' + (on ? ' is-active' : '') + '" aria-selected="' + on + '" data-tab="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
    shelfEl.innerHTML = mix(tab).map(function (p) { return S.ui.productCard(p); }).join('');
    allEl.href = link({ category: tab }); allEl.textContent = 'Все товары раздела «' + tab + '»';
  }
  tabsEl.addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; tab = b.getAttribute('data-tab'); renderTabs(); });
  if (cats.length) renderTabs();

  document.getElementById('home-capsules').innerHTML = D.capsules.filter(function (c) { return !c.soon; }).slice(0, 4).map(function (c) { return S.ui.capsuleCard(c); }).join('');
})();
