## 1. Setup y configuración

- [x] 1.1 Instalar `googleapis` y `google-auth-library`
- [x] 1.2 Agregar variables de entorno para Google Calendar API (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID)
- [x] 1.3 Agregar campo `duracion_minutos` a los servicios en `src/data/servicios.ts`

## 2. Página de agendamiento

- [x] 2.1 Crear página `/agendar.astro` con selector de fecha (calendario HTML), selector de hora (lun-vie 8-12, 14-18), campos de nombre y teléfono
- [x] 2.2 Validar campos del formulario antes de permitir continuar
- [x] 2.3 Manejar servicio inválido en página de agendamiento
- [x] 2.4 Redirigir a `/pago` con datos de cita codificados en URL

## 3. Modificar flujo de pago para incluir cita

- [x] 3.1 Modificar `POST /api/create-preference` para aceptar y codificar datos de cita (fecha, hora, nombre, teléfono) en `external_reference`
- [x] 3.2 Mantener compatibilidad hacia atrás (pagos sin cita siguen funcionando)
- [x] 3.3 Actualizar `src/pages/pago.astro` para leer parámetros de cita desde URL y pasarlos al endpoint

## 4. Módulo Google Calendar

- [x] 4.1 Crear `src/lib/googleCalendar.ts` con autenticación Service Account y función para crear eventos
- [x] 4.2 Configurar zona horaria America/Bogota en todos los eventos

## 5. Webhook y confirmación de cita

- [x] 5.1 Modificar webhook `payment.updated` para crear evento en Google Calendar si `external_reference` contiene datos de cita
- [x] 5.2 Actualizar página de confirmación para mostrar detalles de la cita agendada
- [ ] 5.3 Probar flujo completo: agendar → pagar (sandbox) → confirmar cita
