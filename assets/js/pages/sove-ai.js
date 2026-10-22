/* SOVE AI — главная (ТЗ 22.10, п. 1). Вид — 1:1 из эталонов A–E (sove-ai-variants.js),
   вариант по умолчанию — из sove-ai-config.js, переключатель A–E сверху.
   Здесь нет товаров, корзины и квартиры: только заголовок, 3 блока, 6 генераций, капсулы. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc, FLOW = window.SOVE_FLOW;
  var CFG = window.SOVE_AI_CONFIG, V = window.SOVE_AI_VARIANTS;
  var root = document.getElementById('sa-root'); if (!root || !V) return;
  var VKEY = 'sove.ai.variant.v2';   /* v2: сброс выбора — у всех открывается B (22.10) */

  function variant() { var v = null; try { v = localStorage.getItem(VKEY); } catch (e) {} return (V[v] || v === 'F') ? v : CFG.variant; }

  /* история генераций: sove.gen.history[квартира | none] = { plan, materials, visual } */
  function hist() {
    var all = {}; try { all = JSON.parse(localStorage.getItem('sove.gen.history') || '{}') || {}; } catch (e) {}
    var out = { plan: [], materials: [], visual: [] };
    Object.keys(all).forEach(function (k) { ['plan', 'materials', 'visual'].forEach(function (t) { out[t] = out[t].concat((all[k] || {})[t] || []); }); });
    return out;
  }
  function count(h) { return h.plan.length + h.materials.length + h.visual.length; }

  function price(g) {
    var p = CFG.GEN_PRICES[g];
    if (p === 0) return 'бесплатно';
    if (p === null || p === undefined) return '[N] токенов';
    return F.tokens(p) + (CFG.perFrame[g] ? ' за кадр' : '');
  }
  function tokensLabel() { return S.auth.isIn() ? F.tokens(S.tokens.balance()) : F.tokens(CFG.giftTokens) + ' 🎁'; }

  /* куда ведёт каждая генерация */
  function planHref() { var f = FLOW ? FLOW.load() : {}; return f.step >= 2 ? 'arrange.html?v=panel&flow=1' : 'plan-demo.html'; }
  var GEN = [
    { re: /^План → 3D/, href: function () { return planHref(); } },
    { re: /^Расстановка/, href: function () { return 'arrange.html?v=panel&flow=1'; } },
    { re: /^Мудборд по рендеру/, href: function () { return 'moodboard.html'; } },
    { re: /^Материал по фото/, href: function () { return 'ai.html?mode=photo'; } },
    { re: /^Примерка капсулы/, href: function () { return 'result.html?gen=g4'; } },
    { re: /^Своя капсула/, href: function () { return 'result.html?gen=g5'; } },
    { re: /^Замена предмета/, href: function () { return 'result.html?gen=g6'; } },
    { re: /^Спальня/, href: function () { return 'result.html?gen=g4'; } },
    { re: /^Открыть мудборд/, href: function () { return 'moodboard.html'; } }
  ];
  var BLOCK_HREF = { plan: 'arrange.html?v=panel&flow=1', materials: 'moodboard.html', visual: 'result.html?gen=g4' };
  var CAPS = { 'Изумрудная неоклассика': 'k2', 'Бургундский камень': 'k1', 'Минимализм с голубым': 'k3', 'Тёплая классика': 'k4', 'Органика в песочном': 'k5' };

  /* к какому блоку относится элемент: ближайший предок, в тексте которого ровно один из трёх блоков */
  function blockOf(el) {
    for (var n = el; n && n !== root; n = n.parentElement) {
      var t = n.textContent, hit = [['plan', 'Планировка'], ['materials', 'Материалы'], ['visual', 'Визуализации']].filter(function (b) { return t.indexOf(b[1]) >= 0; });
      if (hit.length === 1) return hit[0][0];
      if (hit.length > 1) return null;
    }
    return null;
  }
  function textOf(el) { var b = el.querySelector('b'); return (b ? b.textContent : el.textContent).trim(); }

  function wire(h) {
    root.querySelectorAll('.sai-body button, .sai-body a').forEach(function (el) {
      var t = el.textContent.replace(/\s+/g, ' ').trim(), tb = textOf(el);
      if (/＋ Создать/.test(t)) { el.setAttribute('data-create', ''); if (el.tagName === 'A') el.setAttribute('href', '#create'); return; }
      /* история блока: «Ваши планировки · 0 ›», «Мудборды · 0 ›», «история · 0 ›» */
      var hm = t.match(/^(Ваши )?(планировки|мудборды|рендеры|история)\s·\s\d+/i);
      if (hm) {
        var type = { 'планировки': 'plan', 'мудборды': 'materials', 'рендеры': 'visual' }[hm[2].toLowerCase()] || blockOf(el);
        if (type) { el.innerHTML = el.innerHTML.replace(/·\s\d+/, '· ' + h[type].length); el.setAttribute('data-hist', type); el.setAttribute('href', '#'); }
        return;
      }
      if (/^пример\s›/i.test(t)) { var bt = blockOf(el); if (bt) el.setAttribute('href', BLOCK_HREF[bt]); return; }
      if (/^Все 7/.test(t)) { el.setAttribute('href', 'capsules.html'); return; }
      var cap = Object.keys(CAPS).filter(function (n) { return tb === n; })[0];
      if (cap) { el.setAttribute('href', 'result.html?gen=g4&capsule=' + CAPS[cap] + '&step=rooms'); return; }
      for (var i = 0; i < GEN.length; i++) {
        if (GEN[i].re.test(tb)) {
          var href = GEN[i].href();
          if (el.tagName === 'A') el.setAttribute('href', href); else el.setAttribute('data-go', href);
          return;
        }
      }
    });
  }

  function header() {
    return '<header class="sai-hd"><div class="sai-hd__t">SOVE AI</div>' +
      '<div class="sai-hd__r"><span class="sai-hd__tok">' + esc(tokensLabel()) + '</span></div></header>';
  }
  function switcher(v) {
    return '<div class="sai-var" role="group" aria-label="Вариант главной"><span>вариант</span>' + 'ABCDEF'.split('').map(function (x) {
      return '<button type="button" data-var="' + x + '" class="' + (x === v ? 'is-on' : '') + '" aria-pressed="' + (x === v) + '">' + x + '</button>';
    }).join('') + '</div>';
  }
  /* мост к АДЕПТ — после «Своей капсулы» или 5+ генераций */
  function adept(h) {
    var own = h.visual.some(function (x) { return x.gen === 'g5' || x.mode === 'own'; });
    if (!own && count(h) < 5) return '';
    return '<a class="sai-adept" href="adept.html"><b>Дизайнер доведёт до проекта с чертежами</b><span>промокод 5 000 ₽ для METOD · АДЕПТ ›</span></a>';
  }

  /* в заголовке: визуализация с товарами из Маркета и планировка (просьба Алины 22.10) —
     та же квартира ЖК PRIDE в «Изумрудной неоклассике», товары и цены METOD — из каталога */
  var HERO_TAGS = [{ id: 202, x: 52, y: 8 }, { id: 107, x: 5, y: 34 }, { id: 106, x: 50, y: 54 }];
  function heroViz() {
    var tags = HERO_TAGS.map(function (t) {
      var p = D.product(t.id); if (!p) return '';
      return '<span class="sai-hv__tag" style="left:' + t.x + '%;top:' + t.y + '%"><b>' + esc(p.name.split(',')[0]) + '</b>' + F.rub(p.metod) + '</span>';
    }).join('');
    return '<div class="sai-hv">' +
      '<a class="sai-hv__r" href="result.html?gen=g4"><img src="assets/img/demo/3-kuhnya-gostinaya.jpg" alt="Визуализация кухни-гостиной с товарами">' + tags +
        '<i>визуализация с товарами</i></a>' +
      '<a class="sai-hv__p" href="' + planHref() + '"><img src="assets/img/demo/1-domik-vsya-kvartira.jpg" alt="Планировка квартиры в 3D"><i>планировка</i></a>' +
      '</div>';
  }

  /* вариант F — горизонтальная лента генераций (просьба Алины 22.10). Заголовок и капсулы — как в A,
     вместо трёх блоков одна лента из 6 карточек; фото живое, подписи тёмным на белом */
  var FEED = [
    { g: 'g1', grp: 'ПЛАНИРОВКА', c: '#2E6B4E', t: 'План → 3D', d: 'план, расстановка мебели', img: 'g-domik.jpg' },
    { g: 'g2', grp: 'МАТЕРИАЛЫ', c: '#A24E32', t: 'Мудборд по рендеру', d: 'своя картинка → мудборд и ДНК', img: 'k1-living.jpg' },
    { g: 'g3', grp: 'МАТЕРИАЛЫ', c: '#A24E32', t: 'Материал по фото', d: 'аналог по закрытой цене', img: 'k1-sideboard.jpg' },
    { g: 'g4', grp: 'ВИЗУАЛИЗАЦИИ', c: '#3E5440', t: 'Примерка капсулы', d: 'капсула SOVE в ваших комнатах', img: 'k2-kitchen.jpg' },
    { g: 'g5', grp: 'ВИЗУАЛИЗАЦИИ', c: '#3E5440', t: 'Своя капсула', d: 'с нуля → рендеры комнат', img: 'k5.jpg' },
    { g: 'g6', grp: 'ВИЗУАЛИЗАЦИИ', c: '#3E5440', t: 'Замена предмета', d: 'по зонам: стены, пол, свет, мебель', img: 'g-hall.jpg' }
  ];
  function variantF() {
    var tmp = document.createElement('div'); tmp.innerHTML = V.A;
    var kids = tmp.children, hero = kids[0].outerHTML, caps = kids[kids.length - 1].outerHTML;
    return hero +
      '<section class="sai-f"><div class="sai-f__h"><b>Что можно создать</b><span>6 генераций · листай ›</span></div>' +
      '<div class="sai-f__row">' + FEED.map(function (x) {
        return '<a class="sai-f__c" href="#"><span class="sai-f__pic" style="background-image:url(assets/img/sove-ai/' + x.img + ')"><i style="background:' + x.c + '">' + x.grp + '</i></span>' +
          '<span class="sai-f__b"><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small><em class="' + (CFG.GEN_PRICES[x.g] === 0 ? 'is-free' : '') + '">' + esc(price(x.g)) + '</em></span></a>';
      }).join('') + '</div>' +
      '<div class="sai-f__hist"><a href="#">Планировки · 0 ›</a><a href="#">Мудборды · 0 ›</a><a href="#">Рендеры · 0 ›</a></div></section>' + caps;
  }

  /* вариант B по правке Алины 22.10: в шапке вместо фото — визуализация с товарами,
     ниже — блок «Планировка» во всю ширину, затем Материалы и Визуализации */
  function vizTags() {
    return HERO_TAGS.map(function (t) {
      var p = D.product(t.id); if (!p) return '';
      return '<span class="sai-hv__tag" style="left:' + t.x + '%;top:' + t.y + '%"><b>' + esc(p.name.split(',')[0]) + '</b>' + F.rub(p.metod) + '</span>';
    }).join('');
  }
  var BTN = 'display: flex; align-items: center; gap: 8px; width: 100%; min-height: 40px; padding: 6px 10px; border-radius: 10px; border: 1px solid #E6E1DA; background: #FFFFFF; color: #1E1C1A; font-family: Montserrat, Arial, sans-serif; text-align: left; cursor: pointer';
  var NUM = 'width: 22px; height: 22px; border-radius: 11px; background: #1E1C1A; color: #FFFFFF; font-size: 11px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0';
  var ROOMS = [
    { t: 'Кухня-гостиная', s: 'Кухня', img: '3-kuhnya-gostinaya' },
    { t: 'Спальня', s: 'Спальня', img: '2-spalnya' },
    { t: 'Санузел', s: 'Санузел', img: '4-sanuzel' },
    { t: 'Прихожая', s: 'Прихожая', img: '5-prihozhaya' }
  ];
  function variantB() {
    var tmp = document.createElement('div'); tmp.innerHTML = V.B;
    var kids = tmp.children, mid = kids[1], caps = kids[kids.length - 1].outerHTML;
    var materials = mid.children[0].outerHTML, visEl = mid.children[1].children[1];
    /* комнаты в блоке Визуализаций: главный кадр + тонкий ряд комнат той же квартиры */
    var top = visEl.children[0], badge = top.querySelector('span') ? top.querySelector('span').outerHTML : '';
    top.outerHTML = '<div class="sai-rm"><div class="sai-rm__main"><img src="assets/img/demo/' + ROOMS[0].img + '.jpg" alt="' + esc(ROOMS[0].t) + '" data-rm-img>' + badge +
      '<span class="sai-rm__cap" data-rm-cap>' + esc(ROOMS[0].t) + '</span></div>' +
      '<div class="sai-rm__row">' + ROOMS.map(function (r, i) {
        return '<button type="button" class="sai-rm__t' + (i === 0 ? ' is-on' : '') + '" data-rm="' + i + '" aria-pressed="' + (i === 0) + '"><img src="assets/img/demo/' + r.img + '.jpg" alt=""><span>' + esc(r.s) + '</span></button>';
      }).join('') + '</div></div>';
    var vis = visEl.outerHTML;
    var hero = '<div class="sai-hb"><div class="sai-hb__t">Создай<br>свой интерьер</div><div class="sai-hb__s">Твой карманный дизайнер</div>' +
      '<a class="sai-hb__v" href="result.html?gen=g4"><img src="assets/img/demo/3-kuhnya-gostinaya.jpg" alt="Визуализация кухни-гостиной с товарами">' + vizTags() + '<i>визуализация с товарами</i></a>' +
      '<button type="button" class="sai-hb__c">＋ Создать</button></div>';
    var plan = '<div style="background: #FFFFFF; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column">' +
      '<div style="position: relative"><img src="assets/img/demo/1-domik-vsya-kvartira.jpg" alt="План в 3D" style="width: 100%; height: 210px; object-fit: cover; display: block">' +
      '<span style="position: absolute; left: 8px; top: 8px; display: flex; align-items: center; gap: 6px; padding: 3px 8px 3px 3px; border-radius: 14px; background: rgba(255,255,255,0.94)"><span style="' + NUM + '">1</span><b style="font-size: 12px">Планировка</b></span>' +
      '<span style="position: absolute; right: 8px; top: 8px; font-size: 10px; font-weight: 700; color: #2E6B4E; background: rgba(255,255,255,0.94); padding: 4px 8px; border-radius: 10px">пример</span></div>' +
      '<div style="padding: 8px; display: flex; flex-direction: column; gap: 5px"><button type="button" style="' + BTN + '"><span style="color: #A24E32; font-size: 13px; width: 14px; text-align: center">✦</span><span style="flex: 1; display: flex; flex-direction: column; gap: 1px"><b style="font-size: 11px">План → 3D</b><small style="font-size: 9px; color: #6B655F">план, расстановка мебели, комнаты</small></span><span style="font-size: 8px; font-weight: 800; padding: 2px 5px; border-radius: 5px; background: #E2EEE6; color: #2E6B4E">БЕСПЛАТНО</span><span style="font-size: 12px; color: #A8A19A">›</span></button>' +
      '<div style="text-align: right"><a href="#" style="font-size: 10px; font-weight: 700; text-decoration: none; white-space: nowrap">Ваши планировки · 0 ›</a></div></div></div>';
    return hero + '<div style="display: flex; flex-direction: column; gap: 10px; padding: 12px">' + plan + materials + vis + '</div>' + caps;
  }

  function render() {
    var v = variant(), h = hist(), n = 0;
    /* цены из конфига: «[N] токенов» в эталоне — по порядку Мудборд по рендеру, Материал по фото */
    var body = (v === 'F' ? variantF() : v === 'B' ? variantB() : V[v]).replace(/\[N\] токенов/g, function () { n++; return price(n === 1 ? 'g2' : 'g3'); });
    root.innerHTML = switcher(v) + header() + '<div class="sai-body">' + body + '</div>' + adept(h);
    var b = root.querySelector('.sai-body');
    /* второй заход: заголовок сворачивается в одну строку */
    if (CFG.collapseOnReturn && count(h) > 0 && b.firstElementChild) {
      var line = document.createElement('div'); line.className = 'sai-line';
      line.innerHTML = '<b>Твой карманный дизайнер</b><button type="button" data-create>＋ Создать</button>';
      b.replaceChild(line, b.firstElementChild);
    } else if (b.firstElementChild && v !== 'B') {
      b.firstElementChild.insertAdjacentHTML('afterend', heroViz());
    }
    wire(h);
  }

  function showHist(type) {
    var names = { plan: 'Ваши планировки', materials: 'Ваши мудборды', visual: 'Ваши рендеры' };
    var list = hist()[type];
    S.ui.modal({ eyebrow: 'История SOVE AI', title: names[type] + ' · ' + list.length,
      html: list.length ? '<ul class="sai-hl">' + list.map(function (x) {
        return '<li><a href="' + esc(x.href || BLOCK_HREF[type]) + '">' + (x.src ? '<img src="' + esc(x.src) + '" alt="">' : '') +
          '<span><b>' + esc(x.title || 'Генерация') + '</b><i>' + (x.ts ? F.dateLong(x.ts) : '') + (x.status === 'draft' ? ' · не закончено' : '') + '</i></span></a></li>';
      }).join('') + '</ul>' : '<p class="text">Пока пусто — всё, что создашь, сохранится сюда.</p>',
      actions: [{ label: 'Закрыть', kind: 'ghost' }] });
  }

  root.addEventListener('click', function (e) {
    var x = e.target.closest('[data-var]');
    if (x) { try { localStorage.setItem(VKEY, x.dataset.var); } catch (err) {} render(); return; }
    if (e.target.closest('[data-create]')) return;   /* шторку открывает sove-ai-create.js */
    x = e.target.closest('[data-rm]');
    if (x) {
      var r = ROOMS[+x.dataset.rm], img = root.querySelector('[data-rm-img]'), cap = root.querySelector('[data-rm-cap]');
      if (img) { img.src = 'assets/img/demo/' + r.img + '.jpg'; img.alt = r.t; }
      if (cap) cap.textContent = r.t;
      root.querySelectorAll('[data-rm]').forEach(function (b) { var on = b === x; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on); });
      return;
    }
    x = e.target.closest('[data-hist]');
    if (x) { e.preventDefault(); showHist(x.dataset.hist); return; }
    x = e.target.closest('[data-go]');
    if (x) { location.href = x.dataset.go; return; }
    x = e.target.closest('a[href="#"]');
    if (x) e.preventDefault();
  });
  S.onChange(function () { var t = root.querySelector('.sai-hd__tok'); if (t) t.textContent = tokensLabel(); });
  render();
})();
