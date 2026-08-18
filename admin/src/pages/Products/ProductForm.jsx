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
import homeSectionService from '../../services/homeSectionService';
import { slugify } from '../../utils/formatters';
import { resolveMediaUrl } from '../../utils/media';

const EMPTY_IMAGES = ['', '', ''];
const EMPTY_COLORS = [
  { name: '', hex: '#000000' },
  { name: '', hex: '#FFFFFF' },
  { name: '', hex: '#956514' },
  { name: '', hex: '#1B2838' },
];

const SIZE_OPTIONS = [
  { value: 'sm', label: 'SM' },
  { value: 'm', label: 'M' },
  { value: 'l', label: 'L' },
  { value: 'xl', label: 'XL' },
  { value: 'xxl', label: 'XXL' },
];

const ProductForm = () => {
  const { id } = useParams();
  const isEdit = id && id !== 'new';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [images, setImages] = useState(EMPTY_IMAGES);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [sections, setSections] = useState([]);
  const [sectionId, setSectionId] = useState('');
  const [colors, setColors] = useState(EMPTY_COLORS);
  const [selectedSizes, setSelectedSizes] = useState([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '', slug: '', description: '', short_description: '', sku: '',
      price: '', sale_price: '', stock: 0, category_id: '', brand_id: '',
      status: 'active', is_featured: false, gst_applicable: true,
      custom_shipping: false, shipping_price: '',
      cod_available: true,
      cancel_available: true,
      return_available: true,
      has_color_variants: false, enable_sizes: false,
    },
  });

  const name = watch('name');
  const gstApplicable = watch('gst_applicable');
  const customShipping = watch('custom_shipping');
  const codAvailable = watch('cod_available');
  const cancelAvailable = watch('cancel_available');
  const returnAvailable = watch('return_available');
  const hasColorVariants = watch('has_color_variants');
  const enableSizes = watch('enable_sizes');

  useEffect(() => {
    if (!isEdit && name) setValue('slug', slugify(name));
  }, [name, isEdit, setValue]);

  useEffect(() => {
    const loadMeta = async () => {
      const [cats, brs, secs] = await Promise.allSettled([
        categoryService.list({ per_page: 100 }),
        brandService.list({ per_page: 100 }),
        homeSectionService.list(),
      ]);
      if (cats.status === 'fulfilled') setCategories(cats.value.items || []);
      if (brs.status === 'fulfilled') setBrands(brs.value.items || []);
      if (secs.status === 'fulfilled') {
        setSections((secs.value.items || []).filter((s) => s.status === 'active'));
      }
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
          gst_applicable: product.gst_applicable === undefined ? true : !!Number(product.gst_applicable),
          custom_shipping: !!Number(product.custom_shipping),
          shipping_price: product.shipping_price ?? '',
          cod_available: product.cod_available === undefined ? true : !!Number(product.cod_available),
          cancel_available: product.cancel_available === undefined ? true : !!Number(product.cancel_available),
          return_available: product.return_available === undefined ? true : !!Number(product.return_available),
          has_color_variants: !!Number(product.has_color_variants),
          enable_sizes: false,
        });
        const ids = (product.section_ids || []).map((sid) => String(sid));
        setSectionId(ids[0] || '');
        const loadedColors = Array.isArray(product.colors) ? product.colors : [];
        setColors(
          [...loadedColors, ...EMPTY_COLORS]
            .slice(0, 4)
            .map((c, i) => ({
              name: c?.name || '',
              hex: c?.hex || EMPTY_COLORS[i].hex,
            }))
        );
        let loadedSizes = Array.isArray(product.sizes) ? product.sizes.map((s) => String(s).toLowerCase()) : [];
        if (loadedSizes.length === 0 && product.size_option && product.size_option !== 'none') {
          loadedSizes = [String(product.size_option).toLowerCase()];
        }
        loadedSizes = loadedSizes.filter((s) => SIZE_OPTIONS.some((o) => o.value === s));
        setSelectedSizes(loadedSizes);
        setValue('enable_sizes', loadedSizes.length > 0);
        const loaded = (product.images || [])
          .map((img) => img.image_path || img.url || '')
          .filter(Boolean)
          .slice(0, 3);
        setImages([...loaded, '', '', ''].slice(0, 3));
      } catch {
        toast.error('Product not found');
        navigate('/products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit, reset, navigate]);

  const setImageAt = (index, value) => {
    setImages((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const setColorAt = (index, patch) => {
    setColors((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const toggleSize = (value) => {
    setSelectedSizes((prev) => (
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    ));
  };

  const handleImageUpload = async (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSlot(index);
    try {
      const result = await productService.uploadImage(file);
      const path = result?.url || result?.path || '';
      if (path) {
        setImageAt(index, path);
        toast.success(`Image ${index + 1} uploaded`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploadingSlot(null);
      e.target.value = '';
    }
  };

  const onSubmit = async (data) => {
    if (data.custom_shipping && (!data.shipping_price || Number(data.shipping_price) < 0)) {
      toast.error('Enter a shipping price when custom shipping is enabled');
      return;
    }
    if (data.has_color_variants) {
      const filled = colors.filter((c) => c.name.trim());
      if (filled.length === 0) {
        toast.error('Add at least one color name (up to 4)');
        return;
      }
    }
    if (data.enable_sizes && selectedSizes.length === 0) {
      toast.error('Select at least one size, or turn off sizes');
      return;
    }

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
        gst_applicable: !!data.gst_applicable,
        custom_shipping: !!data.custom_shipping,
        shipping_price: data.custom_shipping ? Number(data.shipping_price) : null,
        cod_available: !!data.cod_available,
        cancel_available: !!data.cancel_available,
        return_available: !!data.return_available,
        has_color_variants: !!data.has_color_variants,
        colors: data.has_color_variants
          ? colors.filter((c) => c.name.trim()).slice(0, 4).map((c) => ({
              name: c.name.trim(),
              hex: c.hex || '#000000',
            }))
          : [],
        sizes: data.enable_sizes ? selectedSizes : [],
        images: images.map((img) => img.trim()).filter(Boolean).slice(0, 3),
        section_ids: sectionId ? [Number(sectionId)] : [],
      };
      delete payload.enable_sizes;
      delete payload.size_option;
      if (isEdit) {
        await productService.update(id, payload);
        toast.success('Product updated');
      } else {
        await productService.create(payload);
        toast.success('Product created');
      }
      navigate('/products');
    } catch (err) {
      const res = err.response?.data;
      const fieldErrors = res?.errors;
      let detail = res?.message || 'Save failed';
      if (fieldErrors && typeof fieldErrors === 'object') {
        const first = Object.values(fieldErrors).flat().find(Boolean);
        if (first) detail = String(first);
      }
      toast.error(detail);
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

          <div className="col-12">
            <label className="form-label mb-2">Product Images (up to 3)</label>
            <p className="form-text mt-0 mb-3">Image 1 is the primary image.</p>
            <div className="row g-3">
              {images.map((image, index) => (
                <div className="col-md-4" key={index}>
                  <div className="border rounded p-3 h-100 bg-white">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small fw-medium">Image {index + 1}{index === 0 ? ' · Primary' : ''}</span>
                      {image ? (
                        <button type="button" className="btn btn-link btn-sm text-danger p-0" onClick={() => setImageAt(index, '')}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div
                      className="mb-2 d-flex align-items-center justify-content-center bg-light rounded overflow-hidden"
                      style={{ aspectRatio: '3/4' }}
                    >
                      {image ? (
                        <img
                          src={resolveMediaUrl(image)}
                          alt={`Product ${index + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <span className="text-muted small">No image</span>
                      )}
                    </div>
                    <input
                      className="form-control form-control-sm mb-2"
                      placeholder="Image URL or upload below"
                      value={image}
                      onChange={(e) => setImageAt(index, e.target.value)}
                    />
                    <input
                      type="file"
                      className="form-control form-control-sm"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      disabled={uploadingSlot === index}
                      onChange={(e) => handleImageUpload(index, e)}
                    />
                    {uploadingSlot === index ? <div className="form-text">Uploading…</div> : null}
                  </div>
                </div>
              ))}
            </div>
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
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Options row: GST + Homepage */}
          <div className="col-12">
            <div className="yulo-option-grid">
              <div className={`yulo-option-card ${gstApplicable ? 'is-on' : ''}`}>
                <div className="yulo-option-card__head">
                  <div>
                    <div className="yulo-option-card__title">GST (18%)</div>
                    <div className="yulo-option-card__hint">
                      {gstApplicable ? 'GST will be added at checkout' : 'No GST on this product'}
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input type="checkbox" className="form-check-input" id="gst_applicable" {...register('gst_applicable')} />
                  </div>
                </div>
              </div>

              <div className={`yulo-option-card ${codAvailable ? 'is-on' : ''}`}>
                <div className="yulo-option-card__head">
                  <div>
                    <div className="yulo-option-card__title">Cash on Delivery (COD)</div>
                    <div className="yulo-option-card__hint">
                      {codAvailable
                        ? 'Buyers can choose COD if every cart item allows it'
                        : 'Online payment only for this product'}
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input type="checkbox" className="form-check-input" id="cod_available" {...register('cod_available')} />
                  </div>
                </div>
              </div>

              <div className={`yulo-option-card ${cancelAvailable ? 'is-on' : ''}`}>
                <div className="yulo-option-card__head">
                  <div>
                    <div className="yulo-option-card__title">Allow customer cancel</div>
                    <div className="yulo-option-card__hint">
                      {cancelAvailable
                        ? 'Customer can cancel if every item in the order allows it'
                        : 'Customer cannot cancel orders that include this product'}
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input type="checkbox" className="form-check-input" id="cancel_available" {...register('cancel_available')} />
                  </div>
                </div>
              </div>

              <div className={`yulo-option-card ${returnAvailable ? 'is-on' : ''}`}>
                <div className="yulo-option-card__head">
                  <div>
                    <div className="yulo-option-card__title">Allow customer return</div>
                    <div className="yulo-option-card__hint">
                      {returnAvailable
                        ? 'Customer can request a return after delivery if every item allows it'
                        : 'Customer cannot return orders that include this product'}
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input type="checkbox" className="form-check-input" id="return_available" {...register('return_available')} />
                  </div>
                </div>
              </div>

              <div className="yulo-option-card">
                <div className="yulo-option-card__title mb-2">Homepage section</div>
                <select
                  className="form-select"
                  value={sectionId}
                  onChange={(e) => setSectionId(e.target.value)}
                >
                  <option value="">None</option>
                  {sections.map((s) => (
                    <option key={s.id} value={String(s.id)}>{s.name}</option>
                  ))}
                </select>
                <div className="form-text mb-0 mt-2">Shows this product in the selected homepage section.</div>
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="col-12">
            <div className={`yulo-option-card ${customShipping ? 'is-on' : ''}`}>
              <div className="yulo-option-card__head">
                <div>
                  <div className="yulo-option-card__title">Custom shipping price</div>
                  <div className="yulo-option-card__hint">
                    {customShipping
                      ? 'Use the shipping amount below for this product'
                      : 'Off = default cart shipping (free over ₹999)'}
                  </div>
                </div>
                <div className="form-check form-switch m-0">
                  <input type="checkbox" className="form-check-input" id="custom_shipping" {...register('custom_shipping')} />
                </div>
              </div>
              {customShipping ? (
                <div className="mt-3" style={{ maxWidth: 280 }}>
                  <label className="form-label" htmlFor="shipping_price">Shipping price (₹)</label>
                  <input
                    id="shipping_price"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="e.g. 49"
                    {...register('shipping_price')}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* Colors + Size */}
          <div className="col-12">
            <div className="yulo-option-grid">
              <div className={`yulo-option-card ${hasColorVariants ? 'is-on' : ''}`}>
                <div className="yulo-option-card__head">
                  <div>
                    <div className="yulo-option-card__title">Color variants</div>
                    <div className="yulo-option-card__hint">Up to 4 colors on the product page</div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input type="checkbox" className="form-check-input" id="has_color_variants" {...register('has_color_variants')} />
                  </div>
                </div>
                {hasColorVariants ? (
                  <div className="mt-3">
                    <div className="row g-2">
                      {colors.map((color, index) => (
                        <div className="col-md-6" key={index}>
                          <div className="yulo-color-slot">
                            <input
                              type="color"
                              className="yulo-color-slot__picker"
                              value={color.hex || '#000000'}
                              onChange={(e) => setColorAt(index, { hex: e.target.value })}
                              title={`Color ${index + 1}`}
                            />
                            <input
                              className="form-control form-control-sm"
                              placeholder={`Color ${index + 1} name`}
                              value={color.name}
                              onChange={(e) => setColorAt(index, { name: e.target.value })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className={`yulo-option-card ${enableSizes ? 'is-on' : ''}`}>
                <div className="yulo-option-card__head">
                  <div>
                    <div className="yulo-option-card__title">Sizes</div>
                    <div className="yulo-option-card__hint">
                      {enableSizes ? 'Select one or more sizes for the product page' : 'Off = hide size selector'}
                    </div>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input type="checkbox" className="form-check-input" id="enable_sizes" {...register('enable_sizes')} />
                  </div>
                </div>
                {enableSizes ? (
                  <div className="yulo-size-chips mt-3">
                    {SIZE_OPTIONS.map((opt) => {
                      const active = selectedSizes.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`yulo-size-chip ${active ? 'is-active' : ''}`}
                          onClick={() => toggleSize(opt.value)}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
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
