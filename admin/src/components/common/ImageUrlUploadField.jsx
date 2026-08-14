import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { resolveMediaUrl } from '../../utils/media';

/**
 * Image URL input + rounded-pill Upload button.
 * Works with react-hook-form via register/setValue/watch value.
 */
export default function ImageUrlUploadField({
  label = 'Image URL',
  name,
  register,
  setValue,
  value = '',
  required = false,
  helpText = '',
  uploadFn,
  preview = 'image', // 'image' | 'logo' | 'none'
  overlayLabel,
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!uploadFn) {
      toast.error('Upload is not available');
      return;
    }
    setUploading(true);
    try {
      const result = await uploadFn(file);
      const path = result?.path || result?.url || result;
      if (!path) throw new Error('No path returned');
      setValue(name, path, { shouldDirty: true, shouldValidate: true });
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="mb-3">
      <label className="form-label">{label}{required ? ' *' : ''}</label>
      <div className="yulo-image-url-field">
        <input
          className="form-control"
          placeholder="https://… or /uploads/…"
          {...register(name, required ? { required: true } : {})}
        />
        <button
          type="button"
          className="btn btn-outline-dark btn-sm rounded-pill yulo-upload-pill"
          disabled={uploading || !uploadFn}
          onClick={() => fileRef.current?.click()}
        >
          <i className={`bi ${uploading ? 'bi-arrow-repeat' : 'bi-upload'} me-1`} />
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="d-none"
          onChange={handleUpload}
        />
      </div>
      {helpText ? <div className="form-text">{helpText}</div> : null}

      {preview !== 'none' && value ? (
        preview === 'logo' ? (
          <div className="mt-2">
            <img
              src={resolveMediaUrl(value)}
              alt="Logo preview"
              style={{ maxHeight: 48, maxWidth: 140, objectFit: 'contain' }}
            />
          </div>
        ) : typeof overlayLabel === 'string' ? (
          <div className="featured-admin-form-thumb mt-2">
            <img src={resolveMediaUrl(value)} alt="" />
            <div className="featured-admin-form-thumb__label">{overlayLabel || 'Text on image'}</div>
          </div>
        ) : (
          <img
            src={resolveMediaUrl(value)}
            alt="Preview"
            className="mt-2 rounded border"
            style={{ width: '100%', maxHeight: 140, objectFit: 'cover' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )
      ) : null}
    </div>
  );
}
