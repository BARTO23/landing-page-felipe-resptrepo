import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { actualizarEstadoTransaccion, buscarTransaccionPorNotificacion, guardarTransaccion } from '../../../lib/transacciones';
import { buscarReservaPorId, confirmarReserva, guardarEventoCalendar, liberarReserva } from '../../../lib/reservas';
import { notificarPagoAprobado, notificarCitaConfirmada } from '../../../lib/notificaciones';
import { crearEventoAsesoria, type EventoData } from '../../../lib/googleCalendar';
import { servicios } from '../../../data/servicios';

function validateSignature(params: Record<string, string>): boolean {
  const customerId = import.meta.env.EPAYCO_CUSTOMER_ID;
  const pKey = import.meta.env.EPAYCO_P_KEY;

  if (!customerId || !pKey) {
    console.error('EPAYCO_CUSTOMER_ID o EPAYCO_P_KEY no configurados');
    return false;
  }

  const signature = createHash('sha256')
    .update(`${customerId}^${pKey}^${params.x_ref_payco}^${params.x_transaction_id}^${params.x_amount}^${params.x_currency_code}`)
    .digest('hex');

  return signature === params.x_signature;
}

function parseFormData(body: string): Record<string, string> {
  const params: Record<string, string> = {};
  const pairs = body.split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map((s) => decodeURIComponent(s.replace(/\+/g, ' ')));
    if (key) params[key] = value || '';
  }
  return params;
}

/**
 * Crea el evento en Google Calendar para una cita aprobada y persiste el
 * google_event_id en la reserva (si hay sessionId).
 */
async function crearEventoYGuardar(
  extras: { servicioId: string; fecha: string; hora: string; nombre: string; telefono: string; description: string },
  transactionId: string,
  sessionId: string,
  monto: number
) {
  const servicio = servicios.find((s) => s.id === extras.servicioId);
  const servicioNombre = servicio?.titulo || extras.description;
  const duracionMinutos = servicio?.duracion_minutos || 60;

  const eventoData: EventoData = {
    fecha: extras.fecha,
    hora: extras.hora,
    nombreCliente: extras.nombre,
    telefonoCliente: extras.telefono,
    servicioNombre,
    duracionMinutos,
    paymentId: transactionId,
  };

  const resultado = await crearEventoAsesoria(eventoData);
  if (resultado.ok) {
    if (sessionId && resultado.eventId) {
      guardarEventoCalendar(sessionId, resultado.eventId);
    }
    console.log(`[Webhook] Evento de calendario creado para transacción ${transactionId} (event=${resultado.eventId})`);
  } else {
    console.error(`[Webhook] Error al crear evento en Google Calendar para transacción ${transactionId}`, eventoData);
  }

  // El email del cliente vive en la reserva (no en los extras de ePayco).
  const reserva = sessionId ? buscarReservaPorId(sessionId) : undefined;

  // Notificar aunque Calendar haya fallado: el pago es válido y la cita existe.
  await notificarCitaConfirmada({
    fecha: extras.fecha,
    hora: extras.hora,
    nombreCliente: extras.nombre,
    telefonoCliente: extras.telefono,
    emailCliente: reserva?.emailCliente,
    servicioNombre,
    duracionMinutos,
    paymentId: transactionId,
    monto,
  });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const params = parseFormData(rawBody);

    console.log(`[Webhook] Notificación recibida de ePayco`, {
      x_response: params.x_response,
      x_transaction_id: params.x_transaction_id,
      x_ref_payco: params.x_ref_payco,
      x_extra1: params.x_extra1,
      x_extra2: params.x_extra2,
      x_extra3: params.x_extra3,
      x_extra6: params.x_extra6,
    });

    if (!validateSignature(params)) {
      console.error('Firma inválida de ePayco - posible intento de fraude');
      return new Response('Invalid signature', { status: 400 });
    }

    const transactionId = params.x_transaction_id;
    const refPayco = params.x_ref_payco;

    if (!transactionId) {
      return new Response('Missing transaction_id', { status: 400 });
    }

    // Idempotencia: ePayco puede reenviar la misma notificación. Si ya la
    // procesamos, respondemos 200 sin reprocesar.
    if (buscarTransaccionPorNotificacion(transactionId)) {
      console.log(`[Webhook] Notificación ${transactionId} ya procesada (idempotente)`);
      return new Response('OK', { status: 200 });
    }

    const response = params.x_response;
    const amount = parseFloat(params.x_amount || '0');
    const description = params.x_description || 'Servicio legal';
    const extra1 = params.x_extra1 || ''; // servicio_id
    const extra2 = params.x_extra2 || ''; // fecha
    const extra3 = params.x_extra3 || ''; // hora
    const extra4 = params.x_extra4 || ''; // nombre
    const extra5 = params.x_extra5 || ''; // telefono
    const sessionId = params.x_extra6 || ''; // session_id de la reserva

    const tieneCita = Boolean(extra1 && extra2 && extra3 && extra4);

    switch (response) {
      case 'Aceptada': {
        actualizarEstadoTransaccion(transactionId, 'approved', transactionId);
        guardarTransaccion({
          id: transactionId,
          payment_id: refPayco,
          servicio_id: extra1,
          servicio_nombre: description,
          monto: amount,
          estado: 'approved',
          external_reference: refPayco,
          fecha: new Date().toISOString(),
          notificacion_id: transactionId,
          gateway: 'epayco',
          datos_cita: tieneCita
            ? { fecha: extra2, hora: extra3, nombreCliente: extra4, telefonoCliente: extra5 }
            : undefined,
        });

        notificarPagoAprobado({
          payment_id: refPayco,
          servicio_nombre: description,
          monto: amount,
          external_reference: refPayco,
        });

        if (!tieneCita) {
          console.warn(`[Webhook] Transacción ${transactionId} aprobada sin datos de cita.`);
          break;
        }

        const extrasCita = {
          servicioId: extra1,
          fecha: extra2,
          hora: extra3,
          nombre: extra4,
          telefono: extra5,
          description,
        };

        if (sessionId) {
          // Confirmar el hold. La confirmación es idempotente y resuelve el
          // caso borde "hold expirado pero slot todavía libre".
          const resultado = confirmarReserva(sessionId, refPayco);

          if (resultado.ok && resultado.yaConfirmada) {
            // Ya se procesó antes (reintento de webhook): no duplicar evento.
            console.log(`[Webhook] Reserva ${sessionId} ya estaba confirmada; no se recrea el evento.`);
          } else if (resultado.ok) {
            await crearEventoYGuardar(extrasCita, transactionId, sessionId, amount);
          } else if (resultado.motivo === 'slot_tomado') {
            // Caso borde: el hold expiró y otro usuario tomó el slot.
            // No se agenda; se marca para REEMBOLSO MANUAL.
            console.error(
              `[Webhook] REEMBOLSO REQUERIDO: pago aprobado ${transactionId} (ref ${refPayco}) ` +
                `pero el slot ${extra2} ${extra3} ya fue tomado por otra cita. Reembolsar al cliente ${extra4}.`
            );
          } else {
            // Reserva no encontrada: el pago es válido, agendamos igual con
            // los datos que envió ePayco (sin hold que confirmar).
            console.warn(`[Webhook] Reserva ${sessionId} no encontrada; se agenda con datos de la pasarela.`);
            await crearEventoYGuardar(extrasCita, transactionId, sessionId, amount);
          }
        } else {
          // Pago sin reserva previa (p. ej. flujo directo): agendar con extras.
          await crearEventoYGuardar(extrasCita, transactionId, sessionId, amount);
        }
        break;
      }

      case 'Rechazada':
      case 'Fallida': {
        actualizarEstadoTransaccion(transactionId, response === 'Rechazada' ? 'rejected' : 'failed', transactionId);
        guardarTransaccion({
          id: transactionId,
          payment_id: refPayco,
          servicio_id: extra1,
          servicio_nombre: description,
          monto: amount,
          estado: response === 'Rechazada' ? 'rejected' : 'failed',
          external_reference: refPayco,
          fecha: new Date().toISOString(),
          notificacion_id: transactionId,
          gateway: 'epayco',
        });
        // Liberar el hold para que el slot vuelva a estar disponible.
        if (sessionId) {
          liberarReserva(sessionId, 'cancelada');
          console.log(`[Webhook] Pago ${response} para ${sessionId}: hold liberado.`);
        }
        break;
      }

      case 'Pendiente': {
        guardarTransaccion({
          id: transactionId,
          payment_id: refPayco,
          servicio_id: extra1,
          servicio_nombre: description,
          monto: amount,
          estado: 'pending',
          external_reference: refPayco,
          fecha: new Date().toISOString(),
          notificacion_id: transactionId,
          gateway: 'epayco',
        });
        // Se mantiene el hold activo hasta que expire o llegue resolución.
        break;
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing ePayco webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
