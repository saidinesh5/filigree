import { useState } from "react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Textarea,
} from "@nextui-org/react";
import "./App.css";

import MotorController from "./MotorController";

enum MotorCommands {
  MotorsCount = 0,       // () -> uint32_t uint8 should be enough.
  MotorAngle = 1,        // (motor_id: uint8_t) -> float
  MotorStatus = 2,       // (motor_id: uint8_t) -> uint32_t // As per MotorDriver.h
  MotorAlerts = 3,       // (motor_id: uint8_t) -> uint32_t // As per MotorDriver.h
  MotorAbsoluteMove = 4, // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
  MotorRelativeMove = 5, // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
  MotorCutMove = 6,      // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
  MotorReset = 7,        // (motor_id: uint8_t)  -> uint32_t // Motor_alerts
}

function App() {
  const [isMasterConnected, setIsMasterConnected] = useState(true);
  const [isSlaveConnected, setIsSlaveConnected] = useState(false);
  const [motorAngles, setMotorAngles] = useState([
    100, 200, 300, 200, 300, 100, 150, 255,
  ]);
  const [commandSequence, setCommandSequence] = useState([
    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
    [4, 5],
    [4, 6],
    [4, 7],
  ]);

  function setMotorAngle(motorId: number, angle: number) {
    // TODO: Actually send the motor move message
    setMotorAngles(motorAngles.map((x, i) => (i == motorId ? angle : x)));
  }

  function resetMotor(motorId: number) {
    // TODO: Actually send the motor reset message
    setMotorAngle(motorId, 0);
  }

  function describe(sequence: number[][]): string {
    return sequence
      .map((bytes: number[], index: number): string => {
        if (bytes[0] == MotorCommands.MotorReset) {
          return `Step ${index + 1}: Reset Motor ${bytes[1]}`;
        }
        return "???";
      })
      .join("\n");
  }

  return (
    <>
      <Navbar isBordered isBlurred={false}>
        <NavbarBrand>
          <p className="font-bold text-inherit">Silver Filigree Configurator</p>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          <NavbarItem>
            <Button
              as={Link}
              color={isMasterConnected ? "success" : "danger"}
              href="#"
              variant="flat"
              onClick={(_) => {
                setIsMasterConnected(!isMasterConnected);
              }}
            >
              Master: {isMasterConnected ? "Connected" : "Disconnected"}
            </Button>
          </NavbarItem>
          <NavbarItem>
            <Button
              as={Link}
              color={isSlaveConnected ? "success" : "danger"}
              variant="flat"
              onClick={(_) => {
                setIsSlaveConnected(!isSlaveConnected);
              }}
            >
              Slave: {isSlaveConnected ? "Connected" : "Disconnected"}
            </Button>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <div className="columns-2">
        <Card className="flex flex-col gap-2 w-full h-full max-w-md items-start justify-center">
          <CardHeader className="w-full h-full max-h-md items-start">
            <h4 className="font-semibold leading-none text-default-600 align-middle">
              Motor Configuration
            </h4>
          </CardHeader>
          <Divider className="my-3" />
          <CardBody>
            {motorAngles.map((angle, index) => (
              <>
                <MotorController
                  key={`motor${index}`}
                  motorId={index}
                  angle={angle}
                  onAngleChange={setMotorAngle}
                  onResetMotor={resetMotor}
                />
                <Divider className="my-3" />
              </>
            ))}
          </CardBody>
        </Card>

        <Card className="flex flex-col gap-2 w-full h-full max-w-md items-start justify-center">
          <CardHeader className="w-full h-full max-h-md items-start">
            <h4 className="font-semibold leading-none text-default-600 align-middle">
              Sequencer
            </h4>
          </CardHeader>
          <Divider className="my-3" />
          <CardBody>
            <Textarea
              isReadOnly
              variant="bordered"
              defaultValue={describe(commandSequence)}
            />
            <Divider className="my-3" />
            <div className="flex flex-row gap-2 w-full h-full max-w-md items-start justify-center">
              <Button className="justify-center">Cut</Button>
              <Button className="justify-center">Delay</Button>
              <Button className="justify-center">Extrude</Button>
              <Button className="justify-center">Save</Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

export default App;
