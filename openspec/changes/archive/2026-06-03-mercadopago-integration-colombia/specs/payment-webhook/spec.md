## ADDED Requirements

### Requirement: Endpoint de webhook IPN
El sistema SHALL exponer un endpoint POST `/api/webhook/mercadopago` que reciba notificaciones IPN de Mercado Pago.

#### Scenario: Notificación IPN recibida
- **WHEN** Mercado Pago envía una notificación IPN al endpoint
- **THEN** el sistema procesa la notificación y actualiza el estado de la transacción

#### Scenario: Verificación de firma exitosa
- **WHEN** la notificación incluye un header `X-Signature` válido
- **THEN** el sistema verifica la firma usando el secret de Mercado Pago

#### Scenario: Firma inválida
- **WHEN** la firma en `X-Signature` no coincide con el cálculo esperado
- **THEN** el sistema retorna 401 y descarta la notificación

### Requirement: Procesar notificación de pago aprobado
El sistema SHALL actualizar el estado de la transacción a "approved" cuando reciba una notificación de pago exitoso.

#### Scenario: Pago aprobado
- **WHEN** el webhook recibe una notificación con `action=payment.updated` y `status=approved`
- **THEN** el sistema marca la transacción como pagada y almacena el ID de pago de Mercado Pago

### Requirement: Procesar notificación de pago rechazado
El sistema SHALL actualizar el estado de la transacción a "rejected" cuando reciba una notificación de pago fallido.

#### Scenario: Pago rechazado
- **WHEN** el webhook recibe una notificación con `action=payment.updated` y `status=rejected`
- **THEN** el sistema marca la transacción como rechazada

### Requirement: Desduplicación de notificaciones
El sistema SHALL ignorar notificaciones duplicadas basándose en el ID único de la notificación.

#### Scenario: Notificación duplicada
- **WHEN** el webhook recibe una notificación con un `id` ya procesado
- **THEN** el sistema retorna 200 sin procesar la notificación nuevamente

### Requirement: Almacenamiento de transacciones
El sistema SHALL mantener un registro de las transacciones procesadas con su estado, monto, servicio y fecha.

#### Scenario: Transacción almacenada
- **WHEN** una notificación IPN es procesada exitosamente
- **THEN** el sistema almacena la transacción con id, servicio, monto, estado, fecha y external_reference

### Requirement: Notificación al abogado
El sistema SHALL notificar al abogado cuando se reciba un pago aprobado.

#### Scenario: Notificación de pago exitoso
- **WHEN** el webhook procesa un pago aprobado
- **THEN** el sistema envía un correo electrónico al abogado con los detalles del pago
