## Context

El sitio ya tiene integración con Mercado Pago para pagos en línea (output: server con Node adapter). Los clientes pueden pagar servicios legales y recibir confirmación. Sin embargo no hay sistema de agendamiento: el cliente debe contactar al abogado manualmente después del pago para coordinar la cita.

Esta funcionalidad agrega un paso de selección de fecha/hora antes del pago y, al confirmarse el pago, crea automáticamente un evento en Google Calendar del abogado.

## Goals / Non-Goals

**Goals:**
- Permitir al cliente seleccionar fecha y hora disponible para la asesoría antes de pagar
- Integrar la cita con el flujo de pago existente (datos de cita viajan con la preferencia)
- Crear evento en Google Calendar automáticamente al recibir un pago aprobado
- Mostrar resumen de la cita en la página de confirmación de pago
- Usar autenticación service-to-service (Google Service Account) para Calendar API

**Non-Goals:**
- No se implementará sincronización bidireccional (actualizar/borrar citas desde el sitio)
- No se implementará disponibilidad en tiempo real (bloqueo de horarios ya ocupados)
- No se implementará cancelación de citas por parte del cliente

## Decisions

1. **Google Service Account vs OAuth 2.0 de usuario**
   - **Decisión**: Usar Google Service Account con Calendar API
   - **Razón**: El calendario pertenece al abogado (un solo usuario). Con Service Account no hay necesidad de refresh tokens ni intervención del usuario para mantener la autenticación. Se delega acceso al calendario del abogado.
   - **Alternativa considerada**: OAuth 2.0 con refresh token del abogado - más complejo de mantener y requiere regenerar tokens periódicamente.

2. **Datos de cita en external_reference vs almacenamiento propio**
   - **Decisión**: Codificar los datos de cita en la `external_reference` de la preferencia de Mercado Pago como JSON
   - **Razón**: El webhook de MP devuelve la `external_reference` en la notificación, lo que permite al webhook reconstruir los datos de la cita sin necesidad de una base de datos centralizada. Simple para el MVP.

3. **Flujo de páginas: agendar → pagar → confirmar**
   - **Decisión**: Nueva página `/agendar` que recolecta datos; luego redirige a `/pago` con los datos de cita. Al regresar de MP, la confirmación muestra resumen de pago + cita.
   - **Razón**: Flujo lineal que reutiliza la página de pago existente. No requiere modificar la página de confirmación radicalmente.

## Risks / Trade-offs

- **Riesgo**: La `external_reference` tiene límite de caracteres → **Mitigación**: Usar JSON compacto sin espacios; si se excede, almacenar en archivo JSON con un ID corto como referencia
- **Riesgo**: La Service Account puede perder acceso si se rota la clave → **Mitigación**: Documentar el proceso de rotación; el Calendar ID es configurable vía variable de entorno
- **Riesgo**: Huso horario incorrecto al crear eventos → **Mitigación**: Usar explícitamente la zona horaria de Colombia (America/Bogota) en todos los eventos
