## Context

El sitio es un landing page estático construido con Astro (output: static), TailwindCSS y TypeScript. Actualmente no tiene backend ni lógica de pagos. Los clientes contactan al abogado vía WhatsApp y realizan pagos por transferencia manual.

Integrar Mercado Pago requiere:
- Migrar de `output: static` a `output: server` (Astro modo servidor) para soportar endpoints de API y webhooks
- Agregar SDK de Mercado Pago para Node.js
- Crear flujo de checkout y páginas de estado de pago

## Goals / Non-Goals

**Goals:**
- Permitir a clientes pagar servicios legales en línea con Mercado Pago
- Soportar medios de pago colombianos: Nequi, Bancolombia, PSE, Daviplata, efectivo, tarjetas
- Recibir notificaciones de estado de pago vía IPN
- Mostrar confirmación de pago exitoso o fallido al cliente

**Non-Goals:**
- No se implementará carrito de compras multi-producto (pago de un servicio a la vez)
- No se implementará autenticación de usuarios ni cuentas
- No se almacenarán datos sensibles de pago (Mercado Pago maneja la seguridad)
- No se integrará facturación electrónica DIAN (fuera de alcance)

## Decisions

1. **Checkout Pro (redirect) vs Wallet Connect**
   - **Decisión**: Checkout Pro con redirección a Mercado Pago
   - **Razón**: Checkout Pro es la opción más rápida de integrar, soporta todos los medios de pago colombianos sin configuración adicional, y Mercado Pago maneja el cumplimiento PCI. Wallet Connect requiere un frontend más complejo y tokenización.
   - **Alternativa considerada**: Brick de Mercado Pago (Wallet) - más control visual pero más complejidad y mantenimiento.

2. **Astro output: server con Node.js adapter**
   - **Decisión**: Usar `@astrojs/node` con `output: server`
   - **Razón**: Necesitamos endpoints POST para webhooks IPN y endpoints de API para crear preferencias. El adapter Node permite correr el sitio como servidor HTTP.
   - **Alternativa considerada**: Usar funciones serverless (Vercel/Netlify) - posible pero el abogado probablemente usará hosting tradicional.

3. **Webhooks IPN con verificación de firma**
   - **Decisión**: Endpoint `/api/webhook/mercadopago` que verifica la firma del header `X-Signature` antes de procesar
   - **Razón**: Seguridad - solo Mercado Pago debe poder notificar estados

4. **Almacenamiento de transacciones**
   - **Decisión**: Archivo JSON local o variable en memoria para el MVP (no hay base de datos)
   - **Razón**: Simplicidad. Para producción a largo plazo, se debería agregar una base de datos (SQLite o similar)

## Risks / Trade-offs

- **Riesgo**: El sitio actual es 100% estático. Migrar a server mode puede afectar rendimiento si no se configura bien el caching → **Mitigación**: Usar caching de Astro y mantener páginas informativas como estáticas
- **Riesgo**: Las credenciales de Mercado Pago (access token) deben manejarse de forma segura → **Mitigación**: Usar variables de entorno y no committear secrets
- **Riesgo**: El webhook IPN puede recibir duplicados → **Mitigación**: Verificar `id` único de notificación y desduplicar
- **Trade-off**: Checkout Pro saca al usuario del sitio (redirect), lo que puede sentirse menos integrado que un brick embebido
