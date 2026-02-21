import { useState, useEffect } from 'react';
import { Package, Plus, Search, Pencil, Trash2 } from 'lucide-react';
import Card from '../components/Common/Card';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import ProductModal from '../components/Products/ProductModal';
import productService from '../services/productService';
import toast from 'react-hot-toast';
import { formatearPrecio } from '../utils/helpers';

function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productService.getAll();
      
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product = null) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setIsModalOpen(false);
  };

  const handleSaveProduct = async (productData) => {
    try {
      let response;
      if (selectedProduct) {
        // Actualizar producto existente
        response = await productService.update(selectedProduct.id, productData);
        toast.success('Producto actualizado exitosamente');
      } else {
        // Crear nuevo producto
        response = await productService.create(productData);
        toast.success('Producto creado exitosamente');
      }

      if (response.success) {
        loadProducts();
        return response;
      }
    } catch (error) {
      toast.error('Error al guardar producto');
      throw error;
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${productName}"?`)) {
      return;
    }

    try {
      const response = await productService.delete(productId);
      if (response.success) {
        toast.success('Producto eliminado exitosamente');
        loadProducts();
      }
    } catch (error) {
      toast.error('Error al eliminar producto');
    }
  };

  const filteredProducts = products.filter(product =>
    product.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Productos</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Gestiona el menú de tu restaurante</p>
        </div>
        
        <button 
          className="btn btn-primary flex items-center gap-2 justify-center text-sm sm:text-base"
          onClick={() => handleOpenModal()}
        >
          <Plus size={20} />
          Nuevo Producto
        </button>
      </div>

      {/* Búsqueda */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="input pl-10 text-sm sm:text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {/* Lista de productos */}
      {loading ? (
        <LoadingSpinner text="Cargando productos..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-base sm:text-lg">{product.nombre}</h3>
                      {product.activo === false && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                          Inactivo
                        </span>
                      )}
                    </div>
                    {product.descripcion && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">{product.descripcion}</p>
                    )}
                  </div>
                  <Package className="text-gray-400 flex-shrink-0 ml-2" size={18} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-xl sm:text-2xl font-bold text-primary">
                    {formatearPrecio(product.precio)}
                  </span>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleOpenModal(product)}
                    className="flex-1 btn btn-secondary text-xs sm:text-sm flex items-center justify-center gap-2"
                  >
                    <Pencil size={14} />
                    <span className="hidden sm:inline">Editar</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id, product.nombre)}
                    className="flex-1 btn bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 text-xs sm:text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} />
                    <span className="hidden sm:inline">Eliminar</span>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Producto */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveProduct}
        product={selectedProduct}
      />
    </div>
  );
}

export default Products;
