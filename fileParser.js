const MAX_SIZE = 15 * 1024 * 1024;
const ext = (name) => name.split('.').pop().toLowerCase();

export function detectKind(file) {
  const e = ext(file.name);
  if (e === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (e === 'docx') return 'docx';
  if (e === 'txt' || file.type === 'text/plain') return 'txt';
  if (file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(e)) return 'image';
  return null;
}

/** Извлекает текст из файла. onProgress получает число от 0 до 1. */
export async function parseFile(file, onProgress = () => {}) {
  if (file.size > MAX_SIZE) throw new Error('Файл больше 15 МБ. Выберите файл поменьше.');
  const kind = detectKind(file);
  if (!kind) throw new Error('Этот формат не поддерживается. Загрузите PDF, DOCX, TXT или фото (JPG, PNG, WEBP).');
  const readers = { pdf: readPdf, docx: readDocx, txt: (f) => f.text(), image: readImage };
  const raw = await readers[kind](file, onProgress);
  const text = raw.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) {
    throw new Error(kind === 'pdf'
      ? 'В PDF нет текстового слоя. Если это скан, загрузите страницу как фото.'
      : 'Текст в файле не найден.');
  }
  return text;
}

async function readPdf(file, onProgress) {
  const lib = window.pdfjsLib;
  if (!lib) throw new Error('PDF.js не загрузился. Проверьте интернет и обновите страницу.');
  lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((it) => it.str).join(' '));
    onProgress(i / doc.numPages);
  }
  return pages.join('\n\n');
}

async function readDocx(file) {
  if (!window.mammoth) throw new Error('Mammoth.js не загрузился. Проверьте интернет и обновите страницу.');
  return (await window.mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
}

async function readImage(file, onProgress) {
  if (!window.Tesseract) throw new Error('Tesseract.js не загрузился. Проверьте интернет и обновите страницу.');
  const { data } = await window.Tesseract.recognize(file, 'rus+eng+kaz', {
    logger: (m) => m.status === 'recognizing text' && onProgress(m.progress),
  });
  return data.text;
}
