## 1. Configuración y dependencias

- [x] 1.1 Agregar variables de entorno de ePayco al `.env` y `.env.example`: `EPAYCO_PUBLIC_KEY`, `EPAYCO_PRIVATE_KEY`, `EPAYCO_CUSTOMER_ID`, `EPAYCO_P_KEY`
- [x] 1.2 Eliminar variables de entorno de Mercado Pago: `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `MP_WEBHOOK_SECRET`
- [x] 1.3 Eliminar dependencia `mercadopago` de `package.json` y ejecutar `npm uninstall mercadopago`
- [x] 1.4 Verificar que no queden referencias a `mercadopago` en `package-lock.json` o `pnpm-lock.yaml`

## 2. Librería cliente de ePayco

- [x] 2.1 Crear `src/lib/epayco.ts` con funciones: `getApifyToken()` (autenticación Basic Auth contra `POST https://apify.epayco.co/login`), `createCheckoutSession()` (crear sesión en `POST https://apify.epayco.co/payment/session/create`)
- [x] 2.2 Implementar manejo de errores y timeout en las llamadas a la API Apify
- [x] 2.3 Eliminar `src/lib/mercadopago.ts`

## 3. Endpoint de creación de sesión

- [x] 3.1 Crear `src/pages/api/epayco/create-session.ts` (POST) que reciba `servicio_id`, y opcionalmente `fecha`, `hora`, `nombre_cliente`, `telefono_cliente`
- [x] 3.2 En el endpoint: validar servicio, obtener token Apify, crear sesión con `checkout_version: "2"`, `name`, `currency: "COP"`, `amount`, `response` (URL de respuesta), `confirmation` (URL de webhook), y datos de cita en `x_extra1`-`x_extra5`
- [x] 3.3 Retornar `{ sessionId }` al frontend
- [x] 3.4 Eliminar `src/pages/api/create-preference.ts`

## 4. Página de pago (frontend)

- [x] 4.1 Modificar `src/pages/pago.astro`: cambiar texto del botón a "Pagar con ePayco", cargar script `https://checkout.epayco.co/checkout-v2.js`
- [x] 4.2 En el script del cliente: al hacer clic, llamar a `POST /api/epayco/create-session`, configurar `ePayco.checkout.configure({ sessionId, type: "standard", test: false })` y ejecutar `checkout.open()`
- [x] 4.3 Actualizar textos informativos en la página (referencias a MP → ePayco)

## 5. Webhook de confirmación

- [x] 5.1 Crear `src/pages/api/webhook/epayco.ts` (POST) que reciba los parámetros de confirmación de ePayco
- [x] 5.2 Implementar validación de firma SHA-256: `SHA256(p_cust_id_cliente^p_key^x_ref_payco^x_transaction_id^x_amount^x_currency_code)` comparada con `x_signature`
- [x] 5.3 Implementar desduplicación por `x_transaction_id`
- [x] 5.4 Procesar estados: `Aceptada` → `approved` + Google Calendar si hay datos de cita, `Rechazada` → `rejected`, `Pendiente` → `pending`, `Fallida` → `failed`
- [x] 5.5 Integrar `crearEventoAsesoria` de Google Calendar cuando el pago sea aceptado con datos de cita (leer `x_extra1`-`x_extra5`)
- [x] 5.6 Integrar `notificarPagoAprobado` para transacciones aceptadas
- [x] 5.7 Eliminar `src/pages/api/webhook/mercadopago.ts`

## 6. Página de confirmación

- [x] 6.1 Modificar `src/pages/pago/confirmacion.astro` para leer `ref_payco` y parámetros `x_` de ePayco en la URL de respuesta
- [x] 6.2 Manejar los estados de ePayco: `Aceptada` (success), `Rechazada` (failure), `Pendiente` (pending), `Fallida` (failure)
- [x] 6.3 Mostrar datos de cita desde `x_extra2`-`x_extra4` cuando existan
- [x] 6.4 Actualizar referencias textuales de MP a ePayco

## 7. Limpieza

- [x] 7.1 Verificar que ningún archivo en `src/` importe de `mercadopago` o `src/lib/mercadopago`
- [x] 7.2 Archivar o eliminar los specs viejos de `openspec/specs/mercadopago-checkout/` y `openspec/specs/payment-webhook/`
- [x] 7.3 Verificar que `openspec/specs/` tenga solo los specs activos

## 8. Verificación

- [x] 8.1 Probar flujo completo en modo test: agendar → pago → redirección a ePayco → pago simulado → retorno a confirmación
- [x] 8.2 Probar webhook con firma SHA-256 enviando petición simulada
- [x] 8.3 Probar creación de evento en Google Calendar al recibir pago aceptado con datos de cita
- [x] 8.4 Ejecutar `npm run build` para verificar que no hay errores de compilación
