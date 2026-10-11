<!--
SYNC IMPACT REPORT (material temporal de revisión; eliminar antes de hacer commit)

Cambio de versión: 1.0.0 → 1.1.0
Tipo de bump: MINOR. Se añaden tres principios nuevos y sus quality gates; no se elimina ni se
redefine ninguna regla existente.

Principios modificados: ninguno.

Secciones añadidas:
- Core Principles
  - VII. Web mobile-first
  - VIII. Internacionalización (i18n)
  - IX. Sistema de medida global
- Flujo de Desarrollo y Quality Gates: gates 7, 8 y 9 (uno por cada principio nuevo).

Otras secciones modificadas:
- Introducción: "reglas no negociables" → "reglas", para ser coherente con la eliminación de las
  marcas NO NEGOCIABLE hecha en la versión 1.0.0.

Secciones eliminadas: ninguna.

TODOs diferidos: ninguno. No quedan placeholders sin resolver.

Supuestos a confirmar por el responsable del proyecto:
- Tamaño mínimo de objetivo táctil fijado en 44 × 44 px CSS. El usuario pidió "tamaño pulsable
  en una pantalla móvil" sin dar una cifra; se eligió un valor para que la regla sea verificable.
- Principio IX: "podrá ser modificable en alguna feature" se interpretó como que una
  funcionalidad puede cambiar cuál es el sistema global (por defecto, el métrico), no como que
  una funcionalidad pueda usar unidades distintas a las del resto de la aplicación.
- El Principio VIII se aplica al texto visible para el usuario; se excluyen logs, identificadores
  y claves técnicas.
-->

# Chiflete Constitution

Chiflete es un proyecto de software de uso público. Esta constitución fija las reglas que
gobiernan su diseño, construcción y evolución.

## Core Principles

### I. Arquitectura Backend / Frontend guiada por contrato

- El sistema se compone de dos componentes desplegables separados: un **backend** y un
  **frontend**. Ninguno DEBE acceder al código interno, la persistencia o el estado del otro.
- La única vía de comunicación entre ambos es la API HTTP descrita en el documento OpenAPI.
- El documento **OpenAPI es la fuente de verdad** del contrato front-back. Todo endpoint DEBE
  estar definido en OpenAPI antes de implementarse en cualquiera de los dos lados.
- Un cambio de contrato DEBE modificarse primero en OpenAPI; backend y frontend se ajustan a él,
  nunca al revés.
- Los tipos y clientes del frontend, y las interfaces del backend, DEBEN derivarse del documento
  OpenAPI o verificarse automáticamente contra él. Las definiciones de contrato duplicadas a mano
  y sin verificación están prohibidas.

**Justificación**: un contrato único y explícito evita la deriva entre componentes y permite
desarrollarlos y probarlos de forma independiente.

### II. Test-First

- Todo componente DEBE tener pruebas automatizadas verificables.
- Las pruebas se escriben **antes** que la implementación: primero la prueba, se comprueba que
  falla, y solo entonces se implementa (ciclo Rojo → Verde → Refactor).
- "Verificable" significa que las pruebas se ejecutan con un único comando documentado, sin pasos
  manuales, y producen un resultado determinista de aprobado o fallido.
- Un cambio con pruebas fallidas NO PUEDE integrarse.
- Cada endpoint definido en OpenAPI DEBE tener pruebas de contrato que verifiquen que la
  implementación cumple el documento.
- Código sin pruebas que lo respalden se considera incompleto.

**Justificación**: en un proyecto de uso público, las pruebas escritas primero son la única
evidencia objetiva de que el comportamiento es el especificado y de que sigue siéndolo.

### III. Documentación como entregable

Todo componente y toda decisión de arquitectura DEBEN estar documentados. Una entrega sin su
documentación está incompleta.

- **README por componente**: cada componente DEBE tener un `README.md` propio que explique su
  propósito, cómo construirlo, ejecutarlo y probarlo, y su configuración.
- **ADR de arquitectura**: toda decisión de arquitectura DEBE registrarse en un Architecture
  Decision Record con contexto, decisión, alternativas consideradas y consecuencias. Los ADR se
  guardan en `docs/adr/`.
- **Diagramas C4**: los ADR DEBEN incluir o referenciar diagramas del modelo C4 al nivel que la
  decisión afecte (contexto, contenedores o componentes). Los diagramas DEBEN mantenerse
  actualizados cuando la arquitectura cambia.
- **OpenAPI**: todo endpoint DEBE estar documentado en el documento OpenAPI (ver Principio I).
- La documentación se actualiza en el mismo cambio que modifica el comportamiento que describe.

**Justificación**: un proyecto público depende de que terceros puedan entenderlo, auditarlo y
contribuir sin conocimiento tribal.

### IV. Privacidad y cero datos sensibles

El sistema NO DEBE exponer ni almacenar información sensible. Se considera información sensible:

- Claves de API, tokens, secretos y cualquier credencial del sistema.
- Datos y credenciales de usuario.
- Cualquier dato que identifique a un usuario, de forma directa o por combinación con otros
  datos (incluidas direcciones IP).

Reglas:

- Los secretos NO DEBEN aparecer en el repositorio, en el código fuente, en artefactos de build,
  en bundles o respuestas enviadas al cliente, ni en logs. Se suministran exclusivamente por
  configuración externa en tiempo de ejecución.
- El frontend NO DEBE contener ni recibir claves de API de servicios de terceros; las llamadas
  que las requieran se realizan desde el backend.
- NO se persisten datos que identifiquen a un usuario. Toda funcionalidad que parezca requerirlo
  DEBE justificarse en un ADR y resolverse sin almacenar el identificador.
- Las respuestas de error NO DEBEN revelar detalles internos (trazas, rutas, configuración).

**Justificación**: los datos que no se recolectan ni almacenan no pueden filtrarse. Es la
garantía de privacidad más sólida que un proyecto público puede ofrecer.

### V. Observabilidad desde el inicio

- Las estrategias de observabilidad y logging DEBEN existir desde la primera funcionalidad; no
  son trabajo posterior.
- Todo componente DEBE emitir logs estructurados y exponer la información necesaria para
  diagnosticar su salud y su comportamiento en ejecución.
- Todo plan de funcionalidad DEBE indicar qué se registra y qué se mide.
- Los logs, métricas y trazas NO DEBEN contener direcciones IP, datos de usuario ni ningún dato
  sensible según el Principio IV.
- SÍ se permite registrar datos operativos o de contexto, como la ubicación, siempre que no
  identifiquen a un usuario ni permitan vincular el registro a un usuario concreto.
- Las reglas de exclusión de datos sensibles en logs DEBEN verificarse con pruebas automatizadas.

**Justificación**: un sistema público que no se puede observar no se puede operar; y una
observabilidad que filtra datos de usuario viola el Principio IV.

### VI. Simplicidad justificada

- NO se agregan dependencias, capas ni abstracciones sin una justificación escrita en el plan de
  la funcionalidad.
- La justificación DEBE indicar el problema concreto que resuelve y por qué la alternativa más
  simple no es suficiente.
- Lo que no esté justificado en el plan NO se incorpora durante la implementación; si surge la
  necesidad, primero se actualiza el plan.
- No se construye para necesidades hipotéticas futuras (YAGNI).

**Justificación**: cada dependencia o capa aumenta la superficie de mantenimiento, de seguridad
y de comprensión. La complejidad debe ganarse su lugar.

### VII. Web mobile-first

- Chiflete es una aplicación web **mobile-first**: toda pantalla se diseña y se implementa primero
  para móvil, y después se adapta a anchos mayores.
- El ancho mínimo soportado es de **320 px**. Toda pantalla DEBE ser plenamente utilizable a ese
  ancho.
- Ninguna pantalla DEBE producir scroll horizontal de página en ningún ancho igual o superior a
  320 px.
- Todo elemento interactivo DEBE tener un objetivo táctil de tamaño pulsable en una pantalla
  móvil: como mínimo 44 × 44 px CSS.

**Justificación**: el móvil es el contexto de uso principal; lo que funciona en la pantalla más
pequeña soportada escala hacia arriba, y no al revés.

### VIII. Internacionalización (i18n)

- Ningún texto visible para el usuario DEBE estar escrito directamente en el código. Todo texto
  DEBE provenir de un catálogo de mensajes.
- La regla cubre etiquetas, mensajes, errores, textos alternativos y cualquier otro texto que el
  usuario pueda leer o escuchar, en cualquier componente que lo origine.
- Añadir o cambiar un texto DEBE hacerse en el catálogo, no en el código que lo muestra.
- Quedan fuera de esta regla los logs, los identificadores y las claves técnicas.

**Justificación**: un proyecto de uso público debe poder traducirse sin tocar el código; el texto
incrustado lo impide.

### IX. Sistema de medida global

- El sistema de medida global del proyecto es el **sistema métrico**. Toda unidad de medida, en
  cualquier componente, DEBE respetar el sistema de medida global definido.
- Una funcionalidad PUEDE hacer modificable el sistema de medida global. En ese caso, toda
  unidad de medida DEBE respetar el sistema que esté definido a nivel global en ese momento.
- Ninguna funcionalidad DEBE introducir unidades o conversiones propias al margen del sistema
  global definido.
- El documento OpenAPI DEBE indicar la unidad de todo campo que represente una magnitud.

**Justificación**: mezclar unidades entre componentes o funcionalidades produce errores
silenciosos y datos incomparables.

## Stack Tecnológico y Restricciones

El stack del proyecto es fijo:

| Componente | Tecnología |
|------------|------------|
| Backend | Java 25, Spring Boot 4 |
| Frontend | Next.js 16, React 19, TypeScript en modo `strict`, Tailwind |
| Contrato front-back | OpenAPI (fuente de verdad) |

Restricciones:

- TypeScript DEBE compilar con `strict` habilitado. Está prohibido desactivarlo total o
  parcialmente, así como evadir el sistema de tipos para silenciar errores.
- Cambiar una tecnología o versión mayor de este stack es una enmienda a esta constitución
  (ver Governance) y requiere un ADR.
- Incorporar cualquier tecnología adicional está sujeto al Principio VI.

## Flujo de Desarrollo y Quality Gates

Todo cambio DEBE cumplir estas condiciones antes de integrarse:

1. **Contrato primero**: si el cambio toca la API, el documento OpenAPI se actualizó antes que
   las implementaciones (Principio I).
2. **Pruebas primero**: las pruebas se escribieron antes de la implementación y pasan
   (Principio II).
3. **Documentación al día**: README, ADR, diagramas C4 y OpenAPI afectados se actualizaron en el
   mismo cambio (Principio III).
4. **Sin datos sensibles**: el cambio no introduce secretos en el repositorio ni expone, almacena
   o registra datos sensibles (Principios IV y V).
5. **Observabilidad incluida**: la funcionalidad nueva emite logs y señales según lo declarado en
   su plan (Principio V).
6. **Complejidad justificada**: toda dependencia, capa o abstracción nueva aparece justificada en
   el plan (Principio VI).
7. **Mobile-first**: las pantallas afectadas son utilizables a 320 px de ancho, sin scroll
   horizontal y con objetivos táctiles del tamaño mínimo (Principio VII).
8. **Sin texto incrustado**: todo texto visible nuevo o modificado está en el catálogo
   (Principio VIII).
9. **Unidades coherentes**: toda unidad de medida respeta el sistema de medida global
   (Principio IX).

El plan de cada funcionalidad DEBE incluir una verificación explícita contra estos principios
antes de iniciar el diseño y nuevamente antes de la implementación. Toda desviación DEBE quedar
registrada en el plan junto con su justificación.

## Governance

- Esta constitución prevalece sobre cualquier otra práctica, guía o convención del proyecto. En
  caso de conflicto, se cumple la constitución.
- **Enmiendas**: toda enmienda DEBE proponerse por escrito, indicando el cambio, su motivación y
  su impacto sobre el código y los artefactos existentes. Si afecta a trabajo ya realizado, DEBE
  incluir un plan de migración. La enmienda entra en vigor al ser aprobada por el responsable del
  proyecto y registrada en este documento.
- **Versionado**: la constitución usa versionado semántico.
  - MAJOR: eliminación o redefinición incompatible de un principio o regla de gobernanza.
  - MINOR: nuevo principio o sección, o ampliación material de una guía existente.
  - PATCH: aclaraciones, redacción y correcciones sin cambio de significado.
- **Cumplimiento**: toda revisión de cambios DEBE verificar el cumplimiento de estos principios.
  Los quality gates de la sección anterior son el mecanismo de verificación.
- Las desviaciones de cualquier principio solo son válidas si están justificadas por escrito en
  el plan de la funcionalidad.

**Version**: 1.1.0 | **Ratified**: 2026-10-10 | **Last Amended**: 2026-10-11
