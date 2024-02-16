// Each Motor command will be a number array of 3 values:
// [command id, param 1, param 2]

export enum MotorCommands {
  MotorsInitialize = 0,
  MotorsCount = 1,
  MotorStatus = 2,
  MotorAlerts = 3,
  MotorAbsoluteMove = 4,
  MotorRelativeMove = 5,
  MotorCutMove = 6,
  MotorReset = 7,
  MotorGetType = 8,
  MotorSetType = 9,
}

export enum MessageParam {
  PARAM_REQUEST_ID = 0,
  PARAM_COMMAND_ID = 1,
  PARAM_CONTROLLER_ID = 2,
  PARAM_MOTOR_ID = 3,
  PARAM_COMMAND_PARAM = 4,
  PARAM_RESPONSE_ERROR = 1,
  PARAM_RESPONSE_RESULT = 2,
  PARAM_COUNT = 5,
}

export function serializeCommand(cmd: number[]) {
  return (
    [...cmd, ...Array(MessageParam.PARAM_COUNT).fill(0)]
      .slice(0, MessageParam.PARAM_COUNT)
      .join(',') + '\n'
  )
}

export function deserializeCommand(line: string) {
  return line.split(',').map((x) => parseInt(x.trim()))
}

export function serializeCommands(cmds: MotorCommand[]) {
  return new Blob(
    [
      [
        '#filigree-version: 1\n',
        `#command-count: ${cmds.length}\n`,
        ...cmds.map((command, index) => serializeCommand([index, ...command])),
      ].join(''),
    ],
    { type: 'text/plain;charset=utf-8' }
  )
}

export type MotorCommand = Array<number>
// Motor command format:
// [MotorCommandId, ControllerId, MotorId, CommandParam]

/*
# The filigree file is a simple txt file
# Lines starting with # are considered comments
# Each line just contains a single Motor command as comma separated values
# For eg.:

#filigree-version: 1
#command-count: 7
0,7,0,0,0
1,7,0,1,0
2,7,0,2,0
3,7,0,3,0
4,7,1,0,0
5,7,1,1,0
6,7,1,2,0
7,7,1,3,0
*/
