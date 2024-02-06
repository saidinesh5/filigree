import { useEffect, useRef, useState } from "react";
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

import MotorController from "./MotorController";
import MotorControllerView from "./MotorControllerView";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SequencerList } from "./Sequencer";
import { ViewportList } from "react-viewport-list";
import { Motor, MotorType } from "./Motor";
import { MotorCommand, MotorCommands } from "./MotorCommand";
import { saveAs } from "file-saver";
import { observer } from "mobx-react-lite";
import { computed } from "mobx";

const App = observer(() => {
  const motorControllers = [new MotorController(0), new MotorController(1)];
  const [motors, setMotors] = useState<Motor[]>([
    new Motor(motorControllers[0], 0, MotorType.Extruder, 1),
    new Motor(motorControllers[0], 1, MotorType.Default, 2),
    new Motor(motorControllers[0], 2, MotorType.Default, 3),
    new Motor(motorControllers[0], 3, MotorType.Default, 4),
    new Motor(motorControllers[1], 0, MotorType.Default, 5),
    new Motor(motorControllers[1], 1, MotorType.Default, 6),
    new Motor(motorControllers[1], 2, MotorType.Default, 7),
    new Motor(motorControllers[1], 3, MotorType.Default, 8),
  ]);

  navigator.serial?.addEventListener("connect", (event: Event) => {
    // this event occurs every time a new serial device
    // connects via USB:
    console.log(event.target, "connected");
  });
  navigator.serial.addEventListener("disconnect", (event: Event) => {
    // this event occurs every time a new serial device
    // disconnects via USB:
    // for (let m of motorControllers) {
    //   if (m.port == event.target) {
    //     console.log(event.target, "is no longer available");
    //   }
    // }
    console.log(event.target, "disconnected");
  });
  const [commandSequence, setCommandSequence] = useState<MotorCommand[]>([
    [MotorCommands.MotorsInitialize, 0],
    [MotorCommands.MotorsInitialize, 1],
    [MotorCommands.MotorAbsoluteMove, 0, 0, 20],
    [MotorCommands.MotorAbsoluteMove, 0, 1, 20],
    [MotorCommands.MotorAbsoluteMove, 0, 2, 20],
    [MotorCommands.MotorAbsoluteMove, 0, 3, 20],
  ]);
  const [isSequencePlaying, setIsSequencePlaying] = useState(false);
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);

  const ref = useRef<HTMLDivElement | null>(null);

  const areMotorsUnchanged = computed(() => {
    return motors.find((motor: Motor) => motor.hasChanged) == undefined;
  });

  const addCommandSequenceEntries = () => {
    let newCommands = [...commandSequence];
    for (let motor of motors) {
      if (motor.hasChanged) {
        newCommands.push(motor.getCommand());
        motor.save();
      }
    }
    if (newCommands.length > commandSequence.length) {
      setCommandSequence(newCommands);
      setCurrentSequenceIndex(newCommands.length - 1);
    }
  };

  const removeCommandSequenceEntry = (id: number) => {
    if (id >= commandSequence.length) return;

    let newSequence = [...commandSequence];
    newSequence.splice(id, 1);
    setCommandSequence(newSequence);
    if (currentSequenceIndex == commandSequence.length - 1) {
      setCurrentSequenceIndex(currentSequenceIndex - 1);
    }
  };

  const startPlayback = async () => {
    console.log("start playback");
    setIsSequencePlaying(true);
    startPlaybackLoop();
  };

  const pausePlayback = () => {
    console.log("pause playback");
    setIsSequencePlaying(false);
  };

  const startPlaybackLoop = async () => {
    console.log(commandSequence.slice(currentSequenceIndex), isSequencePlaying);
    for await (const command of commandSequence.slice(currentSequenceIndex)) {
      if (isSequencePlaying) {
        await new Promise((r) => setTimeout(r, 500));
        setCurrentSequenceIndex(
          (currentSequenceIndex + 1) % commandSequence.length,
        );
        console.log(command);
      }
    }
  };

  const downloadCommandSequence = () => {
    let blob = new Blob(
      [
        [
          "#filigree-version: 1",
          `#command-count: ${commandSequence.length}`,
          ...commandSequence.map((command, index) =>
            JSON.stringify({ method: command.join(","), id: index }),
          ),
        ].join("\n"),
      ],
      { type: "text/plain;charset=utf-8" },
    );

    saveAs(blob, "filigree.txt");
  };

  return (
    <div className="">
      <Navbar isBordered isBlurred={false} position="static">
        <NavbarBrand>
          <FontAwesomeIcon icon="dharmachakra" />
          <p className="font-bold text-inherit">Silver Filigree Configurator</p>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          {motorControllers.map((controller, index) => (
            <NavbarItem key={index}>
              <Button
                as={Link}
                color={controller.isConnected ? "success" : "danger"}
                variant="flat"
                onClick={(_) => {
                  if (controller.isConnected) {
                    controller.closePort();
                  } else {
                    controller.openPort();
                  }
                }}
              >
                {`Controller ${controller.id + 1}: ${controller.isConnected ? "Connected" : "Disconnected"}`}
              </Button>
            </NavbarItem>
          ))}
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
                    <MotorControllerView motor={motor} />
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
              onClick={isSequencePlaying ? pausePlayback : startPlayback}
            >
              <FontAwesomeIcon icon={isSequencePlaying ? "pause" : "play"} />
            </Button>
            <Button
              isIconOnly
              className="object-right"
              onClick={downloadCommandSequence}
            >
              <FontAwesomeIcon icon="download" />
            </Button>
          </CardHeader>
          <CardBody>
            <SequencerList
              motorControllers={motorControllers}
              commandSequence={commandSequence}
              removeCommandSequenceEntry={removeCommandSequenceEntry}
              currentSequenceIndex={currentSequenceIndex}
              onCurrentSequenceIndexChanged={(index) => {
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
                isDisabled={areMotorsUnchanged.get()}
                isIconOnly
                onClick={addCommandSequenceEntries}
              >
                <FontAwesomeIcon icon="circle-plus" />
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
});

export default App;
