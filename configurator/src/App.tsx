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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

enum MotorCommands {
  MotorsCount = 0, // () -> uint32_t uint8 should be enough.
  MotorAngle = 1, // (motor_id: uint8_t) -> float
  MotorStatus = 2, // (motor_id: uint8_t) -> uint32_t // As per MotorDriver.h
  MotorAlerts = 3, // (motor_id: uint8_t) -> uint32_t // As per MotorDriver.h
  MotorAbsoluteMove = 4, // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
  MotorRelativeMove = 5, // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
  MotorCutMove = 6, // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
  MotorReset = 7, // (motor_id: uint8_t)  -> uint32_t // Motor_alerts
}

function App() {
  const [isController1Connected, setIsController1Connected] = useState(true);
  const [isController2Connected, setIsController2Connected] = useState(false);
  const [motorAngles, setMotorAngles] = useState([
    100, 200, 300, 200, 300, 100, 150, 255,
  ]);
  const [commandSequence, setCommandSequence] = useState([
    [7, 0],
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
    [7, 6],
    [7, 7],
  ]);
  const [isSequencePlaying, setIsSequencePlaying] = useState(true)

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
              color={isController1Connected ? "success" : "danger"}
              href="#"
              variant="flat"
              onClick={(_) => {
                setIsController1Connected(!isController1Connected);
              }}
            >
              Controller 1:{" "}
              {isController1Connected ? "Connected" : "Disconnected"}
            </Button>
          </NavbarItem>
          {isController1Connected && (
            <NavbarItem>
              <Button
                as={Link}
                color={isController2Connected ? "success" : "danger"}
                variant="flat"
                onClick={(_) => {
                  setIsController2Connected(!isController2Connected);
                }}
              >
                Controller 2:{" "}
                {isController2Connected ? "Connected" : "Disconnected"}
              </Button>
            </NavbarItem>
          )}
        </NavbarContent>
      </Navbar>

      <div className="flex space-x-4 items-stretch">
        <Divider className="my-3" orientation="vertical" />
        <Card className="space-x-2 w-full h-full grow items-start">
          <CardHeader className="flex">
            <h4 className="grow font-semibold">Motor Configuration</h4>
            <Button className="object-right">Reset All</Button>
          </CardHeader>
          <CardBody>
            {motorAngles.map((angle, index) => (
              <>
                <MotorController
                  key={index}
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

        <Card className="w-full grow items-start item-center">
          <CardHeader className="flex">
            <h4 className="grow font-semibold">Sequencer</h4>
            <Button isIconOnly className="object-right" onClick={() => setIsSequencePlaying(!isSequencePlaying) }>
              <FontAwesomeIcon icon={isSequencePlaying ? "play" : "stop"} />
            </Button>
          </CardHeader>
          <CardBody className="flex flex-col w-full h-full">
            {/* TODO: Make the TextArea grow to the full available space */}
            <Textarea
              className="grow"
              isReadOnly
              variant="bordered"
              defaultValue={describe(commandSequence)}
            />
            <Divider className="my-3" />
            {/* TODO: Center the icons */}
            <div className="flex flex-row gap-2 max-w-md items-center">
              <Button isIconOnly>
                <FontAwesomeIcon icon="scissors" />
              </Button>
              <Button isIconOnly>
                <FontAwesomeIcon icon="clock" />
              </Button>
              <Button isIconOnly>
                <FontAwesomeIcon icon="tape" />
              </Button>
              <Button isIconOnly>
                <FontAwesomeIcon icon="circle-plus" />
              </Button>
            </div>
          </CardBody>
        </Card>
        <Divider className="my-3" orientation="vertical" />
      </div>
    </>
  );
}

export default App;
