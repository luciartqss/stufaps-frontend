import Axios from 'axios'

const axios = Axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
  withCredentials: true,
  withXSRFToken: true,
})

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

axios.interceptors.response.use(
  function (response) {
    return response
  },
  function (error) {
    let message = 'Unknown error'
    if (error?.response?.data?.message) {
      message = error.response.data.message
    } else if (error?.request?.message) {
      message = error.request.message
    } else if (error?.message) {
      message = error.message
    }
    return Promise.reject(message)
  },
)

export default axios
