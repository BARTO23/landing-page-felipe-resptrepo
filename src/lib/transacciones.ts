import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Transaccion {
  id: string;
  payment_id: string;
  servicio_id: string;
  servicio_nombre: string;
  monto: number;
  estado: 'pending' | 'approved' | 'rejected' | 'failed';
  external_reference: string;
  fecha: string;
  notificacion_id?: string;
  gateway: 'epayco' | 'mercadopago' | 'wompi';
  datos_cita?: {
    fecha: string;
    hora: string;
    nombreCliente: string;
    telefonoCliente: string;
  };
}

const DATA_DIR = resolve('data');
const FILE_PATH = resolve(DATA_DIR, 'transacciones.json');

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function leerTransacciones(): Transaccion[] {
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

function guardarTransacciones(transacciones: Transaccion[]) {
  ensureDataDir();
  writeFileSync(FILE_PATH, JSON.stringify(transacciones, null, 2), 'utf-8');
}

export function buscarTransaccionPorNotificacion(notificacionId: string): Transaccion | undefined {
  const transacciones = leerTransacciones();
  return transacciones.find((t) => t.notificacion_id === notificacionId);
}

export function buscarTransaccionPorReferencia(referencia: string): Transaccion | undefined {
  const transacciones = leerTransacciones();
  return transacciones.find((t) => t.external_reference === referencia);
}

export function guardarTransaccion(transaccion: Transaccion) {
  const transacciones = leerTransacciones();
  transacciones.push(transaccion);
  guardarTransacciones(transacciones);
}

export function actualizarEstadoTransaccion(paymentId: string, estado: Transaccion['estado'], notificacionId: string) {
  const transacciones = leerTransacciones();
  const index = transacciones.findIndex((t) => t.payment_id === paymentId);
  if (index !== -1) {
    transacciones[index].estado = estado;
    transacciones[index].notificacion_id = notificacionId;
    guardarTransacciones(transacciones);
  }
}
