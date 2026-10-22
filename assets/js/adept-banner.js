/* Адепт: два блока, которые нужны в нескольких местах.
   SOVE.adeptBanner(el, opts) — вход в воронку: лист с планом сдвигается, под ним тот же кадр в интерьере.
   SOVE.adeptCompare(el, opts) — уже внутри страницы Адепта: что на руках с капсулой и что добавит проект. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt;
  var PK = D.adept.packages;

  /* тот же чертёж, что на фотографии k1-living: остров со стульями, полукруглый диван,
     круглый ковёр с латунным столом, кресло у панорамного окна */
  function planSVG(titleId, compact) {
    /* в компактном кадре штамп не читается — показываем только сам план */
    /* лист шире чертежа: при стартовом положении план виден целиком, а не срезан краем */
    return '<svg viewBox="0 0 366 ' + (compact ? 318 : 400) + '" role="img" aria-labelledby="' + titleId + '">' +
      '<title id="' + titleId + '">План той же гостиной 22 м²: мраморный остров со стульями, полукруглый диван у стены с картиной, круглый ковёр с латунным столом, кресло у панорамного окна</title>' +
      '<rect class="pl-floor" x="28" y="44" width="264" height="256"/>' +
      '<path class="pl-solid" fill-rule="evenodd" d="M20 36h280v272H20zM28 44v256h264V44z"/>' +
      '<path class="pl-open" d="M296 84v168"/><path class="pl-win" d="M292.5 84v168M299.5 84v168"/>' +
      '<path class="pl-open" d="M24 252v40"/><path class="pl-leaf" d="M28 292v-36"/><path class="pl-arc" d="M28 256a36 36 0 0 1 36 36"/>' +
      '<path class="pl-art" d="M28 96v44"/>' +
      '<path class="pl-furn" data-lit="sofa" d="M44 104a48 48 0 0 1 0 96M60 104a32 32 0 0 1 0 96"/>' +
      '<circle class="pl-rug" cx="176" cy="196" r="62"/>' +
      '<circle class="pl-furn" data-lit="table" cx="176" cy="196" r="24"/>' +
      '<circle class="pl-light" cx="176" cy="196" r="34"/><path class="pl-light" d="M166 186l20 20M186 186l-20 20"/>' +
      '<path class="pl-furn" data-lit="arm" d="M238 156h38v40h-38z"/><path class="pl-hair" d="M268 156v40"/>' +
      '<circle class="pl-furn" cx="240" cy="112" r="7"/>' +
      '<path class="pl-furn" d="M40 214h58v78H40z"/>' +
      '<circle class="pl-hair" cx="112" cy="232" r="8"/><circle class="pl-hair" cx="112" cy="256" r="8"/><circle class="pl-hair" cx="112" cy="280" r="8"/>' +
      '<path class="pl-view" d="M58 306L288 120M58 306L288 244"/><circle class="pl-viewdot" cx="58" cy="306" r="9"/>' +
      '<text class="pl-viewn" x="58" y="309" text-anchor="middle">01</text>' +
      '<text class="pl-t pl-t--room" x="40" y="70">гостиная · 22 м²</text>' +
      '<text class="pl-s" x="40" y="84">пример расстановки</text>' +
      '<path class="pl-dim" d="M14 44v256M10 44h8M10 300h8"/>' +
      '<text class="pl-d" x="14" y="172" text-anchor="middle" transform="rotate(-90 14 172)">4,6 м</text>' +
      (compact ? '' :
        '<path class="pl-stamp" d="M20 326h132v48H20zM20 342h132M20 358h132"/>' +
        '<text class="pl-st" x="26" y="338">SOVEAPP · Адепт</text><text class="pl-st" x="26" y="354">план расстановки</text><text class="pl-st" x="26" y="370">М 1:50</text>') +
      '</svg>';
  }

  var n = 0;
  S.adeptBanner = function (el, opts) {
    if (!el) return;
    opts = opts || {};
    var id = 'adb' + (++n);
    var cap = D.capsule(opts.capsule || 'k1') || D.capsules[0];
    var pack = PK[0], rate = (cap.adeptRates && cap.adeptRates.start) || pack.rate;
    var href = opts.href || ('adept.html?capsule=' + cap.id);
    var compact = !!opts.compact;

    el.className = 'adb' + (compact ? ' adb--compact' : '') + (opts.bare ? ' adb--bare' : '');
    el.innerHTML =
      (opts.bare ? '' :
        '<div class="adb__head"><span class="adb__k">Адепт · дизайн-проект</span>' +
        '<b class="adb__t">' + F.esc(opts.title || 'Ваша квартира — в интерьере капсулы') + '</b></div>') +
      '<div class="adb__stage" id="' + id + '-stage">' +
        '<img class="adb__photo" src="' + cap.cover + '" alt="Гостиная в интерьере капсулы ' + F.esc(cap.code) + '">' +
        '<img class="adb__photo adb__photo--b" alt="" aria-hidden="true">' +
        '<div class="adb__plan" id="' + id + '-plan">' + planSVG(id + '-plan-t', compact) + '</div>' +
        '<input class="adb__input" id="' + id + '-range" type="range" min="8" max="92" step="1" value="88" aria-label="Сдвинуть лист с планом" aria-valuetext="виден план">' +
        '<span class="adb__edge" id="' + id + '-edge" aria-hidden="true"><i class="adb__curl"></i></span>' +
        '<span class="adb__cap">' + F.esc(cap.name) + '</span>' +
        '<span class="adb__room" data-room></span>' +
        '<span class="adb__dots" data-dots></span>' +
        '<span class="adb__hint" id="' + id + '-hint">сдвиньте лист</span>' +
        '<span class="adb__glow" aria-hidden="true"></span>' +
        '<button type="button" class="adb__sun" data-light aria-pressed="false" aria-label="Дневной или вечерний свет">' +
          '<i class="adb__sun__knob" aria-hidden="true">' +
            '<svg class="adb__ico adb__ico--day" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round">' +
            '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.4v2.2M12 19.4v2.2M2.4 12h2.2M19.4 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6"/></svg>' +
            '<svg class="adb__ico adb__ico--night" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"/></svg>' +
          '</i>' +
        '</button>' +
      '</div>' +
      '' +
      (opts.picker ?
      '<div class="adb__pick">' +
        '<div class="adb__pickhead"><span>Выберите интерьер</span><a class="btn btn--link" href="capsules.html">Все интерьеры</a></div>' +
        '<div class="adb__lanebox"><div class="adb__lane" role="group" aria-label="Интерьеры капсул">' +
          D.capsules.filter(function (c) { return !c.soon; }).slice(0, 6).map(function (c) {
            var pic = (c.slides && c.slides[0] && c.slides[0].src) || c.cover;   /* тот же кадр, что откроется в баннере */
            return '<button class="adb__pic" type="button" data-cap="' + c.id + '" aria-pressed="' + (c.id === cap.id ? 'true' : 'false') + '">' +
              '<img src="' + pic + '" alt="" loading="lazy"><b>' + F.esc(c.name) + '</b>' +
              (c.pricePerM2 ? '<span>от ' + F.rub(c.pricePerM2) + '/м²</span>' : '') + '</button>';
          }).join('') +
        '</div></div>' +
      '</div>' : '') +
      (opts.bare ? '' :
      '<div class="adb__foot">' +
        (compact ? '' : '<small class="adb__d">В стартовом пакете: ' + pack.includes.join(' · ') + '. Спецификация с ценами METOD — с пакета «' + PK[1].name + '».</small>') +
        '<span class="adb__cta"><span class="adb__price"><b data-rate>от ' + F.rub(rate) + '/м²</b><i data-pick>' + pack.name + ' пакет · ' + pack.term + '</i></span>' +
        '<a class="btn btn--primary" data-order>' + F.esc(opts.cta || 'Заказать проект') + '</a></span>' +
      '</div>');

    var plan = document.getElementById(id + '-plan'), edge = document.getElementById(id + '-edge');
    var range = document.getElementById(id + '-range'), hint = document.getElementById(id + '-hint');
    var stage = document.getElementById(id + '-stage');
    var lits = plan.querySelectorAll('[data-lit]');

    el.querySelectorAll('a[href]').forEach(function (a) {
      a.addEventListener('click', function () { if (S.draft && S.draft.set) S.draft.set('adept', { capsuleId: cap.id }); });
    });

    /* заказ оформляется на ту капсулу, которая сейчас в кадре */
    var order = el.querySelector('[data-order]');
    if (order) order.addEventListener('click', function () {
      if (S.draft && S.draft.set) S.draft.set('adept', { capsuleId: cap.id });
      S.ui.leadSheet({
        eyebrow: 'Адепт · дизайн-проект',
        title: 'Проект по капсуле «' + cap.name + '»',
        note: 'Пакет «' + pack.name + '» — от ' + F.rub((cap.adeptRates && cap.adeptRates.start) || pack.rate) + '/м², ' + pack.term + '.\nВ проект входит: ' + pack.includes.join('; ') + '. Спецификация с ценами METOD — с пакета «' + PK[1].name + '». Площадь и пакет уточним при звонке.',
        cta: 'Отправить заявку',
        product: 'adept',
        extra: { capsuleId: cap.id, capsule: cap.code },
        done: 'Дизайнер свяжется и уточнит планировку, площадь и пакет.'
      });
    });

    var LIT = { arm: [92, 62], table: [62, 38], sofa: [38, 8] };
    function put(p) {
      plan.style.clipPath = 'inset(0 ' + (100 - p) + '% 0 0)';
      edge.style.left = p + '%';
      lits.forEach(function (x) {
        var r = LIT[x.getAttribute('data-lit')];
        x.classList.toggle('is-lit', !!r && p <= r[0] && p > r[1]);
      });
      range.setAttribute('aria-valuetext', 'виден план на ' + Math.round(p) + '%, интерьер на ' + Math.round(100 - p) + '%');
    }
    var again = null;
    function touched() { hint.classList.add('is-off'); clearTimeout(again); }

    var anim = null;
    function glide(to, ms) {
      if (anim) cancelAnimationFrame(anim);
      var from = Number(range.value), t0 = null;
      function step(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / ms), e = k * k * (3 - 2 * k), v = from + (to - from) * e;
        range.value = v; put(v);
        anim = k < 1 ? requestAnimationFrame(step) : null;
      }
      anim = requestAnimationFrame(step);
    }

    put(Number(range.value));
    range.addEventListener('input', function () { if (anim) { cancelAnimationFrame(anim); anim = null; } put(Number(range.value)); touched(); pause(); });
    range.addEventListener('keydown', function (e) {
      if (e.key !== 'PageUp' && e.key !== 'PageDown') return;
      e.preventDefault();
      var v = Math.max(8, Math.min(92, Number(range.value) + (e.key === 'PageUp' ? 10 : -10)));
      range.value = v; put(v); touched();
    });

    /* тап — плавно открыть или закрыть лист, а не прыгнуть */
    var downX = 0, downT = 0, before = 88, moved = false;
    range.addEventListener('pointerdown', function (e) { downX = e.clientX; downT = e.timeStamp; before = Number(range.value); moved = false; });
    range.addEventListener('pointermove', function (e) { if (Math.abs(e.clientX - downX) > 6) moved = true; });
    range.addEventListener('pointerup', function (e) {
      touched();
      if (moved || e.timeStamp - downT > 260) return;
      range.value = before; put(before);
      glide(before > 50 ? 20 : 88, 450);
    });

    var slow = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function tease() {
      if (hint.classList.contains('is-off')) return;
      if (slow) { play(); return; }             /* в спокойном режиме просто оставляем подсказку текстом */
      glide(40, 1100);                          /* лист отъезжает и остаётся: видно и план, и интерьер */
      setTimeout(play, 1300);
      again = setTimeout(function () {
        if (hint.classList.contains('is-off')) return;
        glide(58, 600); setTimeout(function () { glide(40, 600); }, 700);
      }, 7000);
    }
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { visible = true; tease(); play(); }
          else { visible = false; stop(); }
        });
      }, { threshold: 0.4 }).observe(stage);
    } else { visible = true; tease(); play(); }

    /* кадр показывает слайды выбранной капсулы: точки листают, выбор капсулы начинает с первого */
    /* свет: пока вечер собираем фильтрами. Когда в данных у слайда появится night-кадр,
       show() подставит его — менять разметку не придётся. */
    var night = false;
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-light]'); if (!b) return;
      e.preventDefault(); e.stopPropagation();
      night = !night;
      el.classList.toggle('is-night', night);
      b.setAttribute('aria-pressed', night ? 'true' : 'false');
      if (typeof window.__adbRelight === 'function') window.__adbRelight();
    });

    var shots = el.querySelectorAll('.adb__photo'), top = 0;
    var roomEl = el.querySelector('[data-room]'), dotsEl = el.querySelector('[data-dots]');
    var slides = [], slide = 0;

    function galleryOf(c) {
      /* slides — кадры из папки капсулы на Диске, gallery — то, что было в прототипе раньше */
      var src = (c.slides && c.slides.length ? c.slides : c.gallery) || [];
      var g = src.filter(function (x) { return x && x.src; }).slice(0, 5);
      return g.length ? g : [{ room: '', src: c.cover }];
    }
    window.__adbRelight = function () { show(slide, true); };
    function show(i, quiet) {
      if (!slides.length) return;
      slide = (i + slides.length) % slides.length;
      var sl = slides[slide], alt = (sl.room || 'Интерьер') + ', капсула ' + cap.name;
      var src = (night && sl.night) ? sl.night : sl.src;
      if (quiet) { shots[top].src = src; shots[top].alt = alt; }
      else {
        var next = shots[1 - top], prev = shots[top], pre = new Image();
        pre.onload = function () {
          next.src = src; next.alt = alt;
          next.style.opacity = '1'; prev.style.opacity = '0';
          next.removeAttribute('aria-hidden'); prev.setAttribute('aria-hidden', 'true');
          top = 1 - top;
        };
        pre.src = src;
      }
      if (roomEl) roomEl.textContent = sl.room || '';
      if (dotsEl) dotsEl.innerHTML = slides.map(function (x, n) {
        return '<button type="button" data-slide="' + n + '"' + (n === slide ? ' aria-current="true"' : '') +
          ' aria-label="Кадр ' + (n + 1) + (x.room ? ': ' + x.room : '') + '"></button>';
      }).join('');
    }

    /* кадры листаются сами: пока баннер на экране, вкладка активна и человек ничего не трогает */
    var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var timer = null, resume = null, visible = false;
    function stop() { clearInterval(timer); timer = null; }
    function play() {
      if (calm || timer || !visible || document.hidden || slides.length < 2) return;
      var n = 0;
      timer = setInterval(function () {
        show(slide + 1);
        if (++n === 2) hint.classList.add('is-off');   /* человек уже видел, что кадр живой */
      }, 4200);
    }
    function pause(ms) {
      stop(); clearTimeout(resume);
      resume = setTimeout(play, ms || 8000);
    }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else play(); });

    if (dotsEl) dotsEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-slide]'); if (!b) return;
      show(Number(b.getAttribute('data-slide')));
      pause();
    });

    var api = {
      capsule: function () { return cap; },
      setCapsule: function (id) {
        var c = D.capsule(id);
        if (!c) return;
        if (c.id === cap.id) { show(slide + 1); return; }      /* та же капсула — следующий кадр */
        cap = c;
        slides = galleryOf(c);
        show(0);
        pause(5000);
        var capEl = el.querySelector('.adb__cap');
        if (capEl) capEl.textContent = c.name;
        var rateEl = el.querySelector('[data-rate]');           /* в кадре без подписи футера нет */
        if (rateEl) rateEl.textContent = 'от ' + F.rub((c.adeptRates && c.adeptRates.start) || pack.rate) + '/м²';
        var pickEl = el.querySelector('[data-pick]');
        if (pickEl) pickEl.textContent = pack.name + ' пакет · ' + pack.term;
        var go = el.querySelector('[data-go]');
        if (go) go.href = (opts.href ? opts.href.split('?')[0] : 'adept.html') + '?capsule=' + c.id;
      }
    };
    slides = galleryOf(cap);
    show(0, true);
    shots[1].src = shots[0].src;       /* второй слой не должен оставаться пустым */

    var lane = el.querySelector('.adb__lane'), lanebox = el.querySelector('.adb__lanebox'), scrollT = null;

    /* пока лента едет, размытие у краёв чуть сильнее */
    if (lane && lanebox) lane.addEventListener('scroll', function () {
      lanebox.classList.add('is-moving');
      clearTimeout(scrollT);
      scrollT = setTimeout(function () { lanebox.classList.remove('is-moving'); }, 240);
    }, { passive: true });

    if (lane) lane.scrollLeft = 0;                    /* scroll-snap иначе съедает левое поле */
    if (lane) lane.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cap]'); if (!b) return;
      lane.querySelectorAll('[data-cap]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      api.setCapsule(b.getAttribute('data-cap'));
    });

    el.adept = api;
    return api;
  };

  /* ---------- что у вас на руках: капсула и капсула с проектом ---------- */
  S.adeptCompare = function (el, opts) {
    if (!el) return;
    opts = opts || {};
    var cap = D.capsule(opts.capsule || 'k1') || D.capsules[0], pack = PK[0];
    var ROWS = [
      { t: 'Стиль и палитра', d: 'подобраны в капсуле', base: true },
      { t: 'Список вещей с ценами METOD', d: 'можно покупать самому', base: true },
      { t: 'Планировка по вашим стенам', d: 'мебель встаёт в вашу квартиру' },
      { t: 'Размеры для бригады', d: 'развёртки стен, ниши, плитка' },
      { t: 'Розетки и свет', d: 'чтобы не сверлить дважды' },
      { t: 'Спецификация проекта', d: 'что, где и почём — одним файлом' }
    ];
    el.className = 'adc';
    el.innerHTML =
      '<span class="adb__k">Адепт · дизайн-проект</span>' +
      '<h2 class="adc__t">' + F.esc(opts.title || 'Что у вас на руках') + '</h2>' +
      '<div class="adc__seg" role="tablist"><button type="button" role="tab" data-v="0" class="is-on">Только капсула</button><button type="button" role="tab" data-v="1">Капсула + Адепт</button></div>' +
      '<ul class="adc__list">' + ROWS.map(function (r, i) {
        return '<li style="--i:' + i + '" data-base="' + (r.base ? 1 : 0) + '"><b>' + r.t + '</b><span>' + r.d + '</span></li>';
      }).join('') + '</ul>' +
      '<div class="adc__foot"><span class="adb__price"><b>+ от ' + F.rub(pack.rate) + '/м²</b><i>«' + pack.name + '» · ' + pack.term + '</i></span>' +
      '<a class="btn btn--primary btn--sm" data-go>' + '</a></div>';

    var mode = 0, list = el.querySelector('.adc__list'), seg = el.querySelector('.adc__seg'), go = el.querySelector('[data-go]');
    function draw() {
      list.querySelectorAll('li').forEach(function (li) {
        var base = li.getAttribute('data-base') === '1';
        li.classList.toggle('is-on', base || mode === 1);
        li.classList.toggle('is-new', !base && mode === 1);
      });
      seg.querySelectorAll('button').forEach(function (b) {
        var on = Number(b.getAttribute('data-v')) === mode;
        b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (opts.inside) {                       /* уже на странице Адепта: ведём к расчёту */
        go.textContent = mode ? 'Собрать проект' : 'Смотреть капсулу';
        go.setAttribute('href', mode ? (opts.calc || '#calc') : ('capsule.html?id=' + cap.id));
      } else {
        go.textContent = mode ? 'Собрать проект — от ' + F.rub(pack.rate) + '/м²' : 'Смотреть капсулу';
        go.setAttribute('href', mode ? ('adept.html?capsule=' + cap.id) : ('capsule.html?id=' + cap.id));
      }
    }
    draw();
    seg.addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (!b) return; mode = Number(b.getAttribute('data-v')); draw(); });
  };
})();
