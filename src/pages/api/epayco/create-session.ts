import type { APIRoute } from 'astro';
import { getApifyToken, createCheckoutSession } from '../../../lib/epayco';
import { servicios } from '../../../data/servicios';

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

    const apifyToken = await getApifyToken();

    const extras: Record<string, string> = {};
    extras.extra1 = servicio.id;
    if (fecha) extras.extra2 = fecha;
    if (hora) extras.extra3 = hora;
    if (nombreCliente) extras.extra4 = nombreCliente;
    if (telefonoCliente) extras.extra5 = telefonoCliente;

    const sesion: any = {
      checkout_version: '2',
      name: 'Juan Felipe Restrepo Sánchez - Abogado',
      description: servicio.titulo,
      currency: 'COP',
      amount: servicio.precio,
      extras,
    };

    if (!siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) {
      sesion.response = `${siteUrl}/pago/confirmacion`;
      sesion.confirmation = `${siteUrl}/api/webhook/epayco`;
    }

    const result = await createCheckoutSession(sesion, apifyToken);

    return new Response(JSON.stringify({ sessionId: result.sessionId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating ePayco session:', error);
    const detail = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
    return new Response(JSON.stringify({ error: 'Error al crear la sesión de pago', detail }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
