# Plan de Desarrollo — Sistema de Agendamiento y Pagos

## Estado General

- **Fase 1 (Completada):** Landing page estática con Astro 5 + Tailwind + Lex Meridian
- **Fase 2 (Pendiente):** Sistema de agendamiento con pagos en Colombia

---

## Fase 2 — Sistema de Reservas con Pagos

### Stack
- **Framework:** Astro con `output: 'hybrid'` + adaptador Node
- **UI interactiva:** React islands (client:load)
- **Base de datos:** PostgreSQL con Prisma ORM
- **Pagos:** Wompi (pasarela colombiana: PSE, Nequi, Daviplata, Bancolombia)
- **Calendario:** Google Calendar API via Service Account
- **Estilos:** Tailwind CSS (Lex Meridian design tokens)

### Flujo completo
1. Cliente entra a `/reservar` y ve calendario con slots disponibles
2. Selecciona un slot (fecha + hora)
3. Llena formulario con nombre, email, teléfono
4. Frontend llama a `POST /api/bookings/reserve` → genera referencia única + hash integridad Wompi
5. Se renderiza widget Wompi para que el cliente pague
6. Wompi envía `POST /api/webhooks/wompi` cuando el pago es exitoso
7. Webhook actualiza DB, bloquea slot, crea evento en Google Calendar
8. Google Calendar envía invitación automática al cliente

---

## Tareas de Implementación

### Prerrequisitos (antes de codificar)

- [ ] **P1: Obtener cuenta Wompi** — wompi.com (claves: Integrity Secret, Events Secret, Private Key, Public Key)
- [ ] **P2: Crear proyecto Google Cloud** — habilitar Calendar API + crear Service Account + descargar JSON
- [ ] **P3: Crear base de datos PostgreSQL** — Neon (gratis), Railway ($5/mes), o Supabase
- [ ] **P4: Definir precio de consulta** — ej: $150.000 COP = 15000000 centavos
- [ ] **P5: Definir horarios de atención** — ej: L-V 8am-6pm, cada 60 min

### Paso 1 — Variables de Entorno

- [ ] **T1.1:** Crear `.env` en la raíz del proyecto

```env
DATABASE_URL=postgresql://...
WOMPI_INTEGRITY_SECRET=...
WOMPI_EVENTS_SECRET=...
WOMPI_PRIVATE_KEY=...
PUBLIC_WOMPI_PUBLIC_KEY=...
GOOGLE_CALENDAR_ID=...
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

### Paso 2 — Prisma

- [ ] **T2.1:** Inicializar Prisma (`npx prisma init`)
- [ ] **T2.2:** Crear `prisma/schema.prisma` con modelos `TimeSlot` y `Booking`
- [ ] **T2.3:** Crear `prisma/seed.ts` para generar slots 30 días (L-V, 8am-5pm)
- [ ] **T2.4:** Ejecutar `npx prisma migrate dev --name init`
- [ ] **T2.5:** Crear `src/lib/prisma.ts` (singleton de PrismaClient)

**Modelos:**

```prisma
model TimeSlot {
  id          String    @id @default(cuid())
  date        String
  startTime   String
  endTime     String
  isAvailable Boolean   @default(true)
  booking     Booking?
  createdAt   DateTime  @default(now())
}

model Booking {
  id             String    @id @default(cuid())
  timeSlotId     String    @unique
  timeSlot       TimeSlot  @relation(fields: [timeSlotId], references: [id])
  clientName     String
  clientEmail    String
  clientPhone    String
  wompiReference String    @unique
  wompiStatus    String    @default("PENDING")
  googleEventId  String?
  amount         Int
  createdAt      DateTime  @default(now())
}
```

### Paso 3 — Helpers (src/lib/)

- [ ] **T3.1:** `src/lib/wompi.ts`
  - Función `generateIntegrityHash(reference, amountInCents): string`
  - Usa `crypto` de Node + SHA256
  - Concatena: `reference + amountInCents + "COP" + WOMPI_INTEGRITY_SECRET`
- [ ] **T3.2:** `src/lib/google-calendar.ts`
  - Función `createCalendarEvent(clientName, clientEmail, clientPhone, date, startTime, endTime): Promise<string>`
  - Usa `googleapis` con Service Account
  - TimeZone: `America/Bogota`
  - `sendUpdates: 'all'` para invitación automática
  - Recordatorios: email 60 min, popup 15 min
  - Retorna `event.data.id`

### Paso 4 — API Routes

- [ ] **T4.1:** `src/pages/api/slots.ts` — `GET`
  - Query param: `month` (ej: "2025-06")
  - Retorna JSON con slots disponibles del mes
- [ ] **T4.2:** `src/pages/api/bookings/reserve.ts` — `POST`
  - Body: `{ slotId, clientName, clientEmail, clientPhone }`
  - Genera referencia única con `nanoid`
  - Crea Booking en DB con status PENDING
  - Calcula hash de integridad
  - Responde: `{ reference, amountInCents, integrityHash }`
- [ ] **T4.3:** `src/pages/api/webhooks/wompi.ts` — `POST`
  - Verifica `event === 'transaction.updated'` y `status === 'APPROVED'`
  - Busca Booking por `wompiReference`
  - **Idempotencia:** si ya está APPROVED, ignorar
  - Actualiza `wompiStatus` a APPROVED
  - Marca TimeSlot como `isAvailable: false`
  - Llama `createCalendarEvent()`
  - Guarda `googleEventId` en Booking
  - Responde `{ ok: true }`

### Paso 5 — Componentes React (islands)

- [ ] **T5.1:** `src/components/react/CalendarPicker.tsx`
  - Fetch `GET /api/slots?month=YYYY-MM`
  - Grilla de slots disponibles
  - click → redirige a `/reservar/[slotId]`
- [ ] **T5.2:** `src/components/react/BookingForm.tsx`
  - Props: `slotId: string`
  - Formulario: nombre, email, teléfono
  - Submit → `POST /api/bookings/reserve`
  - Al recibir respuesta → renderiza WompiWidget
- [ ] **T5.3:** `src/components/react/WompiWidget.tsx`
  - Props: `reference, amountInCents, integrityHash, publicKey`
  - `useEffect` inyecta script de Wompi dinámicamente
  - Atributos: `data-render="button"`, `data-public-key`, `data-currency="COP"`,
    `data-amount-in-cents`, `data-reference`, `data-signature:integrity`,
    `data-redirect-url="/confirmacion"`

### Paso 6 — Páginas Astro

- [ ] **T6.1:** `src/pages/reservar/index.astro`
  - Importa `<CalendarPicker client:load />`
  - Meta: solo indexada si hay slots libres
- [ ] **T6.2:** `src/pages/reservar/[slotId].astro`
  - `export const prerender = false` (server-rendered)
  - Valida que el slotId exista y esté disponible
  - Pasa slotId a `<BookingForm client:load slotId={slotId} />`
  - Meta: noindex para evitar SEO duplicado
- [ ] **T6.3:** `src/pages/confirmacion.astro`
  - Página estática de éxito
  - Mensaje: "Reserva confirmada, recibirás un correo con los detalles"
  - Botón volver al inicio

### Paso 7 — Configuración del Proyecto

- [ ] **T7.1:** Actualizar `astro.config.mjs`
  - Cambiar `output: 'static'` a `output: 'hybrid'`
  - Agregar adapter `@astrojs/node` (server mode standalone)
  - Agregar integración `@astrojs/react`
- [ ] **T7.2:** Actualizar `package.json`
  - Dependencias nuevas: `@astrojs/node`, `@astrojs/react`, `react`, `react-dom`,
    `@prisma/client`, `googleapis`, `nanoid`
  - DevDeps: `prisma`, `@types/react`, `@types/react-dom`
- [ ] **T7.3:** Ejecutar `npm install`

### Paso 8 — Build y Pruebas

- [ ] **T8.1:** Generar Prisma client: `npx prisma generate`
- [ ] **T8.2:** Ejecutar seed: `npx prisma db seed`
- [ ] **T8.3:** Probar en dev: `npm run dev`
- [ ] **T8.4:** Probar build: `npm run build`
- [ ] **T8.5:** Probar preview: `npm run preview`
- [ ] **T8.6:** Verificar webhooks con Wompi test mode (ngrok)
- [ ] **T8.7:** Verificar creación de eventos en Google Calendar

---

## Consideraciones de Hosting

### Opciones recomendadas

| Opción | Server Runtime | DB | Costo |
|--------|---------------|-----|-------|
| Vercel + Neon | Serverless Functions | PostgreSQL | Gratis |
| Railway | Node.js | PostgreSQL | ~$5/mes |
| Fly.io | Node.js | PostgreSQL | ~$3/mes |

> **Nota:** `@astrojs/node` con output 'hybrid' funciona en serverless (Vercel)
> y en Node persistent (Railway, Fly.io).

---

## Preguntas Pendientes (responder antes de implementar)

1. ¿Tienes cuenta de Wompi? (wompi.com)
2. ¿Tienes proyecto de Google Cloud con Calendar API activada?
3. ¿Cuánto vale la consulta? (ej: $150.000 COP)
4. ¿Horarios de atención? (ej: L-V 8am-6pm, cada 60 min)
5. ¿Prefieres Vercel+Neon o Railway para hosting?
6. ¿Slots generados automáticamente (seed) o quieres panel admin?
