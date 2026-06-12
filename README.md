# Liga F1 Manager Web

Primer MVP sin npm para la app central de la liga.

## Que incluye

- HTML, CSS y JavaScript puro.
- Firebase por CDN.
- Vista publica de temporada, presupuestos y motoristas.
- Inicio publico con parrilla actual de titulares desde las plantillas de pilotos/staff.
- Login con Firebase Authentication.
- Panel privado de equipo.
- Panel admin.
- Inicializacion de T7 con equipos, presupuestos, aliases, motoristas y limites.
- Edicion admin de estado de temporada, carreras completadas y limites coche/motor.
- Cambio de temporada desde Admin > Base: checklist de preparacion, seleccion de temporada activa y creacion de temporadas nuevas copiando configuracion base editable.
- Registro de movimientos economicos privados por equipo.
- Exportador admin de dinero para app de pujas: JSON con equipos, aliases, motoristas y presupuesto restante.
- Modulo de carreras y premios: tabla editable por temporada, carga manual de resultados, preview antes de aplicar, movimientos privados por equipo y resumen publico por GP.
- Reglamento publico editable por temporada, seccionado desde el panel admin.
- Campeonato publico de motoristas: ranking por GP, carga manual e importacion desde JSON de carrera.
- Campeonato publico de constructores editable por admin, con importacion de JSON por carrera larga y sprint.
- Plantillas publicas de personal por equipo, cargadas manualmente por admin o importadas desde JSON de staff de la app de pujas.
- Campeonato publico de predicciones de constructores: plazo abierto/cerrado por admin, voto por usuario autenticado y puntuacion automatica contra la tabla real de constructores.
- Calculo de gasto contra limite de desarrollo usando movimientos `coche`/`peso`.
- Calendario T7 importado desde `Liga F1 Manager.ods`, guardado dentro de `lfm_seasons/t7`.
- Sedes T7 importadas desde `Liga F1 Manager.ods`, guardadas en `lfm_teamFacilities` y visibles solo para equipo/admin.
- Modulo privado de coche: disenos por pieza, investigaciones acumuladas, tipo de mejora aplicada, comparador de coche, seleccion del equipo y fabricacion aplicada por admin con revision previa.
- Transicion de coche entre temporadas: modo normal con perdida de reglamento o modo regulacion con valores fijos, preview obligatorio y generacion de coches iniciales.
- Importador admin de `Piezas coche/Funcional/liga_f1.json` para cargar el estado actual sin cobrar presupuesto.
- Plazo de GP para abrir/cerrar selecciones de coche, aplicar fabricacion y guardar snapshots privados por carrera.
- Modulo privado de pesos: niveles por pieza, tiradas 1/2/3 con coste 1M/3M/5M, ajuste manual, historial e importador de `Peso/Funcional/pesos_equipos.json`.
- Los snapshots privados de carrera guardan coche, totales de stats, pesos y motor aplicados en ese GP.
- Modulo privado de motores para equipos motoristas: stats, intentos por modo, ajuste manual, limite motor, pagos cliente->motorista e importador de `Motores 3/motores_guardados.json`.
- Los snapshots privados de carrera guardan tambien la referencia de motor; los motoristas guardan stats completas y los clientes solo referencia de motorista/motor.

## Arranque local

Recomendado abrir con un servidor local simple:

```powershell
py -m http.server 5500
```

Luego abrir:

```text
http://127.0.0.1:5500/LigaF1ManagerWeb/
```

Tambien puede funcionar con Live Server de VS Code.

## Configurar Firebase

1. Crear o reutilizar un proyecto Firebase.
2. Activar Authentication > Email/Password.
3. Activar Firestore Database.
4. Editar `firebase-config.js`.
5. Pegar `firebaseConfig`.
6. Confirmar `ADMIN_EMAIL`.
7. Publicar o copiar las reglas de `firestore.rules`.

Si usas el mismo Firebase de otra app, revisa las reglas antes de publicarlas para no borrar reglas existentes.

## Usuarios sugeridos

- `ferrari@ligaf1.local`
- `mclaren@ligaf1.local`
- `redbull@ligaf1.local`
- `williams@ligaf1.local`
- `porsche@ligaf1.local`
- `haas@ligaf1.local`
- `mercedes@ligaf1.local`
- `astonmartin@ligaf1.local`
- `sauber@ligaf1.local`
- `andretti@ligaf1.local`

Despues de crear cada usuario en Firebase Authentication, entra como admin y vincula su UID con el equipo correspondiente.

Para predicciones de constructores puedes crear usuarios extra en Firebase Authentication y vincularlos como rol `Votante predicciones` desde Admin > Usuarios. Esos usuarios no tienen acceso privado a equipos; solo pueden votar en Liga publica > Predicciones cuando el plazo esta abierto.

En Admin > Constructores se edita el sistema de puntos de `Carrera larga`, `Sprint` y vuelta rapida. Al importar un JSON se elige el GP correspondiente; el JSON aporta el orden de llegada, los equipos y `FastestLapDriver`, y la app convierte esas posiciones en puntos usando `lfm_constructorPointSystems/t7`. Cada JSON importado queda registrado para evitar sumarlo dos veces.

En Admin > Premios, la seccion `Premios por JSON importado` usa esos JSON ya cargados para previsualizar y aplicar dinero por posiciones de carrera/sprint y vuelta rapida. La pole sigue cargandose manualmente porque no viene en el JSON. Si una importacion ya tiene premios economicos aplicados, primero puedes usar `Revertir premios` para restar el dinero, dejar movimientos inversos privados y habilitar de nuevo la correccion del resultado en Constructores.

La pestaña `Resultados` muestra el seguimiento por GP usando esos JSONs ya importados: carrera larga, sprint si corresponde, estado cargado/pendiente y puntos sumados por equipo.

La pestaña `Pilotos` calcula automaticamente el campeonato de pilotos desde esos mismos JSONs importados.

Si se carga un JSON equivocado, desde Admin > Constructores o Admin > Resultados se puede usar `Revertir` para quitar esa importacion, restar sus puntos de constructores y recalcular predicciones/pilotos. Si ese JSON ya tiene premios aplicados, la app bloquea esa reversion hasta usar `Revertir premios` en Admin > Premios.

La puntuacion de predicciones se recalcula al guardar Admin > Constructores, al importar un JSON o al cambiar el estado del plazo. Por cada equipo pronosticado se suma `10 - distancia de posicion` con minimo 0; una posicion exacta cuenta como acierto.

El cambio de temporada crea documentos nuevos por `seasonId` para premios, reglamento, campeonatos, puntos de constructores y predicciones. Al crear una temporada puedes copiar el calendario activo, copiar el calendario base T7 o armar un calendario personalizado eligiendo entre los 24 circuitos de F1 Manager 2024. Todas las carreras nuevas empiezan pendientes. Desde Admin > Base tambien se puede editar el calendario activo, elegir sprints y marcar carreras completadas. Coche, motor, pesos, sedes y personal siguen siendo datos de equipo hasta aplicar investigaciones/cambio de reglamento.

Las investigaciones se guardan dentro de `lfm_teamCars` como datos privados por equipo. No son equipables; se acumulan por pieza y solo aportan valores positivos al generar el coche inicial de la siguiente temporada. Cada equipo puede guardar un nombre general para ese coche desde su vista privada.

Admin > Economia puede exportar `lfm-money-<temporada>-<fecha>.json` para la app de pujas. El archivo usa `schema: "lfm_money_export"` y `schemaVersion: 1`. Cada equipo incluye `teamId`, `name`, `aliases`, `lookupKeys`, `budgetRemainingM` en millones y `budgetRemaining` en escala base donde 1M = 1000000.

Despues del mercado, Admin > Economia tambien puede importar el JSON final de pujas con ese mismo schema. La app muestra un preview por equipo con saldo actual, saldo importado, diferencia, `spent` y `committed`; al confirmar actualiza `lfm_teams/{teamId}.budgetRemainingM` y crea movimientos privados de categoria `personal` solo para equipos con diferencia. Cada importacion queda registrada en la temporada activa para bloquear reimportaciones del mismo archivo/mercado.

El formato de retorno desde la app de pujas queda documentado en `examples/pujas-money-return-example.json`. Ese ejemplo agrega `manager`, `budget`, `spent`, `committed`, `budgetRemaining` y `budgetRemainingM` por equipo, y es la referencia del importador de dinero.

Admin > Personal permite importar `f1_mercado_staff_export` v2 para publicar la parrilla oficial. La importacion reemplaza las plantillas de los equipos incluidos, convierte `cost` a M como valor visible, acepta `rating` faltante y no toca presupuesto, movimientos economicos ni campeonatos.

## Colecciones usadas

- `lfm_settings`
- `lfm_seasons`
- `lfm_costs`
- `lfm_awardSettings`
- `lfm_raceAwards`
- `lfm_regulations`
- `lfm_motoristChampionships`
- `lfm_constructorChampionships`
- `lfm_constructorPointSystems`
- `lfm_constructorPredictionSettings`
- `lfm_constructorPredictionVotes/{seasonId}/votes`
- `lfm_teams`
- `lfm_teamFacilities`
- `lfm_teamCars`
- `lfm_teamEngines`
- `lfm_carSelections`
- `lfm_teamPersonnel`
- `lfm_users`
- `lfm_teamEconomy/{teamId}/movements`
