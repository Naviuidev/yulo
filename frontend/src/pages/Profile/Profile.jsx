import { useEffect, useState } from 'react';
import SEO from '../../components/common/SEO';
import Breadcrumb from '../../components/common/Breadcrumb';
import AddressForm from '../../components/forms/AddressForm';
import Button from '../../components/ui/Button';
import Loader from '../../components/common/Loader';
import useAuth from '../../hooks/useAuth';
import { profileService, addressService } from '../../services/contentService';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAddress, setEditingAddress] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    Promise.all([
      profileService.getProfile().catch(() => null),
      addressService.getAddresses().catch(() => ({ data: { data: [] } })),
    ]).then(([profileRes, addrRes]) => {
      if (profileRes?.data?.data) {
        reset(profileRes.data.data);
      } else if (user) {
        reset({ name: user.name, email: user.email, phone: user.phone });
      }
      setAddresses(addrRes?.data?.data ?? []);
    }).finally(() => setLoading(false));
  }, [user, reset]);

  const onUpdateProfile = async (data) => {
    try {
      await profileService.updateProfile(data);
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Update failed');
    }
  };

  const onSaveAddress = async (data) => {
    try {
      if (editingAddress) {
        await addressService.updateAddress(editingAddress, data);
      } else {
        await addressService.createAddress(data);
      }
      const res = await addressService.getAddresses();
      setAddresses(res.data?.data ?? []);
      setEditingAddress(null);
      toast.success('Address saved');
    } catch (err) {
      toast.error(err.response?.data?.message ?? 'Could not save address');
    }
  };

  const deleteAddress = async (id) => {
    try {
      await addressService.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.info('Address deleted');
    } catch {
      toast.error('Could not delete address');
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <>
      <SEO title="My Profile" />
      <div className="page-header">
        <div className="container">
          <Breadcrumb items={[{ label: 'Profile' }]} />
          <h1>My Profile</h1>
        </div>
      </div>

      <div className="container py-5">
        <div className="row g-5">
          <div className="col-lg-6">
            <h5 className="text-uppercase small fw-semibold mb-4">Personal Information</h5>
            <form onSubmit={handleSubmit(onUpdateProfile)} className="yulo-form">
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input className="form-control" {...register('name')} />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" {...register('email')} disabled />
              </div>
              <div className="mb-4">
                <label className="form-label">Phone</label>
                <input className="form-control" {...register('phone')} />
              </div>
              <Button type="submit">Save Changes</Button>
            </form>
          </div>

          <div className="col-lg-6">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="text-uppercase small fw-semibold mb-0">Saved Addresses</h5>
              <Button variant="outline" onClick={() => setEditingAddress(editingAddress ? null : 'new')}>
                {editingAddress ? 'Cancel' : '+ Add'}
              </Button>
            </div>
            {editingAddress && (
              <div className="mb-4">
                <AddressForm
                  onSubmit={onSaveAddress}
                  defaultValues={editingAddress !== 'new' ? addresses.find((a) => a.id === editingAddress) : {}}
                />
              </div>
            )}
            {addresses.map((addr) => (
              <div key={addr.id} className="border p-3 mb-3">
                <strong>{addr.full_name}</strong>
                <p className="small text-muted mb-2">{addr.address_line1}, {addr.city}, {addr.state} {addr.pincode}</p>
                <div className="d-flex gap-2">
                  <button className="btn btn-link btn-sm p-0" onClick={() => setEditingAddress(addr.id)}>Edit</button>
                  <button className="btn btn-link btn-sm p-0 text-danger" onClick={() => deleteAddress(addr.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
