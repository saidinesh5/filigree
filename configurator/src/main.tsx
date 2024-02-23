import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faArrowRotateLeft,
  faCircleMinus,
  faCirclePlus,
  faClock,
  faDharmachakra,
  faFloppyDisk,
  faFolderOpen,
  faMinus,
  faPause,
  faPlay,
  faPlus,
  faScissors,
  faStop,
  faTape
} from '@fortawesome/free-solid-svg-icons'

library.add(
  faArrowRotateLeft,
  faCircleMinus,
  faCirclePlus,
  faClock,
  faDharmachakra,
  faFloppyDisk,
  faFolderOpen,
  faMinus,
  faPause,
  faPlay,
  faPlus,
  faScissors,
  faStop,
  faTape
)

import { NextUIProvider } from '@nextui-org/react'
import Konami from 'react-konami-code'
import { toast } from 'react-toastify'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NextUIProvider>
      <Konami action={() => toast.info(':D was here')}></Konami>
      <App />
    </NextUIProvider>
  </React.StrictMode>
)
