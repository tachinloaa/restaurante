/**
 * Componente Badge - Etiqueta de estado o información
 * 
 * Muestra una etiqueta con color y texto basado en:
 * - Estado de pedidos (pendiente, completado, cancelado, etc.)
 * - Texto personalizado
 * 
 * Los colores se definen en constants.js y se adaptan automáticamente al dark mode
 * 
 * @param {Object} props
 * @param {string} props.estado - Estado del pedido (opcional)
 * @param {string} props.text - Texto personalizado (opcional)
 * @param {string} props.className - Clases CSS adicionales
 * @returns {JSX.Element}
 */
import { COLORES_ESTADO, ETIQUETAS_ESTADO } from '../../utils/constants';

function Badge({ estado, text, className = '' }) {
  // Si se proporciona un estado, usar colores y etiquetas predefinidas
  if (estado) {
    const colorClass = COLORES_ESTADO[estado] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    const label = ETIQUETAS_ESTADO[estado] || estado;

    return (
      <span className={`badge ${colorClass} ${className}`}>
        {label}
      </span>
    );
  }

  // Modo de texto personalizado
  return (
    <span className={`badge ${className}`}>
      {text}
    </span>
  );
}

export default Badge;
