window.TOPIC_LAYOUT = {
  example: true,
  styles: [
    { id: 'reserved', title: 'Сдержанный', description: 'Спокойные просьбы, вежливая дистанция, минимум личных деталей.', lexical: 'B1', grammar: 'B1', sec: 110, words: 72 },
    { id: 'casual', title: 'Непринуждённый', description: 'Короткие ответы, разговорные обороты, небольшие личные реакции.', lexical: 'B1', grammar: 'A2', sec: 95, words: 64 },
    { id: 'business', title: 'Деловой', description: 'Конкретные вопросы, уточнение времени и быстрый переход к решению.', lexical: 'A2', grammar: 'A2', sec: 80, words: 58 }
  ],
  themes: [
    { id: 'hotel', title: 'В отеле', cover: 'app-media/topics/hotel.png', topics: [
      { id: 'room-not-ready', title: 'Номер не готов', description: 'Нужно уточнить время заселения и оставить багаж.' },
      { id: 'room-problems', title: 'Проблемы в номере', description: 'Нужно сообщить о проблеме и договориться о её решении.' },
      { id: 'extra-charge', title: 'Лишнее в счёте', description: 'Нужно уточнить, за что начислена сумма, и проверить счёт.' }
    ] },
    { id: 'cafe', title: 'Кафе и рестораны', cover: 'app-media/topics/cafe.png', topics: [
      { id: 'cafe-order', title: 'Заказ в кафе', description: 'Нужно выбрать напиток и еду и сделать заказ.' }
    ] },
    { id: 'airport', title: 'В аэропорту', legacyTheme: 'Аэропорт', cover: 'app-media/topics/airport.png', topics: [{ id: 'dlg_aeroport_1', title: 'Аэропорт · диалог 1', legacy: true }] },
    { id: 'home', title: 'Дом', legacyTheme: 'Дом', cover: 'app-media/topics/home.png', topics: [{ id: 'dom', title: 'Дом', legacy: true }] }
  ]
};

if(window.WordRecallData?.isTest===false){window.TOPIC_LAYOUT={...window.TOPIC_LAYOUT,themes:[],styles:[]};}
