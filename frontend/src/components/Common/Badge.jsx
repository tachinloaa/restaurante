import { COLORES_ESTADO, ETIQUETAS_ESTADO } from '../../utils/constants';

function Badge({ estado, text, className = '' }) {
  if (estado) {
    const colorClass = COLORES_ESTADO[estado] || 'bg-gray-100 text-gray-800';
    const label = ETIQUETAS_ESTADO[estado] || estado;

    return (
      <span className={`badge ${colorClass} ${className}`}>
        {label}
      </span>
    );
  }

  return (
    <span className={`badge ${className}`}>
      {text}
    </span>
  );
}

export default Badge;
