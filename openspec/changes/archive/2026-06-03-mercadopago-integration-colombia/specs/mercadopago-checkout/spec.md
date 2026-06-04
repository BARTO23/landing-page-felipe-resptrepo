## ADDED Requirements

### Requirement: Crear preferencia de pago
El sistema SHALL exponer un endpoint POST `/api/create-preference` que reciba el ID del servicio, monto y datos del cliente, y retorne la URL de redirección de Mercado Pago Checkout Pro.

#### Scenario: Creación exitosa de preferencia
- **WHEN** el cliente selecciona un servicio y hace clic en "Pagar con Mercado Pago"
- **THEN** el sistema llama a la API de Mercado Pago para crear una preferencia y redirige al cliente a la URL de Checkout Pro

#### Scenario: Error al crear preferencia (servicio inválido)
- **WHEN** el ID del servicio no existe
- **THEN** el sistema retorna un error 400 con mensaje descriptivo

#### Scenario: Error al crear preferencia (fallo API Mercado Pago)
- **WHEN** la API de Mercado Pago no responde o retorna error
- **THEN** el sistema muestra un mensaje de error al usuario indicando que intente más tarde

### Requirement: Redirigir a Mercado Pago Checkout Pro
El sistema SHALL redirigir al cliente a la URL de Checkout Pro generada por Mercado Pago, donde podrá seleccionar su medio de pago (Nequi, Bancolombia, PSE, Daviplata, efectivo, tarjetas).

#### Scenario: Redirección exitosa
- **WHEN** el cliente es redirigido a Mercado Pago
- **THEN** la página de Checkout Pro muestra todos los medios de pago habilitados para Colombia

### Requirement: Página de checkout con selección de servicio
El sistema SHALL mostrar una página `/pago` donde el cliente pueda ver el servicio seleccionado, el monto a pagar y el botón para iniciar el pago.

#### Scenario: Visualizar página de checkout
- **WHEN** el cliente accede a `/pago?servicio=<id>`
- **THEN** el sistema muestra el nombre del servicio, descripción, monto y botón "Pagar con Mercado Pago"

#### Scenario: Servicio no encontrado
- **WHEN** el cliente accede a `/pago?servicio=<id-invalido>`
- **THEN** el sistema muestra mensaje de error y enlace para volver a la página de servicios

### Requirement: Página de confirmación de pago
El sistema SHALL mostrar una página `/pago/confirmacion` con el resultado del pago (éxito o fallo) después de que el cliente regrese de Mercado Pago.

#### Scenario: Pago exitoso
- **WHEN** el cliente es redirigido de vuelta con `status=approved`
- **THEN** el sistema muestra mensaje de éxito, resumen del pago y datos de contacto del abogado

#### Scenario: Pago rechazado
- **WHEN** el cliente es redirigido de vuelta con `status=rejected`
- **THEN** el sistema muestra mensaje de error y opciones para reintentar o contactar al abogado

#### Scenario: Pago pendiente
- **WHEN** el cliente es redirigido de vuelta con `status=pending` (ej. pago en efectivo)
- **THEN** el sistema muestra mensaje indicando que el pago está pendiente y cómo completarlo

### Requirement: Precios de servicios configurables
El sistema SHALL permitir configurar los precios de los servicios legales desde una fuente de datos (archivo de configuración).

#### Scenario: Precio configurado por servicio
- **WHEN** el sistema carga la página de checkout para un servicio
- **THEN** el sistema usa el precio definido en la configuración para ese servicio
