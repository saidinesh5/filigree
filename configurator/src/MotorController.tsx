import React, { useEffect } from "react";
import { Slider, Button} from "@nextui-org/react";

export default function MotorController({
  motorId,
  angle,
  onAngleChange,
}: {
  motorId: number;
  angle: number,
  onAngleChange: (motorId: number, angle: number) => void;
  onResetMotor: (motorId: number) => void;
}) {
  return (
    <div className="flex flex-col w-full h-full max-w-md items-start justify-center">
          {/* <p> Motor {motorId} </p> */}
          {/* <Button className="justify-center">Reset</Button> */}

        <Slider
          aria-label="angle"
          color="success"
          value={angle}
          minValue={0}
          maxValue={360}
          step={0.5}
          label="Angle"
          onChange={(value: number | number[]) =>
            onAngleChange(motorId, Array.isArray(value) ? value[0] : value)
          }
          startContent={
            <Button
              isIconOnly
              radius="full"
              onPress={() => onAngleChange(motorId, angle >= 0.5 ? angle - 0.5 : 0)}
            >
              -
            </Button>
          }
          endContent={
            <Button
              isIconOnly
              radius="full"
              onPress={() =>
                onAngleChange(motorId, angle <= 359.5 ? angle + 0.5 : 360)
              }
            >
              +
            </Button>
          }
          className="max-w-md"
        />
    </div>
  );
}
