import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Link,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@nextui-org/react";
import { useEffect, useRef, useState } from "react";
import "./App.css";

import MotorController from "./MotorController";
import MotorControllerView from "./MotorControllerView";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { saveAs } from "file-saver";
import { autorun } from "mobx";
import { observer } from "mobx-react-lite";
import { ViewportList } from "react-viewport-list";
import { debounce } from "underscore";
import { Motor, MotorType } from "./Motor";
import { MotorCommand, MotorCommands } from "./MotorCommand";
import { SequencerList } from "./Sequencer";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const App = () => {
  const motorControllers = [new MotorController(0), new MotorController(1)];
  const [motors, setMotors] = useState<Motor[]>([]);

  const updateMotors = () => {
    let newMotors: Motor[] = [];

    for (let motorController of motorControllers) {
      if (motorController.isConnected) {
        for (let i = 0; i < motorController.motorCount; i++) {
          newMotors.push(
            new Motor(motorController, i, MotorType.Extruder, newMotors.length),
          );
        }
      }
    }

    console.log("updateMotors", newMotors);

    const debouncedUpdateMotors = debounce(() => {
      let newMotors: Motor[] = [];
    }, 10);
    debouncedUpdateMotors()
    // setMotors(newMotors)
    // Then call  where needed

    // Then use  you need to call it
  };

  autorun(updateMotors);

  navigator.serial?.addEventListener("connect", (event: Event) => {
    // this event occurs every time a new serial device
    // connects via USB:
    console.log(event.target, "connected");
  });
  navigator.serial?.addEventListener("disconnect", (event: Event) => {
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












  const startPlayback = () => {
    console.log("start playback");
    setIsSequencePlaying(true);
  };



  const pausePlayback = () => {
    console.log("pause playback");
    setIsSequencePlaying(false);
  };



  // Correctly typed useRef for AbortController
  const abortCtrl = useRef<AbortController | null>(null);

  const sequencePlaybackLoop = async (abortSignal: AbortSignal) => {
    let i = currentSequenceIndex;
    while (i < commandSequence.length && !abortSignal.aborted) {
      const cmd = commandSequence[i];
      if (abortSignal.aborted) {
        console.log("Playback was aborted.");
        break;
      }
      try {
        await motorControllers[cmd[1]].sendRequest(cmd, 1000, abortSignal);
        await sleep(1000); // Wait for 1 second before moving to the next command
      } catch (err) {
        console.error(err);
      }
      if (!abortSignal.aborted) {
        setCurrentSequenceIndex(i + 1); // Move to the next command
        i++;
      }
    }
    if (!abortSignal.aborted) {
      setIsSequencePlaying(false); // Automatically stop playback when sequence ends
    }
  };


  const togglePlayback = () => {
    if (isSequencePlaying) {
      // Abort the current sequence
      abortCtrl.current?.abort();
    } else {
      // Optionally reset the sequence index to 0 if you want to start from the beginning
      // setCurrentSequenceIndex(0);
      abortCtrl.current = new AbortController();
      sequencePlaybackLoop(abortCtrl.current.signal).catch(console.error);
    }
    setIsSequencePlaying(!isSequencePlaying);
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

    // Get the current date and time
    const now = new Date();
    // Format date and time as 'YYYY-MM-DD_HH-MM-SS' (You can adjust the format as needed)
    const datetime = now.toISOString().replace(/:/g, '-').replace(/\..+/, '').replace('T', '_');

    // Append the date and time to the filename
    saveAs(blob, `filigree_${datetime}.txt`);
  };

  const MotorControllerButton = observer(
    ({ controller }: { controller: MotorController }) => (
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
        {`Controller ${controller.id + 1}: ${controller.isConnected ? "Connected" : "Disconnected"
          }`}
      </Button>
    ),
  );

  const AddCommandsButton = observer(({ motors }: { motors: Motor[] }) => (
    <Button
      isDisabled={motors.find((motor: Motor) => motor.hasChanged) == undefined}
      isIconOnly
      onClick={addCommandSequenceEntries}
    >
      <FontAwesomeIcon icon="circle-plus" />
    </Button>
  ));

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
              <MotorControllerButton
                controller={controller}
              ></MotorControllerButton>
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
              onClick={togglePlayback}
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
              <AddCommandsButton motors={motors}></AddCommandsButton>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default App;
