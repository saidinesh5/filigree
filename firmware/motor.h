/*
  Copyright (C) 2024 Dinesh Manajipet
  This is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This software is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this software.  If not, see <http://www.gnu.org/licenses/>.
*/

#pragma once

#include "log.h"
#include "persistentsettings.h"

#include "Arduino.h"

#include "ClearCore.h"
MotorDriver *motors[] = {&ConnectorM0, &ConnectorM1, &ConnectorM2,
                         &ConnectorM3};

extern PersistentSettings SETTINGS;

const uint8_t motor_count() { return sizeof(motors) / sizeof(motors[0]); }

uint32_t motor_status(int motor_id) {
  return motors[motor_id]->StatusReg().reg;
}

void motor_setup() {
  MotorMgr.MotorInputClocking(
      MotorManager::CLOCK_RATE_NORMAL); // input clocking rate
  MotorMgr.MotorModeSet(
      MotorManager::MOTOR_ALL,
      Connector::CPM_MODE_STEP_AND_DIR); // sets all motor connectors to step
                                         // and direction mode
}

uint32_t motor_alerts(int motor_id) { return motors[motor_id]->AlertReg().reg; }

uint32_t motor_move(int motor_id, float angle, MotorDriver::MoveTarget mode,
                    bool is_cutting = false) {
  MotorDriver *motor = motors[motor_id];

  if (motor->StatusReg().bit.AlertsPresent) {
    return motor->AlertReg().reg;
  }

  if (is_cutting) {
    motor->VelMax(SETTINGS.cuttingVelocityLimit);
    motor->AccelMax(SETTINGS.cuttingAccelerationLimit);
  } else {
    motor->VelMax(SETTINGS.velocityLimit);
    motor->AccelMax(SETTINGS.accelerationLimit);
  }

  Log("Moving motors at particular velocity and position");

  motor->Move(angle * SETTINGS.resolution / 360.0, mode);

  while ((!motor->StepsComplete() ||
          motor->HlfbState() != MotorDriver::HLFB_ASSERTED) &&
         !motor->StatusReg().bit.AlertsPresent) {
    MotorDriver::HlfbStates hlfbState = motor->HlfbState();

    // Write the HLFB state to the serial port
    if (hlfbState == MotorDriver::HLFB_HAS_MEASUREMENT) {
      // Writes the torque measured, as a percent of motor peak torque rating
      if (int(round(motor->HlfbPercent())) < 0)
        break;
    }
  }

  Log("Move completed");
  return motor->AlertReg().reg;
}

uint32_t motor_angle() {
  int angle = 0; // find the parameter where you can find angle
  return angle;
}
uint32_t motors_wait(int del) {
  delay(del);

  return 0;
}
uint32_t motor_reset(uint8_t motor_id) {
  MotorDriver *motor = motors[motor_id];
  motor->HlfbMode(
      MotorDriver::HLFB_MODE_HAS_BIPOLAR_PWM); // sets the motors HLFB mode to
                                               // bipolar PWM
  motor->HlfbCarrier(MotorDriver::HLFB_CARRIER_482_HZ); // sets the HLFB carrier
                                                        // frequency to 482 Hz
  motor->VelMax(SETTINGS.velocityLimit);
  motor->AccelMax(SETTINGS.accelerationLimit);
  motor->EnableRequest(true);
  Log("Motor Enabled, Waiting for HLFB...");
  // Waits for HLFB to assert (waits for homing to complete if applicable)
  while (motor->HlfbState() != MotorDriver::HLFB_ASSERTED &&
         !motor->StatusReg().bit.AlertsPresent)
    ;

  if (!motor->PolarityInvertSDDirection(true)) {
    while (true)
      ;
  }
  Log("HLFB asserted");
  delay(50);
  return motor->AlertReg().reg;
}
