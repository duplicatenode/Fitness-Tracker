import axios from 'axios';

// Centralised API client. Base URL can be overridden with VITE_API_URL (see frontend/.env.example).
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    timeout: 15000
});

// Attach the JWT to every request
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => Promise.reject(error));

// If the token is rejected, tell the app so it can return to the login page
api.interceptors.response.use(
    response => response,
    error => {
        const url = error.config?.url || '';
        if (error.response?.status === 401 && !url.includes('/auth/login') && !url.includes('/auth/demo')) {
            window.dispatchEvent(new Event('fittrack:unauthorized'));
        }
        return Promise.reject(error);
    }
);

// Turns an axios error into a readable message for the UI
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
    if (err?.response?.data?.message) return err.response.data.message;
    if (err?.response?.data?.error) return err.response.data.error;
    if (err?.code === 'ECONNABORTED') return 'The server took too long to respond.';
    if (err?.message === 'Network Error') return 'Cannot reach the FitTrack server. Check that the backend is running on port 5000.';
    return err?.message || fallback;
}

export default api;
