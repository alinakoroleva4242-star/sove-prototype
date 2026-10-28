/* Вход и регистрация: телефон → код из SMS → вход → возврат на returnTo.
   В прототипе SMS не отправляется: подойдёт любой код, кроме 0000. */
(function () {
  var S = window.SOVE, D = S.data;
  var CODE_LEN = 4, MAX_TRIES = 3, RESEND_SEC = 59, LOCK_SEC = 60;
  var LOCK_KEY = 'sove.auth.lockUntil';

  /* ---------- куда вернуть после входа ---------- */
  function safeReturn(raw) {
    var fallback = 'account.html';
    if (!raw || typeof raw !== 'string') return fallback;
    if (raw.indexOf('//') >= 0 || raw.indexOf(':') >= 0 || raw.indexOf('\\') >= 0) return fallback;
    if (!/^[a-z0-9][a-z0-9_-]*\.html(\?[^#\s]*)?(#[\w-]*)?$/i.test(raw)) return fallback;
    if (/^auth\.html/i.test(raw)) return fallback;
    return raw;
  }
  var returnTo = safeReturn(S.ui.qs('returnTo'));

  /* уже вошёл — формы не показываем */
  if (S.auth.isIn()) { location.replace(returnTo); return; }

  function $(id) { return document.getElementById(id); }
  var title = $('auth-title'), eyebrow = $('auth-eyebrow'), lead = $('auth-lead');
  var stepPhone = $('step-phone'), stepCode = $('step-code'), stepDone = $('step-done');
  var phone = $('phone'), phoneField = $('phone-field'), phoneError = $('phone-error');
  var agree = $('agree'), sendBtn = $('send-code'), sendHint = $('send-hint');
  var sentTo = $('sent-to'), changeBtn = $('change-phone');
  var codeField = $('code-field'), codeError = $('code-error'), signBtn = $('sign-in');
  var resendTimer = $('resend-timer'), resendBtn = $('resend');
  var digits = Array.prototype.slice.call(document.querySelectorAll('.auth__digit'));
  var ways = Array.prototype.slice.call(document.querySelectorAll('.auth__way'));
  var stepTg = $('step-tg'), stepTgWait = $('step-tg-wait'), stepMail = $('step-mail');
  var tgAgree = $('agree-tg'), tgGo = $('tg-go');
  var mail = $('mail'), mailField = $('mail-field'), mailError = $('mail-error');
  var mailAgree = $('agree-mail'), mailGo = $('mail-go');
  var way = 'phone';          /* выбранный способ входа */
  var channel = 'phone';      /* чем подтверждаем код: 'phone' или 'email' */

  /* ---------- подпись на фото и подарок ---------- */
  if (S.draft.get('ai') || S.draft.get('scout')) S.ui.toast('Сохранено. После входа продолжите с того же места', 'ok');
  /* подарок — спокойная строка, а не рекламный баннер: человек здесь входит, а не покупает */
  $('gift-note').innerHTML =
    '<span class="auth__gift-ic" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">' +
      '<rect x="3.2" y="9.4" width="17.6" height="10.4" rx="1.6"/><path d="M3.2 13.4h17.6M12 9.4V19.8"/>' +
      '<path d="M12 9.4C10.4 6.6 8.8 5.4 7.4 5.4a2 2 0 0 0 0 4h4.6zM12 9.4c1.6-2.8 3.2-4 4.6-4a2 2 0 0 1 0 4H12z"/></svg></span>' +
    '<span class="auth__gift-t"><b>' + D.gift.tokens + '\u00a0токенов в подарок</b>' +
      '<i>новым пользователям на SOVEAPP\u00a0AI, ' + D.gift.days + '\u00a0дней</i></span>';

  $('done-link').href = returnTo;

  /* ---------- маска телефона +7 (___) ___-__-__ ---------- */
  function phoneDigits(value) {
    var d = String(value || '').replace(/\D/g, '');
    if (d.charAt(0) === '7' || d.charAt(0) === '8') d = d.slice(1);
    if (d.length > 10 && (d.charAt(0) === '7' || d.charAt(0) === '8')) d = d.slice(1);
    return d.slice(0, 10);
  }
  function phoneFormat(d) {
    var out = '+7 (' + d.slice(0, 3);
    if (d.length > 3) out += ') ' + d.slice(3, 6);
    if (d.length > 6) out += '-' + d.slice(6, 8);
    if (d.length > 8) out += '-' + d.slice(8, 10);
    return out;
  }
  function applyMask(input) {
    var raw = input.value, caret = input.selectionStart == null ? raw.length : input.selectionStart;
    var atEnd = caret >= raw.length;
    var before = phoneDigits(raw.slice(0, caret)).length;
    var d = phoneDigits(raw);
    input.value = phoneFormat(d);
    if (!atEnd && document.activeElement === input) {
      var pos = 4, seen = 0;
      while (seen < before && pos < input.value.length) { if (/\d/.test(input.value.charAt(pos))) seen++; pos++; }
      try { input.setSelectionRange(pos, pos); } catch (e) {}
    }
    return d;
  }
  function phoneOk() { return phoneDigits(phone.value).length === 10; }

  function setFieldError(field, box, text) {
    field.classList.toggle('is-error', !!text);
    box.hidden = !text; box.textContent = text || '';
    if (box === phoneError) $('phone-hint').hidden = !!text;
  }
  function syncSend() {
    var ready = phoneOk() && agree.checked;
    sendBtn.disabled = !ready;
    sendHint.hidden = ready;
  }

  phone.addEventListener('focus', function () { if (!phone.value) phone.value = '+7 ('; });
  phone.addEventListener('input', function () { applyMask(phone); if (phoneOk()) setFieldError(phoneField, phoneError, ''); syncSend(); });
  phone.addEventListener('blur', function () {
    var n = phoneDigits(phone.value).length;
    if (!n) { phone.value = ''; setFieldError(phoneField, phoneError, ''); }
    else if (n < 10) setFieldError(phoneField, phoneError, 'Номер неполный: нужно 10 цифр после +7');
    syncSend();
  });
  agree.addEventListener('change', syncSend);

  /* ---------- шаги ---------- */
  var fullPhone = '', fullMail = '', fullTg = '';
  function showStep(name) {
    stepPhone.hidden = !(name === 'phone' && way === 'phone');
    stepTg.hidden = !(name === 'phone' && way === 'tg');
    stepMail.hidden = !(name === 'phone' && way === 'email');
    stepTgWait.hidden = name !== 'tgwait';
    stepCode.hidden = name !== 'code';
    stepDone.hidden = name !== 'done';
    document.querySelector('.auth__ways').hidden = name !== 'phone';
    if (name === 'phone') {
      if (way === 'tg') {
        eyebrow.textContent = 'Шаг 1 из 2 · Telegram';
        title.textContent = 'Вход через Telegram';
        lead.textContent = 'Подтвердите вход в чате с ботом SOVEAPP. Пароль и SMS не нужны.';
      } else if (way === 'email') {
        eyebrow.textContent = 'Шаг 1 из 2 · почта';
        title.textContent = 'Вход по почте';
        lead.textContent = 'Пришлём код на вашу почту. Временные ящики и псевдонимы не подойдут.';
      } else {
        eyebrow.textContent = 'Шаг 1 из 2 · номер телефона';
        title.textContent = 'Вход и регистрация';
        lead.textContent = 'Один номер — и для входа, и для регистрации. Пароль не нужен: пришлём код в SMS.';
      }
      lead.hidden = false;
      document.title = 'Вход и регистрация — SOVEAPP';
    } else if (name === 'tgwait') {
      eyebrow.textContent = 'Шаг 2 из 2 · подтверждение';
      title.textContent = 'Подтвердите вход в Telegram';
      lead.hidden = true;
      document.title = 'Подтвердите вход — SOVEAPP';
    } else if (name === 'code') {
      eyebrow.textContent = 'Шаг 2 из 2 · код';
      title.textContent = channel === 'email' ? 'Введите код из письма' : 'Введите код из SMS';
      lead.hidden = true;
      document.title = title.textContent + ' — SOVEAPP';
    } else {
      eyebrow.textContent = 'Готово';
      title.textContent = 'Вы вошли';
      lead.hidden = true;
    }
  }

  /* переключение способа входа */
  ways.forEach(function (b) {
    b.addEventListener('click', function () {
      way = b.getAttribute('data-way');
      ways.forEach(function (x) {
        var on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      showStep('phone');
    });
  });

  stepPhone.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!phoneOk()) { setFieldError(phoneField, phoneError, 'Номер неполный: нужно 10 цифр после +7'); phone.focus(); return; }
    if (!agree.checked) return;
    fullPhone = '+7' + phoneDigits(phone.value); channel = 'phone';
    sendBtn.classList.add('is-loading');
    setTimeout(function () {
      sendBtn.classList.remove('is-loading');
      sentTo.textContent = S.fmt.phone(fullPhone);
      showStep('code');
      tries = MAX_TRIES; clearCode(); setFieldError(codeField, codeError, '');
      startResend();
      if (!restoreLock()) digits[0].focus();
    }, 600);
  });

  changeBtn.addEventListener('click', function () {
    stopResend(); showStep('phone');
    if (channel === 'email') { mail.focus(); return; }
    phone.focus();
    try { phone.setSelectionRange(phone.value.length, phone.value.length); } catch (e) {}
  });

  /* ---------- поля кода ---------- */
  function codeValue() { return digits.map(function (i) { return i.value; }).join(''); }
  function clearCode() { digits.forEach(function (i) { i.value = ''; }); syncSign(); }
  function syncSign() { signBtn.disabled = locked() || codeValue().length !== CODE_LEN; }
  function fill(from, str) {
    var chars = str.replace(/\D/g, '').split('');
    if (!chars.length) return from;
    var i = from;
    chars.forEach(function (ch) { if (i < CODE_LEN) { digits[i].value = ch; i++; } });
    return Math.min(i, CODE_LEN - 1);
  }
  digits.forEach(function (input, idx) {
    input.addEventListener('input', function () {
      var v = input.value.replace(/\D/g, '');
      input.value = '';
      if (!v) { syncSign(); return; }
      var next;
      /* автоподстановка из SMS и вставка кладут весь код в одно поле */
      if (v.length > 1) next = fill(v.length >= CODE_LEN ? 0 : idx, v);
      else { input.value = v; next = Math.min(idx + 1, CODE_LEN - 1); }
      if (codeError.textContent && !locked()) setFieldError(codeField, codeError, '');
      syncSign();
      if (next !== idx) digits[next].focus();
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !input.value && idx > 0) { e.preventDefault(); digits[idx - 1].value = ''; digits[idx - 1].focus(); syncSign(); }
      else if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); digits[idx - 1].focus(); }
      else if (e.key === 'ArrowRight' && idx < CODE_LEN - 1) { e.preventDefault(); digits[idx + 1].focus(); }
    });
    input.addEventListener('paste', function (e) {
      var text = (e.clipboardData || window.clipboardData).getData('text') || '';
      e.preventDefault();
      var clean = text.replace(/\D/g, '');
      if (!clean) return;
      var next = fill(clean.length >= CODE_LEN ? 0 : idx, clean);
      if (codeError.textContent && !locked()) setFieldError(codeField, codeError, '');
      syncSign();
      digits[next].focus();
    });
    input.addEventListener('focus', function () { try { input.select(); } catch (e) {} });
  });

  /* ---------- повторная отправка ---------- */
  var resendId = null, resendEnd = 0;
  function mmss(sec) { sec = Math.max(0, sec); return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2); }
  function stopResend() { if (resendId) { clearInterval(resendId); resendId = null; } }
  function tickResend() {
    var left = Math.ceil((resendEnd - Date.now()) / 1000);
    if (left > 0) { resendTimer.hidden = false; resendBtn.hidden = true; resendTimer.textContent = 'Отправить ещё раз через ' + mmss(left); }
    else { stopResend(); resendTimer.hidden = true; resendBtn.hidden = false; resendBtn.disabled = locked(); }
  }
  function startResend() { stopResend(); resendEnd = Date.now() + RESEND_SEC * 1000; tickResend(); resendId = setInterval(tickResend, 250); }
  resendBtn.addEventListener('click', function () {
    if (locked()) return;
    tries = MAX_TRIES; clearCode(); setFieldError(codeField, codeError, '');
    startResend(); digits[0].focus();
    S.ui.toast('Отправили новый код на ' + S.fmt.phone(fullPhone));
  });

  /* ---------- попытки и блокировка ---------- */
  var tries = MAX_TRIES, lockUntil = 0, lockId = null;
  function locked() { return lockUntil > Date.now(); }
  function tickLock() {
    var left = Math.ceil((lockUntil - Date.now()) / 1000);
    if (left > 0) { setFieldError(codeField, codeError, 'Слишком много попыток. Попробуйте через ' + mmss(left)); return; }
    clearInterval(lockId); lockId = null; lockUntil = 0;
    try { sessionStorage.removeItem(LOCK_KEY); } catch (e) {}
    tries = MAX_TRIES;
    digits.forEach(function (i) { i.disabled = false; });
    resendBtn.disabled = false;
    setFieldError(codeField, codeError, '');
    clearCode();
    if (!stepCode.hidden) digits[0].focus();
  }
  function startLock(until) {
    lockUntil = until;
    try { sessionStorage.setItem(LOCK_KEY, String(until)); } catch (e) {}
    digits.forEach(function (i) { i.value = ''; i.disabled = true; });
    signBtn.disabled = true; resendBtn.disabled = true;
    if (lockId) clearInterval(lockId);
    tickLock(); lockId = setInterval(tickLock, 250);
  }
  /* блокировка переживает перезагрузку страницы */
  function restoreLock() {
    var until = 0;
    try { until = Number(sessionStorage.getItem(LOCK_KEY)) || 0; } catch (e) {}
    if (until > Date.now()) { startLock(until); return true; }
    return false;
  }

  /* ---------- вход ---------- */
  stepCode.addEventListener('submit', function (e) {
    e.preventDefault();
    if (locked() || signBtn.classList.contains('is-loading')) return;
    var code = codeValue();
    if (code.length !== CODE_LEN) { setFieldError(codeField, codeError, 'Введите все 4 цифры кода.'); return; }
    signBtn.classList.add('is-loading');
    setTimeout(function () {
      signBtn.classList.remove('is-loading');
      if (code === '0000') {
        tries -= 1;
        if (tries <= 0) { startLock(Date.now() + LOCK_SEC * 1000); return; }
        clearCode();
        setFieldError(codeField, codeError, 'Код неверный. Осталось попыток: ' + tries);
        digits[0].focus();
        return;
      }
      stopResend();
      var r = channel === 'email' ? S.auth.login(fullMail, 'email') : S.auth.login(fullPhone);
      showStep('done');
      title.focus();
      if (r.gifted) {
        $('done-text').textContent = 'Дарим ' + S.fmt.tokens(D.gift.tokens) + ' на генерации — действуют ' + D.gift.days + ' дней. Возвращаем вас туда, где вы остановились.';
        S.ui.toast('Дарим ' + S.fmt.tokens(D.gift.tokens) + ' на генерации, действуют ' + D.gift.days + ' дней', 'ok');
      }
      setTimeout(function () { location.href = returnTo; }, r.gifted ? 1200 : 500);
    }, 700);
  });


  /* ---------- вход через Telegram ----------
     Ник не спрашиваем: у многих он закрыт или его нет. В боевой версии здесь
     Telegram Login Widget — он сам отдаёт id, имя и фото с подписью, которую
     проверяет сервер. В прототипе заменяем это id, привязанным к устройству,
     чтобы повторный вход узнавал того же человека. */
  var TG_BOT = 'Sovegroup_bot';   /* имя бота: поменять здесь, когда команда назовёт боевой */
  var TGKEY = 'sove.proto.tgId';
  function tgId() {
    var id = '';
    try { id = localStorage.getItem(TGKEY) || ''; } catch (e) {}
    if (!id) {
      id = 'tg-' + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem(TGKEY, id); } catch (e2) {}
    }
    return id;
  }
  function tgLink() { return 'https://t.me/' + TG_BOT + '?start=login_' + encodeURIComponent(tgId()); }
  function syncTg() {
    var ok = tgAgree.checked;
    tgGo.classList.toggle('is-off', !ok);
    tgGo.setAttribute('aria-disabled', ok ? 'false' : 'true');
    tgGo.href = ok ? tgLink() : '#';
  }
  tgAgree.addEventListener('change', syncTg);

  /* Ссылка, а не кнопка: на телефоне Telegram открывается сразу по нажатию,
     без всплывающего окна, которое браузер может заблокировать. */
  tgGo.addEventListener('click', function (e) {
    if (!tgAgree.checked) {
      e.preventDefault();
      tgAgree.focus();
      S.ui.toast('Отметьте согласие, чтобы продолжить', 'warn');
      return;
    }
    fullTg = tgId();
    $('tg-open').href = tgLink();
    setTimeout(function () { showStep('tgwait'); title.focus(); }, 300);
  });
  $('tg-back').addEventListener('click', function () { showStep('phone'); });
  $('tg-confirm').addEventListener('click', function () {
    var btn = $('tg-confirm');
    if (btn.classList.contains('is-loading')) return;
    btn.classList.add('is-loading');
    setTimeout(function () {
      btn.classList.remove('is-loading');
      finish(S.auth.login(fullTg, 'tg'));
    }, 700);
  });

  /* ---------- вход по почте ----------
     Защита от псевдонимов: временные ящики не пускаем совсем, «плюс-метку»
     и точки Gmail считаем тем же человеком — иначе один ящик даёт бесконечные
     регистрации и бесконечные подарочные токены. */
  var THROWAWAY = [
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', '10minutemail.com', '10minutemail.net',
    'tempmail.com', 'temp-mail.org', 'temp-mail.ru', 'tempmailo.com', 'throwawaymail.com',
    'yopmail.com', 'getnada.com', 'dropmail.me', 'maildrop.cc', 'fakeinbox.com', 'trashmail.com',
    'sharklasers.com', 'spam4.me', 'mohmal.com', 'mytemp.email', 'emailondeck.com', 'tempail.com',
    'inboxkitten.com', 'moakt.com', 'luxusmail.org', 'vmani.com', 'disposablemail.com', 'tmpmail.org',
    'mail.tm', 'tempr.email', 'minuteinbox.com', 'burnermail.io', 'anonbox.net', 'spambog.com'
  ];
  function mailParts() {
    var v = mail.value.trim().toLowerCase();
    var at = v.lastIndexOf('@');
    return { full: v, name: at > 0 ? v.slice(0, at) : '', domain: at > 0 ? v.slice(at + 1) : '' };
  }
  function mailProblem() {
    var m = mailParts();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(m.full)) return 'Проверьте адрес: нужен вид имя@домен.ру';
    if (THROWAWAY.indexOf(m.domain) >= 0) return 'Временная почта не подойдёт — укажите постоянный ящик.';
    if (m.name.indexOf('+') >= 0) return 'Псевдоним с «+» не подойдёт — введите основной адрес без метки.';
    if (/^(test|noreply|no-reply)$/.test(m.name)) return 'Служебный адрес не подойдёт — укажите личную почту.';
    return '';
  }
  function syncMail() { mailGo.disabled = !!mailProblem() || !mailAgree.checked; }
  mail.addEventListener('input', function () {
    if (!mailProblem()) setFieldError(mailField, mailError, '');
    syncMail();
  });
  mail.addEventListener('blur', function () {
    var problem = mail.value.trim() ? mailProblem() : '';
    setFieldError(mailField, mailError, problem);
  });
  mailAgree.addEventListener('change', syncMail);
  stepMail.addEventListener('submit', function (e) {
    e.preventDefault();
    var problem = mailProblem();
    if (problem) { setFieldError(mailField, mailError, problem); mail.focus(); return; }
    if (!mailAgree.checked) return;
    fullMail = mailParts().full;
    channel = 'email';
    mailGo.classList.add('is-loading');
    setTimeout(function () {
      mailGo.classList.remove('is-loading');
      sentTo.textContent = fullMail;
      $('code-label').textContent = 'Код из письма';
      $('code-hint').textContent = 'Прототип: письмо не отправляется. Подойдёт любой код, кроме 0000';
      changeBtn.textContent = 'Изменить адрес';
      showStep('code');
      tries = MAX_TRIES; clearCode(); setFieldError(codeField, codeError, '');
      startResend();
      if (!restoreLock()) digits[0].focus();
    }, 600);
  });

  /* общий финал входа для всех способов */
  function finish(r) {
    stopResend();
    showStep('done');
    title.focus();
    if (r.gifted) {
      $('done-text').textContent = 'Дарим ' + S.fmt.tokens(D.gift.tokens) + ' на генерации — действуют ' + D.gift.days + ' дней. Возвращаем вас туда, где вы остановились.';
      S.ui.toast('Дарим ' + S.fmt.tokens(D.gift.tokens) + ' на генерации, действуют ' + D.gift.days + ' дней', 'ok');
    }
    setTimeout(function () { location.href = returnTo; }, r.gifted ? 1200 : 500);
  }

  showStep('phone');
  syncSend();
})();
