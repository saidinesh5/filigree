import { Listbox, ListboxItem } from "@nextui-org/react";
import { ReactNode } from "react";
import { MotorCommands } from "./types";

import { useRef } from "react";
import { ViewportList } from "react-viewport-list";

function describe(command: number[]): string {
  if (command[0] == MotorCommands.MotorReset) {
    return `Reset Motor ${command[1]}`;
  }
  return "???";
}

export function SequencerList({
  commandSequence,
  currentSequenceIndex,
  onCurrentSequenceIndexChanged,
}: {
  commandSequence: { id: number; command: number[] }[];
  currentSequenceIndex: number;
  onCurrentSequenceIndexChanged: (index: number) => void;
}): ReactNode {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <div className="list" ref={ref}>
      <ViewportList viewportRef={ref} items={commandSequence}>
        {(item) => (
          <div
            key={item.id}
            className={`list-item${currentSequenceIndex == item.id ? " selected" : ""}`}
            onClick={() => {
              onCurrentSequenceIndexChanged(item.id);
            }}
          >
            {`${item.id}: ${describe(item.command)}`}
          </div>
        )}
      </ViewportList>
    </div>
  );
}
