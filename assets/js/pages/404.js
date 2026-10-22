/* 404: три ссылки статичны. Вошедшему пользователю добавляем одну успокаивающую фразу со ссылкой в кабинет. */
(function () {
  var S = window.SOVE, lead = document.getElementById('nf-lead');
  if (!S || !lead || !S.auth.isIn()) return;
  lead.innerHTML = 'Возможно, ссылка устарела или в адресе опечатка. Ваши проекты и токены на месте — они <a class="link" href="account.html">в кабинете</a>.';
})();
