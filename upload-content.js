/* Local text preparation. No network requests or inferred CEFR levels. */
(() => {
  'use strict';
  const normalize = text => String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  function plain(text) {
    const decoded = document.createElement('textarea');
    decoded.innerHTML = text.replace(/<[^>]*>/g, '');
    return decoded.value.replace(/\[(?:music|applause|laughter|silence|noise)[^\]]*\]/gi, '').replace(/\s+/g, ' ').trim();
  }
  function timestamp(value) {
    return value.replace(',', '.').split(':').reduce((sum, part) => sum * 60 + Number(part), 0);
  }
  function subtitles(source) {
    const cues = [];
    for (const block of normalize(source).split(/\n\s*\n/)) {
      const lines = block.trim().split('\n');
      if (/^(NOTE|STYLE|REGION)(\s|$)/.test(lines[0])) continue;
      const at = lines.findIndex(line => line.includes('-->'));
      if (at < 0) continue;
      const match = lines[at].match(/((?:\d+:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d+:)?\d{2}:\d{2}[.,]\d{3})/);
      if (!match) continue;
      const start = timestamp(match[1]), end = timestamp(match[2]);
      const text = plain(lines.slice(at + 1).join(' '));
      if (!text || end <= start) continue;
      cues.push({start, end, text});
    }
    cues.sort((a, b) => a.start - b.start || a.end - b.end);
    const cleaned = [];
    for (const cue of cues) {
      const previous = cleaned.at(-1);
      // Only deduplicate overlapping captions. Separate spoken repeats remain.
      if (previous && cue.start < previous.end && previous.text === cue.text) {
        previous.end = Math.max(previous.end, cue.end);
        continue;
      }
      if (previous && cue.start < previous.end) {
        const old = previous.text.split(' '), next = cue.text.split(' ');
        let overlap = Math.min(old.length, next.length);
        while (overlap && old.slice(-overlap).join(' ') !== next.slice(0, overlap).join(' ')) overlap--;
        if (overlap >= 2) {
          const remainder = next.slice(overlap).join(' ');
          if (!remainder) continue;
          cue.text = remainder;
        }
      }
      cleaned.push(cue);
    }
    return cleaned;
  }
  function split(source, mode = 'sentences') {
    const text = normalize(source).trim();
    if (mode === 'lines') return text.split('\n').map(s => s.trim()).filter(Boolean);
    const paragraphs = text.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (typeof Intl.Segmenter === 'function') {
      const segmenter = new Intl.Segmenter('en', {granularity: 'sentence'});
      return paragraphs.flatMap(p => [...segmenter.segment(p)].map(s => s.segment.trim()).filter(Boolean));
    }
    return paragraphs.flatMap(p => p.match(/[^.!?]+(?:[.!?]+["'”’)]*|$)/g) || [p]).map(s => s.trim()).filter(Boolean);
  }
  function words(text) { return normalize(text).toLowerCase().replace(/’/g, "'").match(/[a-z]+(?:['-][a-z]+)*/g) || []; }
  function stats(item, statuses = {}) {
    const tokens = words(item.text), unique = [...new Set(tokens)];
    const known = unique.filter(word => statuses[word] === 'known').length;
    const cues = Array.isArray(item.cues) ? item.cues : [];
    const ranges = cues.filter(c => Number.isFinite(c.start) && c.end > c.start).map(c => [c.start, c.end]).sort((a,b)=>a[0]-b[0]);
    let seconds = 0, end = -Infinity;
    for (const [start, stop] of ranges) { seconds += Math.max(0, stop - Math.max(start, end)); end = Math.max(end, stop); }
    return {total: tokens.length, unique: unique.length, fresh: unique.length - known, familiar: unique.length ? Math.round(known / unique.length * 100) : 0,
      phrases: (item.lines || split(item.text, 'lines')).length, wpm: seconds > 0 && tokens.length ? Math.round(tokens.length * 60 / seconds) : null};
  }
  function safeURL(value) { try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null; } catch { return null; } }
  window.UploadContent = {subtitles, split, stats, safeURL};
})();
