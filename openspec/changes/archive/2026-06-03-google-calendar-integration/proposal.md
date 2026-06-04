## Why

Actualmente los clientes pagan en línea pero no hay forma de agendar la cita de asesoría. El cliente debe contactar al abogado por WhatsApp después del pago para coordinar día y hora. Integrar Google Calendar permitirá que el cliente seleccione fecha y hora disponible al momento del pago, y la cita se agende automáticamente al confirmarse el pago, eliminando la fricción de coordinar manualmente.

## What Changes

- Nueva página de agendamiento donde el cliente selecciona fecha, hora y opcionalmente deja un mensaje
- El flujo de pago existente se modifica para incluir los datos de la cita (fecha, hora, nombre del cliente) en la preferencia
- Al recibir un pago aprobado via webhook, el sistema crea un evento en Google Calendar del abogado con los datos de la cita
- La página de confirmación de pago muestra los detalles de la cita agendada
- Se agrega autenticación OAuth 2.0 con Google Calendar API

## Capabilities

### New Capabilities
- `booking`: Formulario de agendamiento donde el cliente selecciona fecha, hora y proporciona su nombre para la asesoría. Se integra con el flujo de pago existente.
- `google-calendar`: Integración con Google Calendar API para crear eventos de asesoría automáticamente al confirmarse un pago aprobado, usando OAuth 2.0 para autenticación.

### Modified Capabilities
- `mercadopago-checkout`: El endpoint `POST /api/create-preference` debe aceptar datos de agendamiento (fecha, hora, nombre del cliente) para incluirlos en la `external_reference` y el flujo de pago.
- `payment-webhook`: Al procesar un pago aprobado, el sistema debe crear un evento en Google Calendar si la transacción incluye datos de agendamiento.

## Impact

- **Dependencias nuevas**: `googleapis` (Google API client), `google-auth-library`
- **Configuración**: Se requieren credenciales de Google Cloud (OAuth 2.0 client ID, client secret) para acceso a Calendar API. Variables de entorno: `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`
- **Código nuevo**:
  - Página de agendamiento (`/agendar.astro`)
  - Módulo de Google Calendar (`src/lib/googleCalendar.ts`)
  - Modificación del endpoint `create-preference` para aceptar datos de cita
  - Modificación del webhook para crear evento calendar en pagos aprobados
  - Modificación de la página de confirmación para mostrar detalles de la cita
- **Infraestructura**: El sitio ya usa `output: server`. No requiere cambios de infraestructura.
