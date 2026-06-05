## ADDED Requirements

### Requirement: Endpoint de confirmación (webhook)
El sistema SHALL exponer un endpoint POST `/api/webhook/epayco` que reciba confirmaciones de transacciones enviadas por ePayco (server-to-server).

#### Scenario: Confirmación recibida
- **WHEN** ePayco envía una confirmación POST al endpoint con los parámetros de la transacción
- **THEN** el sistema procesa la confirmación y actualiza el estado de la transacción

### Requirement: Validación de firma SHA-256
El sistema SHALL validar la firma de seguridad `x_signature` recibida en la confirmación para verificar que la petición proviene realmente de ePayco.

#### Scenario: Firma válida
- **WHEN** la firma calculada SHA-256(`p_cust_id_cliente^p_key^x_ref_payco^x_transaction_id^x_amount^x_currency_code`) coincide con `x_signature`
- **THEN** el sistema procesa la confirmación

#### Scenario: Firma inválida
- **WHEN** la firma calculada no coincide con `x_signature`
- **THEN** el sistema retorna 400 y descarta la notificación, registrando un intento de fraude

### Requirement: Procesar transacción aceptada
El sistema SHALL actualizar el estado de la transacción a "approved" cuando reciba una confirmación con `x_response=Aceptada`.

#### Scenario: Transacción aceptada
- **WHEN** el webhook recibe `x_response=Aceptada`
- **THEN** el sistema marca la transacción como pagada, almacena el ref_payco, el ID de transacción de ePayco, el monto y la franquicia utilizada

### Requirement: Procesar transacción rechazada
El sistema SHALL actualizar el estado de la transacción a "rejected" cuando reciba `x_response=Rechazada`.

#### Scenario: Transacción rechazada
- **WHEN** el webhook recibe `x_response=Rechazada`
- **THEN** el sistema marca la transacción como rechazada y almacena el motivo (`x_response_reason_text`)

### Requirement: Procesar transacción pendiente
El sistema SHALL guardar la transacción con estado "pending" cuando reciba `x_response=Pendiente`.

#### Scenario: Transacción pendiente
- **WHEN** el webhook recibe `x_response=Pendiente` (ej. pago en efectivo o PSE en proceso)
- **THEN** el sistema guarda la transacción como pendiente hasta que llegue una actualización

### Requirement: Procesar transacción fallida
El sistema SHALL guardar la transacción con estado "failed" cuando reciba `x_response=Fallida`.

#### Scenario: Transacción fallida
- **WHEN** el webhook recibe `x_response=Fallida`
- **THEN** el sistema registra la transacción como fallida con el motivo del error

### Requirement: Desduplicación de confirmaciones
El sistema SHALL ignorar confirmaciones duplicadas basándose en `x_transaction_id` o `x_ref_payco` para garantizar idempotencia.

#### Scenario: Confirmación duplicada
- **WHEN** el webhook recibe una confirmación con un `x_transaction_id` ya procesado
- **THEN** el sistema retorna 200 sin procesar la confirmación nuevamente

### Requirement: Almacenamiento de transacciones
El sistema SHALL mantener un registro de las transacciones procesadas con su estado, monto, servicio, método de pago y fecha.

#### Scenario: Transacción almacenada
- **WHEN** una confirmación es procesada exitosamente
- **THEN** el sistema almacena la transacción con ref_payco, transaction_id, servicio, monto, estado, franquicia, fecha y campos extras

### Requirement: Notificación al abogado
El sistema SHALL notificar al abogado cuando se reciba una transacción aceptada.

#### Scenario: Notificación de pago aprobado
- **WHEN** el webhook procesa una transacción aceptada
- **THEN** el sistema envía una notificación (email o console.log) al abogado con los detalles del pago

### Requirement: Crear evento de calendario al recibir pago aceptado con cita
El sistema SHALL crear un evento en Google Calendar cuando el webhook procese un pago aceptado que incluya datos de cita en los campos `x_extra1`-`x_extra5`.

#### Scenario: Pago aceptado con datos de cita
- **WHEN** el webhook recibe `x_response=Aceptada` y los campos `x_extra1`-`x_extra5` contienen datos de cita
- **THEN** el sistema crea un evento en Google Calendar con los datos de la cita y marca la transacción como "cita_agendada"

#### Scenario: Pago aceptado sin datos de cita (compatibilidad)
- **WHEN** el webhook recibe `x_response=Aceptada` sin datos de cita en los campos extras
- **THEN** el sistema procesa el pago normalmente sin crear evento de calendario
