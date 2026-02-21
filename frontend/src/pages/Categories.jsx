import { useState, useEffect } from 'react';
import { Plus, Folder, FolderTree, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import Card from '../components/Common/Card';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import CategoryModal from '../components/Categories/CategoryModal';
import SubcategoryModal from '../components/Categories/SubcategoryModal';
import Badge from '../components/Common/Badge';
import categoryService from '../services/categoryService';
import subcategoryService from '../services/subcategoryService';
import toast from 'react-hot-toast';

function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  
  // Modales
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await categoryService.getAll(true); // incluir inactivas
      
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      toast.error('Error al cargar categorías');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Funciones de Categoría
  const handleOpenCategoryModal = (category = null) => {
    setSelectedCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setSelectedCategory(null);
    setIsCategoryModalOpen(false);
  };

  const handleSaveCategory = async (categoryData) => {
    try {
      let response;
      if (selectedCategory) {
        response = await categoryService.update(selectedCategory.id, categoryData);
        toast.success('Categoría actualizada exitosamente');
      } else {
        response = await categoryService.create(categoryData);
        toast.success('Categoría creada exitosamente');
      }

      if (response.success) {
        loadCategories();
        return response;
      }
    } catch (error) {
      toast.error('Error al guardar categoría');
      throw error;
    }
  };

  const handleDeleteCategory = async (categoryId, categoryName) => {
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${categoryName}"? Esto también eliminará todas sus subcategorías.`)) {
      return;
    }

    try {
      const response = await categoryService.delete(categoryId);
      if (response.success) {
        toast.success('Categoría eliminada exitosamente');
        loadCategories();
      }
    } catch (error) {
      toast.error('Error al eliminar categoría');
    }
  };

  // Funciones de Subcategoría
  const handleOpenSubcategoryModal = (subcategory = null, parentCategoryId = null) => {
    setSelectedSubcategory(subcategory);
    setIsSubcategoryModalOpen(true);
    // Si hay un parentCategoryId pero no subcategory, estamos creando una nueva bajo esa categoría
    if (!subcategory && parentCategoryId) {
      setSelectedSubcategory({ categoria_id: parentCategoryId });
    }
  };

  const handleCloseSubcategoryModal = () => {
    setSelectedSubcategory(null);
    setIsSubcategoryModalOpen(false);
  };

  const handleSaveSubcategory = async (subcategoryData) => {
    try {
      let response;
      if (selectedSubcategory && selectedSubcategory.id) {
        response = await subcategoryService.update(selectedSubcategory.id, subcategoryData);
        toast.success('Subcategoría actualizada exitosamente');
      } else {
        response = await subcategoryService.create(subcategoryData);
        toast.success('Subcategoría creada exitosamente');
      }

      if (response.success) {
        loadCategories();
        return response;
      }
    } catch (error) {
      toast.error('Error al guardar subcategoría');
      throw error;
    }
  };

  const handleDeleteSubcategory = async (subcategoryId, subcategoryName) => {
    if (!window.confirm(`¿Estás seguro de eliminar la subcategoría "${subcategoryName}"?`)) {
      return;
    }

    try {
      const response = await subcategoryService.delete(subcategoryId);
      if (response.success) {
        toast.success('Subcategoría eliminada exitosamente');
        loadCategories();
      }
    } catch (error) {
      toast.error('Error al eliminar subcategoría');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Cargando categorías..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Categorías</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Organiza el menú por categorías y subcategorías</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            className="btn btn-secondary flex items-center justify-center gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
            onClick={() => handleOpenSubcategoryModal()}
          >
            <FolderTree size={18} />
            <span className="hidden sm:inline">Nueva Subcategoría</span>
            <span className="sm:hidden">Subcat.</span>
          </button>
          <button 
            className="btn btn-primary flex items-center justify-center gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
            onClick={() => handleOpenCategoryModal()}
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Nueva Categoría</span>
            <span className="sm:hidden">Categoría</span>
          </button>
        </div>
      </div>

      {/* Lista de Categorías */}
      {categories.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Folder className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-500 mb-4">No hay categorías creadas</p>
            <button 
              className="btn btn-primary"
              onClick={() => handleOpenCategoryModal()}
            >
              Crear Primera Categoría
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {categories.map((category) => {
            const isExpanded = expandedCategories.has(category.id);
            const subcategorias = category.subcategorias || [];

            return (
              <Card key={category.id} className="overflow-hidden">
                {/* Categoría Principal */}
                <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex-shrink-0"
                  >
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  
                  <Folder className="text-primary flex-shrink-0" size={20} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                      <h3 className="font-semibold text-base sm:text-lg truncate">{category.nombre}</h3>
                      {!category.activo && (
                        <Badge variant="gray">Inactiva</Badge>
                      )}
                      <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                        (Orden: {category.orden})
                      </span>
                    </div>
                    {category.descripcion && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-1">{category.descripcion}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {subcategorias.length} subcategoría{subcategorias.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleOpenSubcategoryModal(null, category.id)}
                      className="btn btn-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center gap-1 px-2 sm:px-3"
                      title="Agregar subcategoría"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline text-xs">Sub</span>
                    </button>
                    <button
                      onClick={() => handleOpenCategoryModal(category)}
                      className="btn btn-sm btn-secondary p-2"
                      title="Editar categoría"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id, category.nombre)}
                      className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 p-2"
                      title="Eliminar categoría"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Subcategorías */}
                {isExpanded && subcategorias.length > 0 && (
                  <div className="border-t border-gray-200 bg-gray-50">
                    <div className="p-4 space-y-2">
                      {subcategorias.map((subcat) => (
                        <div
                          key={subcat.id}
                          className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
                        >onClick={() => handleDeleteSubcategory(subcat.id, subcat.nombre)}
                              
                          <div className="flex items-center gap-3">
                            <FolderTree className="text-blue-600" size={20} />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{subcat.nombre}</span>
                                {!subcat.activo && (
                                  <Badge variant="gray">Inactiva</Badge>
                                )}
                                <span className="text-xs text-gray-500">(Orden: {subcat.orden})</span>
                              </div>
                              {subcat.descripcion && (
                                <p className="text-sm text-gray-600">{subcat.descripcion}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenSubcategoryModal(subcat)}
                              className="btn btn-sm btn-secondary flex items-center gap-1"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isExpanded && subcategorias.length === 0 && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm text-gray-500 text-center">
                      No hay subcategorías. 
                      <button 
                        onClick={() => handleOpenSubcategoryModal(null, category.id)}
                        className="text-primary hover:underline ml-1"
                      >
                        Crear una
                      </button>
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={handleCloseCategoryModal}
        onSave={handleSaveCategory}
        category={selectedCategory}
      />

      <SubcategoryModal
        isOpen={isSubcategoryModalOpen}
        onClose={handleCloseSubcategoryModal}
        onSave={handleSaveSubcategory}
        categories={categories.filter(c => c.activo)}
        subcategory={selectedSubcategory}
        parentCategoryId={selectedSubcategory?.categoria_id}
      />
    </div>
  );
}

export default Categories;
