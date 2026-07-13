// config.js - Backend API URL
const API_BASE = 'http://localhost:5000'; // For local development

// For production, use:
// const API_BASE = 'https://your-backend.onrender.com';

//  Helper function for authenticated requests
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

//  Helper for making authenticated API calls
const authFetch = async (url, options = {}) => {
  const headers = getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });
  return response;
};