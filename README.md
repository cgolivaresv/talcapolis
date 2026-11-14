# Talcapolis

Juego de mesa tipo Monopoly basado en la ciudad de Talca, Chile. Webapp pensada para correr en el navegador (y como PWA en Windows).

## Tablero

Las calles de Talca están numeradas (`N Oriente/Poniente` y `N Norte/Sur`). No existe la calle "0".

Límites (configurables en `src/engine/board.ts`): de **2 Poniente** a **11 Oriente** y de **2 Sur** a **4 Norte**. El tablero se dibuja horizontal, con el mapa real girado 180°: **2 Sur arriba**, 4 Norte abajo, 11 Oriente a la izquierda y 2 Poniente a la derecha (`MIRROR_COLUMNS` en `src/ui/BoardView.tsx` los invierte). La pantalla se ajusta sola a la ventana, sin scroll.

Cada **tramo de calle entre dos intersecciones** es una casilla del recorrido: 137 tramos sobre 78 intersecciones. **Las calles no se compran.**

## Movimiento

Se juega de **2 a 6 jugadores** (nombres a elección, sin repetirse). Cada uno parte en la SALIDA (Estación). En su turno tira **dos dados** y avanza exactamente esa cantidad de **tramos de calle** (de intersección en intersección), respetando el **sentido del tránsito**. No se da media vuelta salvo que no haya otra salida. En cada intersección con varias salidas el jugador no elige paso a paso: el tablero marca todos los destinos posibles y se toca el que se quiere. Al pasar por la SALIDA se cobra $200; los dobles dan otro turno; "A la Cárcel" manda preso (se sale con dobles, tarjeta de libertad o pagando $50 al tercer turno); las casillas "?" sacan tarjeta. Todo está en `src/engine/movement.ts` y `src/engine/game.ts`.

## Compra y arriendo

Al caer en una intersección, los **lotes que dan a ella** (de las 4 manzanas que la rodean, los sitios que miran a cualquiera de las dos calles que se cruzan: hasta 8) son los que importan:

- Los que están **libres** se pueden comprar, uno por visita, si alcanza la plata (o se pasa).
- Entre los que tienen **dueño ajeno** se paga solo el arriendo del **sitio más caro** (12% del precio; ×1,5 si el dueño tiene los 4 sitios de la manzana; ×2 si tiene todo el barrio). Los edificios emblemáticos cobran el 10% de su precio y se duplica por cada otro de la misma clase.
- Quien no puede pagar **quiebra**: sus lotes vuelven a quedar libres y sale de la partida. Gana el último que queda.

La lógica está en `src/engine/economy.ts`.

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

## Interfaz premium

La presentación sigue la identidad «Edición Arquitectónica Premium». Los estilos están separados del código del juego en `src/styles/` (`tokens.css`, `base.css`, `layout.css`, `components.css`, `board.css`, `animations.css`) y los componentes de interfaz en `src/ui/`. El motor (`src/engine`) no depende de la interfaz.

- **Escritorio:** barra superior, jugadores a la izquierda, tablero al centro, ficha contextual y barrios a la derecha, y abajo las acciones del turno, la última tarjeta y el historial. Todo cabe sin scroll.
- **Móvil:** barra superior compacta, tablero con zoom y arrastre (la vista sigue a la ficha en turno), barra inferior fija con las acciones y paneles desplegables (Jugadores, Ficha, Barrios, Historial). Respeta las áreas seguras del dispositivo.
- **Animaciones** (se desactivan con `prefers-reduced-motion`): desplazamiento de fichas, giro de dados, vuelta de la tarjeta, selección de lotes, menús, hojas, ventanas y avisos. Solo representan lo que el juego ya registró.
- **Gráficos:** `src/assets/graficos/` y `src/assets/premium/` (ilustraciones de hitos, reverso de tarjeta, medallón).
