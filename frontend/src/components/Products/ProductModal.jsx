import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import categoryService from '../../services/categoryService';
import toast from 'react-hot-toast';

function ProductModal({ isOpen, onClose, onSave, product = null }) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    categoria_id: '',
    subcategoria_id: '',
    activo: true
  });
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (product) {
        setFormData({
          nombre: product.nombre || '',
          descripcion: product.descripcion || '',
          precio: product.precio || '',
          categoria_id: product.categoria_id || '',
          subcategoria_id: product.subcategoria_id || '',
          activo: product.activo !== undefined ? product.activo : true
        });
      } else {
        // Resetear formulario para nuevo producto
        setFormData({
          nombre: '',
          descripcion: '',
          precio: '',
          categoria_id: '',
          subcategoria_id: '',
          activo: true
        });
      }
    }
  }, [isOpen, product]);

  const loadCategories = async () => {
    try {
      const response = await categoryService.getAll();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      toast.error('Error al cargar categorías');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Manejar precio especialmente para evitar redondeos
    if (name === 'precio') {
      // Permitir solo números y punto decimal
      const soloNumeros = value.replace(/[^\d.]/g, '');
      // Permitir máximo 2 decimales
      const partes = soloNumeros.split('.');
      const precioLimpio = partes.length > 1 
        ? `${partes[0]}.${partes[1].substring(0, 2)}`
        : soloNumeros;
      
      setFormData(prev => ({
        ...prev,
        [name]: precioLimpio
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    
    // Validar precio
    const precioNum = parseFloat(formData.precio);
    if (!formData.precio || isNaN(precioNum) || precioNum <= 0) {
      toast.error('El precio debe ser mayor a 0');
      return;
    }
    
    if (!formData.categoria_id) {
      toast.error('Debes seleccionar una categoría');
      return;
    }

    setLoading(true);
    try {
      // Preparar datos para enviar - redondear precio a 2 decimales
      const dataToSend = {
        ...formData,
        precio: Math.round(precioNum * 100) / 100 // Asegurar 2 decimales exactos
      };

      // Limpiar campos vacíos opcionales
      if (!dataToSend.descripcion) delete dataToSend.descripcion;
      if (!dataToSend.subcategoria_id) delete dataToSend.subcategoria_id;

      await onSave(dataToSend);
      onClose();
    } catch (error) {
      console.error('Error al guardar producto:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-gray-100">
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre del Producto *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="input bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-primary focus:border-primary"
              placeholder="Ej: Hamburguesa completa"
              required
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              className="input bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-primary focus:border-primary"
              rows="3"
              placeholder="Descripción del producto (opcional)"
            />
          </div>

          {/* Precio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Precio (MXN) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
              <input
                type="text"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                className="input pl-8 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-primary focus:border-primary"
                placeholder="0.00"
                inputMode="decimal"
                required
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Permite centavos: ej. 20.50 o 40</p>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categoría *
            </label>
            <select
              name="categoria_id"
              value={formData.categoria_id}
              onChange={handleChange}
              className="input bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-primary focus:border-primary"
              required
            >
              <option value="" className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">Seleccionar categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id} className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Activo */}
          <div className="flex items-center">
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
              className="w-4 h-4 text-primary bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-primary"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Producto activo
            </label>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Guardando...' : (product ? 'Actualizar' : 'Crear Producto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProductModal;
