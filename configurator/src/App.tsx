import { useState } from 'react'
import {Navbar, NavbarBrand, NavbarContent, NavbarItem, Link, Button} from "@nextui-org/react"
import './App.css'

import MotorController from './MotorController'

function App() {
  const [count, setCount] = useState(0)
  const [motors] = useState([0, 1, 2, 3, 4, 5, 6, 7])

  return (
    <>
      <Navbar isBordered isBlurred={false}>
        <NavbarBrand>
          <p className="font-bold text-inherit">Silver Filigree</p>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem>
            <Button as={Link} color="primary" href="#" variant="flat">
              Master: Disconnected
            </Button>
          </NavbarItem>
          <NavbarItem>
            <Button as={Link} color="primary" href="#" variant="flat">
              Slave: Disconnected
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <div className="flex">
          <MotorController />
      </div>
    </>
  );
}

export default App
