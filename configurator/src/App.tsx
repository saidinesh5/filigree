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

import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

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
  deserializeCommand,
  serializeCommand,
  serializeCommands
} from './MotorCommand'
import { saveAs } from 'file-saver'
import { observer } from 'mobx-react-lite'
import { autorun } from 'mobx'
import { sleep } from './utils'

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
          newMotors.push(motor)
        }
      }
    }

    if (newMotors.length != motors.length) {
      for (let motor of newMotors) {
        try {
          await motor.fetchMotorType()
        } catch (err) {
          console.error(err)
          toast.error(`Unable to fetch motor type for motor: ${motor.id}`)
        }
      }
      setTimeout(() => setMotors(newMotors), 10)
    }
  }

  autorun(updateMotors)

  navigator.serial?.addEventListener('connect', (_event: Event) => {
    // this event occurs every time a new serial device
    // connects via USB:
    // console.log(event.target, 'connected')
  })
  navigator.serial?.addEventListener('disconnect', (event: Event) => {
    // this event occurs every time a new serial device
    // disconnects via USB:
    for (let m of motorControllers.current) {
      if (m.port == event.target) {
        toast.warn(`Controller ${m.id} is disconnected`)
        m.closePort()
      }
    }
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
        newCommands.push(motor.getMoveCommand())
        motor.save()
      }
    }
    if (newCommands.length > commandSequence.length) {
      setCommandSequence(newCommands)
      setCurrentSequenceIndex(newCommands.length - 1)
    }
  }

  const addCutCommands = () => {
    let newCommands: MotorCommand[] = [...commandSequence]
    const delayMotor = new Motor(
      new MotorController(0),
      0,
      MotorType.Default,
      0
    )

    for (let motor of motors) {
      let cmd = motor.getCutStartCommand()
      if (cmd) {
        newCommands.push(cmd)
      }
    }

    newCommands.push(delayMotor.getDelayCommand(50))

    for (let motor of motors) {
      let cmd = motor.getCutEndCommand()
      if (cmd) {
        newCommands.push(cmd)
      }
    }
    newCommands.push(delayMotor.getDelayCommand(50))

    if (newCommands.length > commandSequence.length) {
      setCommandSequence(newCommands)
      setCurrentSequenceIndex(newCommands.length - 1)
    } else {
      toast.error('No cutter motors were found!')
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
          toast.error(`Error Playing back command: ${serializeCommand(cmd)}`)
        }
        setCurrentSequenceIndex(i)
        i++
        await sleep(100)
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
              .map((l) => deserializeCommand(l))
            setCommandSequence(commands)
            return
          }
        } catch (err) {
          console.error(err)
          toast.error('Unable to load command sequence')
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

      {motors.length == 0 ? (
        <div className="fixed h-full w-full flex items-center justify-center bg-opacity-50">
          <div className="flex-col items-center justify-center text-center">
            <h1 className="text-5xl">Motors not found!</h1>
            {'serial' in navigator ? (
              <h2 className="text-3xl">
                Please connect a Filigree controller.
              </h2>
            ) : (
              <h2 className="text-3xl">
                Make sure your browser{' '}
                <a className="underline" href="https://caniuse.com/web-serial">
                  supports Web Serial
                </a>
              </h2>
            )}
          </div>
        </div>
      ) : (
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
                <Button isIconOnly onClick={addCutCommands}>
                  <FontAwesomeIcon icon="scissors" />
                </Button>
                {/* Add move command to the sequencer*/}
                <AddCommandsButton motors={motors}></AddCommandsButton>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
      <ToastContainer />
    </div>
  )
}

export default App
