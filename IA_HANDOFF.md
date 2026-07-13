# Relevo de trabajo: Liga F1 Manager Web

Actualizado: 2026-07-13  
Ultimo commit funcional revisado: `e008075` (`main`)  
Estado del arbol de trabajo al crear este documento: limpio.

## 1. Objetivo del producto

`Liga F1 Manager Web` es la app central de una liga privada de F1 Manager. Debe sustituir hojas, apps aisladas y operaciones manuales dispersas por una sola fuente de verdad para temporadas futuras.

La idea central es separar bien lo publico de lo privado:

- Publico: calendario, resultados, campeonatos, parrilla/personal final, premios, reglamento, motoristas-clientes y presupuesto restante de cada equipo.
- Privado por equipo: coche, disenos, solicitudes, pesos, motor del motorista, sedes, movimientos economicos y solicitudes de transferencia propias.
- Admin: ve y gestiona todo. Es quien valida resultados de mejoras, aplica tiradas, controla plazos, premios, cambios de temporada y transferencias.

La prioridad funcional es que el admin pueda editar y gestionar con precision, pero que cada equipo tenga una vista privada clara y que el publico vea los datos ordenados.

## 2. Tecnologia y despliegue

- Sin npm. La app usa HTML, CSS y JavaScript puro.
- Firebase por CDN: Authentication Email/Password y Cloud Firestore.
- Sitio publicado con GitHub Pages desde el repositorio `Desco3367/App-F1manager`.
- URL que se venia usando: `https://desco3367.github.io/App-F1manager/`.
- La pagina agrega cache-busters en `index.html`. Al cambiar JS/CSS, incrementar la version alli para evitar que equipos reciban un archivo viejo.
- Refresco automatico: 30 segundos. Se bloquea mientras hay un input activo o un formulario de diseno de coche con cambios pendientes, para no borrar lo que el admin esta escribiendo.

Archivos principales:

- `app.js`: casi toda la logica, los renders y los listeners.
- `seed-data.js`: datos iniciales, equipos, piezas, costes, calendario base y valores fallback.
- `styles.css`: interfaz completa.
- `firestore.rules`: permisos. Hay que publicarlas manualmente en Firebase cada vez que se modifiquen.
- `firebase-config.js`: configuracion local de Firebase y email admin; no documentar ni subir secretos nuevos.
- `README.md`: guia de uso existente.

## 3. Estado actual comprobado

La rama `main` contiene, entre otras, estas entregas recientes:

1. Solicitudes de coche, peso y motor por equipo, con resolucion admin.
2. Doble plazo por GP: mejoras y seleccion de piezas.
3. Transferencias de dinero entre equipos con aprobacion/rechazo del admin.
4. Importacion/exportacion de dinero para la app externa de pujas.
5. Importacion de staff y parrilla publica.
6. Resultados desde JSON, campeonatos de constructores/pilotos y premios.
7. Cambio de temporada, investigacion, reglamento, sedes, calendario y predicciones.
8. Panel Admin agrupado en ocho areas y panel interno de Coche.
9. Vista Admin > Coche > Resumen con stats por pieza para copiar al juego real.

Ultimos commits relevantes:

- `e008075` Show car stats by piece for admin.
- `9c7cbf9` Fix whole car stats column order.
- `7362ea9` Add admin whole car stats table.
- `54310ae` Prevent auto refresh from resetting car forms.
- `08c9926` Set auto refresh to 30 seconds.
- `55f2505` Render active team tab only.
- `d1565af` Add team transfer requests.
- `4f310d7` Add engine improvement requests.
- `3167176` Add weight improvement requests.
- `5273c1f` Split car GP windows.

Importante: los documentos reales de Firestore prevalecen sobre `seed-data.js`. El seed es base/fallback e inicializacion, no una fotografia garantizada del estado actual de la liga.

## 4. Temporada y equipos

Base actual en codigo:

- Temporada: T7, en curso.
- Seed: 2 carreras completadas, limite de desarrollo de coche 40M, limite de motor 36M y limite de motor por GP 6M.
- Estos valores pueden haber cambiado en Firestore; comprobar siempre `lfm_seasons/{seasonId}` antes de asumirlos.

Los 10 equipos tienen identidad fija aunque cambien de nombre:

- Ferrari: cliente de Williams.
- McLaren: cliente de Red Bull.
- Red Bull: motorista de McLaren.
- Williams: motorista de Ferrari.
- Porsche: cliente de Mercedes.
- HAAS: cliente de Sauber.
- Mercedes: motorista de Porsche.
- Aston Martin: motorista de Andretti.
- Sauber: motorista de HAAS.
- Andretti: cliente de Aston Martin.

Aliases historicos importantes:

- Renault y Alpine -> Andretti.
- RB / Hugo Boss -> Porsche.
- Aston -> Aston Martin.

Los motoristas y los clientes son publicos. Las stats de motor son privadas para el motorista; el cliente recibe el mismo motor en el juego, pero no necesita ver sus stats en la app.

## 5. Roles y permisos

Roles existentes en `lfm_users`:

- `admin`: se determina por el email configurado en reglas/configuracion. Gestiona todo.
- `manager`: un usuario vinculado a un equipo. Ve y opera solo su espacio privado.
- `predictor`: usuario sin equipo que puede votar predicciones cuando el plazo esta abierto.

Regla de oro: los equipos no escriben presupuestos, movimientos, resultados ni disenos finales directamente. Solicitan; el admin valida/aplica cuando corresponde.

Colecciones principales:

- `lfm_seasons`, `lfm_settings`, `lfm_costs`.
- `lfm_teams`, `lfm_users`, `lfm_teamPersonnel`.
- `lfm_teamCars`, `lfm_carSelections`, `lfm_teamEngines`, `lfm_teamFacilities`.
- `lfm_teamEconomy/{teamId}/movements`.
- `lfm_transferRequests`.
- Colecciones de resultados, premios, constructores, motoristas, predicciones y reglamento listadas en `README.md`.

Nota de seguridad futura: `lfm_carSelections` permite actualmente escritura al usuario de su equipo para soportar solicitudes y seleccion. Antes de abrir el proyecto a usuarios no confiables, endurecer reglas por campos/transiciones, en especial para impedir que un manager altere estados resueltos o datos de otra solicitud dentro de su documento.

## 6. Economia y presupuesto

Principios acordados:

- Cada equipo tiene un presupuesto total unico.
- El publico solo ve el presupuesto restante total.
- El historial de movimientos es privado para el equipo y admin.
- Los limites cambian por temporada.
- Superar un limite no esta bloqueado automaticamente en todos los casos: puede conllevar aviso o sancion manual.

Alcance de limites:

- Diseno de coche, investigacion, fabricacion y peso: movimiento con `limitScope: development`; cuentan para el limite de desarrollo.
- Mejoras de motor: `limitScope: motor`; cuentan para el limite de motor del motorista y deben respetar el limite por GP aplicado.
- Transferencias entre equipos, importaciones de mercado y pagos cliente->motorista: `limitScope: none`; no consumen los limites de desarrollo/motor.

Costes acordados para coche:

- Chasis: 2M.
- Fondo plano: 2M.
- Pontones: 1.5M.
- Suspension: 1M.
- Aleron delantero: 1M.
- Aleron trasero: 1M.
- Investigacion: 75% del coste del diseno de esa pieza.
- Fabricacion al cambiar una pieza equipada: 0.25M por pieza cambiada. Solo se cobra cuando se pasa a otro diseno; no se cobra de nuevo si se mantiene el mismo.

Transferencias entre equipos:

- Equipo solicita desde `Mi equipo > Movimientos`.
- Admin confirma/rechaza en `Admin > Economia > Solicitudes de transferencia`.
- Al aprobar se hace una transaccion Firestore: resta al emisor, suma al receptor y crea movimientos privados en ambos.
- Un aprobado no tiene boton de deshacer automatizado. Corregir con transferencia inversa o movimiento admin.

Mercado/pujas:

- Exportar dinero en Admin > Economia genera `lfm_money_export` v1.
- Importar el retorno permite preview y aplica los saldos finales, creando ajustes privados de categoria `personal`.
- El importador bloquea reimportar el mismo `importId`/mercado.
- El formato de retorno de ejemplo esta en `examples/pujas-money-return-example.json` si existe en la copia de trabajo; verificar antes de cambiar el schema.

## 7. Coche: flujo completo

Piezas:

- Chasis.
- Aleron delantero.
- Aleron trasero.
- Pontones.
- Fondo plano.
- Suspension.

Plazos por GP, dentro de `lfm_seasons/{seasonId}.currentRaceWindow`:

1. `developmentOpen`: los equipos solicitan mejoras/investigaciones, peso y motor.
2. `selectionOpen`: los equipos eligen los disenos con los que correran.

Los plazos no se solapan. Abrir seleccion esta bloqueado si queda alguna solicitud pendiente de coche, peso o motor. Al cerrar seleccion, el admin aplica selecciones, cobra fabricacion y crea snapshots de carrera.

Solicitudes de coche:

- Equipo solicita `Diseno` o `Investigacion`, pieza, tipo de mejora y nota.
- Maximo: 4 solicitudes pendientes por equipo, sin repetir pieza pendiente.
- El coste se cobra solo al cargar el resultado real, no al solicitar.
- Admin resuelve/cancela desde `Admin > Coche > Disenar`.
- Al resolver, se crea el diseno/investigacion, se descuenta presupuesto y se deja movimiento privado.
- El equipo puede arrepentirse mientras `developmentOpen` esta abierto.

Investigaciones:

- Son equivalentes a mejora equilibrada, pero solo guardan stats positivos.
- No son equipables.
- Se acumulan por pieza hasta el cambio de temporada.
- En transicion normal: se toma el ultimo diseno de cada pieza, se aplica primero la perdida de reglamento sin bajar de 0 y luego se suman investigaciones.
- En regulacion: se usan valores fijos definidos por admin y se suman investigaciones, sin tomar el coche previo.
- La reinicializacion de investigaciones cada ciertas temporadas sigue siendo una decision manual de liga.

Seleccion/fabricacion:

- Un equipo puede elegir cualquiera de sus disenos de la temporada.
- Puede cambiar tantas veces como quiera durante `selectionOpen`.
- Admin aplica el resultado final al cerrar seleccion o individualmente desde Admin > Coche > Selecciones GP.

Stats para cargar en el juego real:

- Ruta: `Admin > Coche > Resumen > Stats por pieza`.
- Muestra una tabla independiente por cada pieza, con Diseno, Mejora, Pasos y solo las stats propias de esa pieza.
- Modos: equipado oficial, seleccionado para GP, ultima version disenada.
- Botones para copiar una pieza o todas. Esta es la vista que debe usarse para trasladar datos al juego; no volver a fusionar las stats de las seis piezas en una sola tabla.
- Este bloque es muy reciente y debe probarse visualmente con el formato exacto que el admin necesita pegar.

## 8. Pesos

- Solo se aplican las ultimas versiones/niveles, no una seleccion de peso por GP.
- Equipos pueden solicitar hasta 3 mejoras pendientes por GP en piezas distintas.
- No se permite solicitar una pieza con nivel 10 ni duplicar pieza pendiente.
- Tiradas: 1 = 1M, 2 = 3M, 3 = 5M.
- Admin aplica tiradas con el sistema de azar actual; se guarda historial, nivel antes/despues, presupuesto y movimiento `peso` contra desarrollo.
- Equipo puede arrepentirse durante el plazo de mejoras.
- Admin tiene filtro por equipo en `Admin > Pesos > Solicitudes de peso`.

## 9. Motores

- Solo los equipos motoristas ven `Mi equipo > Motor` y pueden solicitar mejoras de motor.
- Se usan el mismo plazo de mejoras de coche.
- Solicitud: stat, modo, cantidad de intentos y nota.
- Admin aplica/cancela desde `Admin > Motor > Solicitudes de motor`.
- El gasto aplicado por motorista y GP no debe superar `motorRaceLimitM` (fallback 6M); el admin puede editarlo en `Admin > Motor`.
- El equipo cliente paga al motorista cantidades acordadas. Es un movimiento entre presupuestos, no gasto de limite motor.
- Antes de cambiar costes o probabilidades de motor, revisar las funciones de tiradas existentes y no asumir que usan exactamente la escala de peso.

## 10. Carreras, resultados, campeonatos y premios

Resultados:

- Los JSON de carrera se importan desde Admin > Carreras.
- El JSON aporta orden de llegada/equipos; el sistema de puntos es configurable y se aplica desde la app.
- Carrera larga: sistema configurable, actualmente seed con puntuacion F1 normal para top 10.
- Sprint: sistema configurable, seed 8-7-6-5-4-3-2-1 para top 8.
- Vuelta rapida: se reconoce desde JSON cuando esta disponible; el valor de puntos es configurable.
- Pole: se carga manualmente porque no esta en los JSON actuales.
- Se puede revertir una importacion. Si ya tiene premios economicos aplicados, primero hay que revertir premios.

Campeonatos:

- Constructores: importa JSON de carrera/sprint y usa tabla de puntos editable por temporada.
- Pilotos: calcula desde la clasificacion completa del JSON, incluyendo pilotos sin puntos cuando el import contiene `classification`; usa desempate/countback por posiciones.
- Motoristas: gestion manual/importable por GP, independiente de constructores.
- Predicciones: ranking aparte, antes de empezar temporada; usuarios manager/predictor votan mientras admin abre plazo. Puntuacion actual: `max(0, 10 - distancia de posicion)` por equipo y acierto exacto separado.

Premios:

- Se pueden configurar por temporada y aplicar desde resultados JSON con preview.
- Los premios van a equipos, no a pilotos.
- Carrera, sprint, vuelta rapida, pole, constructores y paradas pueden ser editables/manuales segun la necesidad de temporada.
- El usuario queria automatizar premios por carrera a partir del JSON, manteniendo pole manual. Confirmar cualquier cambio de formula antes de alterar logica.

## 11. Personal, parrilla, sedes, reglamento y temporada

Personal/parrilla:

- Importador de staff acepta `f1_mercado_staff_export` v2.
- La portada publica muestra 10 equipos ordenados por constructores y solo Piloto 1/Piloto 2.
- Reservas y staff completo se muestran en la pestana publica `Personal`.
- `null` o rating faltante del staff importado se toleran para plantillas manuales.
- El mercado de staff no debe modificar presupuesto por esta importacion; dinero se actualiza por el JSON monetario de pujas.

Sedes:

- Son privadas para equipo/admin, nunca publicas.
- Tienen niveles 0-5 y sirven como registro para el juego; sus efectos se aplican fuera de la app.

Reglamento y calendario:

- Reglamento publico, editable y seccionado por temporada.
- Calendario sin fechas concretas: define GP y sprint.
- Al crear temporada se puede copiar calendario actual, plantilla T7 o elegir los 24 circuitos de F1 Manager 2024.

Cambio de temporada:

- La app permite crear/activar temporadas nuevas con configuracion base copiada.
- Falta cerrar de forma formal la formula exacta del presupuesto inicial de la proxima temporada: el usuario indico que depende de resultados de motoristas y constructores, pero el dinero restante de la temporada anterior se conserva. No inventar esta formula.

## 12. Interfaz actual

Pestanas publicas:

`Inicio`, `Calendario`, `Resultados`, `Constructores`, `Pilotos`, `Motoristas`, `Personal`, `Predicciones`, `Premios`, `Presupuesto`, `Reglamento`.

Pestanas Admin:

`Base`, `Carreras`, `Economia`, `Mercado`, `Coche`, `Motor`, `Pesos`, `Temporada`.

Subpestanas Admin > Coche:

`Resumen`, `Disenar`, `Selecciones GP`, `Temporada`.

La vista privada de equipo renderiza solo la pestana activa. Esto se hizo porque renderizar paneles ocultos a la vez provocaba errores cruzados, incluido un error antiguo de `engineStats` que rompia Coche.

## 13. Plan recomendado (prioridad)

### P0: validar antes de ampliar

1. Probar con cuentas reales de manager los tres flujos de solicitud: coche, peso y motor.
2. Probar admin: resolver, cancelar, abrir seleccion, guardar seleccion y cerrar seleccion.
3. Confirmar que los cobros y `limitScope` coinciden con los limites esperados.
4. Probar transferencia pendiente, rechazo y aprobacion con dos equipos.
5. Confirmar visualmente `Stats por pieza` y que el texto copiado coincide exactamente con el formato manual que se pega al juego.
6. Verificar en Firebase que las reglas actualmente publicadas incluyen las ultimas reglas de `firestore.rules`, en especial `lfm_transferRequests`.

### P1: cerrar el ciclo de temporada

1. Definir por escrito la formula de presupuesto inicial de la siguiente temporada basada en constructores/motoristas.
2. Probar una transicion completa en una temporada de prueba: ultimo diseno, reglamento, regulacion, investigaciones, nombre de coche y activacion.
3. Decidir cuando y como se reinician investigaciones acumuladas.
4. Definir si el historial de personal necesita snapshot por temporada o si basta la plantilla final actual.

### P2: robustez y precision

1. Endurecer reglas Firestore de `lfm_carSelections` con validacion por campos/estados.
2. Agregar auditoria visible por accion: quien solicito, quien resolvio, GP y coste, en coche/peso/motor.
3. Revisar todos los alias de equipos de JSON y agregar casos reales que aparezcan en importaciones.
4. Agregar pruebas manuales documentadas para reversos de resultados/premios e imports duplicados.
5. Considerar exportadores CSV/JSON adicionales solo despues de acordar exactamente el formato externo.

### P3: mejoras de experiencia

1. Terminar el flujo de alta de participantes de predicciones si se desea que soliciten cuenta sin gestion manual directa del admin.
2. Mejorar feedback de refresco automatico y estado de sincronizacion.
3. Anadir vista/admin de resumen de limites y posibles sanciones si se supera presupuesto.
4. Revisar mobile con las tablas de coche por pieza y priorizar copiar una pieza en vez de todas cuando sea necesario.

## 14. Como trabajar dos IAs sin pisarse

No usar las dos IAs editando el mismo directorio/branch a la vez. Usar ramas o worktrees separados y commits pequenos.

Division sugerida:

- IA A: `Carreras`, `Economia`, `Mercado`, JSONs de pujas/staff, reglas Firestore y documentacion.
- IA B: `Coche`, `Pesos`, `Motor`, `Sedes`, interfaz privada de equipo y CSS relacionado.

Reglas de colaboracion:

1. Antes de editar, leer este archivo, `README.md`, `firestore.rules` y el bloque funcional relevante de `app.js`.
2. No cambiar nombres de colecciones, schemas ni reglas de negocio sin dejarlo documentado aqui y sin confirmacion del usuario.
3. No hacer refactors amplios de `app.js` mientras otra IA trabaja; es un archivo monolitico y los conflictos son faciles.
4. Un cambio funcional debe incluir: cambios de UI, persistencia Firestore, permisos necesarios, manejo de errores y verificacion proporcional.
5. Siempre ejecutar `node --check .\\app.js`, `node --check .\\seed-data.js` y `git diff --check`. En este entorno puede hacer falta ejecutar Node fuera del sandbox por un error de permisos de Windows.
6. Antes de publicar: revisar `git status`, hacer commit descriptivo y push. GitHub Pages puede tardar y el cache-buster debe cambiar si se tocaron JS/CSS.
7. Si se toca `firestore.rules`, recordar al usuario publicarlas en Firebase; hacer push a GitHub no las publica automaticamente.

## 15. Preguntas que no deben responderse por suposicion

- Formula exacta de presupuesto de la temporada siguiente.
- Reinicio de investigaciones entre temporadas.
- Costes/probabilidades definitivas de motor si difieren de la logica actual.
- Formato exacto que el juego externo necesita para pegar stats por pieza: confirmar con una muestra real antes de crear un exportador definitivo.
- Reglas/sanciones concretas al superar limites presupuestarios.
- Cualquier automatizacion de premios que no respete la formula vigente de esa temporada.

## 16. Comandos utiles

Desde `LigaF1ManagerWeb`:

```powershell
node --check .\\app.js
node --check .\\seed-data.js
git diff --check
git status --short
```

Servidor local opcional, sin npm:

```powershell
py -m http.server 5500
```

Abrir: `http://127.0.0.1:5500/LigaF1ManagerWeb/`.
