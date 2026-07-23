const CONTACT_EMAIL = import.meta.env.CONTACT_EMAIL;
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
// Remitente. Con dominio propio verificado usa algo como
// "Abogado Juan Felipe <citas@tudominio.com>". Mientras tanto, el dominio
// de pruebas de Resend funciona sin verificar nada.
const EMAIL_FROM = import.meta.env.EMAIL_FROM || 'Citas <onboarding@resend.dev>';

const RESEND_URL = 'https://api.resend.com/emails';

export interface DatosNotificacion {
  payment_id: string;
  servicio_nombre: string;
  monto: number;
  external_reference: string;
}

export interface DatosCitaNotificacion {
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  nombreCliente: string;
  telefonoCliente: string;
  emailCliente?: string;
  servicioNombre: string;
  duracionMinutos: number;
  paymentId: string;
  monto: number;
}

function formatearFechaLarga(fecha: string): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const [y, m, d] = fecha.split('-').map(Number);
  if (!y || !m || !d) return fecha;
  return `${d} de ${meses[m - 1]} de ${y}`;
}

/**
 * Envía un correo vía la API de Resend. Devuelve true si se aceptó.
 * Si no hay RESEND_API_KEY configurada, solo registra en consola y
 * devuelve false (no rompe el flujo de pago).
 */
async function enviarEmail(para: string, asunto: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn(`[Email] RESEND_API_KEY no configurada. No se envió "${asunto}" a ${para}`);
    return false;
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [para], subject: asunto, html }),
    });

    if (!res.ok) {
      const detalle = await res.text();
      console.error(`[Email] Resend rechazó el envío a ${para} (${res.status}): ${detalle}`);
      return false;
    }

    console.log(`[Email] Enviado "${asunto}" a ${para}`);
    return true;
  } catch (error) {
    console.error(`[Email] Error de red al enviar a ${para}:`, error);
    return false;
  }
}

function plantillaBase(titulo: string, cuerpo: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#e5e1e6;font-family:Helvetica,Arial,sans-serif;color:#1c1b1f">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 16px;font-size:20px;color:#131645">${titulo}</h1>
    ${cuerpo}
    <hr style="border:none;border-top:1px solid #e5e1e6;margin:24px 0" />
    <p style="margin:0;font-size:12px;color:#79747e">
      Juan Felipe Restrepo Sánchez · Abogado<br/>
      Este es un mensaje automático, por favor no respondas a este correo.
    </p>
  </div>
</body></html>`;
}

function filaDato(etiqueta: string, valor: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:14px;color:#49454f">${etiqueta}</td>
    <td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right">${valor}</td>
  </tr>`;
}

/**
 * Notifica la cita confirmada al cliente y al abogado.
 * Nunca lanza: los fallos de email no deben tumbar el webhook de pago.
 */
export async function notificarCitaConfirmada(datos: DatosCitaNotificacion): Promise<void> {
  const fechaLarga = formatearFechaLarga(datos.fecha);
  const montoFmt = `$${datos.monto.toLocaleString('es-CO')} COP`;

  const tabla = `<table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${filaDato('Servicio', datos.servicioNombre)}
    ${filaDato('Fecha', fechaLarga)}
    ${filaDato('Hora', `${datos.hora} (hora Colombia)`)}
    ${filaDato('Duración', `${datos.duracionMinutos} minutos`)}
    ${filaDato('Valor pagado', montoFmt)}
    ${filaDato('Referencia', datos.paymentId)}
  </table>`;

  // 1. Correo al cliente (si dio email)
  if (datos.emailCliente) {
    const cuerpoCliente = `
      <p style="font-size:15px;line-height:1.5">
        Hola <strong>${datos.nombreCliente}</strong>, tu asesoría quedó <strong>confirmada</strong>.
        Recibimos tu pago correctamente.
      </p>
      ${tabla}
      <p style="font-size:14px;line-height:1.5;color:#49454f">
        Si necesitas reprogramar o tienes alguna duda, escríbenos por WhatsApp al
        <a href="https://wa.me/573107285035" style="color:#131645">+57 310 728 5035</a>.
      </p>`;
    await enviarEmail(
      datos.emailCliente,
      `Cita confirmada: ${datos.servicioNombre} — ${fechaLarga} ${datos.hora}`,
      plantillaBase('Tu asesoría está confirmada ✅', cuerpoCliente)
    );
  } else {
    console.warn('[Email] La reserva no tiene email de cliente; no se le notificó.');
  }

  // 2. Correo al abogado
  if (CONTACT_EMAIL) {
    const cuerpoAbogado = `
      <p style="font-size:15px;line-height:1.5">
        Nueva asesoría agendada y <strong>pagada</strong>.
      </p>
      ${tabla}
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        ${filaDato('Cliente', datos.nombreCliente)}
        ${filaDato('Teléfono', datos.telefonoCliente)}
        ${filaDato('Email', datos.emailCliente || 'No proporcionado')}
      </table>
      <p style="font-size:13px;color:#49454f;margin-top:16px">
        El evento ya fue creado en tu Google Calendar.
      </p>`;
    await enviarEmail(
      CONTACT_EMAIL,
      `Nueva cita: ${datos.nombreCliente} — ${fechaLarga} ${datos.hora}`,
      plantillaBase('Nueva asesoría agendada 📅', cuerpoAbogado)
    );
  }
}

/**
 * Registro en consola del pago aprobado (auditoría rápida en logs).
 */
export function notificarPagoAprobado(datos: DatosNotificacion) {
  console.log('=== PAGO APROBADO ===');
  console.log(`Payment ID: ${datos.payment_id}`);
  console.log(`Servicio: ${datos.servicio_nombre}`);
  console.log(`Monto: $${datos.monto.toLocaleString('es-CO')} COP`);
  console.log(`Referencia: ${datos.external_reference}`);
  console.log('=======================');
}
