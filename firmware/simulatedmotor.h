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

namespace MotorDriver {
enum MoveTarget { MOVE_TARGET_REL_END_POSN, MOVE_TARGET_ABSOLUTE };
};

void motor_setup() {}

const uint8_t motor_count() { return 4; }

uint32_t motor_status(int motor_id) { return 0; }

uint32_t motor_alerts(int motor_id) { return 0; }

uint32_t motor_move(int motor_id, float angle, MotorDriver::MoveTarget mode,
                    bool is_cutting = false) {
  delay(200);
  return 0;
}

uint32_t motor_angle() {
  int angle = 0; // find the parameter where you can find angle
  return angle;
}

uint32_t motor_reset(int motor_id) {
  delay(50);
  return 0;
}
