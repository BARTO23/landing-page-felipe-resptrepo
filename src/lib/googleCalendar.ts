import { google } from 'googleapis';

const TIMEZONE = 'America/Bogota';
// Colombia no aplica horario de verano: siempre UTC-05:00.
const BOGOTA_OFFSET = '-05:00';

function getAuth() {
  const credentials = {
    client_email: import.meta.env.GOOGLE_CLIENT_EMAIL,
    private_key: (import.meta.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    // 'calendar' cubre events.insert/patch/delete y freebusy.query.
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });

  return auth;
}

function calendarConfigurado(): boolean {
  return Boolean(
    import.meta.env.GOOGLE_CALENDAR_ID &&
      import.meta.env.GOOGLE_CLIENT_EMAIL &&
      import.meta.env.GOOGLE_PRIVATE_KEY
  );
}

/**
 * Construye el instante de inicio de un slot en hora Bogotá, sin depender
 * de la zona horaria del servidor (usa offset explícito -05:00).
 */
function instanteInicio(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora}:00${BOGOTA_OFFSET}`);
}

export interface EventoData {
  fecha: string;
  hora: string;
  nombreCliente: string;
  telefonoCliente: string;
  servicioNombre: string;
  duracionMinutos: number;
  paymentId: string;
}

export interface ResultadoEvento {
  ok: boolean;
  eventId?: string;
}

export async function crearEventoAsesoria(data: EventoData): Promise<ResultadoEvento> {
  const calendarId = import.meta.env.GOOGLE_CALENDAR_ID;

  if (!calendarConfigurado()) {
    console.error('[Calendar] Google Calendar no configurado. Variables faltantes:', {
      GOOGLE_CLIENT_EMAIL: !!import.meta.env.GOOGLE_CLIENT_EMAIL,
      GOOGLE_CALENDAR_ID: !!calendarId,
      GOOGLE_PRIVATE_KEY: !!import.meta.env.GOOGLE_PRIVATE_KEY,
    });
    return { ok: false };
  }

  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const inicio = instanteInicio(data.fecha, data.hora);
    const fin = new Date(inicio.getTime() + data.duracionMinutos * 60000);

    const event = {
      summary: `Asesoría - ${data.servicioNombre} - ${data.nombreCliente}`,
      description: [
        `Servicio: ${data.servicioNombre}`,
        `Cliente: ${data.nombreCliente}`,
        `Teléfono: ${data.telefonoCliente}`,
        `Pago ID: ${data.paymentId}`,
      ].join('\n'),
      start: {
        dateTime: inicio.toISOString(),
        timeZone: TIMEZONE,
      },
      end: {
        dateTime: fin.toISOString(),
        timeZone: TIMEZONE,
      },
    };

    const res = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    const eventId = res.data.id || undefined;
    console.log(
      `[Calendar] Evento creado: "${data.servicioNombre}" - ${data.nombreCliente} (${data.fecha} ${data.hora}) id=${eventId}`
    );
    return { ok: true, eventId };
  } catch (error) {
    console.error('[Calendar] Error al crear evento en Google Calendar:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fecha: data.fecha,
      hora: data.hora,
      servicio: data.servicioNombre,
      cliente: data.nombreCliente,
      calendarId,
    });
    return { ok: false };
  }
}

/**
 * Cancela (elimina) un evento del calendario del abogado.
 * Usado cuando una cita confirmada se cancela.
 */
export async function cancelarEventoAsesoria(eventId: string): Promise<boolean> {
  const calendarId = import.meta.env.GOOGLE_CALENDAR_ID;
  if (!calendarConfigurado() || !eventId) return false;

  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.events.delete({ calendarId, eventId });
    console.log(`[Calendar] Evento cancelado: ${eventId}`);
    return true;
  } catch (error) {
    console.error('[Calendar] Error al cancelar evento:', {
      error: error instanceof Error ? error.message : String(error),
      eventId,
    });
    return false;
  }
}

/**
 * Reprograma un evento existente a una nueva fecha/hora (events.patch).
 * Usado para reprogramar una cita ya confirmada.
 */
export async function reprogramarEventoAsesoria(
  eventId: string,
  fecha: string,
  hora: string,
  duracionMinutos: number
): Promise<boolean> {
  const calendarId = import.meta.env.GOOGLE_CALENDAR_ID;
  if (!calendarConfigurado() || !eventId) return false;

  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: 'v3', auth });
    const inicio = instanteInicio(fecha, hora);
    const fin = new Date(inicio.getTime() + duracionMinutos * 60000);

    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        start: { dateTime: inicio.toISOString(), timeZone: TIMEZONE },
        end: { dateTime: fin.toISOString(), timeZone: TIMEZONE },
      },
    });
    console.log(`[Calendar] Evento reprogramado: ${eventId} -> ${fecha} ${hora}`);
    return true;
  } catch (error) {
    console.error('[Calendar] Error al reprogramar evento:', {
      error: error instanceof Error ? error.message : String(error),
      eventId,
    });
    return false;
  }
}

export interface BloqueOcupado {
  start: string; // ISO
  end: string; // ISO
}

/**
 * Consulta los bloques ocupados en el calendario del abogado para un día
 * concreto usando freebusy.query. Devuelve intervalos en UTC (ISO).
 * Si el calendario no está configurado o falla, devuelve [] (fail-open):
 * la disponibilidad se sigue calculando con los holds locales.
 */
export async function obtenerBloquesOcupados(fecha: string): Promise<BloqueOcupado[]> {
  const calendarId = import.meta.env.GOOGLE_CALENDAR_ID;
  if (!calendarConfigurado()) return [];

  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const timeMin = new Date(`${fecha}T00:00:00${BOGOTA_OFFSET}`).toISOString();
    const timeMax = new Date(`${fecha}T23:59:59${BOGOTA_OFFSET}`).toISOString();

    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin,
        timeMax,
        timeZone: TIMEZONE,
        items: [{ id: calendarId }],
      },
    });

    const busy = res.data.calendars?.[calendarId!]?.busy || [];
    return busy
      .filter((b): b is { start: string; end: string } => Boolean(b.start && b.end))
      .map((b) => ({ start: b.start, end: b.end }));
  } catch (error) {
    console.error('[Calendar] Error en freebusy.query (fail-open):', {
      error: error instanceof Error ? error.message : String(error),
      fecha,
    });
    return [];
  }
}

/**
 * Dada una fecha y una lista de horas candidatas (HH:MM), devuelve las horas
 * que solapan con algún bloque ocupado del calendario del abogado.
 */
export async function horasOcupadasEnCalendario(
  fecha: string,
  horas: string[],
  duracionMinutos: number
): Promise<string[]> {
  const bloques = await obtenerBloquesOcupados(fecha);
  if (bloques.length === 0) return [];

  const intervalos = bloques.map((b) => ({
    start: new Date(b.start).getTime(),
    end: new Date(b.end).getTime(),
  }));

  return horas.filter((hora) => {
    const inicio = instanteInicio(fecha, hora).getTime();
    const fin = inicio + duracionMinutos * 60000;
    // Solapa si inicio < finBloque && fin > inicioBloque
    return intervalos.some((iv) => inicio < iv.end && fin > iv.start);
  });
}
