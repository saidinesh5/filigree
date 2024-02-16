import React, { useEffect, useState } from 'react'
import { Slider, Button, Divider } from '@nextui-org/react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Motor, MotorType } from './Motor'
import { observer } from 'mobx-react-lite'

const MotorControllerView = observer(({ motor }: { motor: Motor }) => {
  const [localAngle, setLocalAngle] = useState<number>(motor.angle)
  const onAngleChange = (angle: number) => {
    if (motor.motorType == MotorType.Extruder) {
      motor.moveTo(angle)
    } else {
      motor.moveTo(Math.min(360, Math.max(0, angle)))
    }
  }

  useEffect(() => setLocalAngle(motor.angle), [motor.angle])

  return (
    <div className="flex items-center space-x-3 text-small">
      <p className="w-1/10"> Motor {motor.displayIndex} </p>

      <Divider orientation="vertical" />

      <Slider
        aria-label="angle"
        color="success"
        value={localAngle}
        minValue={0}
        maxValue={360}
        step={0.5}
        label="Angle"
        formatOptions={{ minimumFractionDigits: 1 }}
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
