import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import useSWR from 'swr';

// base URL and Path of API endpoints:
const BaseUrl = 'http://localhost:3009';
const BaseApiPath = '/v1';
let BaseApiUrl = `${BaseUrl}${BaseApiPath}`;

// set BaseApiUrl (for example: at runtime)
export const setBaseApiUrl = (newBaseApiUrl: string): void => {
  BaseApiUrl = newBaseApiUrl;
};

export const ApiConfig = {
  get BaseUrl() {
    return BaseUrl;
  },
  get BaseApiPath() {
    return BaseApiPath;
  },
  get BaseApiUrl() {
    return BaseApiUrl;
  }
};

export const BaseAxiosConfig: AxiosRequestConfig = {
  baseURL: BaseApiUrl,
  headers: { 'Content-Type': 'application/json' }
};

export function getLoginData() {
  const loginDataStr = atob(localStorage.getItem('ld') || '') || '{}'; // base64 => string
  const loginData = JSON.parse(loginDataStr);
  return loginData;
}

const axiosApi = axios.create({ ...BaseAxiosConfig });

axiosApi.interceptors.request.use((config) => {
  const loginData = getLoginData();
  if (loginData?.data?.token?.accessToken) {
    config.headers.Authorization = `Bearer ${loginData?.data?.token?.accessToken}`;
  }
  return config;
});

const onError = function (error: AxiosError) {
  console.error('Request Failed:', error.config);
  if (error.response) {
    // Request was made but server responded with something
    // other than 2xx
    console.error('Status:', error.response.status);
    console.error('Data:', error.response.data);
    console.error('Headers:', error.response.headers);
  } else {
    // Something else happened while setting up the request
    // triggered the error
    console.error('Error Message:', error.message);
  }
  return Promise.resolve({ data: null, status: error?.response?.status, error }); // .reject(error.response || error.message);
};

interface ResponseInterface {
  status?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: AxiosError;
}

// custom fetch function for useSWR
export const swrFetcher = (url: string, options?: AxiosRequestConfig) =>
  axiosApi({ url, method: 'GET', ...options }).catch(onError);

// apiGet - uses axios GET - path can be a relative path (uses BaseApiUrl) or absolute url path (startsWith http...)
export const apiGet = (path: string, options?: AxiosRequestConfig): Promise<ResponseInterface> => {
  const url = path.startsWith('http') ? path : `${BaseApiUrl}${path}`;
  // TODO: sanitize data, track xhr errors, analytics... here
  return axiosApi({ url, method: 'GET', ...options }).catch(onError);
};

// apiPost - uses axios POST - path can be a relative path (uses BaseApiUrl) or absolute url path (startsWith http...)
export const apiPost = (path: string, options?: AxiosRequestConfig): Promise<ResponseInterface> => {
  const url = path.startsWith('http') ? path : `${BaseApiUrl}${path}`;
  // TODO: sanitize data, track xhr errors, analytics... here
  return axiosApi({ url, method: 'POST', ...options }).catch(onError);
};

// apiDelete - uses axios POST - path can be a relative path (uses BaseApiUrl) or absolute url path (startsWith http...)
export const apiDelete = (path: string, options?: AxiosRequestConfig): Promise<ResponseInterface> => {
  const url = path.startsWith('http') ? path : `${BaseApiUrl}${path}`;
  // TODO: sanitize data, track xhr errors, analytics... here
  return axiosApi({ url, method: 'DELETE', ...options }).catch(onError);
};

/**
 * useRequest hook for calling an API endpoint using useSWR.
 *
 * @param {string} path API endpoint path.
 * @returns {*} Returns { data, error }
 * @example
 * `const { data } = useRequest('/aidt-session/list');`
 */
export const useRequest = (path: string) => {
  if (!path) {
    throw new Error('Path is required');
  }
  const url = `${BaseApiUrl}${path}`;
  const { data, error } = useSWR(url, swrFetcher);
  return { data, error };
};
