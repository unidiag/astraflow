import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { store } from 'store'
import { Provider } from 'react-redux'
import ThemeModeProvider from './ThemeProvider'
import './i18n';
import { ToastProvider } from 'utils/useToast'
import './App.css'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <Provider store={store}>
    <ThemeModeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
    </ThemeModeProvider>
  </Provider>
)
