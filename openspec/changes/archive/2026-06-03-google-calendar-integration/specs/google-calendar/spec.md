## ADDED Requirements

### Requirement: Autenticación con Google Calendar API
El sistema SHALL autenticarse con Google Calendar API usando una Service Account con credenciales configuradas via variables de entorno.

#### Scenario: Autenticación exitosa
- **WHEN** el sistema necesita crear un evento en Google Calendar
- **THEN** el sistema se autentica usando las credenciales de Service Account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY)

#### Scenario: Credenciales inválidas
- **WHEN** las credenciales de Google no son válidas o han expirado
- **THEN** el sistema registra el error y continúa sin crear el evento, notificando al abogado

### Requirement: Crear evento de asesoría en Google Calendar
El sistema SHALL crear un evento en Google Calendar con los datos de la cita (fecha, hora, nombre del cliente, teléfono, servicio) cuando se recibe un pago aprobado.

#### Scenario: Evento creado exitosamente
- **WHEN** el webhook recibe un pago aprobado con datos de cita
- **THEN** el sistema crea un evento en Google Calendar con:
  - Título: "Asesoría - {nombre del servicio} - {nombre del cliente}"
  - Fecha y hora seleccionada por el cliente
  - Duración: 1 hora
  - Descripción: incluye nombre, teléfono, servicio y ID de pago
  - Zona horaria: America/Bogota

#### Scenario: Error al crear evento (API error)
- **WHEN** la API de Google Calendar retorna un error
- **THEN** el sistema registra el error y notifica al abogado que debe crear el evento manualmente

### Requirement: Notificación de cita confirmada
El sistema SHALL incluir los detalles de la cita agendada en la página de confirmación de pago.

#### Scenario: Mostrar cita en confirmación
- **WHEN** el cliente es redirigido a la confirmación con `status=approved` y datos de cita
- **THEN** la página de confirmación muestra la fecha, hora y servicio de la asesoría agendada
