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
import {
  MessageParam,
  MotorCommand,
  MotorCommands,
  serializeCommands
} from './MotorCommand'
import { saveAs } from 'file-saver'
import { observer } from 'mobx-react-lite'
import { autorun } from 'mobx'

const App = () => {
  const motorControllers = useRef([
    new MotorController(0),
    new MotorController(1)
  ])
  const [motors, setMotors] = useState<Motor[]>([])

  const updateMotors = async () => {
    let newMotors: Motor[] = []

    for (let motorController of motorControllers.current) {
      if (motorController.isConnected) {
        for (let i = 0; i < motorController.motorCount; i++) {
          let motor = new Motor(
            motorController,
            i,
            MotorType.Default,
            newMotors.length
          )
          try {
            await motor.fetchMotorType()
          } catch (err) {
            console.error(err)
          }
          newMotors.push(motor)
        }
      }
    }

    if (newMotors.length != motors.length) {
      setTimeout(() => setMotors(newMotors), 10)
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
    [MotorController.nextRequestId(), MotorCommands.MotorsInitialize, 0],
    [MotorController.nextRequestId(), MotorCommands.MotorsInitialize, 1]
  ])
  const [isSequencePlaying, setIsSequencePlaying] = useState(false)
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0)
  const isSequencePlayingRef = useRef(false)

  const motorListRef = useRef<HTMLDivElement | null>(null)

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
    if (isSequencePlayingRef.current) {
      let i = currentSequenceIndex
      for await (let cmd of commandSequence.slice(currentSequenceIndex)) {
        if (!isSequencePlayingRef.current) {
          break
        }
        const controllerId = cmd[MessageParam.PARAM_CONTROLLER_ID]
        try {
          await motorControllers.current[controllerId].sendRequest(cmd)
        } catch (err) {
          console.error(err)
        }
        setCurrentSequenceIndex(i)
        i++
      }

      isSequencePlayingRef.current = false
      setIsSequencePlaying(false)
    }
  }

  useEffect(() => {
    if (isSequencePlaying && !isSequencePlayingRef.current) {
      isSequencePlayingRef.current = true
      sequencePlaybackLoop()
    }
  }, [isSequencePlaying])

  const startPlayback = () => {
    console.log('start playback')
    setIsSequencePlaying(true)
  }

  const pausePlayback = () => {
    console.log('pause playback')
    isSequencePlayingRef.current = false
  }

  const saveCommandSequence = () => {
    saveAs(serializeCommands(commandSequence), 'filigree.txt')
  }

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      var fr = new FileReader()
      fr.onload = () => {
        resolve(fr.result as string)
      }
      fr.onerror = reject
      fr.readAsText(file)
    })
  }

  const loadCommandSequence = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { files } = event.target as HTMLInputElement
    for await (let file of files ?? []) {
      if (file.name == 'filigree.txt') {
        try {
          let txt = await readFile(file)
          if (txt.indexOf('filigree-version') > 0) {
            const commands = txt
              .split('\n')
              .filter((l) => l.length > 0 && l[0] != '#')
              .map((x) =>
                x
                  .split(',')
                  .filter((c) => c.length > 0)
                  .map((x) => parseInt(x.trim()))
              )
            setCommandSequence(commands)
            return
          }
        } catch (err) {
          console.error(err)
        }
      }
    }
  }

  const resetAll = async () => {
    for (let motor of motors) {
      await motor.undo()
    }
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
            <Button className="object-right" onClick={resetAll}>
              Reset All
            </Button>
          </CardHeader>
          <CardBody>
            <div className="list" ref={motorListRef}>
              <ViewportList viewportRef={motorListRef} items={motors}>
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
            <input
              onChange={(event) => loadCommandSequence(event)}
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt"
            />
            <Button
              isIconOnly
              className="object-right"
              onClick={() => fileInputRef.current?.click()}
            >
              <FontAwesomeIcon icon="folder-open" />
            </Button>
            <Button
              isIconOnly
              className="object-right"
              onClick={saveCommandSequence}
            >
              <FontAwesomeIcon icon="floppy-disk" />
            </Button>
            <Divider orientation="vertical"></Divider>
            <Button
              isIconOnly
              className="object-right"
              onClick={isSequencePlaying ? pausePlayback : startPlayback}
            >
              <FontAwesomeIcon icon={isSequencePlaying ? 'pause' : 'play'} />
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
