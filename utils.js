export const $ = (sel, root = document) => root.querySelector(sel);

/** Создаёт элемент. Текст вставляется через textContent — безопасно для пользовательских данных. */
export function h(tag, cls = '', text = '') {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text) el.textContent = text;
  return el;
}

export const fmtSize = (b) =>
  b < 1024 ? `${b} Б` : b < 1048576 ? `${(b / 1024).toFixed(1)} КБ` : `${(b / 1048576).toFixed(1)} МБ`;

export const fmtDate = (ts) =>
  new Date(ts).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const refreshIcons = () => window.lucide && window.lucide.createIcons();

export function toast(msg, type = 'ok') {
  const t = h('div', `toast ${type === 'error' ? 'error' : ''}`, msg);
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 3000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const a = h('textarea');
    a.value = text;
    document.body.append(a);
    a.select();
    document.execCommand('copy');
    a.remove();
  }
}

export function downloadTxt(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = h('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
