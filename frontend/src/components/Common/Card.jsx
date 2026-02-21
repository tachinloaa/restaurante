/**
 * Componente Card - Tarjeta contenedora reutilizable
 * 
 * Proporciona un contenedor estilizado con:
 * - Fondo blanco/oscuro según tema
 * - Bordes redondeados
 * - Sombra sutil
 * - Padding responsive
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido de la tarjeta
 * @param {string} props.className - Clases CSS adicionales
 * @returns {JSX.Element}
 */
function Card({ children, className = '', ...props }) {
  return (
    <div className={`card ${className}`} {...props}>
      {children}
    </div>
  );
}

export default Card;
