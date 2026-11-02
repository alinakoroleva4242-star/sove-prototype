/* Живые генерации в демо (Валерия 02.11: «везде подключить нейронку»). Все вызовы сервера — здесь, а экран «Интерьер»
   зовёт SOVE.genLive.* одной строкой и при любой ошибке остаётся на прежних примерах.
   - analyze(img)            — своё фото → POST /ai/dna_job: стиль, палитра, материалы и две доски материалов (база и премиум).
                                Формат ответа — как у KB.analyzeInterior (заглушка), плюс поле ai.
   - frame(zone, capId, b)   — кадр комнаты → POST /ai/zone/generate по плану из «Планировки» (разметка, расстановка, анкета).
   - redo(render, stale)     — «обновить» после замены → POST /ai/swap_job: предмет (kind=object) или материал (kind=material).
   Платно: OpenRouter через API сервера, дневные лимиты сервера (ai_limits.json). Разбор фото и две доски ≈ 0,15 $,
   кадр комнаты ≈ 0,07 $, замена ≈ 0,04–0,07 $. Выключить для показа без денег — ?live=0 (до закрытия вкладки), включить — ?live=1.
   Доски материалов ИИ живут в localStorage (sove.genlive.boards.v1, три последних), на экране — карточка под мудбордом. */
(function () {
  var S = window.SOVE, KB = window.SOVE_KB; if (!S || !KB) return;
  var API = '/api', OFF = 'sove.genlive.off', BOARDS = 'sove.genlive.boards.v1';
  var Q = new URLSearchParams(location.search);
  try { if (Q.get('live') === '0') sessionStorage.setItem(OFF, '1'); if (Q.get('live') === '1') sessionStorage.removeItem(OFF); } catch (e) {}
  function off() { if (location.protocol === 'file:') return true; try { return sessionStorage.getItem(OFF) === '1'; } catch (e) { return false; } }
  function toast(t) { if (S.ui && S.ui.toast) S.ui.toast(t); }

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
  function planInputs() {
    var back = null, flow = {};
    try { back = JSON.parse(sessionStorage.getItem('sove.plan.liveBack') || 'null'); } catch (e) {}
    try { flow = JSON.parse(localStorage.getItem('sove.demo.flow.v1') || '{}') || {}; } catch (e) {}
    if (!back || !back.res || !(back.res.rooms || []).length || !back.img) return null;
    return { img: back.img, rooms: back.res.rooms, layout: (flow.live && flow.live.layout) || {}, brief: flow.brief || {} };
  }
  /* null — кадра нет (выключено, нет плана, сервер отказал): экран ставит пример, как раньше */
  function frame(zone, capId, board) {
    if (off()) return new Promise(function (ok) { setTimeout(function () { ok(null); }, 1200); });
    var p = planInputs(), z = ZONE_RU[KB.zoneType(zone)];
    var cap = 'К' + String(capId || (board && (board.capsuleId || board.baseCapsuleId)) || 'k2').replace(/\D/g, '');
    if (!p || !z) {
      toast(!p ? 'Нет загруженного плана в этой вкладке — показываем пример кадра. Загрузите план в «Планировке».' : 'Для этой комнаты ИИ-кадра пока нет — показываем пример');
      return Promise.resolve(null);
    }
    var level = board && board.level === 'premium' ? 'премиум' : 'базовое';
    return srcBlob(p.img).then(function (blob) {
      var fd = new FormData();
      fd.append('file', blob, 'plan.jpg'); fd.append('rooms', JSON.stringify(p.rooms)); fd.append('zone', z);
      fd.append('layout', JSON.stringify(p.layout)); fd.append('brief', JSON.stringify(p.brief)); fd.append('cap', cap); fd.append('level', level);
      return call('POST', '/ai/zone/generate' + (Q.get('dry') === '1' ? '?dry=1' : ''), fd, 120000);
    }).then(function (r) {
      if (r && r.dry) { toast('Проверка без денег: запрос принят (' + r.images + ' картинок в запросе)'); return null; }
      if (!r || !r.image_png_base64) throw new Error('модель не вернула картинку');
      return keepImage('data:image/png;base64,' + r.image_png_base64, 1280);
    }).catch(function (e) {
      toast('Кадр ИИ не получился (' + ((e && e.message) || 'ошибка') + ') — показываем пример');
      return null;
    });
  }

  /* ── 3. «обновить» после замены: предмет или материал на текущем кадре ── */
  function redo(r, what) {
    if (off() || !r || !r.img) return new Promise(function (ok) { setTimeout(function () { ok(null); }, 1500); });
    var kind = r.objStale ? 'object' : 'material', target = r.objStale || what || '';
    if (!target) return Promise.resolve(null);
    return srcBlob(r.img).then(function (blob) {
      var fd = new FormData(); fd.append('file', blob, 'render.jpg');
      return call('POST', '/ai/swap_job?kind=' + kind + '&target=' + encodeURIComponent(target), fd, 30000);
    }).then(function (j) { return poll(j.job_id, 180000); }).then(function (res) {
      if (!res.result_url) throw new Error('замена не вернула картинку');
      return fetchImage(res.result_url.replace(/^\/api/, ''), 1280);
    }).catch(function (e) {
      toast('Замена ИИ не получилась (' + ((e && e.message) || 'ошибка') + ') — кадр оставлен прежним');
      return null;
    });
  }

  S.genLive = { analyze: analyze, frame: frame, redo: redo, isOn: function () { return !off(); } };
  css();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountBoards); else mountBoards();
})();
