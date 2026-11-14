# Talcapolis — Paquete gráfico Premium
Edición Arquitectónica Talca

## Contenido
- `board-frame.svg`: marco ornamental para el tablero.
- `center-medallion.svg`: placa central con identidad Talcapolis.
- `tile-*.svg`: plantillas visuales de casillas (sin nombres ni precios).
- `district-banner.svg`: separador/placa de barrio editable.
- `cardback-*.svg`: reversos de mazos.
- `icon-*.svg`: iconos circulares de servicios y construcciones.
- `landmark-*.svg`: ilustraciones lineales de hitos urbanos (catedral, plaza, estación, mercado y teatro).
- `token-base.svg`: base ornamental para fichas.

## Dirección visual
- Esmeralda: #144e3a
- Cobre: #c68b66
- Alabastro: #f5f1e8
- Pizarra: #222629
- Oro: #d4af37
- Tipografías sugeridas: Montserrat para rótulos e Inter para texto de interfaz.

## Integración
Todos los recursos están en SVG independiente y usan `viewBox`, por lo que se pueden escalar sin pérdida.
Puedes incorporarlos como imágenes (`<img>`), fondos CSS o importar el SVG como recurso según la configuración del proyecto.
Los archivos son deliberadamente gráficos: no incluyen lógica, componentes React, reglas ni datos de propiedades.
Las plantillas de casilla no contienen textos de lotes ni valores; conserva los nombres, precios y orden exactos definidos en el proyecto.
El marco y las placas son capas visuales: ajusta su tamaño al área de dibujo existente sin cambiar la geometría ni la distribución de las 240 propiedades, 8 barrios, 137 tramos y 78 intersecciones.
