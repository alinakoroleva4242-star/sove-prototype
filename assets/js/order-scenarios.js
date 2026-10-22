/* SOVEAPP — прототип. Сценарии заказа по типам поставщиков и пул услуг продвижения.
   Источник истины — services/api/order_scenarios.json и promotion_services.json в репозитории sove-platform;
   этот файл — их копия для прототипа (сгенерирован tools/gen_scenarios.py). Страницы НЕ меняют этот файл. */
window.SOVE_SCENARIOS = {
 "version": 2,
 "default": "stock",
 "single_flow": false,
 "single_flow_note": "16.10.2026 Валерия просила один путь для всех (true); 19.10.2026 Алина попросила вернуть три типа по своему PDF. true — снова один путь по умолчанию, типы остаются в данных.",
 "payment_integrated": false,
 "universal": {
  "cancel_by_buyer_before": "paid",
  "cancel_by_supplier_before": "shipped",
  "auto_receive_days": 7
 },
 "scenarios": {
  "stock": {
   "label": "Ретейл",
   "short": "Ретейл",
   "type_label": "Тип 1 · Ретейл",
   "description": "Сантехника, свет, электрика, готовая мебель, декор и техника: продаётся по артикулу без замера и расчёта расхода. Выбрать → подтверждение наличия → оплата → доставка → получение.",
   "categories": [
    "свет",
    "люстр",
    "бра",
    "светильник",
    "торшер",
    "сантех",
    "смесител",
    "унитаз",
    "раковин",
    "ванн",
    "душ",
    "инсталляц",
    "полотенцесуш",
    "розетк",
    "выключател",
    "терморегул",
    "диван",
    "кресл",
    "стул",
    "стол",
    "кроват",
    "матрас",
    "комод",
    "тумб",
    "полк",
    "готов",
    "декор",
    "текстил",
    "штор",
    "ковр",
    "зеркал",
    "посуд",
    "аксессуар",
    "техник"
   ],
   "buyer_fields": [],
   "card_fields": [
    "Наличие и остаток",
    "Вариант и количество",
    "Срок отгрузки",
    "Гарантия"
   ],
   "delivery": [
    "Доставка до квартиры",
    "Самовывоз"
   ],
   "payment": {
    "prepayment_pct": 100,
    "balance_at": null,
    "payout_event": "received",
    "note": "Оплата 100 % после подтверждения наличия. Выплата поставщику после «Получен» по условиям оферты."
   },
   "steps": [
    {
     "status": "pending_confirmation",
     "label": "Ожидает подтверждения",
     "actor": "system",
     "buyer": "Поставщик подтверждает наличие, цену и срок",
     "supplier": "Подтвердите наличие, цену и срок"
    },
    {
     "status": "confirmed",
     "label": "Подтверждён",
     "actor": "supplier",
     "action": "Подтвердить",
     "buyer": "Наличие и цена подтверждены",
     "supplier": "Наличие, цена и срок подтверждены"
    },
    {
     "status": "paid",
     "label": "Оплачен",
     "actor": "system",
     "buyer": "Оплата принята",
     "supplier": "Оплата принята: часть поставщика и комиссия SOVEAPP учтены"
    },
    {
     "status": "assembling",
     "label": "Собирается",
     "actor": "supplier",
     "action": "Собирается",
     "buyer": "Поставщик собирает заказ",
     "supplier": "Заказ собирается"
    },
    {
     "status": "shipped",
     "label": "Передан в доставку",
     "actor": "supplier",
     "action": "Передать в доставку",
     "fields": [
      "deliveryMethod",
      "carrier",
      "tracking",
      "eta"
     ],
     "buyer": "Дата, перевозчик и трек-номер",
     "supplier": "Укажите дату, перевозчика и трек-номер"
    },
    {
     "status": "in_transit",
     "label": "В пути",
     "actor": "supplier",
     "action": "В пути",
     "optional": true,
     "buyer": "Заказ в пути",
     "supplier": "Заказ в пути"
    },
    {
     "status": "delivered",
     "label": "Доставлен",
     "actor": "supplier",
     "action": "Доставлен",
     "returnable": true,
     "buyer": "Нажмите «Получил» или «Вернуть»",
     "supplier": "Ждём подтверждения покупателя"
    },
    {
     "status": "received",
     "label": "Получен",
     "actor": "buyer",
     "action": "Получил",
     "returnable": true,
     "buyer": "Заказ закрыт",
     "supplier": "Заказ закрыт, выплата по условиям оферты"
    }
   ]
  },
  "materials": {
   "label": "Материал с расчётом",
   "short": "С расчётом",
   "type_label": "Тип 2 · Materials",
   "description": "Плитка и керамогранит, краска и штукатурка, обои, паркет и ламинат, смеси и гипсокартон, панели, тёплый пол: нужно посчитать потребность, запас, кратность упаковки и партию. Заявка с площадью → расчёт и КП поставщика → принятие → оплата → комплектация → доставка.",
   "categories": [
    "плитк",
    "керамогран",
    "мозаик",
    "клинкер",
    "краск",
    "штукатур",
    "грунт",
    "шпакл",
    "затирк",
    "клей",
    "смес",
    "гипсокартон",
    "обои",
    "паркет",
    "ламинат",
    "кварцвинил",
    "инженерн",
    "пробк",
    "ковролин",
    "линолеум",
    "напольн",
    "плинтус",
    "молдинг",
    "карниз",
    "панел",
    "потол",
    "тепл",
    "тёпл",
    "радиатор",
    "расчёт",
    "расчет",
    "м²"
   ],
   "buyer_fields": [
    "area",
    "request"
   ],
   "card_fields": [
    "Площадь коробки / расход",
    "Партия, тон, калибр",
    "Кратность упаковки",
    "Срок отгрузки"
   ],
   "delivery": [
    "Доставка до квартиры",
    "Самовывоз"
   ],
   "payment": {
    "prepayment_pct": 100,
    "balance_at": null,
    "payout_event": "received",
    "note": "Оплата 100 % после принятия расчёта. Выплата поставщику после «Получен» по условиям оферты."
   },
   "steps": [
    {
     "status": "pending_confirmation",
     "label": "Заявка на расчёт",
     "actor": "system",
     "buyer": "Поставщик считает количество, упаковки, партию, цену и срок",
     "supplier": "Рассчитайте заявку: количество, упаковки, партия, цена и срок"
    },
    {
     "status": "spec_sent",
     "label": "Расчёт и КП",
     "actor": "supplier",
     "action": "Рассчитать заявку",
     "fields": [
      "quantity",
      "packs",
      "batch",
      "finalPrice",
      "eta",
      "specNote"
     ],
     "buyer": "Проверьте расчёт и примите условия",
     "supplier": "Ждём, пока покупатель примет расчёт"
    },
    {
     "status": "spec_accepted",
     "label": "Расчёт принят",
     "actor": "buyer",
     "action": "Принять расчёт",
     "buyer": "Количество и цена зафиксированы",
     "supplier": "Покупатель принял расчёт — комплектуйте заказ"
    },
    {
     "status": "paid",
     "label": "Оплачен",
     "actor": "system",
     "buyer": "Оплата принята",
     "supplier": "Оплата принята: часть поставщика и комиссия SOVEAPP учтены"
    },
    {
     "status": "assembling",
     "label": "Комплектуется",
     "actor": "supplier",
     "action": "Комплектуется",
     "buyer": "Поставщик комплектует партию",
     "supplier": "Партия комплектуется"
    },
    {
     "status": "shipped",
     "label": "Передан в доставку",
     "actor": "supplier",
     "action": "Передать в доставку",
     "fields": [
      "deliveryMethod",
      "carrier",
      "tracking",
      "eta"
     ],
     "buyer": "Дата, перевозчик и трек-номер",
     "supplier": "Укажите дату, перевозчика и трек-номер"
    },
    {
     "status": "in_transit",
     "label": "В пути",
     "actor": "supplier",
     "action": "В пути",
     "optional": true,
     "buyer": "Заказ в пути",
     "supplier": "Заказ в пути"
    },
    {
     "status": "delivered",
     "label": "Доставлен",
     "actor": "supplier",
     "action": "Доставлен",
     "returnable": true,
     "buyer": "Проверьте партию и тон: «Получил» или «Вернуть»",
     "supplier": "Ждём подтверждения покупателя"
    },
    {
     "status": "received",
     "label": "Получен",
     "actor": "buyer",
     "action": "Получил",
     "returnable": true,
     "buyer": "Заказ закрыт",
     "supplier": "Заказ закрыт, выплата по условиям оферты"
    }
   ]
  },
  "custom": {
   "label": "Изделие на заказ",
   "short": "На заказ",
   "type_label": "Тип 3 · Custom",
   "description": "Кухни, встроенные шкафы и гардеробные, столярка и нестандартные двери, мебель по индивидуальным размерам, столешницы и камень, перегородки, стекло, лестницы: конфигурация и цена определяются по замеру, проекту и спецификации. Заявка → замер (если нужен) → КП → утверждение → предоплата → производство → доставка → монтаж и приёмка.",
   "categories": [
    "кухн",
    "гардероб",
    "шкаф",
    "встроен",
    "корпусн",
    "столяр",
    "столешниц",
    "камн",
    "мрамор",
    "двер",
    "перегород",
    "портал",
    "погонаж",
    "наличник",
    "лестниц",
    "стекл",
    "на заказ",
    "под заказ",
    "индивидуальн",
    "по размер",
    "изготов",
    "проект"
   ],
   "buyer_fields": [
    "sizes",
    "budget",
    "request"
   ],
   "card_fields": [
    "Конфигурация и модули",
    "Материалы, фасады, фурнитура",
    "Срок изготовления",
    "Замер и монтаж"
   ],
   "delivery": [
    "Доставка и монтаж",
    "Доставка до квартиры",
    "Самовывоз"
   ],
   "payment": {
    "prepayment_pct": 50,
    "balance_at": "installed",
    "payout_event": "received",
    "note": "Предоплата после утверждения КП, остаток после монтажа и приёмки. Доли и этапы — по договору с поставщиком; этапные выплаты — только при подтверждённой поддержке банка."
   },
   "steps": [
    {
     "status": "pending_confirmation",
     "label": "Заявка на проект",
     "actor": "system",
     "buyer": "Поставщик принимает заявку и уточняет детали",
     "supplier": "Примите заявку; замер назначьте, если он нужен"
    },
    {
     "status": "confirmed",
     "label": "Заявка принята",
     "actor": "supplier",
     "action": "Принять заявку",
     "buyer": "Заявка принята: дальше замер или сразу КП",
     "supplier": "Назначьте замер или отправьте КП"
    },
    {
     "status": "measurement_scheduled",
     "label": "Замер назначен",
     "actor": "supplier",
     "action": "Назначить замер",
     "optional": true,
     "fields": [
      "measurementDate"
     ],
     "buyer": "Замерщик приедет в назначенную дату",
     "supplier": "После замера отправьте КП и спецификацию"
    },
    {
     "status": "spec_sent",
     "label": "КП и спецификация",
     "actor": "supplier",
     "action": "Отправить КП",
     "fields": [
      "specNote",
      "finalPrice",
      "eta"
     ],
     "buyer": "Проверьте КП: состав, цену и срок",
     "supplier": "Ждём, пока покупатель утвердит КП"
    },
    {
     "status": "spec_accepted",
     "label": "КП утверждено",
     "actor": "buyer",
     "action": "Утвердить КП",
     "buyer": "Конфигурация, цена и срок зафиксированы",
     "supplier": "Покупатель утвердил КП, ждём предоплату"
    },
    {
     "status": "paid",
     "label": "Предоплата",
     "actor": "system",
     "buyer": "Предоплата принята",
     "supplier": "Предоплата принята"
    },
    {
     "status": "in_production",
     "label": "Изготовление",
     "actor": "supplier",
     "action": "В производство",
     "fields": [
      "eta",
      "note"
     ],
     "buyer": "Изделие в производстве",
     "supplier": "Отмечайте этапы в заметке: материалы, изготовление, проверка"
    },
    {
     "status": "shipped",
     "label": "Передан в доставку",
     "actor": "supplier",
     "action": "Передать в доставку",
     "fields": [
      "deliveryMethod",
      "carrier",
      "tracking",
      "eta"
     ],
     "buyer": "Дата доставки и монтажа",
     "supplier": "Укажите дату доставки и монтажа"
    },
    {
     "status": "delivered",
     "label": "Доставлен",
     "actor": "supplier",
     "action": "Доставлен",
     "buyer": "Изделие доставлено: примите его или дождитесь монтажа",
     "supplier": "Изделие доставлено; смонтируйте или ждите приёмки"
    },
    {
     "status": "installed",
     "label": "Смонтирован",
     "actor": "supplier",
     "action": "Смонтировано",
     "optional": true,
     "returnable": true,
     "buyer": "Примите работу: «Принял» или «Вернуть»",
     "supplier": "Ждём приёмки покупателя"
    },
    {
     "status": "received",
     "label": "Принят",
     "actor": "buyer",
     "action": "Принял",
     "returnable": true,
     "buyer": "Работа принята, остаток к оплате",
     "supplier": "Приёмка подписана, остаток и выплата по договору"
    }
   ],
   "production_stages": [
    "Материалы",
    "Изготовление",
    "Проверка"
   ]
  }
 },
 "field_labels": {
  "area": "Площадь или объём",
  "sizes": "Размеры и параметры",
  "request": "Пожелания к заказу",
  "quantity": "Количество по расчёту",
  "packs": "Упаковок",
  "batch": "Партия и тон",
  "deliveryMethod": "Способ доставки",
  "carrier": "Перевозчик",
  "tracking": "Трек-номер",
  "eta": "Срок",
  "measurementDate": "Дата замера",
  "specNote": "КП и спецификация",
  "finalPrice": "Итоговая цена, ₽",
  "note": "Заметка",
  "stage": "Этап производства",
  "budget": "Бюджет клиента",
  "specItems": "Смета"
 },
 "default_commission_pct": 10
};
window.SOVE_PROMOTION = {
 "services": [
  {
   "key": "product_promo",
   "title": "Продвижение товара",
   "where": "Топ категории и поиска, блок акционных товаров в ленте и в «Мой ремонт», метка «Реклама»",
   "term": "7 / 14 / 30 дней",
   "price": null,
   "price_note": "не утверждена",
   "channel": "app"
  },
  {
   "key": "banner",
   "title": "Баннер",
   "where": "Главная, категории, лента и первый экран «Мой ремонт»",
   "term": "неделя",
   "price": null,
   "price_note": "не утверждена",
   "channel": "app"
  },
  {
   "key": "promo_announce",
   "title": "Анонс новой акции",
   "where": "Канал METOD ремонта",
   "term": "разово",
   "price": null,
   "price_note": "не утверждена",
   "channel": "channel"
  },
  {
   "key": "digest_slot",
   "title": "Место в подборке",
   "where": "Канал METOD ремонта",
   "term": "разово",
   "price": 5000,
   "price_note": "пакет 3 за 3 месяца — 12 000 ₽",
   "channel": "channel"
  },
  {
   "key": "post_exclusive",
   "title": "Пост — эксклюзив",
   "where": "Канал METOD ремонта",
   "term": "разово",
   "price": 0,
   "price_note": "0 ₽",
   "channel": "channel"
  },
  {
   "key": "post_regular",
   "title": "Пост — неэксклюзив",
   "where": "Канал METOD ремонта",
   "term": "разово",
   "price": 15000,
   "price_note": "первый при подключении 0 ₽; пакет 3 за 3 месяца — 40 000 ₽",
   "channel": "channel"
  },
  {
   "key": "capsule_request",
   "title": "Заявка на размещение в капсуле",
   "where": "Капсулы SOVEAPP",
   "term": "—",
   "price": null,
   "price_note": "решает дизайнер SOVEAPP, ни к чему не обязывает",
   "channel": "capsule"
  }
 ],
 "rules": {
  "channel_min_interval_days": 30,
  "package_months": 3,
  "package_count": 3
 }
};
