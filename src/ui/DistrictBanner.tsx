/**
 * Placa de barrio (basada en district-banner.svg del paquete premium), con el nombre y el color
 * del barrio. El color real del barrio va en la franja central y en los círculos de los extremos.
 */
export function DistrictBanner({ name, color }: { name: string; color: string }) {
  return (
    <svg className="district-banner" viewBox="0 0 600 120" role="img" aria-label={name}>
      <path d="M18 8H582L560 60l22 52H18L40 60z" fill="#144e3a" stroke="#d4af37" strokeWidth="5" />
      <path d="M55 22H545M55 98H545" stroke="#f5f1e8" strokeOpacity=".5" strokeWidth="1.5" />
      <circle cx="66" cy="60" r="10" fill={color} stroke="#f5f1e8" strokeWidth="2" />
      <circle cx="534" cy="60" r="10" fill={color} stroke="#f5f1e8" strokeWidth="2" />
      <text x="300" y="69" textAnchor="middle" fontSize={name.length > 20 ? 24 : 28} fontWeight="700" letterSpacing="3" fill="#f5f1e8">
        {name.toUpperCase()}
      </text>
    </svg>
  );
}
