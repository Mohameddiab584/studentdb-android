// ============================================================
// LOCAL OFFLINE DATA LAYER (drop-in replacement for Supabase)
// ------------------------------------------------------------
// This file re-implements, locally and offline, the exact small
// slice of the @supabase/supabase-js client API that this app
// uses: from().select/insert/update/delete/upsert with
// .eq/.or/.order/.limit/.single/.maybeSingle chaining.
//
// NOTHING in the UI changed: every page keeps calling the same
// methods with the same shapes and receiving { data, error }.
//
// Storage: a single JSON document persisted in the app window's
// localStorage (which, inside the desktop shell, lives in a
// dedicated on-disk profile that no browser cleanup can wipe).
// Additionally, when running inside the desktop shell, every
// change is mirrored to a students-db-backup.json file via a
// preload bridge (window.__offlineBackup) for easy recovery.
// ============================================================

export type Student = {
  id: string;
  serial: number | null;
  code: string;
  grade: 'first' | 'second' | 'third';
  name: string;
  national_id: string;
  second_language: string;
  classroom: string;
  education_type: string;
  track: string;
  elective_subject: string;
  division: string;
  guardian_name: string;
  mother_name: string;
  phone: string;
  address: string;
  enrollment_status: string;
  nationality: string;
  integration: string;
  religion: string;
  gender: string;
  birth_date: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentInput = Omit<Student, 'id' | 'created_at' | 'updated_at' | 'gender' | 'birth_date'> & {
  gender?: string;
  birth_date?: string | null;
};

export type SchoolSettings = {
  id: number;
  school_name: string;
  education_administration: string;
  governorate: string;
};

// ---------------- persistent store ----------------

type DbShape = {
  students: Student[];
  school_settings: SchoolSettings[];
};

const STORAGE_KEY = 'school-db-offline-v1';

const seedSettings: SchoolSettings & { updated_at: string } = {
  id: 1,
  school_name: 'مدرسة سعاد جودة عزب الثانوية',
  education_administration: 'إدارة منيا القمح التعليمية',
  governorate: 'محافظة الشرقية',
  updated_at: new Date().toISOString(),
};

let db: DbShape | null = null;

function loadDb(): DbShape {
  if (db) return db;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DbShape;
      if (parsed && Array.isArray(parsed.students) && Array.isArray(parsed.school_settings)) {
        db = parsed;
        return db;
      }
    }
  } catch {
    /* fall through to seed */
  }
  db = { students: [], school_settings: [{ ...seedSettings }] };
  persist();
  return db;
}

let backupTimer: ReturnType<typeof setTimeout> | null = null;

function persist() {
  if (!db) return;
  const json = JSON.stringify(db);
  try {
    window.localStorage.setItem(STORAGE_KEY, json);
  } catch {
    /* storage full/blocked: keep in-memory copy running */
  }
  // Mirror to a backup file when the desktop shell provides the bridge.
  const bridge = (window as unknown as { __offlineBackup?: (json: string) => void }).__offlineBackup;
  if (typeof bridge === 'function') {
    if (backupTimer) clearTimeout(backupTimer);
    backupTimer = setTimeout(() => {
      try {
        bridge(json);
      } catch {
        /* ignore backup failures */
      }
    }, 400);
  }
}

// ---------------- helpers ----------------

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type Row = Record<string, unknown>;

function eqValues(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return false;
  // PostgREST coerces by column type; our ids/grades are stored consistently,
  // but compare stringified forms as a safe fallback for number/text mixes.
  return String(a) === String(b);
}

function ilikeToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/%/g, '.*')
    .replace(/_/g, '.');
  return new RegExp('^' + escaped + '$', 'i');
}

type Filter =
  | { kind: 'eq'; col: string; val: unknown }
  | { kind: 'or'; expr: string };

function matchOr(row: Row, expr: string): boolean {
  // expr like: name.ilike.%q%,code.ilike.%q%,national_id.eq.123
  const parts = expr.split(',');
  return parts.some((part) => {
    const firstDot = part.indexOf('.');
    const secondDot = part.indexOf('.', firstDot + 1);
    if (firstDot < 0 || secondDot < 0) return false;
    const col = part.slice(0, firstDot);
    const op = part.slice(firstDot + 1, secondDot);
    const val = part.slice(secondDot + 1);
    const cell = row[col];
    if (op === 'eq') return eqValues(cell, val);
    if (op === 'neq') return !eqValues(cell, val);
    if (op === 'ilike') return ilikeToRegExp(val).test(String(cell ?? ''));
    if (op === 'like') return ilikeToRegExp(val).test(String(cell ?? ''));
    if (op === 'is') return val === 'null' ? cell === null || cell === undefined : String(cell) === val;
    return false;
  });
}

function applyFilters(rows: Row[], filters: Filter[]): Row[] {
  return rows.filter((row) =>
    filters.every((f) => (f.kind === 'eq' ? eqValues(row[f.col], f.val) : matchOr(row, f.expr))),
  );
}

function applyOrder(
  rows: Row[],
  order: { col: string; ascending: boolean; nullsFirst: boolean } | null,
): Row[] {
  if (!order) return rows;
  const { col, ascending, nullsFirst } = order;
  const dir = ascending ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = a[col];
    const bv = b[col];
    const aNull = av === null || av === undefined;
    const bNull = bv === null || bv === undefined;
    if (aNull && bNull) return 0;
    if (aNull) return nullsFirst ? -1 : 1;
    if (bNull) return nullsFirst ? 1 : -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });
}

// ---------------- query builder ----------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = { data: any; error: { message: string; code?: string } | null };

const studentDefaults: Row = {
  serial: null,
  second_language: '',
  classroom: '',
  education_type: '',
  track: '',
  elective_subject: '',
  division: '',
  guardian_name: '',
  mother_name: '',
  phone: '',
  address: '',
  enrollment_status: '',
  nationality: 'مصري',
  integration: 'لا يوجد',
  religion: 'مسلم',
  gender: '',
  birth_date: null,
};

class QueryBuilder implements PromiseLike<Result> {
  private table: string;
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private payload: Row | Row[] | null = null;
  private filters: Filter[] = [];
  private orderSpec: { col: string; ascending: boolean; nullsFirst: boolean } | null = null;
  private limitN: number | null = null;
  private wantRows = false; // .select() called after a mutation
  private mode: 'many' | 'single' | 'maybeSingle' = 'many';

  constructor(table: string) {
    this.table = table;
  }

  select(_cols?: string): this {
    if (this.op !== 'select') {
      this.wantRows = true;
    }
    return this;
  }

  insert(payload: Row | Row[]): this {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Row): this {
    this.op = 'update';
    this.payload = payload;
    return this;
  }

  upsert(payload: Row): this {
    this.op = 'upsert';
    this.payload = payload;
    return this;
  }

  delete(): this {
    this.op = 'delete';
    return this;
  }

  eq(col: string, val: unknown): this {
    this.filters.push({ kind: 'eq', col, val });
    return this;
  }

  or(expr: string): this {
    this.filters.push({ kind: 'or', expr });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    this.orderSpec = {
      col,
      ascending: opts?.ascending !== false,
      nullsFirst: opts?.nullsFirst === true,
    };
    return this;
  }

  limit(n: number): this {
    this.limitN = n;
    return this;
  }

  single(): this {
    this.mode = 'single';
    return this;
  }

  maybeSingle(): this {
    this.mode = 'maybeSingle';
    return this;
  }

  private tableRows(): Row[] {
    const d = loadDb();
    return (this.table === 'students' ? d.students : d.school_settings) as unknown as Row[];
  }

  private setTableRows(rows: Row[]): void {
    const d = loadDb();
    if (this.table === 'students') d.students = rows as unknown as Student[];
    else d.school_settings = rows as unknown as SchoolSettings[];
  }

  private shapeResult(rows: Row[]): Result {
    if (this.mode === 'single') {
      if (rows.length !== 1) {
        return {
          data: null,
          error: {
            message: 'JSON object requested, multiple (or no) rows returned',
            code: 'PGRST116',
          },
        };
      }
      return { data: rows[0], error: null };
    }
    if (this.mode === 'maybeSingle') {
      if (rows.length === 0) return { data: null, error: null };
      if (rows.length > 1) {
        return {
          data: null,
          error: {
            message: 'JSON object requested, multiple (or no) rows returned',
            code: 'PGRST116',
          },
        };
      }
      return { data: rows[0], error: null };
    }
    return { data: rows, error: null };
  }

  private execute(): Result {
    try {
      return this.executeUnsafe();
    } catch (e) {
      return { data: null, error: { message: e instanceof Error ? e.message : String(e) } };
    }
  }

  private executeUnsafe(): Result {
    const rows = this.tableRows();

    if (this.op === 'select') {
      let out = applyFilters(rows, this.filters);
      out = applyOrder(out, this.orderSpec);
      if (this.limitN !== null) out = out.slice(0, this.limitN);
      return this.shapeResult(out.map((r) => ({ ...r })));
    }

    if (this.op === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload as Row];
      const inserted: Row[] = [];
      for (const item of items) {
        const row: Row = { ...item };
        if (this.table === 'students') {
          for (const [k, v] of Object.entries(studentDefaults)) {
            if (row[k] === undefined) row[k] = v;
          }
          if (!row.code || !row.grade || !row.name || !row.national_id) {
            return {
              data: null,
              error: { message: 'null value in column violates not-null constraint', code: '23502' },
            };
          }
          if (rows.some((r) => r.national_id === row.national_id)) {
            return {
              data: null,
              error: {
                message: 'duplicate key value violates unique constraint "students_national_id_key"',
                code: '23505',
              },
            };
          }
        }
        if (row.id === undefined || row.id === null) {
          row.id = this.table === 'students' ? newId() : 1;
        }
        row.created_at = row.created_at ?? nowIso();
        row.updated_at = nowIso();
        rows.push(row);
        inserted.push({ ...row });
      }
      this.setTableRows(rows);
      persist();
      return this.wantRows || this.mode !== 'many'
        ? this.shapeResult(inserted)
        : { data: null, error: null };
    }

    if (this.op === 'upsert') {
      const item = { ...(this.payload as Row) };
      const key = item.id;
      const idx = rows.findIndex((r) => eqValues(r.id, key));
      let saved: Row;
      if (idx >= 0) {
        rows[idx] = { ...rows[idx], ...item, updated_at: nowIso() };
        saved = { ...rows[idx] };
      } else {
        saved = { ...item, created_at: nowIso(), updated_at: nowIso() };
        rows.push(saved);
      }
      this.setTableRows(rows);
      persist();
      return this.wantRows || this.mode !== 'many'
        ? this.shapeResult([saved])
        : { data: null, error: null };
    }

    if (this.op === 'update') {
      const targets = applyFilters(rows, this.filters);
      const targetSet = new Set(targets);
      const updated: Row[] = [];
      for (const r of rows) {
        if (targetSet.has(r)) {
          Object.assign(r, this.payload as Row, { updated_at: nowIso() });
          updated.push({ ...r });
        }
      }
      persist();
      return this.wantRows || this.mode !== 'many'
        ? this.shapeResult(updated)
        : { data: null, error: null };
    }

    // delete
    const targets = applyFilters(rows, this.filters);
    const targetSet = new Set(targets);
    const remaining = rows.filter((r) => !targetSet.has(r));
    this.setTableRows(remaining);
    persist();
    return this.wantRows || this.mode !== 'many'
      ? this.shapeResult(targets.map((r) => ({ ...r })))
      : { data: null, error: null };
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }
}

// ---------------- public client (same shape the app imports) ----------------

export const supabase = {
  from(table: string): QueryBuilder {
    return new QueryBuilder(table);
  },
};
