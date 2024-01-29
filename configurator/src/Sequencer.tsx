import { ReactNode, useEffect } from "react";
import { MotorCommand, MotorCommands } from "./MotorCommand";

import { useRef } from "react";
import { ViewportList, ViewportListRef } from "react-viewport-list";
import { Button } from "@nextui-org/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

function describe(command: MotorCommand): string {
  switch (command[0]) {
    case MotorCommands.MotorsCount:
      return `Get Motor Count`;
    case MotorCommands.MotorAngle:
      return `Get Motor Angle ${command[1]}`;
    case MotorCommands.MotorStatus:
      return `Get Motor Status ${command[1]}`;
    case MotorCommands.MotorAlerts:
      return `Get Motor Alerts ${command[1]}`;
    case MotorCommands.MotorAbsoluteMove:
      return `Move Motor ${command[1]} to ${command[2]} deg`;
    case MotorCommands.MotorRelativeMove:
      return `Move Motor ${command[1]} by ${command[2]} deg`;
    case MotorCommands.MotorCutMove:
      return `Move Motor ${command[1]} to cut`;
    case MotorCommands.MotorReset:
      return `Reset Motor ${command[1]}`;
    default:
      return "???";
  }
}

export function SequencerList({
  commandSequence,
  removeCommandSequenceEntry,
  currentSequenceIndex,
  onCurrentSequenceIndexChanged,
}: {
  commandSequence: MotorCommand[];
  removeCommandSequenceEntry: (id: number) => void;
  currentSequenceIndex: number;
  onCurrentSequenceIndexChanged: (index: number) => void;
}): ReactNode {
  const ref = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<ViewportListRef>(null);

  useEffect(() => {
    listRef.current?.scrollToIndex({
      index: currentSequenceIndex,
    });
  }, [currentSequenceIndex]);

  return (
    <div className="list" ref={ref}>
      <ViewportList viewportRef={ref} items={commandSequence} ref={listRef}>
        {(item, index) => (
          <div
            key={index}
            className={`flex flex-row list-item${currentSequenceIndex == index ? " selected" : ""}`}
            onClick={() => {
              onCurrentSequenceIndexChanged(index);
            }}
          >
            <div className="flex-none">{`${index + 1}: ${describe(item)}`}</div>
            {/* <Button
              isIconOnly
              className="flex-none"
              onClick={() => removeCommandSequenceEntry(index)}
            >
              <FontAwesomeIcon icon="circle-minus" />
            </Button> */}
          </div>
        )}
      </ViewportList>
    </div>
  );
}
