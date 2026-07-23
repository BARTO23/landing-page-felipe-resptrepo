import type { APIRoute } from 'astro';
import { crearReservaTemporal, estaDisponible } from '../../lib/reservas';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { servicioId, fecha, hora, nombre, telefono, email, precio, duracionMinutos } = body;

    // Validaciones
    if (!servicioId || !fecha || !hora || !nombre || !telefono) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: servicioId, fecha, hora, nombre, telefono' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const emailLimpio = typeof email === 'string' ? email.trim() : '';
    if (emailLimpio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpio)) {
      return new Response(
        JSON.stringify({ error: 'El correo electrónico no tiene un formato válido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      return new Response(
        JSON.stringify({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar disponibilidad
    if (!estaDisponible(fecha, hora)) {
      return new Response(
        JSON.stringify({ error: 'La fecha y hora seleccionadas ya no están disponibles' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Crear reserva temporal
    const reserva = crearReservaTemporal(
      servicioId,
      fecha,
      hora,
      nombre.trim(),
      telefono.trim(),
      typeof precio === 'number' ? precio : 100000,
      typeof duracionMinutos === 'number' ? duracionMinutos : 60,
      emailLimpio || undefined
    );

    if (!reserva) {
      return new Response(
        JSON.stringify({ error: 'No se pudo crear la reserva. La fecha/hora ya fue tomada.' }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: reserva.id,
        expiraEn: reserva.expiraEn,
        mensaje: 'Reserva temporal creada. Tiene 10 minutos para completar el pago.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[API] Error al crear reserva temporal:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno al crear la reserva' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
