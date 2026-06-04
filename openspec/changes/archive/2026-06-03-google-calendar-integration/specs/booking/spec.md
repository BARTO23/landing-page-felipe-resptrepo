## ADDED Requirements

### Requirement: Página de agendamiento de asesoría
El sistema SHALL mostrar una página `/agendar` donde el cliente pueda seleccionar fecha, hora y proporcionar su nombre y teléfono para la asesoría.

#### Scenario: Visualizar formulario de agendamiento
- **WHEN** el cliente accede a `/agendar?servicio=<id>`
- **THEN** el sistema muestra el nombre del servicio, un calendario para seleccionar fecha, un selector de hora, y campos para nombre y teléfono

#### Scenario: Servicio no encontrado en agendamiento
- **WHEN** el cliente accede a `/agendar?servicio=<id-invalido>`
- **THEN** el sistema muestra mensaje de error y enlace para volver a servicios

### Requirement: Validar campos del formulario
El sistema SHALL validar que todos los campos requeridos (fecha, hora, nombre, teléfono) estén completos antes de permitir continuar al pago.

#### Scenario: Todos los campos completos
- **WHEN** el cliente completa fecha, hora, nombre y teléfono
- **THEN** el sistema habilita el botón para continuar al pago

#### Scenario: Campos incompletos
- **WHEN** el cliente intenta continuar sin completar todos los campos
- **THEN** el sistema muestra error indicando los campos faltantes

### Requirement: Horarios disponibles predefinidos
El sistema SHALL mostrar una lista de horarios disponibles (lunes a viernes, 8:00-12:00 y 14:00-18:00, hora Colombia).

#### Scenario: Mostrar horarios disponibles
- **WHEN** el cliente selecciona una fecha
- **THEN** el sistema muestra los horarios disponibles para esa fecha

#### Scenario: Fin de semana sin horarios
- **WHEN** el cliente selecciona un sábado o domingo
- **THEN** el sistema muestra mensaje indicando que solo hay disponibilidad de lunes a viernes

### Requirement: Redirigir al pago con datos de cita
El sistema SHALL redirigir al cliente a la página de pago incluyendo los datos de la cita codificados.

#### Scenario: Continuar al pago
- **WHEN** el cliente completa el formulario y hace clic en "Continuar al pago"
- **THEN** el sistema redirige a `/pago?servicio=<id>&cita=<datos-codificados>` con fecha, hora, nombre y teléfono
