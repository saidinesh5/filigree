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

export type MotorCommand = Array<number>;
// Motor command format:
// [MotorCommandId, ControllerId, MotorId, CommandParam]

/*
# The filigree file is a simple txt file
# Lines starting with # are considered comments
# Each line just contains a single Motor command as comma separated values
# For eg.:

#filigree-version: 1
#command-count: 7
7,0,0,0
7,0,1,0
7,0,2,0
7,0,3,0
7,1,0,0
7,1,1,0
7,1,2,0
7,1,3,0
*/
