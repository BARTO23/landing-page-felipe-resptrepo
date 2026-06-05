## Context

El sitio actual tiene una integración funcional con Mercado Pago Checkout Pro para pagos de servicios legales. Se requiere migrar completamente a ePayco, una pasarela de pagos colombiana con más de 22 medios de pago. El proyecto está construido con Astro 5 SSR + Tailwind, corre en Node.js standalone, y almacena transacciones en archivo JSON. Ya existe un flujo completo: agendar → pago → confirmación, más webhook para IPN y Google Calendar para eventos.

## Goals / Non-Goals

**Goals:**
- Reemplazar Mercado Pago por ePayco Smart Checkout v2 como única pasarela de pagos
- Mantener el flujo de usuario existente (agendar → pago → confirmación)
- Implementar creación de sesión de pago vía API Apify de ePayco
- Implementar webhook de confirmación con validación de firma SHA-256
- Soportar los mismos medios de pago colombianos (Nequi, Bancolombia, PSE, Daviplata, efectivo, tarjetas)
- Eliminar todo el código, dependencias y configuración de Mercado Pago

**Non-Goals:**
- No cambiar el flujo de agendamiento (booking) ni Google Calendar — solo la pasarela de pagos
- No implementar pagos recurrentes/suscripciones
- No implementar el componente embebido (onpage) del Smart Checkout — se usará el modo standard (redirección a entorno seguro) para mantener simplicidad
- No agregar base de datos — se mantiene almacenamiento en archivo JSON

## Decisions

1. **ePayco Smart Checkout v2 (standard) sobre la API directa de transacciones**
   - **Por qué**: Smart Checkout maneja automáticamente la seguridad PCI DSS Nivel 1, la validación de datos sensibles y la experiencia de pago multi-método. La API directa requeriría implementar manejo de tarjetas, PSE, efectivo, etc. por separado.
   - **Alternativa**: Usar la API REST directamente para crear transacciones. Se descarta porque duplica lógica que Smart Checkout ya provee.

2. **Autenticación Apify con Basic Auth (PUBLIC_KEY:PRIVATE_KEY)**
   - **Por qué**: Es el método oficial de ePayco para obtener el token Bearer que firma las peticiones de creación de sesión. Sigue el estándar OAuth2 client credentials.

3. **URL de confirmación (webhook server-to-server) como fuente de verdad**
   - **Por qué**: ePayco documenta explícitamente que la página de respuesta (response) puede ser manipulada por el usuario. Solo la confirmación server-to-server es confiable para determinar el estado final.
   - **Validación**: Firma SHA-256 con `p_cust_id_cliente`, `p_key`, `x_ref_payco`, `x_transaction_id`, `x_amount`, `x_currency_code` separados por `^`.

4. **Campos `x_extra1`-`x_extra5` para datos de cita en lugar de `external_reference`**
   - **Por qué**: ePayco no tiene un campo `external_reference` como MP. Los campos extras (`x_extra1`-`x_extra10`) cumplen la misma función y están disponibles en la respuesta del webhook.
   - **Mapeo**: `x_extra1`=servicio_id, `x_extra2`=fecha_cita, `x_extra3`=hora_cita, `x_extra4`=nombre_cliente, `x_extra5`=telefono_cliente

5. **Modo standard (redirect) en lugar de onpage (embebido)**
   - **Por qué**: El modo onpage requiere manejar hooks JS (`onResponse`, `onCreated`, etc.) y más lógica en el frontend. El modo standard redirige al entorno seguro de ePayco, similar al flujo actual con MP, minimizando cambios en la experiencia de usuario.

## Risks / Trade-offs

- **[Riesgo] Tiempo de migración**: El webhook actual de MP debe seguir funcionando hasta que todas las transacciones en curso se resuelvan → Mitigación: Mantener el endpoint `/api/webhook/mercadopago` activo durante 48h después del deploy, luego deprecarlo.
- **[Riesgo] Datos de cita en `x_extra`**: Hay 10 campos extras pero son VARCHAR(255). Si los datos de cita son más largos (ej. nombres muy largos) podría truncarse → Mitigación: Validar longitud antes de enviar.
- **[Trade-off] Sin embebido**: El modo standard redirige fuera del sitio, lo que puede sentirse menos integrado que el checkout embebido. Se acepta por simplicidad y consistencia con el flujo anterior.
- **[Riesgo] Archivo JSON**: Las transacciones se escriben en un archivo JSON que no es seguro para concurrencia. Ya existe como riesgo preexistente, no se agrava con este cambio.
