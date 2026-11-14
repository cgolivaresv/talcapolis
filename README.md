# Talcapolis

Juego de mesa tipo Monopoly basado en la ciudad de Talca, Chile. Webapp pensada para correr en el navegador (y como PWA en Windows).

## Tablero

Las calles de Talca están numeradas (`N Oriente/Poniente` y `N Norte/Sur`). No existe la calle "0".

Límites (configurables en `src/engine/board.ts`), tal como se ven en pantalla:

- Arriba: **2 Poniente**
- Abajo: **11 Oriente**
- Izquierda: **2 Sur**
- Derecha: **4 Norte**

Cada **tramo de calle entre dos intersecciones** es una casilla del recorrido: 154 tramos sobre 88 intersecciones. **Las calles no se compran.**

## Qué se compra

- **Lotes:** cada manzana se divide en 4 sitios, uno por cada calle que la rodea, así que a ambos lados de cada calle hay propiedades. Cada sitio es una casa, un local comercial (cuesta el doble) o un edificio emblemático. En total 240 lotes.
- **Barrios:** 8 barrios con color; quien reúna todos los lotes de un barrio lo obtiene (arriendo ×2). Con los 4 sitios de una manzana, el arriendo es ×1,5. Cada barrio se define por un lugar real de Talca; sus límites son aproximados (no hay límites oficiales).
- **Casillas "?":** 10 intersecciones naranjas que sacan una tarjeta con una acción (cobrar, pagar, avanzar a un edificio, ir a la cárcel, etc.). El mazo es determinista por semilla.

Las distancias entre calles son las **reales** (cuadras de ~125 m, con tramos más largos donde existen calles intermedias como 9½ Oriente). Se midieron sobre las intersecciones de OpenStreetMap y están en `src/engine/geometry.ts`.

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
