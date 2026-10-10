/* Deterministic initial test scenario; saved sessions always take precedence. */
window.WORD_RECALL_TEST_FIXTURE = window.WordRecallData?.isTest===false ? null : {
  id:'first-learning-session-v1',
  learningWords:['time','way','day','people','work','life','hand','part','place','case','point','world'],
  knownWords:['house','end','state','family'],
  dictionary:{name:'Англо-русский словарь',enabled:true},
  articleExamples:{time:'время',way:'путь; способ',day:'день',wait:'ждать',train:'поезд',table:'стол'}
};

// Home-only layout examples: never seed real counters, cycle state or viewing history.
if (window.WORD_RECALL_TEST_FIXTURE) window.WORD_RECALL_TEST_FIXTURE.home = {
  today: {newWords:7, reviewWords:24, minutes:12}, completedCycles:3, minutesPerCycle:20,
  goals: [
    {title:'Первый отрывок',cycles:10,cover:'app-media/covers/friends.jpg',href:'player.html?collection=friends&clip=u-38awTaUIo&mode=video'},
    {title:'Второй отрывок',cycles:18,cover:'app-media/covers/extra.jpg',href:'catalog.html?section=series&collection=extra-english'},
    {title:'Длинная сцена',cycles:25,cover:'app-media/covers/friends.jpg',href:'player.html?collection=friends&clip=fOcYm9udNQA&mode=video'},
    {title:'Полный эпизод',cycles:40,words:500,cover:'app-media/covers/extra.jpg',href:'catalog.html?section=series&collection=extra-english'}
  ],
  workPreview: [
    {title:'Friends',cover:'app-media/covers/friends.jpg',caption:'Продолжить просмотр',href:'player.html?collection=friends&clip=u-38awTaUIo&mode=video'},
    {title:'Аэропорт · диалог 1',cover:'app-media/topics/airport.png',caption:'Чтение',href:'catalog.html?section=topics&theme=airport&topic=dlg_aeroport_1&mode=read'}
  ]
};
