# Talcapolis

Juego de mesa tipo Monopoly basado en la ciudad de Talca, Chile. Webapp pensada para correr en el navegador (y como PWA en Windows).

## Tablero

Las calles de Talca están numeradas (`N Oriente/Poniente` y `N Norte/Sur`). No existe la calle "0".

Límites (configurables en `src/engine/board.ts`), tal como se ven en pantalla:

- Arriba: **2 Poniente**
- Abajo: **11 Oriente**
- Izquierda: **2 Sur**
- Derecha: **4 Norte**

Cada **tramo de calle entre dos intersecciones** es una casilla/propiedad: 137 casillas sobre 78 intersecciones.

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
