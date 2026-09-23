/**
 * Supabase falso para las pruebas: no toca ninguna base de datos, solo
 * apunta cada operación (tabla, tipo, datos y filtros) para poder
 * comprobar qué habría hecho de verdad cada acción del servidor.
 */

export type RecordedOp = {
  table: string;
  kind: "insert" | "update" | "delete" | "select";
  payload?: unknown;
  filters: [string, unknown][];
};

type Result = { data: unknown; error: { message: string } | null };

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;

export function createFakeSupabase(options: {
  userId?: string | null;
  email?: string;
  /** Resultado de cada operación, por "tabla:tipo" (por defecto, éxito). */
  results?: Record<string, Result>;
  signInError?: boolean;
} = {}) {
  const ops: RecordedOp[] = [];
  const userId = options.userId === undefined ? "user-me" : options.userId;
  const auth = {
    signInCalls: [] as { email: string; password: string }[],
    updateUserCalls: [] as unknown[],
    signOutCalls: 0,
  };

  function builder(table: string) {
    const op: RecordedOp = { table, kind: "select", filters: [] };
    const resultFor = (): Result =>
      options.results?.[`${table}:${op.kind}`] ?? {
        data: op.kind === "insert" ? { id: "new-id" } : [],
        error: null,
      };

    const chain = {
      insert(payload: unknown) {
        op.kind = "insert";
        op.payload = payload;
        ops.push(op);
        return chain;
      },
      update(payload: unknown) {
        op.kind = "update";
        op.payload = payload;
        ops.push(op);
        return chain;
      },
      delete() {
        op.kind = "delete";
        ops.push(op);
        return chain;
      },
      select() {
        if (!ops.includes(op)) ops.push(op);
        return chain;
      },
      eq(column: string, value: unknown) {
        op.filters.push([column, value]);
        return chain;
      },
      single: async () => resultFor(),
      maybeSingle: async () => resultFor(),
      then(resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) {
        return Promise.resolve(resultFor()).then(resolve, reject);
      },
    };
    return chain;
  }

  const storage = { removed: [] as { bucket: string; paths: string[] }[] };

  const rpcCalls: { fn: string; args: unknown }[] = [];

  const client = {
    from: (table: string) => builder(table),
    rpc: async (fn: string, args?: unknown): Promise<Result> => {
      rpcCalls.push({ fn, args });
      return options.results?.[`rpc:${fn}`] ?? { data: null, error: null };
    },
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          storage.removed.push({ bucket, paths });
          return { data: [], error: null };
        },
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: `https://signed.test/${bucket}/${path}` },
          error: null,
        }),
      }),
    },
    auth: {
      getUser: async () => ({
        data: { user: userId ? { id: userId, email: options.email ?? "yo@ratta.test" } : null },
      }),
      signInWithPassword: async (creds: { email: string; password: string }) => {
        auth.signInCalls.push(creds);
        return { error: options.signInError ? { message: "Invalid login" } : null };
      },
      updateUser: async (attrs: unknown) => {
        auth.updateUserCalls.push(attrs);
        return { error: null };
      },
      signOut: async () => {
        auth.signOutCalls += 1;
        return { error: null };
      },
    },
  };

  return { client, ops, auth, storage, rpcCalls };
}

/** Construye un FormData con exactamente los campos que manda el formulario. */
export function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return fd;
}
