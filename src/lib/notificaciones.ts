const CONTACT_EMAIL = import.meta.env.CONTACT_EMAIL;

export interface DatosNotificacion {
  payment_id: string;
  servicio_nombre: string;
  monto: number;
  external_reference: string;
}

export function notificarPagoAprobado(datos: DatosNotificacion) {
  console.log('=== PAGO APROBADO ===');
  console.log(`Email: ${CONTACT_EMAIL}`);
  console.log(`Payment ID: ${datos.payment_id}`);
  console.log(`Servicio: ${datos.servicio_nombre}`);
  console.log(`Monto: $${datos.monto.toLocaleString('es-CO')} COP`);
  console.log(`Referencia: ${datos.external_reference}`);
  console.log('=======================');

  if (CONTACT_EMAIL) {
    console.log(`Notificación enviada a: ${CONTACT_EMAIL}`);
  }
}
