/* SOVE.ui.capCard(c, o) — единая карточка интерьера (капсулы) по всему демо; образец — карточка «Расчёта ремонта» (scout.js, scout-cap).
   Вика 03.11 20:08–20:09: «все значки, где используются интерьеры, — в таком формате», размер может быть разным, вид один.
   Вид — assets/css/cap-card.css. Подключать после site.js.
   c — капсула из data.js (name, style, palette, pricePerM2, soon, cover, wide, widePos).
   o: tag 'a' | 'button' | 'div' (по умолчанию a, если есть href, иначе button); href; size 's' | 'l';
      on — выбрана (обводка и галочка; у кнопки aria-pressed); off — недоступна (по умолчанию — «скоро»);
      cls — свои классы страницы (её обработчики и стили не теряются); attrs — {data-…: значение};
      price — false (без цены) | строка (своя подпись вместо «от N ₽/м²»); level — тип ремонта: при 'premium' цена Премиума, если она есть; meta — строка под стилем; badge — подпись на фото;
      img — своё фото вместо c.wide || c.cover; alt; label — aria-label всей карточки. */
(function () {
  var S = window.SOVE; if (!S || !S.ui) return;
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  S.ui.capCard = function (c, o) {
    o = o || {};
    var F = S.fmt, esc = F.esc;
    var tag = o.tag || (o.href ? 'a' : 'button');
    var off = o.off != null ? !!o.off : !!c.soon;
    var cls = 'ucap' + (o.size ? ' ucap--' + o.size : '') + (o.on ? ' is-active' : '') + (off ? ' is-off' : '') + (o.cls ? ' ' + o.cls : '');
    var at = '';
    Object.keys(o.attrs || {}).forEach(function (k) { if (o.attrs[k] != null) at += ' ' + k + '="' + esc(String(o.attrs[k])) + '"'; });
    if (tag === 'a') at += ' href="' + esc(o.href || ('capsule.html?id=' + c.id)) + '"' + (off ? ' aria-disabled="true"' : '');
    if (tag === 'button') at += ' type="button"' + (o.on != null ? ' aria-pressed="' + !!o.on + '"' : '') + (off ? ' disabled' : '');
    if (o.label) at += ' aria-label="' + esc(o.label) + '"';
    var own = !o.img, src = o.img || c.wide || c.cover;
    var pos = own && c.wide && c.widePos ? ' style="object-position:' + esc(c.widePos) + '"' : '';
    var alt = o.alt != null ? o.alt : 'Капсула «' + c.name + '»' + (c.style ? ': ' + String(c.style).toLowerCase() : '');
    var price = '';
    if (o.price === false) price = '';
    else if (typeof o.price === 'string') price = '<span class="ucap__price">' + o.price + '</span>';
    else if (c.soon) price = '<span class="ucap__soon">скоро</span>';
    else if (c.pricePerM2) price = '<span class="ucap__price num">от <b>' + F.num((o.level === 'premium' && c.pricePerM2Premium) || c.pricePerM2) + '</b> ₽/м²</span>';
    var dots = (c.palette || []).length ? '<span class="ucap__dots" aria-hidden="true">' + c.palette.map(function (h) { return '<i style="background:' + esc(h) + '"></i>'; }).join('') + '</span>' : '<span></span>';
    return '<' + tag + ' class="' + cls + '"' + at + '>' +
      '<span class="ucap__pic"><img src="' + esc(src) + '"' + pos + ' alt="' + esc(alt) + '" loading="lazy" decoding="async">' +
        (o.badge ? '<span class="ucap__badge">' + o.badge + '</span>' : '') +
        '<span class="ucap__check" aria-hidden="true">' + CHECK + '</span></span>' +
      '<span class="ucap__body"><span class="ucap__name">' + esc(c.name) + '</span>' +
        (c.style ? '<span class="ucap__style">' + esc(c.style) + '</span>' : '') +
        (o.meta ? '<span class="ucap__meta">' + o.meta + '</span>' : '') +
        ((price || (c.palette || []).length) ? '<span class="ucap__foot">' + dots + price + '</span>' : '') + '</span>' +
      '</' + tag + '>';
  };
})();
