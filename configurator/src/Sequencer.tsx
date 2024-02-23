import { ReactNode, useEffect } from 'react'
import { MessageParam, MotorCommand, MotorCommands } from './MotorCommand'

import { useRef } from 'react'
import { ViewportList, ViewportListRef } from 'react-viewport-list'
import { Button } from '@nextui-org/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import MotorController from './MotorController'

//TODO: The value you see must matche what is passed to Motor
function motorDisplayIndex(
  motorControllers: MotorController[],
  command: MotorCommand
) {
  const controllerId = command[MessageParam.PARAM_CONTROLLER_ID]
  const motorId = command[MessageParam.PARAM_MOTOR_ID]
  if (controllerId == 0) {
    return motorId
  } else {
    return motorControllers[controllerId - 1].motorCount + motorId
  }
}

function angle(command: MotorCommand): number {
  switch (command[MessageParam.PARAM_COMMAND_ID]) {
    case MotorCommands.MotorAbsoluteMove:
    case MotorCommands.MotorCutMove:
    case MotorCommands.MotorRelativeMove:
      return command[MessageParam.PARAM_COMMAND_PARAM] / 1000
    default:
      return NaN
  }
}

function describe(
  motorControllers: MotorController[],
  command: MotorCommand
): string {
  switch (command[MessageParam.PARAM_COMMAND_ID]) {
    case MotorCommands.MotorsInitialize:
      return `Initialize Motors of Controller ${command[MessageParam.PARAM_CONTROLLER_ID] + 1}`
    case MotorCommands.MotorsCount:
      return `Get Motor Count`
    case MotorCommands.MotorStatus:
      return `Get Motor Status of Motor ${motorDisplayIndex(motorControllers, command)}`
    case MotorCommands.MotorAlerts:
      return `Get Motor Alerts ${motorDisplayIndex(motorControllers, command)}`
    case MotorCommands.MotorAbsoluteMove:
      return `Move Motor ${motorDisplayIndex(motorControllers, command)} to ${angle(command)} deg`
    case MotorCommands.MotorRelativeMove:
      return `Move Motor ${motorDisplayIndex(motorControllers, command)} by ${angle(command)} deg`
    case MotorCommands.MotorCutMove:
      return `Move Motor ${motorDisplayIndex(motorControllers, command)} to cut at ${angle(command)} deg`
    case MotorCommands.MotorReset:
      return `Reset Motor ${motorDisplayIndex(motorControllers, command)}`
    case MotorCommands.MotorGetType:
      return `Get Motor type for motor: ${command[MessageParam.PARAM_REQUEST_ID]}`
    case MotorCommands.MotorSetType:
      return `Set Motor type for motor: ${command[MessageParam.PARAM_MOTOR_ID]} to ${motorDisplayIndex(motorControllers, command)}`
    default:
      return '???'
  }
}

export function SequencerList({
  motorControllers,
  commandSequence,
  removeCommandSequenceEntry,
  currentSequenceIndex,
  onCurrentSequenceIndexChanged
}: {
  motorControllers: MotorController[]
  commandSequence: MotorCommand[]
  removeCommandSequenceEntry: (id: number) => void
  currentSequenceIndex: number
  onCurrentSequenceIndexChanged: (index: number) => void
}): ReactNode {
  const ref = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<ViewportListRef>(null)

  useEffect(() => {
    listRef.current?.scrollToIndex({
      index: currentSequenceIndex
    })
  }, [currentSequenceIndex])

  return (
    <div className="list" ref={ref}>
      <ViewportList viewportRef={ref} items={commandSequence} ref={listRef}>
        {(item, index) => (
          <div
            key={index}
            className={`list-item${
              currentSequenceIndex == index ? ' selected' : ''
            }`}
            onClick={() => {
              onCurrentSequenceIndexChanged(index)
            }}
          >
            <div className="flex">
              <div className="grow select-none">{`${index + 1}: ${describe(
                motorControllers,
                item
              )}`}</div>
              <Button
                isIconOnly
                className="object-right"
                onClick={() => removeCommandSequenceEntry(index)}
              >
                <FontAwesomeIcon icon="circle-minus" />
              </Button>
            </div>
          </div>
        )}
      </ViewportList>
    </div>
  )
}
