import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';
import { actualizarEstadoTransaccion, buscarTransaccionPorNotificacion, guardarTransaccion } from '../../../lib/transacciones';
import { notificarPagoAprobado } from '../../../lib/notificaciones';
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

export const POST: APIRoute = async ({ request }) => {
  try {
    const rawBody = await request.text();
    const params = parseFormData(rawBody);

    if (!validateSignature(params)) {
      console.error('Firma inválida de ePayco - posible intento de fraude');
      return new Response('Invalid signature', { status: 400 });
    }

    const transactionId = params.x_transaction_id;
    const refPayco = params.x_ref_payco;

    if (!transactionId) {
      return new Response('Missing transaction_id', { status: 400 });
    }

    if (buscarTransaccionPorNotificacion(transactionId)) {
      return new Response('OK', { status: 200 });
    }

    const response = params.x_response;
    const amount = parseFloat(params.x_amount || '0');
    const description = params.x_description || 'Servicio legal';
    const franchise = params.x_franchise || '';
    const extra1 = params.x_extra1 || '';
    const extra2 = params.x_extra2 || '';
    const extra3 = params.x_extra3 || '';
    const extra4 = params.x_extra4 || '';
    const extra5 = params.x_extra5 || '';

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
        });

        notificarPagoAprobado({
          payment_id: refPayco,
          servicio_nombre: description,
          monto: amount,
          external_reference: refPayco,
        });

        if (extra1 && extra2 && extra3 && extra4) {
          const servicio = servicios.find((s) => s.id === extra1);
          const eventoData: EventoData = {
            fecha: extra2,
            hora: extra3,
            nombreCliente: extra4,
            telefonoCliente: extra5 || '',
            servicioNombre: servicio?.titulo || description,
            duracionMinutos: servicio?.duracion_minutos || 60,
            paymentId: transactionId,
          };
          await crearEventoAsesoria(eventoData);
        }
        break;
      }
      case 'Rechazada': {
        actualizarEstadoTransaccion(transactionId, 'rejected', transactionId);
        guardarTransaccion({
          id: transactionId,
          payment_id: refPayco,
          servicio_id: extra1,
          servicio_nombre: description,
          monto: amount,
          estado: 'rejected',
          external_reference: refPayco,
          fecha: new Date().toISOString(),
          notificacion_id: transactionId,
        });
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
        });
        break;
      }
      case 'Fallida': {
        guardarTransaccion({
          id: transactionId,
          payment_id: refPayco,
          servicio_id: extra1,
          servicio_nombre: description,
          monto: amount,
          estado: 'failed',
          external_reference: refPayco,
          fecha: new Date().toISOString(),
          notificacion_id: transactionId,
        });
        break;
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing ePayco webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
};
