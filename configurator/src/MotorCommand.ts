// Each Motor command will be a number array of 3 values:
// [command id, param 1, param 2]

export enum MotorCommands {
  MotorsCount = 0, // () -> uint32_t uint8 should be enough.
  MotorAngle = 1, // (motor_id: uint8_t) -> float
  MotorStatus = 2, // (motor_id: uint8_t) -> uint32_t // As per MotorDriver.h
  MotorAlerts = 3, // (motor_id: uint8_t) -> uint32_t // As per MotorDriver.h
  MotorAbsoluteMove = 4, // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
  MotorRelativeMove = 5, // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
  MotorCutMove = 6, // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
  MotorReset = 7, // (motor_id: uint8_t)  -> uint32_t // Motor_alerts
}

export type MotorCommand = Array<number>;

/*
# The filigree file is a simple txt file
# Lines starting with # are considered comments
# Each line just contains a single Motor command as comma separated values
# For eg.:

#filigree-version: 1
#command-count: 7
7,0,0
7,1,0
7,2,0
7,3,0
7,4,0
7,5,0
7,6,0
7,7,0
*/
