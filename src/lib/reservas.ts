import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Estado de una reserva (equivalente a la tabla `appointments` del spec):
 *  - 'activa'      => pending_payment: hold temporal, esperando pago.
 *  - 'confirmada'  => confirmed: pago aprobado, evento creado en Calendar.
 *  - 'expirada'    => expired: el hold venció sin pago.
 *  - 'cancelada'   => cancelled: el pago falló o se liberó manualmente.
 *
 * Un slot está OCUPADO si existe una reserva 'activa' o 'confirmada' para
 * ese (fecha, hora). 'expirada' y 'cancelada' liberan el slot.
 */
export interface ReservaTemporal {
  id: string; // session_id único
  servicioId: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  nombreCliente: string;
  telefonoCliente: string;
  emailCliente?: string;
  precio: number;
  duracionMinutos: number;
  creadaEn: string; // ISO string
  expiraEn: string; // ISO string (hold_expires_at)
  estado: 'activa' | 'confirmada' | 'expirada' | 'cancelada';
  transaccionReferencia?: string; // payment_reference
  googleEventId?: string; // google_event_id
}

const DATA_DIR = resolve('data');
const FILE_PATH = resolve(DATA_DIR, 'reservas.json');
const TIEMPO_EXPIRACION_MS = 10 * 60 * 1000; // 10 minutos (hold)

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function leerReservas(): ReservaTemporal[] {
  ensureDataDir();
  if (!existsSync(FILE_PATH)) {
    return [];
  }
  try {
    const raw = readFileSync(FILE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function guardarReservas(reservas: ReservaTemporal[]) {
  ensureDataDir();
  writeFileSync(FILE_PATH, JSON.stringify(reservas, null, 2), 'utf-8');
}

/**
 * Marca como 'expirada' todo hold 'activa' cuyo hold_expires_at ya pasó,
 * persiste el cambio y devuelve la lista completa de reservas.
 * (Sustituye al "job de limpieza" del spec: se ejecuta al leer disponibilidad.)
 */
function expirarHoldsVencidos(): ReservaTemporal[] {
  const ahora = Date.now();
  let cambio = false;
  const reservas = leerReservas().map((r) => {
    if (r.estado === 'activa' && new Date(r.expiraEn).getTime() < ahora) {
      cambio = true;
      return { ...r, estado: 'expirada' as const };
    }
    return r;
  });
  if (cambio) guardarReservas(reservas);
  return reservas;
}

/** Estados que ocupan el slot y deben bloquearlo. */
function ocupaSlot(r: ReservaTemporal): boolean {
  return r.estado === 'activa' || r.estado === 'confirmada';
}

/**
 * Verifica si una fecha y hora están disponibles según los holds locales.
 * (La combinación con Google Calendar se hace en el endpoint de disponibilidad.)
 */
export function estaDisponible(fecha: string, hora: string): boolean {
  const reservas = expirarHoldsVencidos();
  return !reservas.some((r) => r.fecha === fecha && r.hora === hora && ocupaSlot(r));
}

/**
 * Crea un hold temporal (pending_payment). Devuelve null si el slot ya está
 * ocupado. Re-verifica justo antes de escribir para minimizar la ventana de
 * condición de carrera (best-effort sobre almacenamiento en archivo).
 */
export function crearReservaTemporal(
  servicioId: string,
  fecha: string,
  hora: string,
  nombreCliente: string,
  telefonoCliente: string,
  precio: number,
  duracionMinutos: number,
  emailCliente?: string
): ReservaTemporal | null {
  const reservas = expirarHoldsVencidos();

  // Re-check de disponibilidad sobre la lista ya cargada (misma pasada).
  const ocupado = reservas.some((r) => r.fecha === fecha && r.hora === hora && ocupaSlot(r));
  if (ocupado) {
    return null;
  }

  const ahora = new Date();
  const expira = new Date(ahora.getTime() + TIEMPO_EXPIRACION_MS);

  const reserva: ReservaTemporal = {
    id: `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    servicioId,
    fecha,
    hora,
    nombreCliente,
    telefonoCliente,
    emailCliente,
    precio,
    duracionMinutos,
    creadaEn: ahora.toISOString(),
    expiraEn: expira.toISOString(),
    estado: 'activa',
  };

  reservas.push(reserva);
  guardarReservas(reservas);

  return reserva;
}

/**
 * Busca una reserva por su ID de sesión (aplicando expiración de holds).
 */
export function buscarReservaPorId(id: string): ReservaTemporal | undefined {
  return expirarHoldsVencidos().find((r) => r.id === id);
}

/**
 * Confirma una reserva (pago aprobado). Idempotente: si ya está 'confirmada'
 * devuelve la reserva sin volver a escribir. Guarda referencia de pago y,
 * opcionalmente, el google_event_id.
 *
 * Devuelve:
 *  - { ok: true, yaConfirmada: boolean, reserva } si se pudo confirmar.
 *  - { ok: false, motivo } si la reserva no existe o el slot fue tomado.
 */
export function confirmarReserva(
  id: string,
  transaccionReferencia: string,
  googleEventId?: string
): { ok: boolean; yaConfirmada: boolean; reserva?: ReservaTemporal; motivo?: string } {
  const reservas = leerReservas();
  const index = reservas.findIndex((r) => r.id === id);
  if (index === -1) {
    return { ok: false, yaConfirmada: false, motivo: 'no_encontrada' };
  }

  const reserva = reservas[index];

  // Idempotencia: ya confirmada, no reprocesar.
  if (reserva.estado === 'confirmada') {
    return { ok: true, yaConfirmada: true, reserva };
  }

  // Edge case: el hold expiró antes de llegar el pago. Se puede confirmar
  // igual solo si NINGUNA otra reserva confirmada tomó el mismo slot.
  const slotTomadoPorOtro = reservas.some(
    (r) =>
      r.id !== id &&
      r.fecha === reserva.fecha &&
      r.hora === reserva.hora &&
      r.estado === 'confirmada'
  );
  if (slotTomadoPorOtro) {
    return { ok: false, yaConfirmada: false, reserva, motivo: 'slot_tomado' };
  }

  reserva.estado = 'confirmada';
  reserva.transaccionReferencia = transaccionReferencia;
  if (googleEventId) reserva.googleEventId = googleEventId;
  guardarReservas(reservas);

  return { ok: true, yaConfirmada: false, reserva };
}

/** Guarda el google_event_id en una reserva ya confirmada. */
export function guardarEventoCalendar(id: string, googleEventId: string): boolean {
  const reservas = leerReservas();
  const index = reservas.findIndex((r) => r.id === id);
  if (index === -1) return false;
  reservas[index].googleEventId = googleEventId;
  guardarReservas(reservas);
  return true;
}

/**
 * Libera un hold (pago rechazado/fallido o expiración). Cambia el estado a
 * 'cancelada' salvo que ya esté confirmada (en cuyo caso no se toca).
 */
export function liberarReserva(id: string, motivo: 'cancelada' | 'expirada' = 'cancelada'): boolean {
  const reservas = leerReservas();
  const index = reservas.findIndex((r) => r.id === id);
  if (index === -1) return false;
  if (reservas[index].estado === 'confirmada') return false;
  reservas[index].estado = motivo;
  guardarReservas(reservas);
  return true;
}

/**
 * Obtiene las horas ocupadas (activa o confirmada) para una fecha,
 * según los holds locales.
 */
export function obtenerHorasBloqueadas(fecha: string): string[] {
  return expirarHoldsVencidos()
    .filter((r) => r.fecha === fecha && ocupaSlot(r))
    .map((r) => r.hora);
}
