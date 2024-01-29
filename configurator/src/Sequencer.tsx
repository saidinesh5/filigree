import { Listbox, ListboxItem } from "@nextui-org/react";
import { ReactNode } from "react";
import { MotorCommands } from "./types";

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
  return (
    <div className="">
      <Listbox
        items={commandSequence}
        aria-label="Sequencer"
        variant="flat"
        disallowEmptySelection
        selectionMode="single"
        selectedKeys={`${currentSequenceIndex}`}
        onAction={(key): any => {
          console.log("action:", key);
          onCurrentSequenceIndexChanged(parseInt(key.toString()));
        }}
      >
        {(item) => (
          <ListboxItem key={`${item.id}`}>
            {`${item.id + 1}: ` + describe(item.command)}
          </ListboxItem>
        )}
      </Listbox>
    </div>
  );
}
