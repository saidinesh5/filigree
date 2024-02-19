import { useEffect, useRef, useState } from 'react'
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
  Divider
} from '@nextui-org/react'
import './App.css'

import MotorController from './MotorController'
import MotorControllerView from './MotorControllerView'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { SequencerList } from './Sequencer'
import { ViewportList } from 'react-viewport-list'
import { Motor, MotorType } from './Motor'
import { MotorCommand, MotorCommands, serializeCommands } from './MotorCommand'
import { saveAs } from 'file-saver'
import { observer } from 'mobx-react-lite'
import { autorun } from 'mobx'

const App = () => {
  const motorControllers = useRef([
    new MotorController(0),
    new MotorController(1)
  ])
  const [motors, setMotors] = useState<Motor[]>([])

  const updateMotors = () => {
    let newMotors: Motor[] = []

    for (let motorController of motorControllers.current) {
      if (motorController.isConnected) {
        for (let i = 0; i < motorController.motorCount; i++) {
          newMotors.push(
            new Motor(motorController, i, MotorType.Extruder, newMotors.length)
          )
        }
      }
    }

    if (newMotors.length != motors.length) {
      setTimeout(() => setMotors(newMotors), 1000)
    }
  }

  autorun(updateMotors)

  navigator.serial?.addEventListener('connect', (event: Event) => {
    // this event occurs every time a new serial device
    // connects via USB:
    console.log(event.target, 'connected')
  })
  navigator.serial?.addEventListener('disconnect', (event: Event) => {
    // this event occurs every time a new serial device
    // disconnects via USB:
    // for (let m of motorControllers) {
    //   if (m.port == event.target) {
    //     console.log(event.target, "is no longer available");
    //   }
    // }
    console.log(event.target, 'disconnected')
  })
  const [commandSequence, setCommandSequence] = useState<MotorCommand[]>([
    [MotorCommands.MotorsInitialize, 0],
    [MotorCommands.MotorsInitialize, 1]
  ])
  const [isSequencePlaying, setIsSequencePlaying] = useState(false)
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0)

  const ref = useRef<HTMLDivElement | null>(null)

  const addCommandSequenceEntries = () => {
    let newCommands = [...commandSequence]
    for (let motor of motors) {
      if (motor.hasChanged) {
        newCommands.push(motor.getCommand())
        motor.save()
      }
    }
    if (newCommands.length > commandSequence.length) {
      setCommandSequence(newCommands)
      setCurrentSequenceIndex(newCommands.length - 1)
    }
  }

  const removeCommandSequenceEntry = (id: number) => {
    if (id >= commandSequence.length) return

    let newSequence = [...commandSequence]
    newSequence.splice(id, 1)
    setCommandSequence(newSequence)
    if (currentSequenceIndex == commandSequence.length - 1) {
      setCurrentSequenceIndex(currentSequenceIndex - 1)
    }
  }

  const sequencePlaybackLoop = async () => {
    if (isSequencePlaying) {
      let i = currentSequenceIndex
      for await (let cmd of commandSequence.slice(currentSequenceIndex)) {
        console.log('isSequenceplaying', isSequencePlaying)
        if (!isSequencePlaying) {
          break
        }
        const controllerId = cmd[1]
        try {
          await motorControllers.current[controllerId].sendRequest(cmd, 1000)
        } catch (err) {
          console.error(err)
        }
        setCurrentSequenceIndex(i)
        i++
      }

      setIsSequencePlaying(false)
    }
  }

  useEffect(() => {
    if (isSequencePlaying) sequencePlaybackLoop()
  }, [isSequencePlaying])

  const startPlayback = () => {
    console.log('start playback')
    setIsSequencePlaying(true)
  }

  const pausePlayback = () => {
    console.log('pause playback')
    setIsSequencePlaying(false)
  }

  const downloadCommandSequence = () => {
    saveAs(serializeCommands(commandSequence), 'filigree.txt')
  }

  const MotorControllerButton = observer(
    ({ controller }: { controller: MotorController }) => (
      <Button
        as={Link}
        color={controller.isConnected ? 'success' : 'danger'}
        variant="flat"
        onClick={(_) => {
          if (controller.isConnected) {
            controller.closePort()
          } else {
            controller.openPort()
          }
        }}
      >
        {`Controller ${controller.id + 1}: ${
          controller.isConnected ? 'Connected' : 'Disconnected'
        }`}
      </Button>
    )
  )

  const AddCommandsButton = observer(({ motors }: { motors: Motor[] }) => (
    <Button
      isDisabled={motors.find((motor: Motor) => motor.hasChanged) == undefined}
      isIconOnly
      onClick={addCommandSequenceEntries}
    >
      <FontAwesomeIcon icon="circle-plus" />
    </Button>
  ))

  return (
    <div className="">
      <Navbar isBordered isBlurred={false} position="static">
        <NavbarBrand>
          <FontAwesomeIcon icon="dharmachakra" />
          <p className="font-bold text-inherit">Silver Filigree Configurator</p>
        </NavbarBrand>
        <NavbarContent className="hidden sm:flex gap-4" justify="center">
          {motorControllers.current.map((controller, index) => (
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
                      ''
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
              <FontAwesomeIcon icon={isSequencePlaying ? 'pause' : 'play'} />
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
              motorControllers={motorControllers.current}
              commandSequence={commandSequence}
              removeCommandSequenceEntry={removeCommandSequenceEntry}
              currentSequenceIndex={currentSequenceIndex}
              onCurrentSequenceIndexChanged={(index) => {
                setCurrentSequenceIndex(index)
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
  )
}

export default App
