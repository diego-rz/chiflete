# Feature Specification: Clima actual por ciudad

**Feature Branch**: `001-city-current-weather`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "Objetivo principal: el usuario puede ver el clima actual en la ciudad que desee. Flujo principal: ingreso de datos en cuadro de búsqueda, despliegue de lista de coincidencias, selección del usuario, visualización de clima actual. Reglas de búsqueda: el usuario escribe mínimo 3 caracteres, a partir de ahí el sistema empieza a proponerle resultados de búsqueda (sin que el usuario tenga que dejar de escribir ni pulsar enter), a medida que sigue escribiendo la búsqueda se va refinando, por defecto se muestran 5 resultados con la opción de cargar más resultados oprimiendo un botón de "ver mas resultados". La búsqueda debe soportar que el usuario omita tildes o caracteres (por ejemplo: 'cordoba' debería encontrar 'córdoba'). Los datos a mostrar en los resultados de búsqueda son ciudad, provincia y país (ciudad se muestra en un tamaño más grande, provincia y país en un tamaño más pequeño y más claro). Datos a mostrar: temperatura actual en grados, precipitación actual, velocidad de viento (sin ráfagas), dirección de viento, humedad en porcentaje, presión y visibilidad. La información debe ser la más actual encontrada con un máximo de 2 hs de antigüedad y debe informarse en qué momento fue realizada la observación (toda hora debe ser la hora del sistema en donde ejecuta el usuario). Los datos deben estar en sistema métrico. En caso de que el proveedor no informe un dato mostrar guión "-". En caso de que no haya resultados, debe mostrarse un mensaje en la lista de búsqueda "Sin resultados", en caso de que el proveedor esté caído debe informarse un mensaje de error "Error interno" sin mostrar resultados. Fuera de alcance: geolocalización del usuario, pronóstico extendido, mapa, cualquier información que guarde el usuario."

## Clarifications

### Session 2026-10-11

- Q: ¿La búsqueda debe encontrar la ciudad si el usuario se salta o equivoca letras en mitad del
  nombre? → A: No. Solo se ignoran tildes, diacríticos (ñ/n, ü/u) y mayúsculas, y se aceptan
  nombres incompletos; los signos de puntuación y los espacios sí cuentan, y no hay tolerancia a
  errores ortográficos. (Revisado el 2026-10-11 para simplificar: antes también se ignoraban
  signos de puntuación y espacios.)
- Q: ¿Qué ve el usuario si la observación más reciente tiene más de 2 horas? → A: Los datos se
  muestran igualmente, con su hora de observación y una advertencia visible de que están
  desactualizados.
- Q: ¿En qué unidad métrica se muestra la velocidad del viento? → A: km/h.
- Q: ¿Se puede encontrar una ciudad escribiendo su nombre en otro idioma? → A: No en esta versión.
  (Revisado el 2026-10-31 para simplificar: antes se buscaba por nombre en español, local o en
  inglés. La búsqueda bilingüe queda para una versión posterior.)
- Q: ¿Se actualizan solos los datos del clima mientras la pantalla está abierta? → A: No; hay un
  botón "Actualizar" junto al clima.

### Session 2026-10-31

- Q: ¿Qué reglas de búsqueda incluye esta primera versión? → A: Solo se ignoran tildes,
  diacríticos y mayúsculas, y se busca por prefijo. Ignorar signos de puntuación y espacios y la
  búsqueda bilingüe quedan para una versión posterior.
- Q: ¿Por qué nombre se busca y se muestra cada ciudad? → A: Por su nombre en español cuando
  exista ("Londres"); si no existe, por su nombre local. Se busca y se muestra por ese mismo
  nombre.
- Q: ¿El prefijo coincide solo con el inicio del nombre completo o también con el de cada
  palabra? → A: Con el inicio del nombre completo o de cualquiera de sus palabras.
- Q: Sabiendo que en una versión futura se añadirá el sistema imperial, ¿qué deja preparado esta
  primera versión? → A: Solo se muestra el sistema métrico y no se implementa ninguna conversión;
  los datos del clima que entrega el sistema indican explícitamente el sistema de medida en que
  vienen sus valores, sin mostrar ninguna etiqueta extra en pantalla.
- Q: Si falla el proveedor al pulsar "Ver más resultados", ¿qué pasa con los resultados ya
  mostrados? → A: Se conservan; debajo de ellos aparece "Error interno" y el usuario puede volver
  a pulsar "Ver más resultados" para reintentar.
- Q: ¿Cuánto se espera al proveedor antes de mostrar "Error interno"? → A: 5 segundos, igual para
  la búsqueda y para el clima.
- Q: ¿Qué registra y mide la funcionalidad? → A: Cada operación (búsqueda, más resultados, clima,
  actualizar) con su resultado y su duración; métricas de volumen, latencia y tasa de error por
  operación. Del clima se registra la ciudad consultada; el texto de búsqueda nunca se registra.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Buscar una ciudad y ver su clima actual (Priority: P1)

Una persona quiere saber qué tiempo hace ahora mismo en una ciudad. Escribe el nombre en el
cuadro de búsqueda; a partir del tercer carácter, y sin dejar de escribir ni pulsar Enter, ve una
lista de ciudades coincidentes que se va afinando con cada carácter. Elige una y ve el clima
actual de esa ciudad junto con el momento en que se tomó la observación.

**Why this priority**: es el objetivo completo de la funcionalidad. Sin este recorrido no hay
producto; con él solo, ya hay un producto útil.

**Independent Test**: se prueba de extremo a extremo escribiendo "cordoba", eligiendo
"Córdoba, Córdoba, Argentina" en la lista y comprobando que se muestran los siete datos del
clima con sus unidades y la hora de la observación.

**Acceptance Scenarios**:

1. **Given** el cuadro de búsqueda vacío, **When** el usuario escribe 1 o 2 caracteres, **Then**
   no se muestra ninguna lista ni se busca nada.
2. **Given** el usuario ha escrito 2 caracteres, **When** escribe el tercero, **Then** aparece la
   lista de coincidencias sin que tenga que pulsar Enter ni ningún botón.
3. **Given** una lista de coincidencias visible, **When** el usuario sigue escribiendo, **Then**
   la lista se actualiza para reflejar únicamente el texto actual del cuadro.
4. **Given** el usuario escribe "cordoba", **When** se muestran las coincidencias, **Then** la
   lista incluye ciudades llamadas "Córdoba".
5. **Given** una lista de coincidencias, **When** el usuario la observa, **Then** cada resultado
   muestra la ciudad en un tamaño mayor y, debajo o al lado, la provincia y el país en un tamaño
   menor y un tono más claro.
6. **Given** una lista de coincidencias, **When** el usuario selecciona una ciudad, **Then** la
   lista se cierra y se muestra el clima actual de esa ciudad: temperatura, precipitación,
   velocidad del viento, dirección del viento, humedad, presión y visibilidad, cada dato con su
   unidad métrica.
7. **Given** el clima de una ciudad en pantalla, **When** el usuario lo observa, **Then** ve el
   nombre de la ciudad consultada y la fecha y hora de la observación expresadas en la hora de
   su propio dispositivo.
8. **Given** el clima de una ciudad en pantalla, **When** el usuario busca y selecciona otra
   ciudad, **Then** el clima mostrado se sustituye por el de la nueva ciudad.
9. **Given** el clima de una ciudad en pantalla, **When** el usuario pulsa "Actualizar", **Then**
   se muestran la observación más reciente de esa misma ciudad y su hora de observación.

---

### User Story 2 - Ver más resultados de búsqueda (Priority: P2)

El nombre que busca la persona es común a muchas ciudades y la que le interesa no está entre las
cinco primeras. Pulsa "Ver más resultados" y la lista se amplía hasta encontrarla.

**Why this priority**: sin esto, las ciudades con nombres muy repetidos pueden ser inalcanzables,
pero el recorrido principal funciona para la mayoría de búsquedas.

**Independent Test**: se prueba buscando un nombre con más de cinco coincidencias (por ejemplo
"san") y comprobando que el botón añade resultados a la lista hasta agotarlos.

**Acceptance Scenarios**:

1. **Given** una búsqueda con más de 5 coincidencias, **When** se muestra la lista, **Then**
   aparecen exactamente 5 resultados y un botón "Ver más resultados".
2. **Given** la lista con el botón visible, **When** el usuario lo pulsa, **Then** se añaden
   hasta 5 resultados más a continuación de los ya mostrados, sin perder los anteriores.
3. **Given** una búsqueda con 5 coincidencias o menos, **When** se muestra la lista, **Then** el
   botón "Ver más resultados" no aparece.
4. **Given** el usuario ya cargó todos los resultados existentes, **When** se muestra la lista,
   **Then** el botón "Ver más resultados" deja de mostrarse.
5. **Given** el usuario amplió la lista, **When** modifica el texto de búsqueda, **Then** la lista
   vuelve a mostrar los 5 primeros resultados de la nueva búsqueda.
6. **Given** la lista con resultados y el botón visible, **When** el usuario pulsa "Ver más
   resultados" y el proveedor falla, **Then** los resultados ya mostrados se conservan, debajo
   aparece "Error interno" y el botón sigue disponible para reintentar.

---

### User Story 3 - Entender qué pasa cuando no hay datos o algo falla (Priority: P3)

La persona busca una ciudad que no existe, el proveedor de datos no informa alguno de los valores
o el proveedor no responde. En cada caso recibe una indicación clara y nunca ve datos inventados,
datos antiguos sin advertencia o un mensaje técnico.

**Why this priority**: son situaciones menos frecuentes que el recorrido principal, pero sin un
tratamiento explícito el usuario no sabe si se equivocó él o falló el sistema.

**Independent Test**: se prueba provocando cada situación por separado (búsqueda sin
coincidencias, dato ausente, observación antigua, proveedor caído) y comprobando el mensaje o el
valor mostrado.

**Acceptance Scenarios**:

1. **Given** una búsqueda de 3 o más caracteres sin coincidencias, **When** termina la búsqueda,
   **Then** la lista muestra el mensaje "Sin resultados" y ningún resultado.
2. **Given** el proveedor de ciudades no está disponible, **When** el usuario busca, **Then** se
   muestra el mensaje "Error interno" y ningún resultado.
3. **Given** el proveedor de clima no está disponible, **When** el usuario selecciona una ciudad,
   **Then** se muestra el mensaje "Error interno" y ningún dato de clima.
4. **Given** el proveedor no informa uno de los datos del clima, **When** se muestra el clima,
   **Then** ese dato aparece como "-" y el resto se muestra con normalidad.
5. **Given** la observación más reciente de la ciudad tiene más de 2 horas, **When** el usuario
   selecciona la ciudad, **Then** se muestran sus valores y su hora de observación junto con una
   advertencia visible de que los datos están desactualizados.
6. **Given** se mostró "Error interno", **When** el usuario vuelve a buscar o a seleccionar,
   **Then** el sistema lo intenta de nuevo y, si el proveedor ya responde, muestra el resultado
   normal.

---

### Edge Cases

- **Respuestas fuera de orden**: si el usuario escribe rápido y una búsqueda anterior responde
  después que la más reciente, la lista muestra siempre los resultados del texto que hay en el
  cuadro, nunca los de un texto anterior.
- **Borrado por debajo del mínimo**: si el usuario borra hasta quedar con menos de 3 caracteres,
  la lista y cualquier mensaje de búsqueda desaparecen.
- **Espacios**: los espacios al inicio y al final no cuentan para el mínimo de 3 caracteres; un
  texto formado solo por espacios no dispara la búsqueda.
- **Mayúsculas y caracteres especiales**: "CORDOBA", "cordoba" y "Córdoba" dan las mismas
  coincidencias; lo mismo ocurre con "ñ"/"n" y "ü"/"u".
- **Ciudades homónimas**: varias ciudades con el mismo nombre aparecen como resultados distintos,
  diferenciados por provincia y país.
- **Ciudad sin provincia**: si no existe provincia o división equivalente, el resultado muestra
  solo ciudad y país, sin separadores ni huecos sobrantes.
- **Valor cero frente a dato ausente**: un valor informado igual a cero (por ejemplo, 0 mm de
  precipitación o viento en calma) se muestra como cero con su unidad, no como "-".
- **Viento sin dirección**: si hay velocidad pero no dirección informada, la dirección se muestra
  como "-".
- **Observación en otro día**: si la observación corresponde a un día distinto al actual en el
  dispositivo del usuario, la fecha mostrada lo deja claro.
- **Fallo al actualizar**: si el proveedor falla al pulsar "Actualizar", se muestra "Error
  interno" en lugar de los datos anteriores; el usuario puede volver a intentarlo.
- **Pantalla abierta mucho tiempo**: los datos no cambian solos ni aparece la advertencia de
  datos desactualizados por el mero paso del tiempo; la antigüedad se evalúa al obtener la
  observación.
- **Espera**: mientras se busca o se carga el clima, el usuario ve una indicación de carga; al
  cargar el clima de una nueva ciudad no permanecen visibles los datos de la anterior como si
  fueran de la nueva.
- **Nombres largos a 320 px**: los nombres de ciudad, provincia y país largos se ajustan sin
  provocar scroll horizontal.

## Requirements *(mandatory)*

### Functional Requirements

**Búsqueda de ciudades**

- **FR-001**: El sistema DEBE ofrecer un cuadro de búsqueda de ciudades como punto de entrada de
  la funcionalidad.
- **FR-002**: El sistema NO DEBE buscar ni mostrar lista de coincidencias mientras el texto tenga
  menos de 3 caracteres, sin contar espacios al inicio y al final.
- **FR-003**: A partir de 3 caracteres, el sistema DEBE mostrar coincidencias de forma automática
  mientras el usuario escribe, sin requerir Enter ni ninguna otra acción de confirmación.
- **FR-004**: El sistema DEBE actualizar las coincidencias con cada cambio del texto, y la lista
  mostrada DEBE corresponder siempre al texto actual del cuadro.
- **FR-005**: La búsqueda DEBE ignorar tildes y demás signos diacríticos y la diferencia entre
  mayúsculas y minúsculas, de modo que "cordoba" encuentre "Córdoba".
- **FR-005a**: Tildes, diacríticos y mayúsculas son lo ÚNICO que la búsqueda ignora. Los signos de
  puntuación y los espacios interiores cuentan tal como se escriben, y no se toleran errores
  ortográficos: "sanjose" no tiene por qué encontrar "San José" ni "cordba" encontrar "Córdoba".
- **FR-005b**: Cada ciudad, provincia y país tiene un único nombre para buscar y mostrar: su
  nombre en español cuando exista ("Londres") y, si no existe, su nombre local. "London" no
  tiene por qué encontrar "Londres".
- **FR-006**: La búsqueda DEBE encontrar ciudades a partir de un nombre incompleto: el texto
  escrito coincide con el inicio del nombre de la ciudad o de alguna de sus palabras: "san j" y
  "jose" encuentran "San José"; "ose" no lo encuentra.
- **FR-007**: Cada resultado DEBE mostrar ciudad, provincia (o división administrativa
  equivalente) y país. La ciudad se muestra en un tamaño mayor; provincia y país, en un tamaño
  menor y un tono más claro.
- **FR-008**: El sistema DEBE mostrar inicialmente como máximo 5 resultados.
- **FR-009**: Cuando existan más coincidencias que las mostradas, el sistema DEBE ofrecer un
  botón "Ver más resultados" que añade hasta 5 resultados más cada vez que se pulsa, conservando
  los ya mostrados. El botón NO DEBE mostrarse cuando no quedan más resultados.
- **FR-009a**: Si el proveedor falla al cargar más resultados, el sistema DEBE conservar los
  resultados ya mostrados, mostrar "Error interno" debajo de ellos y mantener el botón "Ver más
  resultados" para reintentar.
- **FR-010**: Cuando una búsqueda no tenga coincidencias, la lista DEBE mostrar el mensaje
  "Sin resultados".
- **FR-011**: El usuario DEBE poder seleccionar un resultado de la lista; al hacerlo, la lista se
  cierra y se muestra el clima actual de esa ciudad.

**Clima actual**

- **FR-012**: Para la ciudad seleccionada, el sistema DEBE mostrar: temperatura, precipitación,
  velocidad del viento (velocidad sostenida, sin ráfagas), dirección del viento, humedad
  relativa, presión atmosférica y visibilidad.
- **FR-013**: Todos los valores DEBEN expresarse en el sistema métrico y mostrarse con su unidad:
  temperatura en °C, precipitación en mm, velocidad del viento en km/h, humedad en %, presión en
  hPa y visibilidad en km. La dirección del viento se muestra como punto cardinal.
- **FR-013a**: Los datos del clima que entrega el sistema DEBEN indicar explícitamente el sistema
  de medida en que vienen sus valores (en esta versión, siempre el métrico). La pantalla NO
  muestra el sistema de medida como texto aparte: cada valor ya lleva su unidad.
- **FR-013b**: Esta versión NO DEBE incluir conversión a otros sistemas de medida.
- **FR-014**: El sistema DEBE mostrar la observación más reciente disponible para la ciudad. Una
  observación se considera vigente si no tiene más de 2 horas de antigüedad en el momento de la
  consulta.
- **FR-015**: Si la observación más reciente tiene más de 2 horas, el sistema DEBE mostrar
  igualmente sus valores y su hora de observación, acompañados de una advertencia visible de que
  los datos están desactualizados. La advertencia NO DEBE mostrarse con observaciones vigentes.
- **FR-016**: El sistema DEBE mostrar la fecha y hora en que se realizó la observación.
- **FR-017**: Toda fecha y hora mostrada DEBE expresarse en la zona horaria del dispositivo del
  usuario, no en la de la ciudad consultada.
- **FR-018**: Cuando el proveedor no informe un dato, el sistema DEBE mostrar "-" en su lugar y
  seguir mostrando el resto. Un valor informado igual a cero NO es un dato ausente.
- **FR-019**: El sistema DEBE identificar junto al clima la ciudad a la que corresponde (ciudad,
  provincia y país).
- **FR-020**: Seleccionar otra ciudad DEBE sustituir por completo el clima mostrado.
- **FR-020a**: Junto al clima mostrado DEBE haber un botón "Actualizar" que vuelve a obtener la
  observación más reciente de la misma ciudad y sustituye los datos y la hora de observación.
- **FR-020b**: El clima mostrado NO DEBE actualizarse de forma automática; solo cambia cuando el
  usuario pulsa "Actualizar" o selecciona una ciudad.

**Errores y estados**

- **FR-021**: Si el proveedor de datos no está disponible o falla durante una búsqueda, el
  sistema DEBE mostrar el mensaje "Error interno" y NO DEBE mostrar resultados. La única
  excepción es el fallo al cargar más resultados (FR-009a).
- **FR-022**: Si el proveedor de datos no está disponible o falla al obtener el clima, el sistema
  DEBE mostrar el mensaje "Error interno" y NO DEBE mostrar datos de clima.
- **FR-022a**: Si el proveedor no responde en 5 segundos, la operación (búsqueda, carga de más
  resultados, obtención o actualización del clima) DEBE tratarse como fallo del proveedor y
  aplicar FR-009a, FR-021 o FR-022 según corresponda.
- **FR-023**: Los mensajes de error NO DEBEN revelar detalles técnicos ni el nombre del proveedor.
- **FR-024**: Tras un error, el usuario DEBE poder reintentar repitiendo la búsqueda, la
  selección o la actualización, sin recargar la aplicación.
- **FR-025**: El sistema DEBE indicar visualmente que hay una búsqueda o una carga de clima en
  curso.

**Privacidad**

- **FR-026**: El sistema NO DEBE guardar ninguna información del usuario: ni textos buscados, ni
  ciudades seleccionadas, ni historial, ni preferencias. Al volver a abrir la aplicación, el
  usuario parte de un cuadro de búsqueda vacío.
- **FR-027**: El sistema NO DEBE solicitar ni utilizar la ubicación del usuario.
- **FR-028**: Los registros operativos PUEDEN incluir la ciudad consultada, pero NO DEBEN
  contener ningún dato que identifique al usuario ni que permita vincular una consulta con él.
- **FR-028a**: El sistema DEBE registrar cada operación (búsqueda, carga de más resultados,
  obtención del clima y actualización) con su tipo, su resultado (éxito, sin resultados, error
  del proveedor o tiempo agotado) y su duración. En las operaciones de clima se registra además la
  ciudad consultada.
- **FR-028b**: El texto escrito por el usuario en la búsqueda NUNCA DEBE aparecer en registros ni
  métricas.
- **FR-028c**: El sistema DEBE medir, por tipo de operación, el número de operaciones, su latencia
  y su tasa de error, de forma que puedan comprobarse SC-002, SC-003 y la disponibilidad del
  proveedor.

**Presentación**

- **FR-029**: Toda la funcionalidad DEBE ser utilizable en una pantalla de 320 px de ancho, sin
  scroll horizontal, y los elementos pulsables (cuadro de búsqueda, resultados, botones "Ver más
  resultados" y "Actualizar") DEBEN tener un tamaño cómodo para el dedo.
- **FR-030**: Todos los textos visibles (etiquetas, mensajes, unidades y puntos cardinales) DEBEN
  ser traducibles; el idioma inicial es el español.

### Key Entities

- **Ciudad**: lugar que el usuario puede buscar y seleccionar. Se identifica ante el usuario por
  su nombre (en español si existe; si no, el local), su provincia o división equivalente (puede
  faltar) y su país. Varias ciudades pueden compartir nombre.
- **Búsqueda**: texto escrito por el usuario y el conjunto ordenado de ciudades que coinciden con
  él, mostrado por tandas de 5. Existe solo mientras el usuario la está usando.
- **Observación del clima**: medición de las condiciones de una ciudad en un momento concreto.
  Tiene un instante de observación y hasta siete datos (temperatura, precipitación, velocidad y
  dirección del viento, humedad, presión, visibilidad), cualquiera de los cuales puede faltar,
  y el sistema de medida en que se expresan esos datos.
  Está vigente durante las 2 horas siguientes a su instante de observación; pasado ese plazo
  está desactualizada y solo se muestra con advertencia.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario que conoce el nombre de la ciudad llega desde el cuadro de búsqueda
  vacío hasta ver su clima actual en menos de 15 segundos.
- **SC-002**: En el 95 % de las búsquedas, las coincidencias aparecen en menos de 1 segundo desde
  la última pulsación.
- **SC-003**: En el 95 % de las selecciones, el clima se muestra en menos de 2 segundos.
- **SC-004**: El 100 % de las búsquedas escritas sin tildes devuelve las mismas ciudades que la
  misma búsqueda escrita con tildes.
- **SC-005**: El 100 % de las observaciones mostradas con más de 2 horas de antigüedad en el
  momento de la consulta lleva la advertencia de datos desactualizados, y ninguna observación
  vigente la lleva.
- **SC-006**: El 100 % de los datos no informados por el proveedor se muestra como "-"; nunca
  como cero, vacío o un valor estimado.
- **SC-007**: El recorrido completo (buscar, ampliar resultados, seleccionar y leer el clima) se
  puede realizar en una pantalla de 320 px de ancho sin scroll horizontal.
- **SC-008**: Tras cerrar y volver a abrir la aplicación no queda ningún rastro de búsquedas ni
  ciudades consultadas anteriormente.
- **SC-009**: En todas las situaciones de fallo del proveedor, el usuario ve "Error interno" y
  ningún dato parcial ni técnico; la única excepción son los resultados ya mostrados cuando falla
  la carga de más resultados (FR-009a).

## Assumptions

- **Unidades**: dentro del sistema métrico se usan °C, mm, hPa y km, además de km/h para el
  viento (confirmado en Clarifications). La precipitación
  "actual" es la acumulada en la última hora según la informa el proveedor. La dirección del
  viento se muestra como punto cardinal (N, NE, E…), indicando de dónde viene el viento.
- **Advertencia de datos desactualizados**: su texto exacto se define en el catálogo de mensajes
  (propuesta: "Datos desactualizados"). Si el proveedor no tiene ninguna observación para la
  ciudad, los siete datos se muestran como "-".
- **"Ver más resultados"** añade tandas de 5 resultados.
- **Orden de los resultados**: por relevancia según el proveedor de ciudades; a igual
  coincidencia, primero las ciudades más pobladas.
- **Cobertura**: ciudades de todo el mundo, según las que ofrezca el proveedor.
- **"Error interno"** se aplica tanto a fallos en la búsqueda de ciudades como a fallos al
  obtener el clima, e incluye que el proveedor no responda en 5 segundos (FR-022a).
- **Hora mostrada**: se usa la zona horaria y el formato de fecha y hora del dispositivo del
  usuario; no se muestra la hora local de la ciudad consultada.
- **Idioma**: la aplicación se entrega en español.
- **Dependencia**: la funcionalidad depende de un proveedor externo de datos (búsqueda de
  ciudades y observaciones del clima). Su elección corresponde a la fase de planificación.
- **Sin cuentas de usuario**: no hay registro ni inicio de sesión; todos los usuarios son
  anónimos y ven lo mismo.

## Out of Scope

- Geolocalización del usuario.
- Pronóstico extendido (cualquier dato que no sea la observación actual).
- Mapas.
- Cualquier información guardada por o sobre el usuario: favoritos, historial, ciudad
  predeterminada, preferencias.
- Búsqueda bilingüe (encontrar una ciudad por su nombre en otro idioma) y búsqueda que ignore
  signos de puntuación y espacios: se añadirán en una versión posterior.
- Sistema imperial y cambio de sistema de medida: esta versión usa solo el sistema de medida
  global, el métrico. La posibilidad de cambiar al sistema imperial se añadirá en una versión
  posterior, con su propia especificación.
- Ráfagas de viento.
