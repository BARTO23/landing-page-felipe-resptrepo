import type { APIRoute } from 'astro';
import { buscarReservaPorId } from '../../../lib/reservas';

export const GET: APIRoute = async ({ params }) => {
  try {
    const sessionId = params.sessionId;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reserva = buscarReservaPorId(sessionId);

    if (!reserva) {
      return new Response(
        JSON.stringify({ success: false, estado: 'no_encontrada', vigente: false }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Vigente = todavía se puede pagar contra este hold.
    const vigente = reserva.estado === 'activa' || reserva.estado === 'confirmada';

    return new Response(
      JSON.stringify({
        success: true,
        vigente,
        reserva: {
          id: reserva.id,
          fecha: reserva.fecha,
          hora: reserva.hora,
          estado: reserva.estado,
          expiraEn: reserva.expiraEn,
          servicioId: reserva.servicioId,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[API] Error al verificar reserva:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
