import axiosClient from './axiosClient';

const IDENTITY_PREFIX = '/identity';

const authApi = {
  register: (data) => {
    return axiosClient.post(`${IDENTITY_PREFIX}/api/auth/register`, data);
  },

  login: (email, password) => {
        return axiosClient.post(`${IDENTITY_PREFIX}/api/auth/login`, {
        email: email, 
        password: password
    });
  },

  getMe: () => {
    return axiosClient.get(`${IDENTITY_PREFIX}/api/users/me`);
  },

  logout: () => {
    return axiosClient.post(`${IDENTITY_PREFIX}/api/auth/logout`);
  },
};

export default authApi;
