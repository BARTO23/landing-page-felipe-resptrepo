import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { getApifyToken, createCheckoutSession } from '../../../lib/epayco';
import { guardarTransaccion } from '../../../lib/transacciones';
import { buscarReservaPorId } from '../../../lib/reservas';
import { servicios } from '../../../data/servicios';

export const POST: APIRoute = async ({ request }) => {
  const siteUrl = new URL(request.url).origin;

  try {
    const body = await request.json();
    const servicioId = typeof body.servicio_id === 'string' ? body.servicio_id.trim() : '';
    const fecha = typeof body.fecha === 'string' ? body.fecha.trim() : '';
    const hora = typeof body.hora === 'string' ? body.hora.trim() : '';
    const nombreCliente = typeof body.nombre_cliente === 'string' ? body.nombre_cliente.trim() : '';
    const telefonoCliente = typeof body.telefono_cliente === 'string' ? body.telefono_cliente.trim() : '';
    const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';

    if (!servicioId) {
      return new Response(JSON.stringify({ error: 'servicio_id es requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const servicio = servicios.find((s) => s.id === servicioId);

    if (!servicio) {
      return new Response(JSON.stringify({ error: 'Servicio no encontrado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verificar que existe una reserva temporal valida si se proporciona session_id
    let reservaValida = null;
    if (sessionId) {
      reservaValida = buscarReservaPorId(sessionId);
      if (!reservaValida || reservaValida.estado !== 'activa') {
        return new Response(
          JSON.stringify({ error: 'Su reserva ha expirado o no es valida. Por favor inicie el proceso nuevamente.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // Verificar que los datos coincidan
      if (reservaValida.fecha !== fecha || reservaValida.hora !== hora) {
        return new Response(
          JSON.stringify({ error: 'Los datos de la reserva no coinciden. Por favor inicie el proceso nuevamente.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const referencia = `asesoria_${Date.now().toString(36)}_${randomUUID().slice(0, 8)}`;

    const extras: Record<string, string> = {};
    extras.extra1 = servicio.id;
    if (fecha) extras.extra2 = fecha;
    if (hora) extras.extra3 = hora;
    if (nombreCliente) extras.extra4 = nombreCliente;
    if (telefonoCliente) extras.extra5 = telefonoCliente;
    if (sessionId) extras.extra6 = sessionId; // Guardar sessionId para vincular con reserva

    const sesion: any = {
      checkout_version: '2',
      name: 'Juan Felipe Restrepo Sanchez - Abogado',
      description: servicio.titulo,
      currency: 'COP',
      amount: servicio.precio,
      invoice: referencia,
      extras,
    };

    if (!siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) {
      sesion.response = `${siteUrl}/pago/confirmacion?referencia=${referencia}`;
      sesion.confirmation = `${siteUrl}/api/webhook/epayco`;
    }

    const apifyToken = await getApifyToken();
    const result = await createCheckoutSession(sesion, apifyToken);

    if (fecha && hora && nombreCliente) {
      const datosCita = { fecha, hora, nombreCliente, telefonoCliente };
      guardarTransaccion({
        id: referencia,
        payment_id: '',
        servicio_id: servicio.id,
        servicio_nombre: servicio.titulo,
        monto: servicio.precio,
        estado: 'pending',
        external_reference: referencia,
        fecha: new Date().toISOString(),
        gateway: 'epayco',
        datos_cita: datosCita,
      });
    }

    // NOTA: la reserva permanece en 'activa' (pending_payment). Solo se
    // confirma cuando el webhook de ePayco reporte el pago como aprobado.
    console.log(`[ePayco] Sesion creada: ${referencia} - ${servicio.titulo} (session_id=${sessionId || 'n/a'})`);

    return new Response(JSON.stringify({ sessionId: result.sessionId, referencia }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[ePayco] Error al crear sesion:', error);
    const detail = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    return new Response(JSON.stringify({ error: 'Error al crear la sesion de pago', detail }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
