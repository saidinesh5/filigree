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
import { SequencerList } from "./Sequencer";

function App() {
  const [isController1Connected, setIsController1Connected] = useState(true);
  const [isController2Connected, setIsController2Connected] = useState(false);
  const [motorAngles, setMotorAngles] = useState([
    100, 200, 300, 200, 300, 100, 150, 255,
  ]);
  const [commandSequence, setCommandSequence] = useState([
    { id: 0, command: [7, 0] },
    { id: 1, command: [7, 1] },
    { id: 2, command: [7, 2] },
    { id: 3, command: [7, 3] },
    { id: 4, command: [7, 4] },
    { id: 5, command: [7, 5] },
    { id: 6, command: [7, 6] },
    { id: 7, command: [7, 7] },

    { id: 10, command: [7, 0] },
    { id: 11, command: [7, 1] },
    { id: 12, command: [7, 2] },
    { id: 13, command: [7, 3] },
    { id: 14, command: [7, 4] },
    { id: 15, command: [7, 5] },
    { id: 16, command: [7, 6] },
    { id: 17, command: [7, 7] },
  ]);
  const [isSequencePlaying, setIsSequencePlaying] = useState(true);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);

  function setMotorAngle(motorId: number, angle: number) {
    // TODO: Actually send the motor move message
    setMotorAngles(motorAngles.map((x, i) => (i == motorId ? angle : x)));
  }

  function resetMotor(motorId: number) {
    // TODO: Actually send the motor reset message
    setMotorAngle(motorId, 0);
  }

  return (
    <div className="">
      <Navbar isBordered isBlurred={false} position="static">
        <NavbarBrand>
          <FontAwesomeIcon icon="dharmachakra" />
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

      <div className="applicationgrid">
        <Card className="leftpane max-w-xxl">
          <CardHeader className="flex">
            <h4 className="grow font-semibold">Motor Configuration</h4>
            <Button className="object-right">Reset All</Button>
          </CardHeader>
          <CardBody>
            {motorAngles.map((angle, index) => (
              <div key={index}>
                <MotorController
                  motorId={index}
                  angle={angle}
                  onAngleChange={setMotorAngle}
                  onResetMotor={resetMotor}
                />
                {index != motorAngles.length - 1 ? (
                  <Divider className="my-2" />
                ) : (
                  ""
                )}
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="rightpane max-w-xxl h-full">
          <CardHeader className="flex gap-1">
            <h4 className="grow font-semibold">Sequencer</h4>
            <Button
              isIconOnly
              className="object-right"
              onClick={() => setIsSequencePlaying(!isSequencePlaying)}
            >
              <FontAwesomeIcon icon={isSequencePlaying ? "play" : "pause"} />
            </Button>
            <Button
              isIconOnly
              className="object-right"
              onClick={() => setIsSequencePlaying(!isSequencePlaying)}
            >
              <FontAwesomeIcon icon="download" />
            </Button>
          </CardHeader>
          <CardBody>
            <SequencerList
              commandSequence={commandSequence}
              currentSequenceIndex={currentSequenceIndex}
              onCurrentSequenceIndexChanged={(index) => {
                console.log(index);
                setCurrentSequenceIndex(index);
              }}
            />
            <Divider className="my-3" />
            {/* TODO: Center the icons */}
            <div className="flex gap-unit-4xl justify-center">
              <Button isIconOnly>
                <FontAwesomeIcon icon="tape" />
              </Button>
              <Button isIconOnly>
                <FontAwesomeIcon icon="scissors" />
              </Button>
              {/* <Button isIconOnly>
                <FontAwesomeIcon icon="clock" />
              </Button> */}
              <Button isIconOnly>
                <FontAwesomeIcon icon="circle-plus" />
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default App;
