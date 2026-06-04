import type { APIRoute } from 'astro';
import { getPreferenceClient } from '../../lib/mercadopago';
import { servicios } from '../../data/servicios';

export const POST: APIRoute = async ({ request }) => {
  const siteUrl = new URL(request.url).origin;

  try {
    const body = await request.json();
    const servicioId = body.servicio_id;
    const fecha = body.fecha;
    const hora = body.hora;
    const nombreCliente = body.nombre_cliente;
    const telefonoCliente = body.telefono_cliente;

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

    const externalReference = fecha && hora && nombreCliente
      ? JSON.stringify({
          s: servicio.id,
          f: fecha,
          h: hora,
          n: nombreCliente,
          t: telefonoCliente || '',
          ts: Date.now(),
        })
      : `${servicio.id}-${Date.now()}`;

    const preference = await getPreferenceClient().create({
      body: {
        items: [
          {
            id: servicio.id,
            title: servicio.titulo,
            description: servicio.descripcion,
            quantity: 1,
            unit_price: servicio.precio,
            currency_id: 'COP',
          },
        ],
        back_urls: {
          success: `${siteUrl}/pago/confirmacion`,
          failure: `${siteUrl}/pago/confirmacion`,
          pending: `${siteUrl}/pago/confirmacion`,
        },
        notification_url: `${siteUrl}/api/webhook/mercadopago`,
        external_reference: externalReference,
      },
    });

    return new Response(
      JSON.stringify({
        init_point: preference.init_point,
        preference_id: preference.id,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (error: any) {
    console.error('Error creating preference:', error);
    const detail = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    return new Response(JSON.stringify({ error: 'Error al crear la preferencia de pago', detail }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
