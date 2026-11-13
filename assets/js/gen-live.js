/* Живые генерации в демо (Валерия 02.11: «везде подключить нейронку»). Все вызовы сервера — здесь, а экран «Интерьер»
   зовёт SOVE.genLive.* одной строкой и при любой ошибке остаётся на прежних примерах.
   - analyze(img)            — своё фото → POST /ai/dna_job: стиль, палитра, материалы и две доски материалов (база и премиум).
                                Формат ответа — как у KB.analyzeInterior (заглушка), плюс поле ai.
   - frame(zone, capId, b)   — кадр комнаты → POST /ai/zone/generate по плану из «Планировки» (разметка, расстановка, анкета).
   - refresh(zone, capId, b) — «Обновить комнату» после замен на доске → тот же /ai/zone/generate с items (доска клиента), один кадр.
   - redo(render, kind, prod)— замена предмета на рендере → POST /ai/swap_job (product_id, если товар из каталога).
   Ответы: {img} — готово; {mock: true} — живых генераций нет, экран ставит пример; null — не получилось, генерация возвращается на баланс.
   Платно: OpenRouter через API сервера, дневные лимиты сервера (ai_limits.json). Разбор фото и две доски ≈ 0,15 $,
   кадр комнаты ≈ 0,07 $, замена ≈ 0,04–0,07 $. Выключить для показа без денег — ?live=0 (до закрытия вкладки), включить — ?live=1.
   Доски материалов ИИ живут в localStorage (sove.genlive.boards.v1, три последних), на экране — карточка под мудбордом. */
(function () {
  var S = window.SOVE, KB = window.SOVE_KB; if (!S || !KB) return;
  var API = '/api', OFF = 'sove.genlive.off', BOARDS = 'sove.genlive.boards.v1';
  var Q = new URLSearchParams(location.search);
  try { if (Q.get('live') === '0') sessionStorage.setItem(OFF, '1'); if (Q.get('live') === '1') sessionStorage.removeItem(OFF); } catch (e) {}
  function off() { if (location.protocol === 'file:') return true; try { return sessionStorage.getItem(OFF) === '1'; } catch (e) { return false; } }
  /* один и тот же тост подряд (кадры по комнатам идут друг за другом) — показываем один раз (Вика 05.11: «тост выходит дважды») */
  var lastToast = { t: '', ts: 0 };
  function toast(t) { var now = Date.now(); if (t === lastToast.t && now - lastToast.ts < 8000) return; lastToast = { t: t, ts: now }; if (S.ui && S.ui.toast) S.ui.toast(t); }

  /* ── сеть ── */
  function dataToBlob(src) {
    var m = /^data:([^;,]+)?(;base64)?,(.*)$/.exec(src); if (!m) throw new Error('картинка не прочиталась');
    var raw = m[2] ? atob(m[3]) : decodeURIComponent(m[3]), buf = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
    return new Blob([buf], { type: m[1] || 'image/jpeg' });
  }
  function srcBlob(src) {
    if (/^data:/.test(src)) return Promise.resolve(dataToBlob(src));
    return fetch(src).then(function (r) { if (!r.ok) throw new Error('картинка не загрузилась'); return r.blob(); });
  }
  function call(method, path, body, ms) {
    var ctl = window.AbortController ? new AbortController() : null, t = ctl ? setTimeout(function () { ctl.abort(); }, ms || 60000) : 0;
    return fetch(API + path, { method: method, body: body, signal: ctl ? ctl.signal : undefined }).then(function (r) {
      clearTimeout(t);
      return r.text().then(function (txt) {
        var j = null; try { j = JSON.parse(txt); } catch (e) {}
        if (!r.ok) { var e2 = new Error((j && j.detail) || ('сервер ответил ' + r.status)); e2.status = r.status; throw e2; }
        return j;
      });
    }, function (e) { clearTimeout(t); throw new Error(e && e.name === 'AbortError' ? 'сервер не ответил вовремя' : 'нет связи с сервером'); });
  }
  /* джоба: опрашиваем раз в 2,5 с, до maxMs */
  function poll(jid, maxMs) {
    var t0 = Date.now();
    return new Promise(function (ok, no) {
      (function tick() {
        call('GET', '/ai/job/' + jid, undefined, 15000).then(function (j) {
          if (j.status === 'done') return ok(j.result || {});
          if (j.status === 'error') return no(new Error(j.error || 'генерация не удалась'));
          if (Date.now() - t0 > (maxMs || 180000)) return no(new Error('генерация идёт слишком долго'));
          setTimeout(tick, 2500);
        }, no);
      })();
    });
  }
  /* картинка с сервера (живёт 30 минут) → своя копия JPEG в браузере, не больше max по длинной стороне */
  function keepImage(src, max) {
    return new Promise(function (ok, no) {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, (max || 1280) / Math.max(img.width, img.height)), c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        try { ok(c.toDataURL('image/jpeg', 0.84)); } catch (e) { no(e); }
      };
      img.onerror = function () { no(new Error('картинка с сервера не открылась')); };
      img.src = src;
    });
  }
  function fetchImage(path, max) {
    return fetch(API + path).then(function (r) { if (!r.ok) throw new Error('картинка с сервера не нашлась'); return r.blob(); }).then(function (b) {
      var u = URL.createObjectURL(b);
      return keepImage(u, max).then(function (d) { URL.revokeObjectURL(u); return d; }, function (e) { URL.revokeObjectURL(u); throw e; });
    });
  }

  /* ── доски материалов ИИ: хранение и карточка под мудбордом ── */
  function keyOf(img) { var s = String(img || ''), h = 0; for (var i = 0; i < Math.min(s.length, 4000); i++) h = (h * 31 + s.charCodeAt(i)) | 0; return s.length + ':' + h; }
  function loadBoards() { try { return JSON.parse(localStorage.getItem(BOARDS) || '{}') || {}; } catch (e) { return {}; } }
  function saveBoards(key, rec) {
    var all = loadBoards(); all[key] = rec;
    var keys = Object.keys(all).sort(function (a, b) { return (all[b].t || 0) - (all[a].t || 0); });
    keys.slice(3).forEach(function (k) { delete all[k]; });
    for (var n = 0; n < 3; n++) {
      try { localStorage.setItem(BOARDS, JSON.stringify(all)); return true; } catch (e) {
        var old = Object.keys(all).filter(function (k) { return k !== key; }); if (!old.length) break; delete all[old[old.length - 1]];
      }
    }
    return false;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function matWord(n) { var a = n % 10, b = n % 100; return n + ' ' + (a === 1 && b !== 11 ? 'материал' : a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'материала' : 'материалов'); }
  function boardCard(rec) {
    var tiers = (rec.boards || []).filter(function (b) { return b.img; });
    if (!tiers.length) return '';
    return '<section class="gl-board" data-gl-board><b class="gl-board__t">Доска материалов от ИИ' + (rec.title ? ' · ' + esc(rec.title) : '') + '</b>' +
      (rec.combination ? '<p class="gl-board__d">' + esc(rec.combination) + '</p>' : '') +
      '<div class="gl-board__row">' + tiers.map(function (b) {
        var name = /баз/.test(b.tier) ? 'База' : 'Премиум';
        return '<figure class="gl-board__f"><a href="' + b.img + '" download="doska-' + (name === 'База' ? 'base' : 'premium') + '.jpg"><img src="' + b.img + '" alt="Доска материалов · ' + name + '"></a>' +
          '<figcaption>' + name + ' · ' + matWord((b.materials || []).length) + '</figcaption></figure>';
      }).join('') + '</div></section>';
  }
  /* экран перерисовывает себя целиком — карточку ставим заново после каждой перерисовки */
  function mountBoards() {
    var root = document.getElementById('mt-root'); if (!root || !S.repair) return;
    var mo = new MutationObserver(function () {
      var mb = root.querySelector('.mb'); if (!mb || root.querySelector('[data-gl-board]')) return;
      var it = null; try { it = S.repair.get().interior; } catch (e) {}
      var rec = it && it.imageUrl ? loadBoards()[keyOf(it.imageUrl)] : null; if (!rec) return;
      var html = boardCard(rec); if (!html) return;
      mo.disconnect(); mb.insertAdjacentHTML('afterend', html); mo.observe(root, { childList: true, subtree: true });
    });
    mo.observe(root, { childList: true, subtree: true });
  }
  function css() {
    if (document.getElementById('gl-css')) return;
    var s = document.createElement('style'); s.id = 'gl-css';
    s.textContent = '.gl-board{margin:14px 0;padding:14px;border:1px solid var(--line,#e9e2dc);border-radius:16px;background:var(--white,#fff)}' +
      '.gl-board__t{display:block;font-size:15px;font-weight:700;margin-bottom:4px}.gl-board__d{margin:0 0 10px;font-size:13px;line-height:1.45;color:var(--graphite,#5b534e)}' +
      '.gl-board__row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.gl-board__f{margin:0}.gl-board__f img{display:block;width:100%;border-radius:12px;border:1px solid var(--line,#e9e2dc)}' +
      '.gl-board__f figcaption{margin-top:6px;font-size:12.5px;color:var(--stone,#817b76)}';
    document.head.appendChild(s);
  }

  /* ── 1. своё фото → ДНК и доски ── */
  function analyze(img) {
    var mock = KB.analyzeInterior(img);
    if (off()) return mock;
    var t0 = Date.now();
    return srcBlob(img).then(function (blob) {
      var fd = new FormData(); fd.append('file', blob, 'photo.jpg');
      return call('POST', '/ai/dna_job', fd, 30000);
    }).then(function (r) { return poll(r.job_id, 240000); }).then(function (res) {
      var boards = res.boards || [];
      return Promise.all(boards.map(function (b) {
        return b.board_url ? fetchImage(b.board_url, 1400).catch(function () { return null; }) : Promise.resolve(null);
      })).then(function (imgs) {
        return mock.then(function (a) {
          /* палитра ИИ ложится на роли ДНК (основной, второй, акцент…) по порядку; не хватило цветов — остаётся разбор по пикселям */
          var pal = (res.palette || []).filter(function (c) { return c && /^#[0-9a-f]{6}$/i.test(c.hex || ''); });
          a.dna = a.dna.map(function (c, i) { var p = pal[i]; return p ? Object.assign({}, c, { hex: p.hex, name: p.name ? p.name.charAt(0).toUpperCase() + p.name.slice(1) : c.name }) : c; });
          if (res.style_title) a.style = String(res.style_title).toLowerCase();
          var rec = { t: Date.now(), title: res.style_title || '', tagline: res.tagline || '', combination: res.combination || '',
            boards: boards.map(function (b, i) {
              return { tier: b.tier, img: imgs[i], error: b.error || null, materials: (b.materials || []).map(function (m) {
                return { zone: m.zone, name: m.name_ru || m.name_en, color: m.color, products: (m.products || []).slice(0, 2).map(function (p) {
                  return { id: p.id, brand: p.brand, name: p.name, price: p.price_metod, url: p.url, img: p.img }; }) }; }) };
            }) };
          saveBoards(keyOf(img), rec);
          a.ai = rec; a.ms = Date.now() - t0;
          return a;
        });
      });
    }).catch(function (e) {
      if (e && e.status === 429) toast('Дневной лимит генераций исчерпан — показали примерный разбор. ' + (e.message || ''));
      else toast('ИИ не ответил (' + ((e && e.message) || 'ошибка') + ') — показали примерный разбор по цветам');
      return mock;
    });
  }

  /* ── 2. кадр комнаты по плану ── */
  var ZONE_RU = { kitchenLiving: 'гостиная', bedroom: 'спальня', bathroom: 'санузел', hall: 'прихожая' };
  /* откуда план для кадра (Вика 05.11: на примере ЖК PRIDE «Сгенерировать» давал тост «Нет загруженного плана»):
     1) свой план — разметка и уменьшенная копия картинки из sessionStorage этой вкладки (plan-demo.js keepLive) или из копии
        в localStorage (та же разметка, другая вкладка); 2) в «Моём ремонте» свой план есть, а разметки в браузере нет —
        пример кадра с подсказкой; 3) пример ЖК PRIDE: картинка «Планировка по анкете» и комнаты SOVE_ARRANGE */
  var LIVE_BACK = 'sove.plan.liveBack';
  /* картинка примера 760×760; рамки SOVE_ARRANGE — в сетке плана (76,8 px = 1 м), на картинке план сдвинут на 15 px вправо
     и 60 px вниз (заголовок сверху) — сверено наложением рамок на картинку 05.11 */
  var SAMPLE = { img: 'assets/img/demo/0-planirovka-po-ankete.jpg', w: 760, h: 760, dx: 15, dy: 60 };
  function flowOf() { try { return JSON.parse(localStorage.getItem('sove.demo.flow.v1') || '{}') || {}; } catch (e) { return {}; } }
  function validBack(b) { return !!(b && b.res && (b.res.rooms || []).length && b.img); }
  function ownPlan() {
    var back = null;
    try { back = JSON.parse(sessionStorage.getItem(LIVE_BACK) || 'null'); } catch (e) {}
    if (!validBack(back)) { back = null; try { back = JSON.parse(localStorage.getItem(LIVE_BACK) || 'null'); } catch (e) {} }
    return validBack(back) ? back : null;
  }
  /* комнаты примера → формат разметки сервера (box_2d — доли картинки ×1000, порядок y-x-y-x; type по-русски; area_m2).
     Мебель: расстановка, которую клиент сам подвинул в «Планировке» (sove.arrange.layout.v2, сетка SOVE_ARRANGE → сдвиг), иначе мебель,
     найденная на картинке примера (SOVE_ARRANGE.pictured — уже в px картинки, маршрут /ai/plan/furniture); нет ни того ни другого —
     мебель серверу не отдаём: рамки «Как советует SOVEAPP» с картинкой «по анкете» не совпадают (Валерия 05.11), а расстановку
     сервер и так видит на самой картинке */
  function samplePlan(flow) {
    var A = window.SOVE_ARRANGE; if (!A || !(A.rooms || []).length) return null;
    function shift(b) { return [b[0] + SAMPLE.dx, b[1] + SAMPLE.dy, b[2] + SAMPLE.dx, b[3] + SAMPLE.dy]; }
    function norm(b) { var s = shift(b); return [s[1] / SAMPLE.h, s[0] / SAMPLE.w, s[3] / SAMPLE.h, s[2] / SAMPLE.w].map(function (v) { return Math.round(v * 1000); }); }
    function moved(list) { return (list || []).map(function (x) { return Object.assign({}, x, { box: shift(x.box) }); }); }
    var rooms = A.rooms.filter(function (r) { return !r.part_of; }).map(function (r, i) { return { id: 'r' + (i + 1), label: r.name, type: r.type, area_m2: r.m2, box_2d: norm(r.box) }; });
    var kinds = {}; (A.furniture || []).forEach(function (f) { kinds[f.label] = f.kind; });
    var furn = null, from = 'none', sig = A.rooms.map(function (r) { return r.name + ':' + (r.box || []).map(Math.round).join(','); }).join('|');
    try { var sv = JSON.parse(localStorage.getItem('sove.arrange.layout.v2') || 'null'); if (sv && sv.sig === sig && sv.items && sv.items.length) { furn = moved(sv.items.map(function (it) { return { label: it.label, box: it.box, kind: kinds[it.label] || 'store' }; })); from = 'client'; } } catch (e) {}
    if (!furn && A.pictured && (A.pictured.furniture || []).length) { furn = A.pictured.furniture.map(function (f) { return { label: f.label, box: f.box, kind: f.kind || 'store' }; }); from = 'pictured'; }
    var layout = { px_per_m: A.px_per_m, rooms: moved(A.rooms), windows: moved(A.windows), doors: moved(A.doors) };
    if (furn) layout.furniture = furn;
    return { img: SAMPLE.img, rooms: rooms, brief: flow.brief || {}, sample: true, layout: layout, furnitureFrom: from };
  }
  function planInputs() {
    var flow = flowOf(), back = ownPlan();
    if (back) return { img: back.img, rooms: back.res.rooms, layout: (flow.live && flow.live.layout) || {}, brief: flow.brief || {} };
    var rp = null; try { rp = S.repair ? S.repair.get().plan : null; } catch (e) {}
    if (rp && rp.jk !== 'PRIDE' && rp.level && rp.level !== 'none') return { lost: true };   /* свой план есть, разметки в браузере нет */
    var p = samplePlan(flow); if (p) p.noPlan = !rp;
    return p;
  }
  /* ответ: {img} — кадр ИИ; {mock: true} — живых генераций нет (выключено, нет плана, dry) и экран ставит пример как готовый;
     null — ИИ не справился (сервер отказал или судья не принял 3 попытки): экран возвращает генерацию на баланс (ТЗ 04.11, правило 7).
     items — доска клиента после замен («Обновить комнату» одним кадром, правило 10) */
  function boardItems(board) {
    if (!board || !board.slots) return null;
    var out = [];
    Object.keys(board.slots).forEach(function (k) { var it = KB.item(board.slots[k].sku); if (it) out.push({ slot: k, name: it.name, material: it.material || '' }); });
    return out.length ? out : null;
  }
  function frame(zone, capId, board, opts) {
    opts = opts || {};
    if (off()) return new Promise(function (ok) { setTimeout(function () { ok({ mock: true }); }, 1200); });
    var p = planInputs(), z = ZONE_RU[KB.zoneType(zone)];
    var cap = 'К' + String(capId || (board && (board.capsuleId || board.baseCapsuleId)) || 'k2').replace(/\D/g, '');
    if (!p || p.lost || !z) {
      toast(!z ? 'Для этой комнаты ИИ-кадра пока нет — показываем пример'
        : p && p.lost ? 'Разметка вашего плана в этом браузере не сохранилась — показываем пример кадра. Откройте «Планировку» и загрузите план ещё раз.'
        : 'Плана пока нет — показываем пример кадра. Загрузите план в «Планировке».');
      return Promise.resolve({ mock: true });
    }
    if (p.noPlan) toast('Плана пока нет — кадр по примеру ЖК PRIDE. Свой план можно загрузить в «Планировке».');
    var level = board && board.level === 'premium' ? 'премиум' : 'базовое';
    return srcBlob(p.img).then(function (blob) {
      var fd = new FormData();
      fd.append('file', blob, 'plan.jpg'); fd.append('rooms', JSON.stringify(p.rooms)); fd.append('zone', z);
      fd.append('layout', JSON.stringify(p.layout)); fd.append('brief', JSON.stringify(p.brief)); fd.append('cap', cap); fd.append('level', level);
      var items = opts.withItems ? boardItems(board) : null; if (items) fd.append('items', JSON.stringify(items));
      return call('POST', '/ai/zone/generate' + (Q.get('dry') === '1' ? '?dry=1' : ''), fd, 300000);
    }).then(function (r) {
      if (r && r.dry) { toast('Проверка без денег: запрос принят (' + r.images + ' картинок в запросе)'); return { mock: true }; }
      if (!r || !r.image_png_base64) throw new Error('модель не вернула картинку');
      if (r.accepted === false) { toast('Не получилось: после ' + (r.tries || 3) + ' попыток кадр не прошёл проверку'); return null; }
      return keepImage('data:image/png;base64,' + r.image_png_base64, 1280).then(function (img) { return { img: img, tries: r.tries || 1, review: r.review || null }; });
    }).catch(function (e) {
      toast('Кадр ИИ не получился (' + ((e && e.message) || 'ошибка') + ')');
      return null;
    });
  }
  /* «Обновить комнату» после замен на доске — один новый кадр по доске клиента (все замены сразу, 1 ✦) */
  function refresh(zone, capId, board) { return frame(zone, capId, board, { withItems: true }); }

  /* ── 3. замена предмета на рендере: ИИ перерисовывает только этот предмет (ТЗ 04.11, правило 11).
     product — выбранный товар: по catalogId сервер берёт карточку из каталога без поиска аналогов (product_id) ── */
  function redo(r, what, product) {
    if (off() || !r || !r.img) return new Promise(function (ok) { setTimeout(function () { ok({ mock: true }); }, 1500); });
    var kind = 'object', target = (what || '') + (product && product.name ? ' — ' + product.name : '');
    if (!target) return Promise.resolve(null);
    return srcBlob(r.img).then(function (blob) {
      var fd = new FormData(); fd.append('file', blob, 'render.jpg');
      var pid = product && product.catalogId ? '&product_id=' + encodeURIComponent(product.catalogId) : '';
      return call('POST', '/ai/swap_job?kind=' + kind + '&target=' + encodeURIComponent(target) + pid, fd, 30000);
    }).then(function (j) { return poll(j.job_id, 180000); }).then(function (res) {
      if (!res.result_url) throw new Error('замена не вернула картинку');
      return fetchImage(res.result_url.replace(/^\/api/, ''), 1280).then(function (img) { return { img: img, tries: res.tries || 1 }; });
    }).catch(function (e) {
      toast('Замена ИИ не получилась (' + ((e && e.message) || 'ошибка') + ')');
      return null;
    });
  }

  S.genLive = { analyze: analyze, frame: frame, refresh: refresh, redo: redo, isOn: function () { return !off(); }, inputs: planInputs };   /* inputs — для проверки без денег */
  css();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBoards); else mountBoards();
})();
