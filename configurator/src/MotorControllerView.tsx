import { useEffect, useState } from 'react'
import { Slider, Button, Divider } from '@nextui-org/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Motor, MotorType } from './Motor'
import { observer } from 'mobx-react-lite'
import { Input } from '@nextui-org/react'
import Dropdown, { Option } from 'react-dropdown'
import 'react-dropdown/style.css'

const MotorControllerView = observer(({ motor }: { motor: Motor }) => {
  const [localAngle, setLocalAngle] = useState<number>(motor.angle)
  const onAngleChange = (angle: number) => {
    motor.moveTo(Math.min(360, Math.max(0, angle)))
  }

  const moveBy = (angle: number) => {
    angle += motor.angle
    motor.moveTo(angle)
  }

  useEffect(() => setLocalAngle(motor.angle), [motor.angle])

  const motorTypes = [
    { value: '0', label: 'Default' },
    { value: '1', label: 'Extruder' },
    { value: '2', label: 'Cutter Bottom' },
    { value: '3', label: 'Cutter Top' },
    { value: '4', label: 'Disabled' }
  ]
  const defaultMotorType = motorTypes[motor.motorType]
  const onMotorTypeChange = (arg: Option) => {
    motor.setMotorType(parseInt(arg.value))
  }

  return (
    <div className="flex items-center space-x-3 text-small">
      <div className="w-40 min-w-40 max-w-40">
        <p className="w-full"> Motor {motor.displayIndex} </p>
        <Dropdown
          className="w-full"
          options={motorTypes}
          onChange={onMotorTypeChange}
          value={defaultMotorType}
        />
      </div>

      <Divider orientation="vertical" />

      {motor.motorType == MotorType.Extruder ? (
        <div className="grow">
          <div className="flex items-center space-x-2">
            <Button isIconOnly radius="full" onClick={() => moveBy(-2.5)}>
              <FontAwesomeIcon icon="minus" />
            </Button>
            <Button isIconOnly radius="full" onClick={() => moveBy(-0.5)}>
              <FontAwesomeIcon icon="circle-minus" />
            </Button>
            <Input
              type="number"
              label="Angle"
              value={`${motor.angle}`}
              onValueChange={(value: string) => motor.moveTo(Number(value))}
            />
            <Button isIconOnly radius="full" onClick={() => moveBy(+0.5)}>
              <FontAwesomeIcon icon="circle-plus" />
            </Button>
            <Button isIconOnly radius="full" onClick={() => moveBy(+2.5)}>
              <FontAwesomeIcon icon="plus" />
            </Button>
          </div>
        </div>
      ) : (
        <Slider
          aria-label="angle"
          color="success"
          value={localAngle}
          minValue={0}
          maxValue={360}
          step={0.5}
          label="Angle"
          formatOptions={{ minimumFractionDigits: 1 }}
          isDisabled={motor.motorType === MotorType.Disabled}
          onChange={(value: number | number[]) =>
            setLocalAngle(Array.isArray(value) ? value[0] : value)
          }
          onChangeEnd={(value: number | number[]) =>
            onAngleChange(Array.isArray(value) ? value[0] : value)
          }
          startContent={
            <Button
              isIconOnly
              radius="full"
              onPress={() =>
                onAngleChange(motor.angle >= 0.5 ? motor.angle - 0.5 : 0)
              }
            >
              <FontAwesomeIcon icon="minus" />
            </Button>
          }
          endContent={
            <Button
              isIconOnly
              radius="full"
              onPress={() =>
                onAngleChange(motor.angle <= 359.5 ? motor.angle + 0.5 : 360)
              }
            >
              <FontAwesomeIcon icon="plus" />
            </Button>
          }
          className="grow w-8/10"
        />
      )}

      <Divider orientation="vertical" />

      <Button
        isDisabled={!motor.hasChanged}
        isIconOnly
        className="justify-center w-1/10"
        onClick={() => motor.undo()}
      >
        <FontAwesomeIcon icon="arrow-rotate-left" />
      </Button>
    </div>
  )
})

export default MotorControllerView
