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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-display">Productos</h1>
          <p className="text-gray-600 mt-2">Gestiona el menú de tu restaurante</p>
        </div>
        
        <button 
          className="btn btn-primary flex items-center gap-2"
          onClick={() => handleOpenModal()}
        >
          <Plus size={20} />
          Nuevo Producto
        </button>
      </div>

      {/* Búsqueda */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar productos..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </Card>

      {/* Lista de productos */}
      {loading ? (
        <LoadingSpinner text="Cargando productos..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{product.nombre}</h3>
                    {product.descripcion && (
                      <p className="text-sm text-gray-600 mt-1">{product.descripcion}</p>
                    )}
                  </div>
                  <Package className="text-gray-400 flex-shrink-0 ml-2" size={20} />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-2xl font-bold text-primary">
                    {formatearPrecio(product.precio)}
                  </span>
                  <span className={`text-sm font-medium ${
                    product.stock > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    Stock: {product.stock}
                  </span>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => handleOpenModal(product)}
                    className="flex-1 btn btn-secondary text-sm flex items-center justify-center gap-2"
                  >
                    <Pencil size={16} />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(product.id, product.nombre)}
                    className="flex-1 btn bg-red-50 text-red-600 hover:bg-red-100 text-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Eliminar
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
