# Talcapolis

Juego de mesa tipo Monopoly basado en la ciudad de Talca, Chile. Webapp pensada para correr en el navegador (y como PWA en Windows).

## Tablero

Las calles de Talca están numeradas (`N Oriente/Poniente` y `N Norte/Sur`). No existe la calle "0".

Límites (configurables en `src/engine/board.ts`): de **2 Poniente** a **11 Oriente** y de **2 Sur** a **4 Norte**. El tablero se dibuja horizontal, con el mapa real girado 180°: **2 Sur arriba**, 4 Norte abajo, 11 Oriente a la izquierda y 2 Poniente a la derecha (`MIRROR_COLUMNS` en `src/ui/BoardView.tsx` los invierte). La pantalla se ajusta sola a la ventana, sin scroll.

Las casillas del recorrido son los **137 tramos de calle** y las **78 intersecciones**. **Las calles no se compran.**

## Movimiento

Se juega de **2 a 6 jugadores** (nombres a elección, sin repetirse). Cada uno parte en la SALIDA (Estación). En su turno tira **dos dados** y avanza esa cantidad de **casillas**, respetando el **sentido del tránsito**. El recorrido alterna dos tipos de casilla:

- **Tramos de calle:** donde se **compra** y se **paga arriendo**.
- **Intersecciones (las esquinas de las cuadras):** **casillas de acción**. No se compra ni se paga arriendo.

No se da media vuelta salvo que no haya otra salida. El tablero marca todos los destinos posibles y se toca el que se quiere. Al pasar por la SALIDA se cobra $200; los dobles dan otro turno; "A la cárcel" manda preso (se sale con dobles, tarjeta de libertad o pagando $50 al tercer turno). Todo está en `src/engine/movement.ts` y `src/engine/game.ts`.

### Casillas de acción

Todas las intersecciones son casillas de acción (`src/engine/actions.ts`):

- **"?"** (10 casillas): sacan una tarjeta con una acción.
- **Esquinas del tablero:** SALIDA (solo se cobra al pasar), LIBRE (sin efecto), CÁRCEL (de visita) y "A LA CÁRCEL" (va preso).
- **Resto:** acción aleatoria de la ciudad (`RANDOM_ACTIONS`, 10 eventos): cobrar o pagar una suma pequeña, cobrar de cada jugador, caminar hasta la Catedral o el Mercado Central, **perder el próximo turno** o **tirar de nuevo**. Se elige con la semilla de la partida. Para agregar una basta con sumarla a la lista.

Los edificios emblemáticos que están dibujados en una intersección siguen en su lugar; el lote se compra desde un tramo de calle de su manzana.

## Compra y arriendo

Al caer en un **tramo de calle**, los **lotes que dan a él** son los sitios de las manzanas de ambos lados que miran a esa calle (**hasta 2**, o 1 en una calle del borde del tablero):

- Los que están **libres** se pueden comprar, uno por visita, si alcanza la plata (o se pasa).
- Entre las propiedades con **dueño ajeno** se paga solo el arriendo de la **más cara**: el **triple del precio** en casas y locales (×1,5 si el dueño tiene los 4 sitios de la manzana; ×2 si tiene todo el barrio; más las mejoras), 2,4 veces el precio en edificios emblemáticos (que se duplica por cada otro de la misma clase) y, en los servicios, según los dados. Parece mucho, pero cada tramo se pisa muy pocas veces por partida (ver "Equilibrio"). Las propiedades hipotecadas no cobran.
- Si el jugador **no compra**, la propiedad se **subasta** (ver abajo).
- Quien no puede pagar queda en **deuda** si puede juntar la plata hipotecando o vendiendo mejoras (no puede seguir jugando hasta pagar o declararse en quiebra). Si ni así alcanza, **quiebra**: sus propiedades pasan al jugador a quien debía (o quedan libres si era el banco) y sale de la partida. Gana el último que queda.

La lógica está en `src/engine/economy.ts`.

## Reglas adicionales

- **Servicios:** dos propiedades que no son lotes, la *Compañía Eléctrica del Maule* y *Aguas Nuevosur Talca* ($150 cada una). Están en un tramo de calle y se ofrecen, junto con los lotes de ese tramo, a quien cae en él. Cobran **20 × los dados** de quien cae (**50 ×** si el dueño tiene los dos). Están en `src/engine/services.ts`.
- **Hipotecas:** se hipoteca una propiedad sin mejoras y se reciben el **30%** de su precio; mientras tanto no cobra arriendo. Levantarla cuesta lo recibido más 10%. Se hace desde la ficha de la propiedad (o desde el panel de deudas).
- **Mejoras:** con los **4 sitios de una manzana** (y ninguno hipotecado) se pueden construir hasta **3 mejoras** por casa o local, de a una y *parejo* entre los sitios. Cada mejora cuesta el 50% del precio del lote y multiplica el arriendo (×1,6, ×2,4 y ×3,5). Al venderla se recupera la mitad. Los edificios emblemáticos y los lotes con mejoras no se mejoran ni se intercambian.
- **Subastas:** si quien cae en un tramo decide no comprar, lo que rechazó se subasta entre los demás jugadores (alzas de $10, $25 o $50 sobre la oferta más alta; cada uno puede ofertar o retirarse). Si nadie oferta, queda libre.

La lógica de estas reglas está en `src/engine/game.ts` y `src/engine/assets.ts`; las constantes (porcentajes, límites) en `src/engine/properties.ts`.

## Equilibrio

`src/engine/simulate.ts` juega partidas completas con jugadores automáticos para medir el equilibrio. Para correr un resumen:

```
SIM_GAMES=300 SIM_PLAYERS=4 npx vitest run src/engine/simulate.test.ts
```

(opcionales: `SIM_POLICY=random|smart`, `SIM_RESERVE=250`, la plata que el jugador automático no gasta al comprar).

Lo que mostró, con 4 jugadores:

- Con el tablero actual (215 casillas) cada lote se pisa ~1,3 veces por partida. Con un arriendo del 12% del precio la renta casi no circulaba (≈$140 por partida frente a ≈$5.700 gastados en comprar), la partida se decidía por los pagos al banco y duraba una mediana de **100 tiradas por jugador**.
- Subiendo el arriendo la renta pasa a ser el motor del juego. Con las reglas adicionales (hipotecas, subastas, servicios, mejoras) la vara quedó en el **triple del precio**, el bono por pasar por la SALIDA en $100 y la hipoteca en el 30%: medianas de **~88 tiradas por jugador con 2 jugadores, ~73 con 4 y ~64 con 6** (p90: 143, 102 y 84). Las hipotecas son un salvavidas y alargan la partida; por eso se probaron valores más bajos.
- No hay ventaja por el asiento (con 2, 4 y 6 jugadores las victorias se reparten parejo), las partidas siempre terminan, y se venden entre el 10% (2 jugadores) y el 26% (6) de los lotes.
- Bajar el dinero inicial **no** acorta las partidas (se compran menos lotes y hay menos arriendos).

Una partida de 4 jugadores son unas 240 tiradas. Para acortarla de verdad habría que cobrar arriendo también al **pasar** por un tramo, o achicar el tablero.

## Qué se compra

- **Lotes:** cada manzana se divide en 4 sitios, uno por cada calle que la rodea, así que a ambos lados de cada calle hay propiedades. Cada sitio es una casa, un local comercial (cuesta el doble) o un edificio emblemático. En total 240 lotes.
- **Barrios:** 8 barrios con color; quien reúna todos los lotes de un barrio lo obtiene (arriendo ×2). Con los 4 sitios de una manzana, el arriendo es ×1,5. Cada barrio se define por un lugar real de Talca; sus límites son aproximados (no hay límites oficiales).
- **Casillas "?":** 10 intersecciones naranjas que sacan una tarjeta con una acción (cobrar, pagar, avanzar a un edificio, ir a la cárcel, etc.). El mazo es determinista por semilla.

En el tablero todas las cuadras miden lo mismo (se dejaron de lado las proporciones reales para aprovechar el espacio). Las distancias reales entre calles, medidas sobre las intersecciones de OpenStreetMap, siguen en `src/engine/geometry.ts` y se usan para ubicar cada edificio dentro de su cuadra.

Datos de mapa © colaboradores de [OpenStreetMap](https://www.openstreetmap.org/copyright), licencia ODbL.

## Stack

TypeScript, Vite, React, Zustand, Vitest, Playwright, PWA. El motor de juego (`src/engine`) es puro y serializable, separado de la UI, para permitir tests deterministas y un multijugador online futuro.

## Desarrollo

```
npm install
npm run dev        # servidor de desarrollo
npm test           # tests unitarios
npm run typecheck
npm run build
```

## Intercambios

Antes de tirar los dados, el jugador en turno puede proponer un intercambio a otro jugador: lotes y/o dinero a cambio de lotes y/o dinero. El otro jugador acepta o rechaza. Una oferta solo es válida si cada lote es de quien lo ofrece y si ambos tienen el dinero. No hay hipotecas.

## Estilo gráfico

Paleta y tipografías del set «Edición Arquitectónica Talca» (Esmeralda Mate `#144E3A`, Cobre Cepillado `#C68B66`, Crema Alabastro `#F5F1E8`, Pizarra Carbón `#222629`, Oro Champagne `#D4AF37`), con Montserrat (títulos) e Inter (texto), servidas desde el propio proyecto (`@fontsource`). Los 8 colores de barrio siguen los grupos de la guía de estilo. Los tokens están en `src/index.css` y los colores del tablero en `src/ui/BoardView.tsx`.

Los gráficos SVG (casa, mercado, catedral, plaza, teatro, tren, banco, estrella de tarjetas) están en `src/assets/graficos/` y se asignan en `src/ui/glyphs.ts`: casa para las casas, mercado para los locales comerciales y uno por edificio emblemático. `service-electricity.svg`, `service-water.svg` y `hotel.svg` (usado para universidades y liceos) quedan disponibles; los servicios aún no existen en el juego.

## Ayudas de la interfaz

- **Tutorial:** se muestra la primera vez (y desde el menú, en "Cómo se juega").
- **Recorrido animado:** la ficha pasa por las casillas del camino elegido.
- **Sonido opcional:** efectos sintetizados (sin archivos), desactivados por defecto; se activan desde el menú.
- **App instalable (PWA):** se puede instalar en escritorio o móvil y abrir sin conexión una vez cargada (`vite-plugin-pwa`; íconos en `public/`).

## Interfaz premium

La presentación sigue la identidad «Edición Arquitectónica Premium». Los estilos están separados del código del juego en `src/styles/` (`tokens.css`, `base.css`, `layout.css`, `components.css`, `board.css`, `animations.css`) y los componentes de interfaz en `src/ui/`. El motor (`src/engine`) no depende de la interfaz.

- **Escritorio:** barra superior, jugadores a la izquierda, tablero al centro, ficha contextual y barrios a la derecha, y abajo las acciones del turno, la última tarjeta y el historial. Todo cabe sin scroll.
- **Móvil:** barra superior compacta, tablero con zoom y arrastre (la vista sigue a la ficha en turno), barra inferior fija con las acciones y paneles desplegables (Jugadores, Ficha, Barrios, Historial). Respeta las áreas seguras del dispositivo.
- **Animaciones** (se desactivan con `prefers-reduced-motion`): desplazamiento de fichas, giro de dados, vuelta de la tarjeta, selección de lotes, menús, hojas, ventanas y avisos. Solo representan lo que el juego ya registró.
- **Gráficos:** `src/assets/graficos/` y `src/assets/premium/` (ilustraciones de hitos, reverso de tarjeta, medallón).
