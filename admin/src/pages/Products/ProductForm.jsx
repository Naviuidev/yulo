import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import PageHeader from '../../components/common/PageHeader';
import Loader from '../../components/common/Loader';
import productService from '../../services/productService';
import categoryService from '../../services/categoryService';
import brandService from '../../services/brandService';
import { slugify } from '../../utils/formatters';

const ProductForm = () => {
  const { id } = useParams();
  const isEdit = id && id !== 'new';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '', slug: '', description: '', short_description: '', sku: '',
      price: '', sale_price: '', stock: 0, category_id: '', brand_id: '',
      status: 'active', is_featured: false,
    },
  });

  const name = watch('name');

  useEffect(() => {
    if (!isEdit && name) setValue('slug', slugify(name));
  }, [name, isEdit, setValue]);

  useEffect(() => {
    const loadMeta = async () => {
      const [cats, brs] = await Promise.allSettled([
        categoryService.list({ per_page: 100 }),
        brandService.list({ per_page: 100 }),
      ]);
      if (cats.status === 'fulfilled') setCategories(cats.value.items || []);
      if (brs.status === 'fulfilled') setBrands(brs.value.items || []);
    };
    loadMeta();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const product = await productService.get(id);
        reset({
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          short_description: product.short_description || '',
          sku: product.sku || '',
          price: product.price || '',
          sale_price: product.sale_price || '',
          stock: product.stock || 0,
          category_id: product.category_id || '',
          brand_id: product.brand_id || '',
          status: product.status || 'active',
          is_featured: !!product.is_featured,
        });
      } catch {
        toast.error('Product not found');
        navigate('/products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, reset, navigate]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        price: Number(data.price),
        sale_price: data.sale_price ? Number(data.sale_price) : null,
        stock: Number(data.stock),
        category_id: data.category_id ? Number(data.category_id) : null,
        brand_id: data.brand_id ? Number(data.brand_id) : null,
        is_featured: !!data.is_featured,
      };
      if (isEdit) {
        await productService.update(id, payload);
        toast.success('Product updated');
      } else {
        await productService.create(payload);
        toast.success('Product created');
      }
      navigate('/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <>
      <Helmet><title>{isEdit ? 'Edit Product' : 'New Product'} — YULO Admin</title></Helmet>
      <PageHeader
        title={isEdit ? 'Edit Product' : 'Add Product'}
        breadcrumbs={<Link to="/products" className="text-muted text-decoration-none">Products</Link>}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="yulo-form-card">
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label">Product Name *</label>
            <input className={`form-control ${errors.name ? 'is-invalid' : ''}`} {...register('name', { required: true })} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Slug *</label>
            <input className={`form-control ${errors.slug ? 'is-invalid' : ''}`} {...register('slug', { required: true })} />
          </div>
          <div className="col-12">
            <label className="form-label">Short Description</label>
            <input className="form-control" {...register('short_description')} />
          </div>
          <div className="col-12">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={4} {...register('description')} />
          </div>
          <div className="col-md-4">
            <label className="form-label">SKU</label>
            <input className="form-control" {...register('sku')} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Price *</label>
            <input type="number" step="0.01" className={`form-control ${errors.price ? 'is-invalid' : ''}`} {...register('price', { required: true })} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Sale Price</label>
            <input type="number" step="0.01" className="form-control" {...register('sale_price')} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Stock</label>
            <input type="number" className="form-control" {...register('stock')} />
          </div>
          <div className="col-md-3">
            <label className="form-label">Category</label>
            <select className="form-select" {...register('category_id')}>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Brand</label>
            <select className="form-select" {...register('brand_id')}>
              <option value="">Select brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Status</label>
            <select className="form-select" {...register('status')}>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="col-12">
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="featured" {...register('is_featured')} />
              <label className="form-check-label" htmlFor="featured">Featured product</label>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 mt-4">
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
          </button>
          <Link to="/products" className="btn btn-light">Cancel</Link>
        </div>
      </form>
    </>
  );
};

export default ProductForm;
