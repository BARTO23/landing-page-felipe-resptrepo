## ADDED Requirements

### Requirement: Autenticación con Apify (obtener token)
El sistema SHALL autenticarse con el servicio Apify de ePayco usando Basic Auth con PUBLIC_KEY y PRIVATE_KEY para obtener un token Bearer antes de crear sesiones de checkout.

#### Scenario: Autenticación exitosa
- **WHEN** el backend envía una petición POST a `https://apify.epayco.co/login` con header `Authorization: Basic <base64(PUBLIC_KEY:PRIVATE_KEY)>`
- **THEN** el sistema recibe un token JWT en la respuesta

#### Scenario: Credenciales inválidas
- **WHEN** las credenciales PUBLIC_KEY o PRIVATE_KEY son incorrectas
- **THEN** el sistema retorna un error 401 y muestra mensaje de error al usuario

### Requirement: Crear sesión de Smart Checkout
El sistema SHALL exponer un endpoint POST `/api/epayco/create-session` que reciba el ID del servicio, monto y datos opcionales de cita, se autentique con Apify, cree una sesión de Smart Checkout y retorne el `sessionId` al frontend.

#### Scenario: Creación exitosa de sesión
- **WHEN** el cliente selecciona un servicio y hace clic en "Pagar con ePayco"
- **THEN** el backend obtiene un token Apify, crea una sesión con `checkout_version: "2"`, `name`, `currency: "COP"`, `amount`, `response` (URL de respuesta), `confirmation` (URL de webhook), y los datos de cita en `x_extra1`-`x_extra5`, y retorna `{ sessionId }`

#### Scenario: Error al crear sesión (servicio inválido)
- **WHEN** el ID del servicio no existe
- **THEN** el sistema retorna un error 400 con mensaje descriptivo

#### Scenario: Error al crear sesión (fallo API ePayco)
- **WHEN** la API de ePayco Apify no responde o retorna error
- **THEN** el sistema muestra un mensaje de error al usuario indicando que intente más tarde

### Requirement: Inicializar ePayco Smart Checkout en el frontend
El sistema SHALL cargar el script de ePayco (`https://checkout.epayco.co/checkout-v2.js`) en la página de pago e inicializar el Smart Checkout con el `sessionId` obtenido del backend.

#### Scenario: Inicialización exitosa del checkout
- **WHEN** el usuario hace clic en "Pagar con ePayco"
- **THEN** el frontend llama a `POST /api/epayco/create-session`, recibe el `sessionId`, configura `ePayco.checkout.configure({ sessionId, type: "standard", test: false })` y ejecuta `checkout.open()`

#### Scenario: Error de inicialización
- **WHEN** el script de ePayco no carga o el `sessionId` es inválido
- **THEN** el sistema muestra un mensaje de error al usuario

### Requirement: Redirigir a ePayco Smart Checkout (entorno seguro)
El sistema SHALL redirigir al cliente al entorno seguro de ePayco Smart Checkout (modo standard), donde podrá seleccionar su medio de pago entre más de 22 opciones disponibles.

#### Scenario: Redirección exitosa
- **WHEN** el checkout se abre exitosamente
- **THEN** el navegador redirige al entorno seguro de ePayco mostrando los medios de pago habilitados

### Requirement: Página de checkout con selección de servicio
El sistema SHALL mostrar una página `/pago` donde el cliente pueda ver el servicio seleccionado, el monto a pagar y el botón para iniciar el pago con ePayco.

#### Scenario: Visualizar página de checkout
- **WHEN** el cliente accede a `/pago?servicio=<id>`
- **THEN** el sistema muestra el nombre del servicio, descripción, monto y botón "Pagar con ePayco"

#### Scenario: Servicio no encontrado
- **WHEN** el cliente accede a `/pago?servicio=<id-invalido>`
- **THEN** el sistema muestra mensaje de error y enlace para volver a la página de servicios

### Requirement: Página de confirmación de pago
El sistema SHALL mostrar una página `/pago/confirmacion` con el resultado del pago después de que el cliente regrese de ePayco, usando el parámetro `ref_payco` para consultar el estado de la transacción.

#### Scenario: Pago aceptado
- **WHEN** el cliente es redirigido de vuelta con `ref_payco` y la transacción fue aprobada
- **THEN** el sistema muestra mensaje de éxito, resumen del pago y datos de contacto del abogado

#### Scenario: Pago rechazado
- **WHEN** el cliente es redirigido de vuelta con `ref_payco` y la transacción fue rechazada
- **THEN** el sistema muestra mensaje de error y opciones para reintentar o contactar al abogado

#### Scenario: Pago pendiente
- **WHEN** el cliente es redirigido de vuelta con `ref_payco` y la transacción está pendiente (ej. pago en efectivo o PSE en proceso)
- **THEN** el sistema muestra mensaje indicando que el pago está pendiente y cómo completarlo

#### Scenario: Pago fallido
- **WHEN** el cliente es redirigido de vuelta con `ref_payco` y la transacción falló
- **THEN** el sistema muestra mensaje de error indicando que el pago no pudo completarse

### Requirement: Precios de servicios configurables
El sistema SHALL permitir configurar los precios de los servicios legales desde una fuente de datos (archivo de configuración), sin cambios en el código de integración de pagos.

#### Scenario: Precio configurado por servicio
- **WHEN** el sistema carga la página de checkout para un servicio
- **THEN** el sistema usa el precio definido en la configuración para ese servicio

### Requirement: Aceptar datos de cita en create-session
El sistema SHALL aceptar datos de agendamiento opcionales (fecha, hora, nombre del cliente, teléfono) en el endpoint `POST /api/epayco/create-session` además del `servicio_id`, y transmitirlos a ePayco mediante los campos `x_extra1` a `x_extra5`.

#### Scenario: Crear sesión con datos de cita
- **WHEN** el cliente ha seleccionado fecha y hora antes de pagar
- **THEN** el endpoint recibe `servicio_id`, `fecha`, `hora`, `nombre_cliente` y `telefono_cliente`, y los codifica en los campos `x_extra1`-`x_extra5` de la sesión

#### Scenario: Crear sesión sin datos de cita (compatibilidad)
- **WHEN** el endpoint recibe solo `servicio_id` sin datos de cita
- **THEN** el endpoint funciona correctamente sin incluir datos de cita en los campos extras
