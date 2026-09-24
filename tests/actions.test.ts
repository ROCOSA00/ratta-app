import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeSupabase, form, type FakeSupabase } from "./helpers/fake-supabase";

const state = vi.hoisted(() => ({
  fake: null as unknown as FakeSupabase,
  spaceId: "space-1" as string | null,
  revalidated: [] as string[],
  notified: [] as { title: string; body: string; url: string; tag?: string }[],
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => state.fake.client }));
vi.mock("@/lib/spaces/get-current-space", () => ({ getCurrentSpaceId: async () => state.spaceId }));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => {
    state.revalidated.push(path);
  },
}));
vi.mock("@/lib/push/notify", () => ({
  notifyPartner: async (build: (me: string) => { title: string; body: string; url: string; tag?: string }) => {
    state.notified.push(build("Rokito"));
  },
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import {
  addNoteItem,
  createNote,
  deleteNote,
  deleteNoteItem,
  togglePin,
  toggleNoteItem,
  updateNote,
  updateNoteTitle,
} from "@/app/(app)/notas/actions";
import { addEventPhoto, createEvent, deleteEvent, deleteEventPhoto } from "@/app/(app)/calendario/actions";
import { logEntry, undoEntry } from "@/lib/poop/actions";
import { submitAnswer } from "@/lib/questions/actions";
import { sendNudge } from "@/lib/nudges/actions";
import { updateDisplayName } from "@/lib/profile/actions";
import { changePassword, signIn } from "@/lib/auth/actions";
import { addMemory, deleteMemory } from "@/lib/memories/actions";
import { markChatRead, sendMessage, sendPhotoMessage } from "@/lib/chat/actions";
import { sendHearts } from "@/lib/hearts/actions";
import { postMoment } from "@/lib/moments/actions";
import { submitFlappyScore } from "@/lib/games/actions";
import { todayKey } from "@/lib/calendar/date-utils";

const ok = { error: null };
const NOTE_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";
const EVENT_ID = "33333333-3333-4333-8333-333333333333";
const ROUND_ID = "44444444-4444-4444-8444-444444444444";
const PHOTO_ID = "55555555-5555-4555-8555-555555555555";

beforeEach(() => {
  state.fake = createFakeSupabase();
  state.spaceId = "space-1";
  state.revalidated = [];
  state.notified = [];
});

const opsOf = (table: string, kind: string) => state.fake.ops.filter((o) => o.table === table && o.kind === kind);

// ---------------------------------------------------------------- Notas

describe("Notas", () => {
  it("crea una nota de texto", async () => {
    const res = await createNote(ok, form({ noteType: "text", title: "Ideas", content: "Viaje a Roma" }));
    expect(res).toEqual({ error: null });
    expect(opsOf("notes", "insert")[0]?.payload).toEqual({
      space_id: "space-1",
      created_by: "user-me",
      title: "Ideas",
      content: "Viaje a Roma",
      note_type: "text",
    });
  });

  it("crea una lista aunque el formulario NO mande el campo de contenido (fallo reportado)", async () => {
    await expect(createNote(ok, form({ noteType: "checklist", title: "Compra" }))).rejects.toThrow(
      "NEXT_REDIRECT:/notas/new-id",
    );
    expect(opsOf("notes", "insert")[0]?.payload).toMatchObject({ title: "Compra", content: "", note_type: "checklist" });
  });

  it("no deja crear una nota de texto vacía", async () => {
    const res = await createNote(ok, form({ noteType: "text", title: "Ideas", content: "   " }));
    expect(res.error).toBe("Escribe algo en la nota.");
    expect(state.fake.ops).toHaveLength(0);
  });

  it("no deja crear una nota sin título", async () => {
    const res = await createNote(ok, form({ noteType: "text", title: "", content: "algo" }));
    expect(res.error).toBe("Ponle un título a la nota.");
  });

  it("avisa si la sesión ha caducado o no hay espacio", async () => {
    state.fake = createFakeSupabase({ userId: null });
    expect((await createNote(ok, form({ noteType: "text", title: "a", content: "b" }))).error).toMatch(/sesión/);
    state.fake = createFakeSupabase();
    state.spaceId = null;
    expect((await createNote(ok, form({ noteType: "text", title: "a", content: "b" }))).error).toMatch(/espacio/);
  });

  it("edita título y contenido", async () => {
    const res = await updateNote({ error: null }, form({ noteId: NOTE_ID, title: "Nuevo", content: "Texto" }));
    expect(res).toEqual({ error: null, saved: true });
    const [op] = opsOf("notes", "update");
    expect(op?.payload).toEqual({ title: "Nuevo", content: "Texto" });
    expect(op?.filters).toEqual([["id", NOTE_ID]]);
  });

  it("no guarda una edición que deja la nota vacía", async () => {
    const res = await updateNote({ error: null }, form({ noteId: NOTE_ID, title: "Nuevo", content: "" }));
    expect(res.error).toBe("Escribe algo en la nota.");
    expect(state.fake.ops).toHaveLength(0);
  });

  it("renombra una lista", async () => {
    await updateNoteTitle(form({ noteId: NOTE_ID, title: "Compra semanal" }));
    expect(opsOf("notes", "update")[0]?.payload).toEqual({ title: "Compra semanal" });
  });

  it("fija y desfija", async () => {
    await togglePin(form({ noteId: NOTE_ID, nextPinned: "true" }));
    expect(opsOf("notes", "update")[0]?.payload).toEqual({ is_pinned: true });
  });

  it("borra una nota y vuelve al listado", async () => {
    await expect(deleteNote(form({ noteId: NOTE_ID }))).rejects.toThrow("NEXT_REDIRECT:/notas");
    expect(opsOf("notes", "delete")[0]?.filters).toEqual([["id", NOTE_ID]]);
  });

  it("ignora un id de nota manipulado", async () => {
    await deleteNote(form({ noteId: "no-es-un-uuid" }));
    expect(state.fake.ops).toHaveLength(0);
  });

  it("añade, marca y borra elementos de una lista, refrescando también el listado", async () => {
    await addNoteItem(form({ noteId: NOTE_ID, content: "Leche" }));
    expect(opsOf("note_items", "insert")[0]?.payload).toEqual({ note_id: NOTE_ID, content: "Leche" });

    await toggleNoteItem(form({ itemId: ITEM_ID, noteId: NOTE_ID, nextChecked: "true" }));
    expect(opsOf("note_items", "update")[0]?.payload).toEqual({ is_checked: true });

    await deleteNoteItem(form({ itemId: ITEM_ID, noteId: NOTE_ID }));
    expect(opsOf("note_items", "delete")[0]?.filters).toEqual([["id", ITEM_ID]]);

    expect(state.revalidated).toContain("/notas");
    expect(state.revalidated).toContain(`/notas/${NOTE_ID}`);
  });

  it("no añade elementos vacíos", async () => {
    await addNoteItem(form({ noteId: NOTE_ID, content: "  " }));
    expect(state.fake.ops).toHaveLength(0);
  });
});

// ------------------------------------------------------------ Calendario

describe("Calendario", () => {
  it("guarda un plan con hora, en hora de Madrid (20:00 en septiembre = 18:00 UTC)", async () => {
    const res = await createEvent(
      ok,
      form({ title: "Cena", date: "2026-09-25", time: "20:00", location: "", description: "" }),
    );
    expect(res).toEqual({ error: null });
    expect(opsOf("events", "insert")[0]?.payload).toEqual({
      space_id: "space-1",
      created_by: "user-me",
      title: "Cena",
      start_at: "2026-09-25T18:00:00.000Z",
      end_at: "2026-09-25T19:00:00.000Z",
      all_day: false,
      location: null,
      description: null,
    });
  });

  it("en invierno la diferencia es de 1 hora (20:00 en enero = 19:00 UTC)", async () => {
    await createEvent(ok, form({ title: "Cena", date: "2027-01-15", time: "20:00", location: "", description: "" }));
    expect(opsOf("events", "insert")[0]?.payload).toMatchObject({ start_at: "2027-01-15T19:00:00.000Z" });
  });

  it("guarda un plan de todo el día aunque el formulario NO mande la hora (mismo fallo que en listas)", async () => {
    const res = await createEvent(
      ok,
      form({ title: "Cumple", date: "2026-09-26", allDay: "on", location: "Casa", description: "Tarta" }),
    );
    expect(res).toEqual({ error: null });
    expect(opsOf("events", "insert")[0]?.payload).toMatchObject({
      all_day: true,
      start_at: "2026-09-25T22:00:00.000Z",
      end_at: "2026-09-26T21:59:00.000Z",
      location: "Casa",
      description: "Tarta",
    });
  });

  it("pide la hora si no es de todo el día", async () => {
    const res = await createEvent(ok, form({ title: "Cena", date: "2026-09-25", time: "", location: "", description: "" }));
    expect(res.error).toBe("Elige una hora.");
    expect(state.fake.ops).toHaveLength(0);
  });

  it("pide título y fecha", async () => {
    expect((await createEvent(ok, form({ title: "", date: "2026-09-25", time: "20:00" }))).error).toBe(
      "Ponle un título al evento.",
    );
    expect((await createEvent(ok, form({ title: "Cena", date: "", time: "20:00" }))).error).toBe("Elige una fecha.");
  });

  it("borra un plan", async () => {
    await deleteEvent(form({ eventId: EVENT_ID }));
    expect(opsOf("events", "delete")[0]?.filters).toEqual([["id", EVENT_ID]]);
  });

  it("al borrar un plan también quita sus fotos del almacén, y desde el detalle vuelve al calendario", async () => {
    state.fake = createFakeSupabase({
      results: { "event_photos:select": { data: [{ storage_path: "s/a.jpg" }, { storage_path: "s/b.jpg" }], error: null } },
    });
    await expect(deleteEvent(form({ eventId: EVENT_ID, redirect: "1" }))).rejects.toThrow("NEXT_REDIRECT:/calendario");
    expect(opsOf("events", "delete")).toHaveLength(1);
    expect(state.fake.storage.removed).toEqual([{ bucket: "event-photos", paths: ["s/a.jpg", "s/b.jpg"] }]);
  });
});

// ------------------------------------------------------- Fotos de planes

describe("Fotos de planes", () => {
  const SPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const PATH = `${SPACE}/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg`;
  const withEvent = (startAt: string) =>
    createFakeSupabase({
      results: { "events:select": { data: { id: EVENT_ID, title: "Cena", start_at: startAt }, error: null } },
    });

  beforeEach(() => {
    state.spaceId = SPACE;
  });

  it("añade una foto a un plan de hoy o pasado y avisa a tu pareja", async () => {
    state.fake = withEvent("2020-05-01T18:00:00Z");
    expect(await addEventPhoto({ eventId: EVENT_ID, path: PATH })).toEqual({ error: null });
    expect(opsOf("event_photos", "insert")[0]?.payload).toEqual({
      space_id: SPACE,
      event_id: EVENT_ID,
      uploaded_by: "user-me",
      storage_path: PATH,
    });
    expect(state.notified[0]).toMatchObject({
      title: "📸 Fotos del plan",
      body: "Rokito ha añadido una foto a «Cena»",
      url: `/calendario/${EVENT_ID}`,
    });
  });

  it("no deja añadir fotos antes del día del plan", async () => {
    state.fake = withEvent("2999-01-01T18:00:00Z");
    expect((await addEventPhoto({ eventId: EVENT_ID, path: PATH })).error).toBe(
      "Podréis añadir fotos a partir del día del plan.",
    );
    expect(opsOf("event_photos", "insert")).toHaveLength(0);
    expect(state.notified).toHaveLength(0);
  });

  it("si el plan no existe (o no es vuestro), no guarda nada", async () => {
    state.fake = createFakeSupabase({ results: { "events:select": { data: null, error: null } } });
    expect((await addEventPhoto({ eventId: EVENT_ID, path: PATH })).error).toBe("Ese plan ya no existe.");
    expect(opsOf("event_photos", "insert")).toHaveLength(0);
  });

  it("rechaza rutas de otro espacio o manipuladas", async () => {
    for (const path of [
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg",
      `${SPACE}/../x.jpg`,
      "https://evil.test/x.jpg",
    ]) {
      expect((await addEventPhoto({ eventId: EVENT_ID, path })).error).toBe("Ruta de foto no válida.");
    }
    expect((await addEventPhoto({ eventId: "no-es-uuid", path: PATH })).error).toBeTruthy();
    expect(state.fake.ops).toHaveLength(0);
  });

  it("quitar una foto borra la fila y el fichero", async () => {
    state.fake = createFakeSupabase({
      results: { "event_photos:delete": { data: { storage_path: PATH, event_id: EVENT_ID }, error: null } },
    });
    expect(await deleteEventPhoto(PHOTO_ID)).toEqual({ error: null });
    expect(opsOf("event_photos", "delete")[0]?.filters).toEqual([["id", PHOTO_ID]]);
    expect(state.fake.storage.removed).toEqual([{ bucket: "event-photos", paths: [PATH] }]);
  });

  it("si no se pudo borrar la fila (no es vuestra), no toca el almacén", async () => {
    state.fake = createFakeSupabase({ results: { "event_photos:delete": { data: null, error: null } } });
    expect((await deleteEventPhoto(PHOTO_ID)).error).toBeTruthy();
    expect(state.fake.storage.removed).toHaveLength(0);
  });
});

// -------------------------------------------------------------- El Trono

describe("El Trono", () => {
  it("registra una visita y devuelve su id para poder deshacerla", async () => {
    const res = await logEntry();
    expect(res).toEqual({ error: null, entryId: "new-id" });
    expect(opsOf("poop_entries", "insert")[0]?.payload).toEqual({ space_id: "space-1", user_id: "user-me" });
  });

  it("avisa si falla la base de datos o la sesión", async () => {
    state.fake = createFakeSupabase({ results: { "poop_entries:insert": { data: null, error: { message: "x" } } } });
    expect((await logEntry()).error).toMatch(/No se pudo registrar/);
    state.fake = createFakeSupabase({ userId: null });
    expect((await logEntry()).error).toMatch(/sesión/);
  });

  it("deshacer solo borra un registro TUYO (filtra por tu usuario)", async () => {
    await undoEntry(EVENT_ID);
    expect(opsOf("poop_entries", "delete")[0]?.filters).toEqual([
      ["id", EVENT_ID],
      ["user_id", "user-me"],
    ]);
  });

  it("deshacer ignora ids manipulados", async () => {
    await undoEntry("'; drop table poop_entries; --");
    expect(state.fake.ops).toHaveLength(0);
  });
});

// ---------------------------------------------- Pregunta, cariño y perfil

describe("Pregunta del día, Cariño y Perfil", () => {
  it("guarda tu respuesta", async () => {
    const res = await submitAnswer(ok, form({ roundId: ROUND_ID, answer: "Tu sonrisa" }));
    expect(res).toEqual({ error: null });
    expect(opsOf("question_answers", "insert")[0]?.payload).toEqual({
      round_id: ROUND_ID,
      user_id: "user-me",
      answer: "Tu sonrisa",
    });
  });

  it("no guarda respuestas vacías", async () => {
    expect((await submitAnswer(ok, form({ roundId: ROUND_ID, answer: " " }))).error).toBe("Escribe una respuesta.");
  });

  it("manda un mensajito de cariño", async () => {
    const res = await sendNudge(
      { error: null, sent: false },
      form({ key: "te_quiero" }),
    );
    expect(res).toEqual({ error: null, sent: true });
    expect(opsOf("activity_log", "insert")[0]?.payload).toMatchObject({
      action: "nudge",
      metadata: { key: "te_quiero", emoji: "🥰", label: "Te quiero" },
    });
  });

  it("los mensajitos nuevos funcionan y el texto lo pone el servidor, no el móvil", async () => {
    const res = await sendNudge(
      { error: null, sent: false },
      form({ key: "pedo", emoji: "🔥", label: "Texto inventado desde el móvil" }),
    );
    expect(res).toEqual({ error: null, sent: true });
    expect(opsOf("activity_log", "insert")[0]?.payload).toMatchObject({
      metadata: { key: "pedo", emoji: "💨", label: "Me he tirado un pedo que flipas" },
    });
    expect(state.notified[0]).toMatchObject({ title: "💨 Rokito", body: "Me he tirado un pedo que flipas" });
  });

  it("rechaza mensajitos inventados", async () => {
    const res = await sendNudge({ error: null, sent: false }, form({ key: "hackeo", emoji: "x", label: "x" }));
    expect(res.sent).toBe(false);
    expect(state.fake.ops).toHaveLength(0);
  });

  it("cambia tu nombre, solo en tu perfil", async () => {
    const res = await updateDisplayName(ok, form({ displayName: "Rokito" }));
    expect(res).toEqual({ error: null });
    const [op] = opsOf("profiles", "update");
    expect(op?.payload).toEqual({ display_name: "Rokito" });
    expect(op?.filters).toEqual([["id", "user-me"]]);
  });

  it("valida el nombre", async () => {
    expect((await updateDisplayName(ok, form({ displayName: "" }))).error).toBe("Escribe un nombre.");
    expect((await updateDisplayName(ok, form({ displayName: "x".repeat(31) }))).error).toBe("Máximo 30 caracteres.");
  });
});

// -------------------------------------------------------- Acceso y cuenta

describe("Acceso y contraseña", () => {
  it("entra con email y contraseña correctos", async () => {
    await expect(signIn(ok, form({ email: "yo@ratta.test", password: "secreta" }))).rejects.toThrow(
      "NEXT_REDIRECT:/inicio",
    );
  });

  it("con datos incorrectos da un error genérico (no revela si el email existe)", async () => {
    state.fake = createFakeSupabase({ signInError: true });
    expect((await signIn(ok, form({ email: "yo@ratta.test", password: "mal" }))).error).toBe(
      "Email o contraseña incorrectos.",
    );
  });

  it("cambia la contraseña verificando antes la actual, y cierra sesión", async () => {
    await expect(
      changePassword(
        ok,
        form({ currentPassword: "vieja123", newPassword: "nueva1234", confirmPassword: "nueva1234" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/login?passwordChanged=1");
    expect(state.fake.auth.signInCalls).toEqual([{ email: "yo@ratta.test", password: "vieja123" }]);
    expect(state.fake.auth.updateUserCalls).toEqual([{ password: "nueva1234" }]);
    expect(state.fake.auth.signOutCalls).toBe(1);
  });

  it("no cambia la contraseña si la actual es incorrecta", async () => {
    state.fake = createFakeSupabase({ signInError: true });
    const res = await changePassword(
      ok,
      form({ currentPassword: "mal", newPassword: "nueva1234", confirmPassword: "nueva1234" }),
    );
    expect(res.error).toBe("La contraseña actual no es correcta.");
    expect(state.fake.auth.updateUserCalls).toHaveLength(0);
  });

  it("exige 8 caracteres y que la repetición coincida", async () => {
    expect(
      (await changePassword(ok, form({ currentPassword: "v", newPassword: "corta", confirmPassword: "corta" }))).error,
    ).toBe("La contraseña nueva debe tener al menos 8 caracteres.");
    expect(
      (await changePassword(ok, form({ currentPassword: "v", newPassword: "nueva1234", confirmPassword: "otra12345" })))
        .error,
    ).toBe("Las contraseñas nuevas no coinciden.");
    expect(state.fake.auth.updateUserCalls).toHaveLength(0);
  });
});

// -------------------------------------------------------------- Recuerdos

describe("Recuerdos", () => {
  const SPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const PHOTO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const MEMORY_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

  beforeEach(() => {
    state.spaceId = SPACE;
  });

  it("registra un recuerdo con pie de foto y fecha", async () => {
    const res = await addMemory({ path: `${SPACE}/${PHOTO}.jpg`, caption: " Playa ", takenOn: "2026-07-14" });
    expect(res).toEqual({ error: null });
    expect(opsOf("memories", "insert")[0]?.payload).toEqual({
      space_id: SPACE,
      uploaded_by: "user-me",
      storage_path: `${SPACE}/${PHOTO}.jpg`,
      caption: "Playa",
      taken_on: "2026-07-14",
    });
    expect(state.revalidated).toEqual(expect.arrayContaining(["/recuerdos", "/inicio"]));
  });

  it("sin pie ni fecha guarda null (campos opcionales vacíos)", async () => {
    await addMemory({ path: `${SPACE}/${PHOTO}.jpg`, caption: "", takenOn: "" });
    expect(opsOf("memories", "insert")[0]?.payload).toMatchObject({ caption: null, taken_on: null });
  });

  it("rechaza una foto de la carpeta de otro espacio", async () => {
    const other = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const res = await addMemory({ path: `${other}/${PHOTO}.jpg` });
    expect(res.error).toBe("Ruta de foto no válida.");
    expect(state.fake.ops).toHaveLength(0);
  });

  it("rechaza rutas manipuladas", async () => {
    for (const path of ["../../secreto.jpg", `${SPACE}/${PHOTO}.png`, `${SPACE}/../x/${PHOTO}.jpg`, ""]) {
      expect((await addMemory({ path })).error).toBe("Ruta de foto no válida.");
    }
    expect(state.fake.ops).toHaveLength(0);
  });

  it("borra solo un recuerdo tuyo, y también su foto", async () => {
    state.fake = createFakeSupabase({
      results: { "memories:delete": { data: { storage_path: `${SPACE}/${PHOTO}.jpg` }, error: null } },
    });
    await expect(deleteMemory(form({ memoryId: MEMORY_ID }))).rejects.toThrow("NEXT_REDIRECT:/recuerdos");
    expect(opsOf("memories", "delete")[0]?.filters).toEqual([
      ["id", MEMORY_ID],
      ["uploaded_by", "user-me"],
    ]);
    expect(state.fake.storage.removed).toEqual([{ bucket: "memories", paths: [`${SPACE}/${PHOTO}.jpg`] }]);
  });

  it("si el recuerdo no era tuyo, no toca ninguna foto", async () => {
    state.fake = createFakeSupabase({ results: { "memories:delete": { data: null, error: null } } });
    await expect(deleteMemory(form({ memoryId: MEMORY_ID }))).rejects.toThrow("NEXT_REDIRECT:/recuerdos");
    expect(state.fake.storage.removed).toHaveLength(0);
  });
});

// ------------------------------------------------------------------ Chat

describe("Chat", () => {
  it("envía un mensaje y avisa a tu pareja con el texto", async () => {
    state.fake = createFakeSupabase({
      results: {
        "messages:insert": {
          data: {
            id: "m1",
            sender_id: "user-me",
            body: "Te quiero",
            image_path: null,
            created_at: "2026-09-23T18:00:00Z",
          },
          error: null,
        },
      },
    });
    const res = await sendMessage("  Te quiero  ");
    expect(res.error).toBeNull();
    expect(res.message?.id).toBe("m1");
    expect(opsOf("messages", "insert")[0]?.payload).toEqual({
      space_id: "space-1",
      sender_id: "user-me",
      body: "Te quiero",
      image_path: null,
    });
    expect(res.message?.image_url).toBeNull();
    expect(state.notified).toEqual([{ title: "💬 Rokito", body: "Te quiero", url: "/chat", tag: "chat" }]);
  });

  it("no envía mensajes vacíos ni gigantes, y no avisa", async () => {
    expect((await sendMessage("   ")).error).toBe("Escribe algo.");
    expect((await sendMessage("x".repeat(2001))).error).toBe("Máximo 2000 caracteres.");
    expect(state.fake.ops).toHaveLength(0);
    expect(state.notified).toHaveLength(0);
  });

  it("si falla al guardar, no avisa", async () => {
    state.fake = createFakeSupabase({ results: { "messages:insert": { data: null, error: { message: "x" } } } });
    expect((await sendMessage("hola")).error).toMatch(/No se pudo enviar/);
    expect(state.notified).toHaveLength(0);
  });

  it("abrir el chat lo marca como leído en tu espacio (quita el globo rojo)", async () => {
    await markChatRead();
    expect(state.fake.rpcCalls).toEqual([{ fn: "mark_chat_read", args: { p_space_id: "space-1" } }]);
  });

  it("sin espacio no marca nada", async () => {
    state.spaceId = null;
    await markChatRead();
    expect(state.fake.rpcCalls).toHaveLength(0);
  });

  const CHAT_SPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const CHAT_PHOTO = `${CHAT_SPACE}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg`;

  it("envía una foto con texto, devuelve su enlace temporal y avisa", async () => {
    state.spaceId = CHAT_SPACE;
    state.fake = createFakeSupabase({
      results: {
        "messages:insert": {
          data: { id: "m2", sender_id: "user-me", body: "Mira", image_path: CHAT_PHOTO, created_at: "2026-09-23T18:00:00Z" },
          error: null,
        },
      },
    });
    const res = await sendPhotoMessage({ path: CHAT_PHOTO, caption: " Mira " });
    expect(res.error).toBeNull();
    expect(opsOf("messages", "insert")[0]?.payload).toEqual({
      space_id: CHAT_SPACE,
      sender_id: "user-me",
      body: "Mira",
      image_path: CHAT_PHOTO,
    });
    expect(res.message?.image_url).toBe(`https://signed.test/chat/${CHAT_PHOTO}`);
    expect(state.notified).toEqual([{ title: "💬 Rokito", body: "📷 Mira", url: "/chat", tag: "chat" }]);
  });

  it("una foto sin texto también vale", async () => {
    state.spaceId = CHAT_SPACE;
    const res = await sendPhotoMessage({ path: CHAT_PHOTO, caption: "   " });
    expect(res.error).toBeNull();
    expect(opsOf("messages", "insert")[0]?.payload).toMatchObject({ body: "", image_path: CHAT_PHOTO });
    expect(state.notified[0]?.body).toBe("📷 Te ha enviado una foto");
  });

  it("rechaza fotos de otro espacio o con rutas manipuladas", async () => {
    state.spaceId = CHAT_SPACE;
    for (const path of [
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg",
      `${CHAT_SPACE}/../otra.jpg`,
      `${CHAT_SPACE}/cccccccc-cccc-4ccc-8ccc-cccccccccccc.png`,
      "https://evil.test/foto.jpg",
    ]) {
      expect((await sendPhotoMessage({ path, caption: "" })).error).toBe("Ruta de foto no válida.");
    }
    expect(state.fake.ops).toHaveLength(0);
    expect(state.notified).toHaveLength(0);
  });
});

// ------------------------------------------------------------- Corazones

describe("Corazones", () => {
  it("manda un paquete de corazones a tu espacio y avisa al empezar una racha", async () => {
    state.fake = createFakeSupabase({ results: { "rpc:add_hearts": { data: true, error: null } } });
    expect(await sendHearts(37)).toEqual({ error: null });
    expect(state.fake.rpcCalls).toEqual([{ fn: "add_hearts", args: { p_space_id: "space-1", p_count: 37 } }]);
    expect(state.notified).toEqual([
      { title: "💖 Corazones", body: "Rokito te está mandando corazones", url: "/juegos/corazones", tag: "hearts" },
    ]);
  });

  it("en mitad de una racha no vuelve a avisar", async () => {
    state.fake = createFakeSupabase({ results: { "rpc:add_hearts": { data: false, error: null } } });
    expect(await sendHearts(12)).toEqual({ error: null });
    expect(state.notified).toHaveLength(0);
  });

  it("rechaza paquetes vacíos, negativos, decimales o demasiado grandes", async () => {
    for (const bad of [0, -5, 1.5, 301, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect((await sendHearts(bad)).error).toBe("Número de corazones no válido.");
    }
    expect(state.fake.rpcCalls).toHaveLength(0);
  });

  it("si la base de datos lo rechaza, avisa del error y no notifica", async () => {
    state.fake = createFakeSupabase({ results: { "rpc:add_hearts": { data: null, error: { message: "x" } } } });
    expect((await sendHearts(5)).error).toMatch(/No se pudieron mandar/);
    expect(state.notified).toHaveLength(0);
  });

  it("sin sesión o sin espacio no manda nada", async () => {
    state.fake = createFakeSupabase({ userId: null });
    expect((await sendHearts(5)).error).toMatch(/sesión/);
    state.fake = createFakeSupabase();
    state.spaceId = null;
    expect((await sendHearts(5)).error).toMatch(/espacio/);
    expect(state.fake.rpcCalls).toHaveLength(0);
  });
});

// --------------------------------------------------------- Momento Ratta

describe("Momento Ratta", () => {
  const SPACE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const PATH = `${SPACE}/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg`;
  const inserted = (late: number) =>
    createFakeSupabase({ results: { "moment_photos:insert": { data: { late_seconds: late }, error: null } } });

  beforeEach(() => {
    state.spaceId = SPACE;
  });

  it("sube tu Momento de hoy y avisa a tu pareja de que llegaste a tiempo", async () => {
    state.fake = inserted(0);
    expect(await postMoment({ path: PATH, caption: " Currando " })).toEqual({ error: null, lateSeconds: 0 });
    expect(opsOf("moment_photos", "insert")[0]?.payload).toEqual({
      space_id: SPACE,
      day: todayKey(),
      user_id: "user-me",
      storage_path: PATH,
      caption: "Currando",
    });
    expect(state.notified).toEqual([
      { title: "📸 Momento Ratta", body: "Rokito ha subido su Momento ¡a tiempo!", url: "/momento", tag: "momento" },
    ]);
  });

  it("si llegas tarde, el aviso lo dice (el retraso lo calcula la base de datos)", async () => {
    state.fake = inserted(754);
    await postMoment({ path: PATH, caption: "" });
    expect(opsOf("moment_photos", "insert")[0]?.payload).toMatchObject({ caption: null });
    expect(state.notified[0]?.body).toBe("Rokito ha subido su Momento (13 min tarde)");
  });

  it("explica por qué no se pudo: aún no ha sonado, o ya subiste el de hoy", async () => {
    state.fake = createFakeSupabase({
      results: { "moment_photos:insert": { data: null, error: { message: "el momento de hoy aun no ha sonado" } } },
    });
    expect((await postMoment({ path: PATH, caption: "" })).error).toBe("El Momento de hoy aún no ha sonado.");
    state.fake = createFakeSupabase({
      results: {
        "moment_photos:insert": { data: null, error: { message: "duplicate key value violates unique constraint" } },
      },
    });
    expect((await postMoment({ path: PATH, caption: "" })).error).toBe("Ya has subido tu Momento de hoy.");
    expect(state.notified).toHaveLength(0);
  });

  it("rechaza fotos de otro espacio, rutas manipuladas y textos largos", async () => {
    for (const path of ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee.jpg", `${SPACE}/x.jpg`]) {
      expect((await postMoment({ path, caption: "" })).error).toBe("Ruta de foto no válida.");
    }
    expect((await postMoment({ path: PATH, caption: "x".repeat(141) })).error).toBe("Máximo 140 caracteres.");
    expect(state.fake.ops).toHaveLength(0);
  });
});

// ------------------------------------------------------------ Flappy Rata

describe("Flappy Rata", () => {
  const withBests = (myPrev: number, partnerBest: number) =>
    createFakeSupabase({
      results: { "rpc:record_game_score": { data: { my_prev_best: myPrev, partner_best: partnerBest }, error: null } },
    });

  it("guarda la partida en tu espacio", async () => {
    state.fake = withBests(3, 10);
    expect(await submitFlappyScore(5)).toEqual({ error: null, personalBest: true, stoleRecord: false });
    expect(state.fake.rpcCalls).toEqual([
      { fn: "record_game_score", args: { p_space_id: "space-1", p_game: "flappy", p_score: 5 } },
    ]);
    expect(state.notified).toHaveLength(0);
  });

  it("si le quitas el récord a tu pareja, le llega un aviso", async () => {
    state.fake = withBests(8, 12);
    expect(await submitFlappyScore(13)).toEqual({ error: null, personalBest: true, stoleRecord: true });
    expect(state.notified).toEqual([
      { title: "🐀 Flappy Rata", body: "Rokito te ha quitado el récord con 13 puntos 😈", url: "/juegos/flappy", tag: "flappy" },
    ]);
  });

  it("si ya tenías tú el récord, no vuelve a avisar en cada partida", async () => {
    state.fake = withBests(20, 12);
    expect(await submitFlappyScore(25)).toEqual({ error: null, personalBest: true, stoleRecord: false });
    expect(state.notified).toHaveLength(0);
  });

  it("empatar o quedarse por debajo no es quitar el récord", async () => {
    state.fake = withBests(5, 12);
    expect((await submitFlappyScore(12)).stoleRecord).toBe(false);
    expect((await submitFlappyScore(4)).personalBest).toBe(false);
    expect(state.notified).toHaveLength(0);
  });

  it("rechaza puntuaciones imposibles", async () => {
    for (const bad of [-1, 2.5, 10001, Number.NaN]) {
      expect((await submitFlappyScore(bad)).error).toBe("Puntuación no válida.");
    }
    expect(state.fake.rpcCalls).toHaveLength(0);
  });
});

// ---------------------------------------------------------- Notificaciones

describe("Notificaciones a la pareja", () => {
  it("cada acción que crea algo avisa con su texto", async () => {
    await sendNudge({ error: null, sent: false }, form({ key: "te_echo_de_menos" }));
    await logEntry();
    await createEvent(ok, form({ title: "Cena", date: "2026-09-25", time: "20:00", location: "", description: "" }));
    await createNote(ok, form({ noteType: "text", title: "Ideas", content: "Roma" }));
    await submitAnswer(ok, form({ roundId: ROUND_ID, answer: "Secreto" }));
    state.spaceId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await addMemory({ path: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg", caption: "Playa" });

    expect(state.notified.map((n) => `${n.title} | ${n.body} | ${n.url}`)).toEqual([
      "🥺 Rokito | Te echo de menos | /inicio",
      "👑 El Trono | Rokito acaba de visitar El Trono 💩 | /juegos/trono",
      expect.stringMatching(/^📅 Nuevo plan \| Rokito ha añadido: Cena \(vie, 25 sept?, 20:00\) \| \/calendario$/),
      "📝 Nueva nota | Rokito: Ideas | /notas/new-id",
      "❓ Pregunta del día | Rokito ya ha respondido. ¡Te toca! | /inicio",
      "📸 Nuevo recuerdo | Rokito ha subido una foto: Playa | /recuerdos",
    ]);
  });

  it("la notificación de la pregunta del día NUNCA incluye la respuesta", async () => {
    await submitAnswer(ok, form({ roundId: ROUND_ID, answer: "Mi respuesta secreta" }));
    expect(JSON.stringify(state.notified)).not.toContain("secreta");
  });

  it("si la acción falla por validación, no se avisa", async () => {
    await createNote(ok, form({ noteType: "text", title: "", content: "x" }));
    await createEvent(ok, form({ title: "Cena", date: "2026-09-25", time: "", location: "", description: "" }));
    expect(state.notified).toHaveLength(0);
  });
});
