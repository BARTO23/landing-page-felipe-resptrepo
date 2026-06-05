## Why

El cliente ha solicitado migrar de Mercado Pago a ePayco como pasarela de pagos. ePayco es una solución colombiana con más de 22 medios de pago locales (Nequi, Bancolombia, PSE, Daviplata, efectivo, tarjetas) y ofrece un Smart Checkout moderno con componente embebido o redirección a entorno seguro. La integración actual con Mercado Pago debe ser reemplazada completamente para que solo ePayco procese los pagos.

## What Changes

- **BREAKING**: Eliminar toda la integración con Mercado Pago (SDK, API routes, webhook, configuración)
- Integrar ePayco Smart Checkout v2 usando su API Apify para crear sesiones de pago
- Reemplazar el flujo de creación de preferencia (MP) por creación de sesión (ePayco) desde el backend
- Reemplazar el webhook de IPN (MP) por la URL de confirmación (webhook) de ePayco con validación de firma SHA-256
- Actualizar página `/pago` para usar el Smart Checkout de ePayco en lugar de redirigir a MP
- Actualizar página `/pago/confirmacion` para manejar los estados de ePayco (Aceptada, Rechazada, Pendiente, Fallida)
- Eliminar dependencia npm `mercadopago` y agregar `epayco-sdk-node` (opcional, para API directa)
- Actualizar variables de entorno (eliminar MP, agregar ePayco credentials)

## Capabilities

### New Capabilities
- `epayco-checkout`: Integración con ePayco Smart Checkout v2 para crear sesiones de pago desde el backend, inicializar el checkout en el frontend y procesar pagos con más de 22 medios de pago colombianos. Reemplaza completamente la funcionalidad de `mercadopago-checkout`.
- `epayco-webhook`: Receptor de confirmaciones (webhook) de ePayco para validar firma SHA-256, actualizar estado de transacciones y notificar al abogado. Reemplaza completamente la funcionalidad de `payment-webhook`.

### Modified Capabilities
- `booking`: La referencia externa ahora usará campos `x_extra1`-`x_extra10` de ePayco en lugar de `external_reference` de MP. Los datos de cita se pasarán en estos campos personalizados.
- `google-calendar`: El webhook de ePayco disparará la creación de eventos en Google Calendar igual que antes, pero leyendo los datos de `x_extra1`-`x_extra10` en lugar de `external_reference`.

## Impact

- **Dependencias**: Eliminar `mercadopago` npm package. Agregar carga del script JS de ePayco (`https://checkout.epayco.co/checkout-v2.js`) en el frontend.
- **Configuración**: Nuevas variables de entorno (`EPAYCO_PUBLIC_KEY`, `EPAYCO_PRIVATE_KEY`, `EPAYCO_CUSTOMER_ID`, `EPAYCO_P_KEY`). Eliminar `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`.
- **Código eliminado**:
  - `src/lib/mercadopago.ts` — reemplazar por `src/lib/epayco.ts`
  - `src/pages/api/create-preference.ts` — reemplazar por nueva API de creación de sesión
  - `src/pages/api/webhook/mercadopago.ts` — reemplazar por webhook de ePayco
- **Código modificado**:
  - `src/pages/pago.astro` — cambiar lógica de botón de pago para usar ePayco Smart Checkout
  - `src/pages/pago/confirmacion.astro` — manejar estados de ePayco
- **Infraestructura**: Ya está en modo SSR (`output: server`), no requiere cambios. El webhook debe ser accesible públicamente.
- **Seguridad**: Autenticación Basic Auth para obtener token Apify, firma SHA-256 para validar webhooks.
