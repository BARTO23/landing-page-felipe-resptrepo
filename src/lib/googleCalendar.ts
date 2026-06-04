import { google } from 'googleapis';

const TIMEZONE = 'America/Bogota';

function getAuth() {
  const credentials = {
    client_email: import.meta.env.GOOGLE_CLIENT_EMAIL,
    private_key: (import.meta.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });

  return auth;
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

export async function crearEventoAsesoria(data: EventoData): Promise<boolean> {
  const calendarId = import.meta.env.GOOGLE_CALENDAR_ID;

  if (!calendarId || !import.meta.env.GOOGLE_CLIENT_EMAIL) {
    console.error('Google Calendar no configurado. GOOGLE_CLIENT_EMAIL o GOOGLE_CALENDAR_ID faltan.');
    return false;
  }

  try {
    const auth = getAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const [horaInicio, minutoInicio] = data.hora.split(':').map(Number);
    const inicio = new Date(`${data.fecha}T12:00:00`);
    inicio.setHours(horaInicio, minutoInicio, 0, 0);
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

    await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    console.log(`Evento creado en Google Calendar: ${data.servicioNombre} - ${data.nombreCliente}`);
    return true;
  } catch (error) {
    console.error('Error al crear evento en Google Calendar:', error);
    return false;
  }
}
