import api, { extractData } from './api';

const staffLicenceService = {
  getFeatures: async () => extractData(await api.get('/admin/staff-licences/features')),
  list: async () => extractData(await api.get('/admin/staff-licences')),
  pending: async () => extractData(await api.get('/admin/staff-licences/pending')),
  start: async (payload) => extractData(await api.post('/admin/staff-licences/start', payload)),
  verifyDevOtp: async (id, otp) =>
    extractData(await api.post(`/admin/staff-licences/${id}/verify-dev-otp`, { otp })),
  assignFeatures: async (id, features) =>
    extractData(await api.post(`/admin/staff-licences/${id}/features`, { features })),
  approve: async (id) => extractData(await api.post(`/admin/staff-licences/${id}/approve`)),
  reject: async (id) => extractData(await api.post(`/admin/staff-licences/${id}/reject`)),
};

export const staffOnboardService = {
  show: async (token) => extractData(await api.get(`/staff-onboard/${token}`)),
  sendOtp: async (token, email) =>
    extractData(await api.post(`/staff-onboard/${token}/send-otp`, { email })),
  verifyOtp: async (token, email, otp) =>
    extractData(await api.post(`/staff-onboard/${token}/verify-otp`, { email, otp })),
  complete: async (token, payload) =>
    extractData(await api.post(`/staff-onboard/${token}/complete`, payload)),
};

export default staffLicenceService;
