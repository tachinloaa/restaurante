/**
 * Componente LoadingSpinner - Indicador de carga
 * 
 * Muestra un spinner animado con texto opcional
 * Tamaños disponibles: sm (pequeño), md (mediano), lg (grande)
 * 
 * @param {Object} props
 * @param {string} props.size - Tamaño del spinner ('sm' | 'md' | 'lg')
 * @param {string} props.text - Texto descriptivo opcional
 * @returns {JSX.Element}
 */
import { Loader2 } from 'lucide-react';

function LoadingSpinner({ size = 'md', text = '' }) {
  // Mapeo de tamaños a clases de Tailwind
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Spinner animado */}
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary dark:text-primary-400`} />
      
      {/* Texto opcional */}
      {text && (
        <p className="mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400">
          {text}
        </p>
      )}
    </div>
  );
}

export default LoadingSpinner;
