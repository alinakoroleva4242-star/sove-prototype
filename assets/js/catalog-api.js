/* Живой каталог для прототипа: обёртка над /api/marketplace/* боевого API (1 млн товаров).
   Включается, когда страница открыта по http(s) — на стенде /api/ проксируется к API тем же хостом.
   С file:// API недоступен (нет CORS) — страницы работают на примерах из data.js, как раньше.
   Товар API приводится к формату товара прототипа (см. data.js: p()), чтобы карточки, избранное,
   «Мой ремонт» и прочие блоки не отличали живой товар от примера. */
(function () {
  var S = window.SOVE, D = window.SOVE_DATA || (S && S.data);   /* подключать после site.js: объект SOVEAPP создаёт он */
  if (!S || !D) return;
  var base = /^https?:$/.test(location.protocol) ? '/api' : null;
  var api = { enabled: !!base, base: base };

  function get(path, params) {
    var q = [];
    Object.keys(params || {}).forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === '') return;
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    });
    var url = base + path + (q.length ? (path.indexOf('?') >= 0 ? '&' : '?') + q.join('&') : '');
    /* сервер иногда не отвечает (например, капсула + скидка): через 20 с показываем ошибку, а не вечный скелет */
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var tm = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
    return fetch(url, { headers: { Accept: 'application/json' }, signal: ctl ? ctl.signal : undefined }).then(function (r) {
      if (!r.ok) { var e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
      return r.json();
    }).finally(function () { if (tm) clearTimeout(tm); });
  }

  function pct(d) { var m = /(\d+)/.exec(String(d || '')); return m ? Number(m[1]) : 0; }
  /* 'К1,К2' из API → id капсул прототипа ('k1','k2'); капсулы, которых в прототипе нет (К8), пропускаем */
  function capsIds(str) {
    return String(str || '').split(',').map(function (c) { return c.trim(); }).filter(Boolean).map(function (code) {
      var c = (D.capsules || []).filter(function (x) { return x.code === code; })[0];
      return c ? c.id : null;
    }).filter(Boolean);
  }
  function toProto(it) {
    if (!it || !it.id) return null;
    var retail = Number(it.price_retail || it.price_metod || 0), metod = Number(it.price_metod || it.price_retail || 0);
    var disc = pct(it.discount) || (retail > metod && retail ? Math.round((retail - metod) / retail * 100) : 0);
    var delivery = it.delivery ? String(it.delivery) + (it.delivery_city ? ' · ' + it.delivery_city : '') : 'Уточняется у поставщика';
    return {
      id: it.id, name: String(it.name || '').trim(), brand: String(it.brand || '').trim(), category: it.category || '',
      subcat: it.subcat || '', capsules: capsIds(it.capsule_id), retail: retail, metod: metod, discount: disc,
      img: it.img || '', white: true, delivery: delivery, leadTime: '', madeToOrder: false, live: true,
      descr: it.descr || '', sizes: it.sizes || '', color: it.color || '', material: it.material || '', style: it.style || '',
      suppliers: [ { id: 's-' + it.id, name: it.brand || 'Поставщик', metod: metod, delivery: delivery } ]
    };
  }

  api.toProto = toProto;
  /* поиск по каталогу: q, category, ptype (подтип), capsule_id ('К1'), discount_min, price_min/max, sort (discount|price_asc|price_desc|default), page, page_size */
  api.search = function (params) {
    return get('/marketplace/search', params).then(function (d) {
      return { total: d.total || 0, page: d.page || 1, pageSize: d.page_size || 0, items: (d.items || []).map(toProto).filter(Boolean) };
    });
  };
  api.facets = function (params) { return get('/marketplace/facets', params); };
  api.subtypes = function (category) { return get('/marketplace/subtypes', { category: category }).then(function (d) { return d.items || []; }); };
  api.product = function (id) {
    return get('/marketplace/product/' + encodeURIComponent(id)).then(toProto).catch(function (e) { if (e.status === 404) return null; throw e; });
  };
  api.similar = function (id, n) { return get('/marketplace/similar/' + encodeURIComponent(id), { topn: n || 8 }).then(function (d) { return (d.items || []).map(toProto).filter(Boolean); }); };
  api.deals = function (n) { return get('/marketplace/deals', { limit: n || 24 }).then(function (d) { return (d.items || []).map(toProto).filter(Boolean); }); };
  api.stats = function () { return get('/marketplace/stats'); };

  /* товар по id: сначала примеры (их id трёхзначные), потом API. Возвращает Promise. */
  api.resolve = function (id) {
    var local = D.product(id);
    if (local) return Promise.resolve(local);
    if (!api.enabled) return Promise.resolve(null);
    return api.product(id);
  };

  S.catalog = api;
})();
