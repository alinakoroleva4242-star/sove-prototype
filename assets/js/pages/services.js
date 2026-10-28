/* Услуги: хаб из четырёх карточек, каждая ведёт на свою страницу-воронку */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var adeptFrom = Math.min.apply(null, D.adept.packages.map(function (p) { return p.rate; }));
  var trackFrom = Math.min.apply(null, D.scout.states.map(function (s) { return s.rate; }));
  var LIST = [
    { href: 'metod.html', name: 'METOD', lead: 'Подписка на цены партнёров', text: 'Скидки 10–30 % на мебель, свет и отделку, контакты поставщиков и промокоды.', price: 'от ' + F.rub(D.metodPlans[0].price) + ' в месяц', cta: 'Оформить подписку', img: 'assets/img/capsules/k1-living.jpg' },
    { href: 'adept.html', name: 'Дизайн-проект', lead: 'По вашей капсуле', text: 'Планировка, рендеры и спецификация по выбранному интерьеру. Три пакета по объёму.', price: 'от ' + F.rub(adeptFrom) + '/м²', cta: 'Оставить заявку', img: 'assets/img/capsules/k4-main-1.jpg' },
    { href: 'sove-ai.html', name: 'Генерации', lead: 'Поиск по фото и рендер', text: 'Найдём вещь с фотографии среди товаров партнёров или покажем вашу квартиру в выбранном интерьере.', price: 'первые попытки бесплатно, дальше токены', cta: 'Попробовать', img: 'assets/img/capsules/k2-main-1.jpg' },
    { href: 'track.html', name: 'Управление ремонтом', lead: 'Ремонт под ключ', text: 'Бригада, закупки и контроль этапов. Отчёты и платежи в одном месте.', price: 'работы от ' + F.rub(trackFrom) + '/м²', cta: 'Оставить заявку', img: 'assets/img/capsules/k3-main-1.jpg' },
    { href: 'track.html#tr-stages', name: 'Финиш', lead: 'Ключи от квартиры', text: 'Сдача по акту, гарантия на работы, мебель и свет расставлены по проекту.', price: '', cta: 'Как проходит сдача', img: 'assets/img/capsules/k6-main-2.jpg', final: true }
  ];
  document.getElementById('svc-list').innerHTML = LIST.map(function (x, i) {
    return '<div class="svc-step' + (x.final ? ' svc-step--final' : '') + '" style="--n:' + (i + 1) + '"><a class="svc" href="' + x.href + '"><img src="' + x.img + '" alt="" loading="lazy"><span class="svc__body"><span class="svc__name">' + esc(x.name) + '</span><span class="h3">' + esc(x.lead) + '</span><span class="text">' + esc(x.text) + '</span><span class="svc__foot"><b>' + esc(x.price) + '</b><span class="btn btn--dark btn--sm">' + esc(x.cta) + '</span></span></span></a></div>';
  }).join('');
})();

/* приписка сверху: номер телефона → заявка «перезвоните» */
(function () {
  var S = window.SOVE, f = document.getElementById('callme'); if (!f) return;
  var inp = document.getElementById('callme-phone'), err = document.getElementById('callme-err');
  if (S.auth.isIn()) inp.value = S.fmt.phone ? '' : '';
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = inp.value.replace(/\D/g, ''); if (d.length === 10) d = '7' + d; if (d.charAt(0) === '8' && d.length === 11) d = '7' + d.slice(1);
    if (d.length !== 11) { err.hidden = false; err.textContent = 'Введите номер полностью, например +7 900 000-00-00.'; inp.focus(); return; }
    err.hidden = true;
    var lead = S.leads.add({ product: 'services', phone: '+' + d, note: 'просьба связаться, страница услуг' });
    f.innerHTML = '<p class="callme__done">Спасибо, свяжемся с вами в рабочее время. Заявка ' + S.fmt.esc(lead.id.slice(-6).toUpperCase()) + ' — в профиле.</p>';
    S.ui.toast('Заявка принята', 'ok');
  });
})();
