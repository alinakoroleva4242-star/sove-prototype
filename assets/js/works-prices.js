/* Расценки Scout для демо — снимок книги «Основная. Монтажные работы. Москва» (лист «Раб. черн.»)
   на 27.10.2026. Собирает tools/gen_works_prices.py — руками не править.
   q — откуда объём (считает assets/js/plan-volumes.js по плану), base/premium — для каких состояний
   работа есть: secondary — вторичка, pre — предчистовая (White Box), concrete — бетон, finish — с отделкой. */
window.SOVE_WORKS = {
 "source": "Scout · Основная. Монтажные работы. Москва",
 "date": "2026-10-27",
 "items": [
  {
   "row": 11,
   "work": "Демонтаж",
   "unit": "кв.м.",
   "price": 5000.0,
   "q": "area",
   "stage": "Демонтаж",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": false,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": false,
    "finish": false
   }
  },
  {
   "row": 12,
   "work": "Укрытие плёнкой окон и дверей",
   "unit": "шт.",
   "price": 3000.0,
   "q": "openings_n",
   "stage": "Демонтаж",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 13,
   "work": "Монтаж временная электрика",
   "unit": "компл.",
   "price": 10000.0,
   "q": "temp_el",
   "stage": "Демонтаж",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 14,
   "work": "Монтаж временной сантехники",
   "unit": "компл.",
   "price": 5000.0,
   "q": "one",
   "stage": "Демонтаж",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 15,
   "work": "Возведение перегородок из пеноблока до 10 см.",
   "unit": "кв.м.",
   "price": 2503.0,
   "q": "partitions_m2",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 16,
   "work": "Усиление стандартного проема металлоконструкциями",
   "unit": "м/п",
   "price": 3000.0,
   "q": "strengthen_m",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 17,
   "work": "Обеспыливание и грунтовка стен",
   "unit": "кв.м.",
   "price": 165.0,
   "q": "walls",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 18,
   "work": "Отштукатуривание стен под маяк",
   "unit": "кв.м.",
   "price": 1502.0,
   "q": "walls_dry",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 19,
   "work": "Отштукатуривание стен под маяк в санузле",
   "unit": "кв.м.",
   "price": 1878.0,
   "q": "walls_bath",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 20,
   "work": "Обеспыливание и грунтовка откосов",
   "unit": "м/п",
   "price": 165.0,
   "q": "slopes_m",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 21,
   "work": "Отштукатуривание отокосов",
   "unit": "м/п",
   "price": 1015.0,
   "q": "slopes_m",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 22,
   "work": "Гидроизоляция пола шуманет гидро-100",
   "unit": "кв.м.",
   "price": 1127.0,
   "q": "area",
   "stage": "Полы",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 23,
   "work": "Устройство стяжки по маякам до 12см",
   "unit": "кв.м.",
   "price": 2252.0,
   "q": "area",
   "stage": "Полы",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 24,
   "work": "Штробление гипсолитовых/ пеноблочных стен до 7 см",
   "unit": "м/п",
   "price": 1001.0,
   "q": "chasing_m",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 27,
   "work": "Разводка труб водоснабжения до 3-х метров (за 1 точку)",
   "unit": "шт.",
   "price": 6500.0,
   "q": "water_points",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 28,
   "work": "Разводка труб канализации",
   "unit": "компл.",
   "price": null,
   "q": "by_rooms",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "byRooms": {
    "1": 25000.0,
    "2": 30000.0,
    "3": 35000.0,
    "4": 45000.0
   }
  },
  {
   "row": 33,
   "work": "Сборка и монтаж системы \"инсталляции\"",
   "unit": "шт.",
   "price": 15642.0,
   "q": "baths",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 34,
   "work": "Установка сливного трапа",
   "unit": "шт.",
   "price": 4317.0,
   "q": "baths",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 35,
   "work": "Установка коллекторов (гребенка)",
   "unit": "шт.",
   "price": 6500.0,
   "q": "two",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 36,
   "work": "Установка шарового крана",
   "unit": "шт.",
   "price": 1314.25,
   "q": "two",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 37,
   "work": "Компенсатор от гидроудара",
   "unit": "шт.",
   "price": 2000.0,
   "q": "two",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 38,
   "work": "Установка регулятора давления",
   "unit": "шт.",
   "price": 1877.75,
   "q": "two",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 39,
   "work": "Установка фильтра грубой очистки",
   "unit": "шт.",
   "price": 1877.75,
   "q": "two",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 40,
   "work": "Установка фильтра тонкой очистки",
   "unit": "шт.",
   "price": 3379.25,
   "q": "two",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 41,
   "work": "Установка системы защиты от протечек воды",
   "unit": "компл.",
   "price": 15000.0,
   "q": "one",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 42,
   "work": "Замена радиаторов системы отопления",
   "unit": "шт.",
   "price": 20000.0,
   "q": "radiators",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 43,
   "work": "Затирка швоф эпоксидной затиркой",
   "unit": "кв.м.",
   "price": 2000.0,
   "q": "tiles_all",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 44,
   "work": "Монтаж распределительного электрощита",
   "unit": "компл.",
   "price": null,
   "q": "by_rooms",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "byRooms": {
    "1": 40000.0,
    "2": 45000.0,
    "3": 50000.0,
    "4": 60000.0
   }
  },
  {
   "row": 49,
   "work": "Установка слаботочного щита",
   "unit": "компл.",
   "price": 10000.0,
   "q": "one",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 50,
   "work": "Монтаж тепло / звукоизоляции стен (мин.вата,пенополистироловые плиты) 1 слой",
   "unit": "кв.м.",
   "price": 1127.0,
   "q": "insulation_m2",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 51,
   "work": "Монтаж трассы системы кондиционирования",
   "unit": "компл.",
   "price": null,
   "q": "by_rooms",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "byRooms": {
    "1": 20000.0,
    "2": 30000.0,
    "3": 40000.0,
    "4": 50000.0
   }
  },
  {
   "row": 56,
   "work": "Шпатлевка стен в 2 слоя с ошкуриванием",
   "unit": "кв.м.",
   "price": 1090.25,
   "q": "paint",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 57,
   "work": "Обеспыливание и грунтовка стен 2 этап",
   "unit": "кв.м.",
   "price": 165.0,
   "q": "paint",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 58,
   "work": "Поклейка стеклохолста на стены (паутинки)",
   "unit": "кв.м.",
   "price": 563.5,
   "q": "paint",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 59,
   "work": "Обеспыливание и грунтовка стен 3 этап",
   "unit": "кв.м.",
   "price": 165.0,
   "q": "paint",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 60,
   "work": "Шпаклевка финишная в 2 слоя с шлифованием",
   "unit": "кв.м.",
   "price": 1090.25,
   "q": "paint",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 62,
   "work": "Гидроизоляция ленточная и обмазночная",
   "unit": "кв.м.",
   "price": 813.75,
   "q": "waterproof_m2",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 63,
   "work": "Замазка штроб",
   "unit": "шт.",
   "price": 1300.0,
   "q": "chases_by_rooms",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "qtyByRooms": {
    "secondary": {
     "1": 30.0,
     "2": 40.0,
     "3": 50.0,
     "4": 60.0
    },
    "pre": {
     "1": null,
     "2": null,
     "3": null,
     "4": null
    },
    "concrete": {
     "1": 30.0,
     "2": 40.0,
     "3": 50.0,
     "4": 60.0
    },
    "finish": {
     "1": null,
     "2": null,
     "3": null,
     "4": null
    }
   }
  },
  {
   "row": 68,
   "work": "Вывоз мусора",
   "unit": "шт.",
   "price": 20000.0,
   "q": "debris_by_rooms",
   "stage": "Демонтаж",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "qtyByRooms": {
    "secondary": {
     "1": 5.0,
     "2": 5.0,
     "3": 5.0,
     "4": 5.0
    },
    "pre": {
     "1": 2.0,
     "2": 2.0,
     "3": 2.0,
     "4": 2.0
    },
    "concrete": {
     "1": 3.0,
     "2": 3.0,
     "3": 3.0,
     "4": 3.0
    },
    "finish": {
     "1": null,
     "2": null,
     "3": null,
     "4": null
    }
   }
  },
  {
   "row": 73,
   "work": "Обшивка ГКЛ инсталляции",
   "unit": "компл.",
   "price": 7000.0,
   "q": "baths",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 74,
   "work": "Обшифка ГКЛ",
   "unit": "кв.м.",
   "price": 5000.0,
   "q": "boxes_m2",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 75,
   "work": "Монтаж вентеляции из короба ПВХ",
   "unit": "компл.",
   "price": null,
   "q": "by_rooms",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "byRooms": {
    "1": 20000.0,
    "2": 30000.0,
    "3": 40000.0,
    "4": 50000.0
   }
  },
  {
   "row": 80,
   "work": "Обеспыливание и грунтовка стен этап 4",
   "unit": "кв.м.",
   "price": 165.0,
   "q": "paint",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 81,
   "work": "Покраска стен в 2 слоя (техническая и обычна краска)",
   "unit": "кв.м.",
   "price": 873.0,
   "q": "paint",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 82,
   "work": "Установка раковины",
   "unit": "шт.",
   "price": 5000.0,
   "q": "sinks",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 83,
   "work": "Установка смесителей / гигиенического душа",
   "unit": "шт.",
   "price": 2628.5,
   "q": "mixers",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 84,
   "work": "Установка душевой системы",
   "unit": "шт.",
   "price": 5500.0,
   "q": "showers",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 85,
   "work": "Установка чистовых разеток, выключателей и т.д.",
   "unit": "шт.",
   "price": 850.0,
   "q": "el_points",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 86,
   "work": "Монтаж электроточек комплект (точка)",
   "unit": "компл.",
   "price": 3000.0,
   "q": "el_points",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": false,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 88,
   "work": "Монтаж натяжного потолка",
   "unit": "кв.м.",
   "price": 4000.0,
   "q": "area",
   "stage": "Потолки",
   "base": {
    "secondary": false,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   }
  },
  {
   "row": 89,
   "work": "Монтаж прямолинейных потолков из ГКЛ в 2 уровня",
   "unit": "кв.м.",
   "price": 3700.0,
   "q": "area",
   "stage": "Потолки",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 90,
   "work": "Установка навесных зеркал в санузле",
   "unit": "шт.",
   "price": 2252.25,
   "q": "baths",
   "stage": "Финальная сдача",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 91,
   "work": "Облицовка стены керамогранитом 60*120",
   "unit": "кв.м.",
   "price": 6125.0,
   "q": "tiles_60",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 92,
   "work": "Облицовка стен керамогранитом 120*120",
   "unit": "кв.м.",
   "price": 8050.0,
   "q": "tiles_120",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 94,
   "work": "Запил края плитки под 45 гр.",
   "unit": "м/п",
   "price": 3003.0,
   "q": "cut45_m",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 95,
   "work": "Высверливание отверстий в керамограните",
   "unit": "шт.",
   "price": 876.75,
   "q": "drill_n",
   "stage": "Стены и перегородки",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 96,
   "work": "Установка точечного светильника (в натяжной потолок)",
   "unit": "шт.",
   "price": 866.35,
   "q": "spots",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   }
  },
  {
   "row": 97,
   "work": "Установка люстры на 1 - 3 лампы на монтажную планку",
   "unit": "шт.",
   "price": 1443.75,
   "q": "rooms",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 98,
   "work": "Установка настенных светильников, бра",
   "unit": "шт.",
   "price": 1117.0,
   "q": "bra",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 102,
   "work": "Установка дверей",
   "unit": "шт.",
   "price": 12000.0,
   "q": "doors_n",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 105,
   "work": "Установка точечного светильника (в ГКЛ потолок)",
   "unit": "шт.",
   "price": 866.35,
   "q": "spots",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 106,
   "work": "Установка двухстворчатых дверей",
   "unit": "шт.",
   "price": 22000.0,
   "q": "doors_double_n",
   "stage": "Электрика, свет, двери",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 108,
   "work": "Монтаж ламината ёлкой",
   "unit": "кв.м.",
   "price": 2500.0,
   "q": "floor_dry",
   "stage": "Полы",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   }
  },
  {
   "row": 112,
   "work": "Монтаж инженерная доска ёлкой",
   "unit": "кв.м.",
   "price": 3500.0,
   "q": "floor_dry",
   "stage": "Полы",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 114,
   "work": "Монтаж плинтуса из дюрополимера с покраской",
   "unit": "шт.",
   "price": 1200.0,
   "q": "plinth_pcs",
   "stage": "Полы",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 116,
   "work": "Укладка ветоши на напольное покрытие и оргалита",
   "unit": "шт.",
   "price": 9000.0,
   "q": "one",
   "stage": "Финальная сдача",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 117,
   "work": "Установка и подключение стиральной машины",
   "unit": "шт.",
   "price": 4630.5,
   "q": "one",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 118,
   "work": "Установка унитаза, без сборки",
   "unit": "шт.",
   "price": 5131.0,
   "q": "baths",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 119,
   "work": "Установка полотенцесушителя эектрический",
   "unit": "шт.",
   "price": 5000.0,
   "q": "baths",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": true
   }
  },
  {
   "row": 120,
   "work": "Установка ванны",
   "unit": "шт.",
   "price": 11261.25,
   "q": "bathtub",
   "stage": "Водоснабжение и канализация",
   "base": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   },
   "premium": {
    "secondary": true,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 121,
   "work": "Шпатлевка потолка в 2 слоя и грунтовка",
   "unit": "кв.м.",
   "price": 2510.0,
   "q": "area",
   "stage": "Потолки",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  },
  {
   "row": 122,
   "work": "Покраска потолка в 2 слоя",
   "unit": "кв.м.",
   "price": 873.0,
   "q": "area",
   "stage": "Потолки",
   "base": {
    "secondary": false,
    "pre": false,
    "concrete": false,
    "finish": false
   },
   "premium": {
    "secondary": false,
    "pre": true,
    "concrete": true,
    "finish": false
   }
  }
 ]
};
