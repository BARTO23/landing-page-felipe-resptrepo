## 1. Setup y configuración

- [x] 1.1 Instalar `mercadopago` SDK y `@astrojs/node` adapter
- [x] 1.2 Migrar `astro.config.mjs` a `output: server` con adapter Node
- [x] 1.3 Agregar variables de entorno para credenciales de Mercado Pago (access token, public key, webhook secret)
- [x] 1.4 Configurar precios de servicios en `src/data/servicios.ts` (agregar campo `precio`)

## 2. Página de checkout

- [x] 2.1 Crear endpoint `POST /api/create-preference` que recibe servicio ID y retorna URL de Checkout Pro
- [x] 2.2 Crear página `/pago.astro` con resumen del servicio y botón "Pagar con Mercado Pago"
- [x] 2.3 Manejar caso de servicio inválido en página de checkout
- [x] 2.4 Integrar botón de pago que llama al endpoint y redirige a Mercado Pago

## 3. Página de confirmación de pago

- [x] 3.1 Crear página `/pago/confirmacion.astro` que lee parámetros `status` y `payment_id` de la URL
- [x] 3.2 Mostrar mensaje de éxito con resumen del pago y datos de contacto
- [x] 3.3 Mostrar mensaje de rechazo con opción de reintentar o contactar al abogado
- [x] 3.4 Mostrar mensaje de pago pendiente (efectivo) con instrucciones

## 4. Webhook IPN

- [x] 4.1 Crear endpoint `POST /api/webhook/mercadopago` con verificación de firma `X-Signature`
- [x] 4.2 Implementar procesamiento de notificación `payment.updated` (approved/rejected)
- [x] 4.3 Implementar desduplicación por ID de notificación
- [x] 4.4 Implementar almacenamiento de transacciones en archivo JSON local (`data/transacciones.json`)

## 5. Notificaciones y finalización

- [x] 5.1 Enviar notificación por correo al abogado cuando un pago es aprobado
- [ ] 5.2 Probar flujo completo en modo sandbox de Mercado Pago
- [x] 5.3 Agregar página de error genérica para fallos inesperados
