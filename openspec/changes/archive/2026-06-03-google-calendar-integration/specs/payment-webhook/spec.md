## ADDED Requirements

### Requirement: Crear evento de calendario al recibir pago aprobado con cita
El sistema SHALL crear un evento en Google Calendar cuando el webhook procese un pago aprobado que incluya datos de agendamiento en la `external_reference`.

#### Scenario: Pago aprobado con datos de cita
- **WHEN** el webhook recibe una notificación `payment.updated` con `status=approved` y la `external_reference` contiene datos de cita
- **THEN** el sistema crea un evento en Google Calendar con los datos de la cita y marca la transacción como "cita_agendada"

#### Scenario: Pago aprobado sin datos de cita (compatibilidad)
- **WHEN** el webhook recibe una notificación `payment.updated` con `status=approved` pero la `external_reference` no contiene datos de cita
- **THEN** el sistema procesa el pago normalmente sin crear evento de calendario
