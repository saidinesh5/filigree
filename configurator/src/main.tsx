import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faArrowRotateLeft,
  faCirclePlus,
  faClock,
  faMinus,
  faPlay,
  faPlus,
  faScissors,
  faStop,
  faTape
} from "@fortawesome/free-solid-svg-icons";

library.add(faArrowRotateLeft,
  faCirclePlus,
  faClock,
  faMinus,
  faPlay,
  faPlus,
  faScissors,
  faStop,
  faTape);

import {NextUIProvider} from '@nextui-org/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NextUIProvider>
      <main className="dark text-foreground">
        <div className='h-screen'>
          <App />
        </div>
      </main>
    </NextUIProvider>
  </React.StrictMode>,
)
