import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import AOS from 'aos'
import 'aos/dist/aos.css'
import 'react-datepicker/dist/react-datepicker.css' // before index.css, which restyles it
import './index.css'
import App from './App.jsx'
import AuthProvider from './auth/AuthProvider.jsx'
import { dropIn } from './lib/toast.js'

AOS.init({ once: true, duration: 500 })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
    <ToastContainer position="top-right" transition={dropIn} autoClose={3000} newestOnTop hideProgressBar theme="light" />
  </StrictMode>,
)
