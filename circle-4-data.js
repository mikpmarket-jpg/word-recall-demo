// Demo words and hint phrases from the earlier prototypes, not a cycle algorithm.
const ACTIVE_WORDS = window.CycleContext ? window.CycleContext.words.map(w=>{
  const p=window.CycleContext.phrases.find(p=>p.word===w.id);
  return {word:w.word,translation:w.translation,audio:w.audio,phrase:p.text,phraseTranslation:p.translation,phraseAudio:p.audio};
}) : CIRCLE_PHRASES.map(phrase=>({
  word:phrase.id,
  translation:{wait:'ждать; подождать',train:'поезд',table:'стол'}[phrase.id],
  audio:'audio/circle-4/'+phrase.id+'.wav',
  phrase:phrase.text,
  phraseTranslation:phrase.translation,
  phraseAudio:phrase.audio
}));
