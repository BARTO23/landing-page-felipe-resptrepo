import type { APIRoute } from 'astro';
import { WebhookSignatureValidator } from 'mercadopago';
import { actualizarEstadoTransaccion, buscarTransaccionPorNotificacion, guardarTransaccion } from '../../../lib/transacciones';
import { notificarPagoAprobado } from '../../../lib/notificaciones';
import { crearEventoAsesoria, type EventoData } from '../../../lib/googleCalendar';
import { servicios } from '../../../data/servicios';

export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.MP_WEBHOOK_SECRET;

  try {
    const url = new URL(request.url);
    const dataId = url.searchParams.get('data.id');

    WebhookSignatureValidator.validate({
      xSignature: request.headers.get('x-signature'),
      xRequestId: request.headers.get('x-request-id'),
      dataId,
      secret,
      toleranceSeconds: 300,
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Firma inválida' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const action = body.action;
    const notificacionId = body.id;

    if (notificacionId && buscarTransaccionPorNotificacion(notificacionId)) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (action === 'payment.updated') {
      const paymentId = body.data?.id;
      const paymentStatus = body.data?.status;

      if (paymentId && paymentStatus) {
        if (paymentStatus === 'approved') {
          actualizarEstadoTransaccion(String(paymentId), 'approved', String(notificacionId));

          const extRef = body.data?.external_reference || '';
          let bookingData: { s?: string; f?: string; h?: string; n?: string; t?: string } | null = null;
          try {
            const parsed = JSON.parse(extRef);
            if (parsed.s && parsed.f && parsed.h && parsed.n) {
              bookingData = parsed;
            }
          } catch {
            // external_reference is a plain string (no booking data)
          }

          if (bookingData) {
            const servicio = servicios.find((s) => s.id === bookingData!.s);
            const eventoData: EventoData = {
              fecha: bookingData.f,
              hora: bookingData.h,
              nombreCliente: bookingData.n,
              telefonoCliente: bookingData.t || '',
              servicioNombre: servicio?.titulo || 'Asesoría legal',
              duracionMinutos: servicio?.duracion_minutos || 60,
              paymentId: String(paymentId),
            };
            await crearEventoAsesoria(eventoData);
          }

          notificarPagoAprobado({
            payment_id: String(paymentId),
            servicio_nombre: body.data?.description || 'Servicio legal',
            monto: body.data?.transaction_amount || 0,
            external_reference: extRef,
          });
        } else if (paymentStatus === 'rejected') {
          actualizarEstadoTransaccion(String(paymentId), 'rejected', String(notificacionId));
        } else if (paymentStatus === 'pending') {
          guardarTransaccion({
            id: String(paymentId),
            payment_id: String(paymentId),
            servicio_id: '',
            servicio_nombre: '',
            monto: 0,
            estado: 'pending',
            external_reference: '',
            fecha: new Date().toISOString(),
            notificacion_id: String(notificacionId),
          });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
