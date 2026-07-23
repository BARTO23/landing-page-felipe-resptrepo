import type { APIRoute } from 'astro';
import { obtenerHorasBloqueadas } from '../../lib/reservas';
import { horasOcupadasEnCalendario } from '../../lib/googleCalendar';

const HORAS_BASE = [
  '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00',
];

const DURACION_SLOT_MIN = 60;

export const GET: APIRoute = async ({ url }) => {
  try {
    const fecha = url.searchParams.get('fecha'); // Formato: YYYY-MM-DD

    if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return new Response(JSON.stringify({ error: 'Fecha inválida. Use formato YYYY-MM-DD' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fuente 1: holds locales (pending_payment) + citas confirmadas.
    const bloqueadasLocal = obtenerHorasBloqueadas(fecha);

    // Fuente 2: Google Calendar del abogado (freebusy). Fail-open: si el
    // calendario no está configurado o falla, devuelve [].
    const bloqueadasCalendar = await horasOcupadasEnCalendario(fecha, HORAS_BASE, DURACION_SLOT_MIN);

    // Unión de ambas fuentes.
    const horasBloqueadas = Array.from(new Set([...bloqueadasLocal, ...bloqueadasCalendar]));
    const horasDisponibles = HORAS_BASE.filter((hora) => !horasBloqueadas.includes(hora));

    return new Response(
      JSON.stringify({
        fecha,
        horasDisponibles,
        horasBloqueadas,
        totalDisponibles: horasDisponibles.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[API] Error al verificar disponibilidad:', error);
    return new Response(JSON.stringify({ error: 'Error interno al verificar disponibilidad' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
