import { $, h, fmtSize, fmtDate, toast, copyText, downloadTxt, refreshIcons } from './utils.js';
import { parseFile } from './fileParser.js';
import { MODES, LENGTHS, LANGS, processText } from './processor.js';
import * as history from './history.js';

const state = { mode: 'summary', length: 's', lang: 'auto', file: null, current: null };
const MIN_CHARS = 50;

/* ---------- Навигация ---------- */
function show(view) {
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('hidden', v.id !== `view-${view}`));
  document.querySelectorAll('[data-nav]').forEach((b) =>
    b.classList.toggle('active', b.dataset.nav === (view === 'result' ? 'home' : view)));
  if (view === 'history') renderHistory();
  window.scrollTo(0, 0);
}

/* ---------- Выбор настроек ---------- */
function buildOptions(containerId, items, key) {
  const box = $(containerId);
  Object.entries(items).forEach(([id, item]) => {
    const label = typeof item === 'string' ? item : item.label;
    const btn = h('button', 'opt', label);
    btn.type = 'button';
    if (item.hint) btn.append(h('small', '', item.hint));
    btn.addEventListener('click', () => { state[key] = id; paint(); });
    btn.dataset.id = id;
    box.append(btn);
  });
  const paint = () => box.querySelectorAll('.opt').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === state[key])));
  paint();
}

/* ---------- Файл ---------- */
function showError(msg) {
  const el = $('#err');
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

function setProgress(p) {
  $('#progress').classList.toggle('hidden', p === null);
  if (p !== null) $('#bar').style.width = `${Math.round(p * 100)}%`;
}

async function handleFile(file) {
  if (!file) return;
  showError('');
  setProgress(0);
  try {
    const text = await parseFile(file, setProgress);
    state.file = file;
    $('#src').value = text;
    $('#fileName').textContent = file.name;
    $('#fileSize').textContent = fmtSize(file.size);
    $('#fileInfo').classList.remove('hidden');
    updateCount();
    toast('Текст извлечён из файла');
  } catch (e) {
    showError(e.message || 'Не удалось прочитать файл.');
  } finally {
    setProgress(null);
    $('#file').value = '';
  }
}

function removeFile() {
  state.file = null;
  $('#src').value = '';
  $('#fileInfo').classList.add('hidden');
  showError('');
  updateCount();
}

const updateCount = () => { $('#count').textContent = `${$('#src').value.length} символов`; };

/* ---------- Обработка и результат ---------- */
async function run(source, opts) {
  const btn = $('#run');
  btn.disabled = true;
  $('#redo').disabled = true;
  try {
    const result = await processText(source, opts);
    state.current = { result, source, opts };
    if (!history.add(state.current)) toast('История не сохранена: нет места в браузере', 'error');
    renderResult(state.current);
    show('result');
  } catch (e) {
    toast(e.message || 'Ошибка обработки', 'error');
  } finally {
    btn.disabled = false;
    $('#redo').disabled = false;
  }
}

function startRun() {
  const source = $('#src').value.trim();
  if (source.length < MIN_CHARS) {
    showError(`Нужно хотя бы ${MIN_CHARS} символов. Вставьте текст или загрузите файл.`);
    return;
  }
  showError('');
  run(source, { mode: state.mode, length: state.length, lang: state.lang });
}

function renderResult({ result, opts }) {
  $('#resTitle').textContent = result.title;
  $('#resMode').textContent = `${MODES[opts.mode].label} · ${LENGTHS[opts.length].label} · демо`;
  const body = $('#resBody');
  body.replaceChildren();
  result.sections.forEach((s) => {
    const block = h('div');
    block.append(h('h3', 'font-semibold text-snow mb-2', s.heading));
    if (s.paragraph) block.append(h('p', 'text-ink', s.paragraph));
    if (s.items) {
      const ul = h('ul', 'list-disc pl-5 space-y-1.5');
      s.items.forEach((t) => ul.append(h('li', '', t)));
      block.append(ul);
    }
    body.append(block);
  });
  if (opts.lang !== 'auto') {
    body.append(h('p', 'text-xs text-muted', `Язык «${LANGS[opts.lang]}» в демо не применяется: текст остался на языке оригинала.`));
  }
}

function toPlainText({ result, opts }) {
  const lines = [result.title, `[ДЕМО-РЕЖИМ, без ИИ] ${MODES[opts.mode].label}`, ''];
  result.sections.forEach((s) => {
    lines.push(s.heading);
    if (s.paragraph) lines.push(s.paragraph);
    (s.items || []).forEach((t) => lines.push(`- ${t}`));
    lines.push('');
  });
  return lines.join('\n').trim();
}

/* ---------- История ---------- */
function renderHistory() {
  const items = history.list();
  const box = $('#histList');
  box.replaceChildren();
  $('#histEmpty').classList.toggle('hidden', items.length > 0);
  $('#clearAll').classList.toggle('hidden', items.length === 0);
  items.forEach((entry) => {
    const row = h('div', 'card flex items-center gap-3 p-3');
    const open = h('button', 'min-w-0 flex-1 text-left');
    open.append(
      h('p', 'text-sm text-snow truncate', entry.result.title),
      h('p', 'text-xs text-muted mt-0.5', `${MODES[entry.opts.mode].label} · ${fmtDate(entry.ts)}`),
    );
    open.addEventListener('click', () => {
      state.current = entry;
      renderResult(entry);
      show('result');
    });
    const del = h('button', 'p-2 -m-2 text-muted hover:text-snow');
    del.setAttribute('aria-label', 'Удалить запись');
    del.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i>'; // статичная иконка, без пользовательских данных
    del.addEventListener('click', () => { history.remove(entry.id); renderHistory(); toast('Запись удалена'); });
    row.append(open, del);
    box.append(row);
  });
  refreshIcons();
}

/* ---------- Инициализация ---------- */
function init() {
  buildOptions('#modes', MODES, 'mode');
  buildOptions('#lengths', LENGTHS, 'length');
  buildOptions('#langs', LANGS, 'lang');

  document.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => show(b.dataset.nav)));
  $('#src').addEventListener('input', updateCount);
  $('#clearSrc').addEventListener('click', removeFile);
  $('#removeFile').addEventListener('click', removeFile);
  $('#file').addEventListener('change', (e) => handleFile(e.target.files[0]));
  $('#run').addEventListener('click', startRun);

  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

  $('#copy').addEventListener('click', async () => { await copyText(toPlainText(state.current)); toast('Скопировано'); });
  $('#dl').addEventListener('click', () => { downloadTxt('note-ai-result.txt', toPlainText(state.current)); toast('Файл скачан'); });
  $('#redo').addEventListener('click', () => run(state.current.source, state.current.opts));
  $('#clearAll').addEventListener('click', () => {
    if (confirm('Удалить всю историю?')) { history.clear(); renderHistory(); toast('История очищена'); }
  });

  show('home');
  window.addEventListener('load', refreshIcons);
  refreshIcons();
}

init();
