## ADDED Requirements

### Requirement: Aceptar datos de cita en create-preference
El sistema SHALL aceptar datos de agendamiento opcionales (fecha, hora, nombre del cliente, teléfono) en el endpoint `POST /api/create-preference` además del `servicio_id`.

#### Scenario: Crear preferencia con datos de cita
- **WHEN** el cliente ha seleccionado fecha y hora antes de pagar
- **THEN** el endpoint recibe `servicio_id`, `fecha`, `hora`, `nombre_cliente` y `telefono_cliente`, y codifica estos datos en la `external_reference` de la preferencia

#### Scenario: Crear preferencia sin datos de cita (compatibilidad)
- **WHEN** el endpoint recibe solo `servicio_id` sin datos de cita
- **THEN** el endpoint funciona igual que antes, sin incluir datos de cita en `external_reference`
