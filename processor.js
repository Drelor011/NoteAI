// Модуль обработки. Сейчас — ДЕМО без ИИ. Для подключения ИИ замените тело processText:
// отправьте text и opts на ВАШ сервер (ключи API в браузере хранить нельзя) и верните объект того же формата.
export const AI_ENABLED = false;

export const MODES = {
  summary: { label: 'Краткий конспект', hint: 'Структура и основные факты' },
  retell: { label: 'Краткий пересказ', hint: 'Содержание связным текстом' },
  ideas: { label: 'Главные мысли', hint: 'Ключевые идеи списком' },
  simple: { label: 'Простыми словами', hint: 'Короткие и понятные фразы' },
};
export const LENGTHS = { xs: { label: 'Очень коротко', n: 3 }, s: { label: 'Коротко', n: 5 }, l: { label: 'Подробно', n: 9 } };
export const LANGS = { auto: 'Автоматически', ru: 'Русский', kk: 'Қазақша', en: 'English' };

/** Формат результата: { title, demo, sections: [{ heading, paragraph?, items? }] } */
export async function processText(text, opts) {
  await new Promise((r) => setTimeout(r, 400)); // имитация ожидания
  return AI_ENABLED ? null : demoProcess(text, opts);
}

function demoProcess(text, { mode, length }) {
  const n = LENGTHS[length].n;
  const sentences = text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 20);
  const words = text.toLowerCase().match(/[\p{L}]{4,}/gu) || [];
  const freq = {};
  words.forEach((w) => (freq[w] = (freq[w] || 0) + 1));
  const score = (s) => {
    const w = s.toLowerCase().match(/[\p{L}]{4,}/gu) || [];
    return w.reduce((a, x) => a + freq[x], 0) / Math.sqrt(w.length || 1);
  };
  const picked = sentences
    .map((s, i) => ({ s, i, sc: score(s) }))
    .sort((a, b) => b.sc - a.sc).slice(0, n)
    .sort((a, b) => a.i - b.i).map((x) => x.s);
  const keywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 6).map((x) => x[0]);
  const first = sentences[0] || text;
  const title = first.length > 60 ? first.slice(0, 57) + '…' : first;
  const sections = [];

  if (!picked.length) sections.push({ heading: 'Текст слишком короткий', paragraph: text.slice(0, 500) });
  else if (mode === 'summary') {
    sections.push({ heading: 'Основные факты', items: picked });
    sections.push({ heading: 'Ключевые слова', paragraph: keywords.join(', ') });
  } else if (mode === 'retell') {
    sections.push({ heading: 'Пересказ', paragraph: picked.join(' ') });
  } else if (mode === 'ideas') {
    sections.push({ heading: 'Главные мысли', items: picked.map((s) => (s.length > 170 ? s.slice(0, 167) + '…' : s)) });
  } else {
    const parts = picked.flatMap((s) => (s.length > 120 ? s.split(/[;:,]\s+/).filter((p) => p.length > 15) : [s]));
    sections.push({ heading: 'Короткими фразами', items: parts });
  }
  sections.push({ heading: 'О тексте', paragraph: `Слов в исходнике: ${text.split(/\s+/).length}.` });
  return { title, demo: true, mode, length, sections };
}
