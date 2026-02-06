import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';

function CategoryModal({ isOpen, onClose, onSave, category = null }) {
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    orden: '',
    activo: true
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData({
          nombre: category.nombre || '',
          descripcion: category.descripcion || '',
          orden: category.orden || '',
          activo: category.activo !== undefined ? category.activo : true
        });
      } else {
        setFormData({
          nombre: '',
          descripcion: '',
          orden: '',
          activo: true
        });
      }
    }
  }, [isOpen, category]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = {
        ...formData,
        orden: parseInt(formData.orden) || 0
      };

      if (!dataToSend.descripcion) delete dataToSend.descripcion;

      await onSave(dataToSend);
      onClose();
    } catch (error) {
      console.error('Error al guardar categoría:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-gray-100">
            {category ? 'Editar Categoría' : 'Nueva Categoría'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="input"
              placeholder="Ej: BEBIDAS"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              className="input"
              rows="3"
              placeholder="Descripción de la categoría (opcional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Orden
            </label>
            <input
              type="number"
              name="orden"
              value={formData.orden}
              onChange={handleChange}
              className="input"
              placeholder="0"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">Orden en el menú (menor número = primera posición)</p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label className="ml-2 text-sm text-gray-700">
              Categoría activa
            </label>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
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
              {loading ? 'Guardando...' : (category ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CategoryModal;
