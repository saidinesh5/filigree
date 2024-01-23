import React from "react";
import {Slider, Button} from "@nextui-org/react";

export default function MotorController() {
    const [angle, setAngle] = React.useState(25)
    
    return (
      <div className="flex flex-col gap-2 w-full h-full max-w-md items-start justify-center">
        <span className="text-default-500 font-medium text-small">Motor</span>
        <span className="text-default-500 font-medium text-small">Angle</span>
        <Slider
          aria-label="angle"
          size="lg"
          color="success"
          value={angle}
          onChange={setAngle}
          startContent={
            <Button
              radius="full"
              variant="light"
              onPress={() => setAngle((prev) => prev >= 0.5 ? prev - 0.5 : 0)}
            >-</Button>
          }
          endContent={
            <Button
              isIconOnly
              radius="full"
              variant="light"
              onPress={() => setAngle((prev) => prev <= 359.5 ? prev + 0.5 : 360)}
            >+</Button>
          }
          className="max-w-md"
        />
      </div>
    );
  }