const KEY = 'noteai.history.v1';
const LIMIT = 30;

export function list() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

function save(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); return true; } catch { return false; }
}

/** entry: { result, source, opts }. Возвращает false, если браузер не дал сохранить. */
export function add(entry) {
  const item = {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    ts: Date.now(),
    result: entry.result,
    opts: entry.opts,
    source: entry.source.slice(0, 20000),
  };
  return save([item, ...list()].slice(0, LIMIT)) ? item : null;
}

export const remove = (id) => save(list().filter((e) => e.id !== id));
export const clear = () => save([]);
