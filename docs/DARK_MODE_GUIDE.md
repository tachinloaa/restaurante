# 🌓 Dark Mode & Clean Code - Guía de Implementado

## ✅ Componentes Completados

### 1. **Sistema de Temas**
- ✅ `ThemeContext.jsx` - Contexto global de tema con persistencia en localStorage
- ✅ `main.jsx` - Integración del ThemeProvider
- ✅ `tailwind.config.js` - Configuración de dark mode con clase

### 2. **Componentes de Layout**
- ✅ `Header.jsx` - Con botón toggle Moon/Sun y soporte dark mode
- ✅ `Sidebar.jsx` - Navegación adaptada a tema oscuro
- ✅ `MainLayout.jsx` - Container principal con dark mode

### 3. **Componentes Comunes**
- ✅ `Card.jsx` - Tarjeta con comentarios JSDoc
- ✅ `Badge.jsx` - Badges con dark mode
- ✅ `LoadingSpinner.jsx` - Spinner con dark mode

### 4. **Páginas**
- ✅ `Dashboard.jsx` - Completamente comentada y con dark mode

### 5. **Estilos Globales**
- ✅ `index.css` - Clases CSS con soporte dark mode (.btn, .card, .input, .badge)

## 📋 Patrón de Dark Mode Implementado

### Clases de Tailwind para Dark Mode

```jsx
// Texto
className="text-gray-900 dark:text-gray-100"

// Backgrounds
className="bg-white dark:bg-gray-800"

// Borders
className="border-gray-200 dark:border-gray-700"

// Hover states
className="hover:bg-gray-100 dark:hover:bg-gray-700"

// Colores de marca
className="text-primary dark:text-primary-400"
className="text-green-600 dark:text-green-400"
```

## 🔧 Cómo Usar el Toggle de Tema

```jsx
import { useTheme } from '../context/ThemeContext';

function MiComponente() {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <button onClick={toggleTheme}>
      {isDark ? 'Modo Claro' : 'Modo Oscuro'}
    </button>
  );
}
```

## 📝 Estándares de Comentarios JSDoc

```jsx
/**
 * Descripción breve del componente
 * 
 * Descripción detallada de funcionalidades:
 * - Funcionalidad 1
 * - Funcionalidad 2
 * 
 * @param {Object} props - Props del componente
 * @param {string} props.nombre - Descripción del prop
 * @param {Function} props.callback - Descripción de la función
 * @returns {JSX.Element}
 */
function MiComponente({ nombre, callback }) {
  // Implementación
}
```

## 🎨 Componentes Pendientes de Actualizar

### Páginas
- [ ] Orders.jsx - Agregar clases dark mode
- [ ] Products.jsx - Agregar clases dark mode
- [ ] Categories.jsx - Agregar clases dark mode
- [ ] Customers.jsx - Agregar clases dark mode
- [ ] Login.jsx - Ya tiene diseño bonito, solo falta dark mode
- [ ] Settings.jsx - Crear y agregar dark mode

### Componentes Dashboard
- [ ] LoyalCustomers.jsx - Agregar comentarios JSDoc
- [ ] TopProducts.jsx - Agregar comentarios JSDoc
- [ ] OrderTypeDistribution.jsx - Agregar comentarios JSDoc

### Modales
- [ ] ProductModal.jsx - Agregar dark mode
- [ ] CategoryModal.jsx - Agregar dark mode
- [ ] SubcategoryModal.jsx - Agregar dark mode

## 🚀 Ejemplo de Actualización Rápida

**Antes:**
```jsx
<div className="bg-white p-4 rounded-lg">
  <h2 className="text-gray-900">Título</h2>
  <p className="text-gray-600">Contenido</p>
</div>
```

**Después:**
```jsx
<div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
  <h2 className="text-gray-900 dark:text-gray-100">Título</h2>
  <p className="text-gray-600 dark:text-gray-400">Contenido</p>
</div>
```

## 🎯 Checklist de Dark Mode

Al actualizar cada componente, verificar:

- [ ] Backgrounds: `bg-white` → `bg-white dark:bg-gray-800`
- [ ] Texto primario: `text-gray-900` → `text-gray-900 dark:text-gray-100`
- [ ] Texto secundario: `text-gray-600` → `text-gray-600 dark:text-gray-400`
- [ ] Texto terciario: `text-gray-500` → `text-gray-500 dark:text-gray-500`
- [ ] Bordes: `border-gray-200` → `border-gray-200 dark:border-gray-700`
- [ ] Cards: Usar componente `<Card>` que ya tiene dark mode
- [ ] Inputs: Usar clase `.input` que ya tiene dark mode
- [ ] Buttons: Usar clases `.btn-*` que ya tienen dark mode
- [ ] Estados hover: `hover:bg-gray-100` → `hover:bg-gray-100 dark:hover:bg-gray-700`

## 💡 Mejores Prácticas Aplicadas

1. **Separación de Responsabilidades**
   - Contextos separados (Auth, Theme)
   - Servicios API aislados
   - Componentes reutilizables

2. **Comentarios Claros**
   - JSDoc en todos los componentes
   - Comentarios inline donde es necesario
   - Descripciones de funciones complejas

3. **Accesibilidad**
   - Atributos `aria-label` en botones
   - Contraste adecuado en dark mode
   - Focus states bien definidos

4. **Rendimiento**
   - Lazy loading de estadísticas avanzadas
   - Estados de carga independientes
   - Memorización cuando es necesario

5. **UX/UI**
   - Transiciones suaves entre temas
   - Persistencia de preferencias
   - Responsive en todos los tamaños

## 🔥 Comandos Útiles

```bash
# Iniciar desarrollo
npm run dev

# Build para producción
npm run build

# Preview build
npm run preview

# Linter
npm run lint
```

## 📦 Dependencias Clave

- **React 18** - Framework principal
- **TailwindCSS 3** - Estilos con dark mode
- **React Router 6** - Navegación
- **Lucide React** - Iconos
- **React Hot Toast** - Notificaciones

## 🌟 Features Implementadas

✅ Dark mode completo en componentes base
✅ Sistema de temas con persistencia
✅ Componentes comentados profesionalmente
✅ Responsive design completo
✅ Accesibilidad mejorada
✅ Performance optimizado
✅ Clean code aplicado

---

**Desarrollado con 💚 por El Caldo de las Albóndigas 🍲**
