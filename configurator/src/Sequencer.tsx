import { Listbox, ListboxItem } from "@nextui-org/react";
import { ReactNode, useEffect } from "react";
import { MotorCommand, MotorCommands } from "./MotorCommand";

import { useRef } from "react";
import { ViewportList, ViewportListRef } from "react-viewport-list";

function describe(command: number[]): string {
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
  setCommandSequence,
  currentSequenceIndex,
  onCurrentSequenceIndexChanged,
}: {
  commandSequence: MotorCommand[];
  setCommandSequence: (commands: MotorCommand[]) => void;
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
        {(item) => (
          <div
            key={item.sequenceId}
            className={`list-item${currentSequenceIndex == item.sequenceId ? " selected" : ""}`}
            onClick={() => {
              onCurrentSequenceIndexChanged(item.sequenceId);
            }}
          >
            {`${item.sequenceId + 1}: ${describe(item.command)}`}
          </div>
        )}
      </ViewportList>
    </div>
  );
}
