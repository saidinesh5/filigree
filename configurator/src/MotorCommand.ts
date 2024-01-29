// Each Motor command will be a number array of 5 values:
// [command id, param 1, param 2, param 3, param 4]

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

export interface MotorCommand {
  sequenceId: number;
  command: number[];
}
