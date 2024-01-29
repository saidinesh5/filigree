import { useRef, useState } from "react";
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
} from "@nextui-org/react";
import "./App.css";

import MotorController from "./MotorControllerView";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SequencerList } from "./Sequencer";
import { ViewportList } from "react-viewport-list";
import { Motor, MotorType } from "./Motor";
import { MotorCommand } from "./MotorCommand";

function App() {
  const [isController1Connected, setIsController1Connected] = useState(true);
  const [isController2Connected, setIsController2Connected] = useState(false);
  const [motors, setMotors] = useState<Motor[]>([
    new Motor(0, MotorType.Extruder, null),
    new Motor(1, MotorType.Default, null),
  ]);
  const [commandSequence, setCommandSequence] = useState<MotorCommand[]>([
    { sequenceId: 0, command: [7, 0] },
    { sequenceId: 1, command: [7, 1] },
    { sequenceId: 2, command: [7, 2] },
    { sequenceId: 3, command: [7, 3] },
    { sequenceId: 4, command: [7, 4] },
    { sequenceId: 5, command: [7, 5] },
    { sequenceId: 6, command: [7, 6] },
    { sequenceId: 7, command: [7, 7] },
  ]);
  const [isSequencePlaying, setIsSequencePlaying] = useState(true);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);

  const ref = useRef<HTMLDivElement | null>(null);

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
            <div className="list" ref={ref}>
              <ViewportList viewportRef={ref} items={motors}>
                {(motor, index) => (
                  <div key={index}>
                    <MotorController motor={motor} />
                    {index != motors.length - 1 ? (
                      <Divider className="my-2" />
                    ) : (
                      ""
                    )}
                  </div>
                )}
              </ViewportList>
            </div>
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
              setCommandSequence={(commands: MotorCommand[]) =>
                setCommandSequence(commands)
              }
              currentSequenceIndex={currentSequenceIndex}
              onCurrentSequenceIndexChanged={(index) => {
                console.log(index);
                setCurrentSequenceIndex(index);
              }}
            />
            <Divider className="my-3" />
            <div className="flex gap-unit-4xl justify-center">
              {/*
              <Button isIconOnly>
                <FontAwesomeIcon icon="tape" />
              </Button>
               <Button isIconOnly>
                <FontAwesomeIcon icon="clock" />
              </Button>
              */}
              {/* Add cut command to the sequencer*/}
              <Button isIconOnly>
                <FontAwesomeIcon icon="scissors" />
              </Button>
              {/* Add move command to the sequencer*/}
              <Button
                isIconOnly
                onClick={() => {
                  let newCommands = [...commandSequence];
                  for (let motor of motors) {
                    if (motor.hasChanged) {
                      newCommands.push({
                        sequenceId: newCommands.length,
                        command: motor.getCommand(),
                      });
                      motor.save();
                    }
                  }
                  if (newCommands.length > commandSequence.length) {
                    setCommandSequence(newCommands);
                    setCurrentSequenceIndex(newCommands.length - 1);
                  }
                }}
              >
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
