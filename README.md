# Talcapolis

Juego de mesa tipo Monopoly basado en la ciudad de Talca, Chile. Webapp pensada para correr en el navegador (y como PWA en Windows).

## Tablero

Las calles de Talca están numeradas. Las `N Oriente/Poniente` corren de norte a sur y las `N Norte/Sur` de oriente a poniente. No existe la calle "0".

Límites iniciales (configurables en `src/engine/board.ts`):

- Poniente: **2 Poniente**
- Oriente: **11 Oriente**
- Sur: **2 Sur**
- Norte: **4 Norte** (interpretación a confirmar)

Cada **tramo de calle entre dos intersecciones** es una casilla/propiedad: 137 casillas sobre 78 intersecciones.

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
