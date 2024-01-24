import React, { useEffect } from "react";
import { Slider, Button, Divider} from "@nextui-org/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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
      <div className="flex items-center space-x-3 text-small w-full h-full">
        <p className="w-1/10"> Motor {motorId} </p>

        <Divider orientation="vertical" />

        <Slider
          aria-label="angle"
          color="success"
          value={angle}
          minValue={0}
          maxValue={360}
          step={0.5}
          label="Angle"
          formatOptions={
            {minimumFractionDigits: 1}
          }
          onChange={(value: number | number[]) =>
            onAngleChange(motorId, Array.isArray(value) ? value[0] : value)
          }
          startContent={
            <Button
              isIconOnly
              radius="full"
              onPress={() => onAngleChange(motorId, angle >= 0.5 ? angle - 0.5 : 0)}
            >
              <FontAwesomeIcon icon="minus" />
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
              <FontAwesomeIcon icon="plus" />
            </Button>
          }
          className="grow w-8/10"
        />

        <Divider orientation="vertical" />
        
        <Button isIconOnly className="justify-center w-1/10">
          <FontAwesomeIcon icon="arrow-rotate-left" />
        </Button>

        <Divider orientation="vertical" />
    </div>
  );
}
