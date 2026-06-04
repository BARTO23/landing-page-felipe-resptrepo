## Why

El sitio web del abogado Juan Felipe Restrepo Sánchez actualmente solo permite contacto vía WhatsApp/telefono. No hay forma de que los clientes paguen servicios legales en línea. Integrar Mercado Pago como pasarela de pagos permitirá a los clientes pagar honorarios y servicios legales de forma segura usando los medios de pago más populares en Colombia (Nequi, Bancolombia, PSE, Daviplata, efectivo, etc.), eliminando la fricción de transferencias manuales y ampliando la base de clientes que pueden contratar servicios digitalmente.

## What Changes

- Integrar SDK de Mercado Pago para procesar pagos en Colombia
- Agregar página de checkout donde los clientes seleccionan servicio y medio de pago
- Crear página de confirmación de pago (éxito/fallo)
- Implementar webhooks para notificaciones de estado de pago (IPN)
- Almacenar historial de transacciones (opcional, para referencia del abogado)
- No se modifican funcionalidades existentes; es una adición

## Capabilities

### New Capabilities
- `mercadopago-checkout`: Integración con Mercado Pago Checkout Pro para generar preferencias de pago y redirigir al cliente a la pasarela, soportando todos los medios de pago habilitados en Colombia (Nequi, Bancolombia, PSE, Daviplata, efectivo, tarjetas)
- `payment-webhook`: Receptor de notificaciones IPN (Instant Payment Notification) de Mercado Pago para actualizar el estado de las transacciones y notificar al abogado

### Modified Capabilities
*(Ninguna - es una funcionalidad completamente nueva)*

## Impact

- **Dependencias nuevas**: SDK de Mercado Pago (`mercadopago` npm package)
- **Configuración**: Se requieren credenciales de API de Mercado Pago (access token, public key) para los entornos de producción y pruebas
- **Código nuevo**:
  - Página de checkout (`/pago/checkout.astro`)
  - Página de confirmación (`/pago/confirmacion.astro`)
  - Endpoint/server para webhooks IPN
  - Componente de resumen de servicio/pago
- **Infraestructura**: El sitio actual es estático (`output: static`). Se necesita migrar a `output: server` o `output: hybrid` para soportar webhooks y endpoints de API
- **SEO / Performance**: Mínimo impacto. Las nuevas páginas de pago son transaccionales
