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

enum class Commands {
  MotorsInitialize = 0,
  MotorsCount = 1,
  MotorStatus = 2,
  MotorAlerts = 3,
  MotorAbsoluteMove = 4,
  MotorRelativeMove = 5,
  MotorCutMove = 6,
  MotorReset = 7,
  MotorGetType = 8,
  MotorSetType = 9
};

enum MessageParam {
  PARAM_REQUEST_ID = 0,
  PARAM_COMMAND_ID = 1,
  PARAM_CONTROLLER_ID = 2,
  PARAM_MOTOR_ID = 3,
  PARAM_COMMAND_PARAM = 4,
  PARAM_RESPONSE_ERROR = 1,
  PARAM_RESPONSE_RESULT = 2,
  PARAM_COUNT = 5,
};

bool parseMessage(const String &line, int *message, int messageSize) {
  if (line.length() == 0 || line[0] == '#') {
    return true;
  }

  int value = 0;
  bool isNegative = false;
  int paramIndex = 0;

  for (int i = 0; i < line.length() && paramIndex < messageSize; i++) {
    if (line[i] == '-') {
      isNegative = true;
    } else if (isDigit(line[i])) {
      value = 10 * value + line[i] - '0';
    } else if (line[i] == ',') {
      message[paramIndex] = (isNegative ? -1 : 1) * value;
      value = 0;
      isNegative = false;
      paramIndex += 1;
    } else {
      // Do nothing
    }
  }

  if (paramIndex == messageSize - 1) {
    message[paramIndex] = (isNegative ? -1 : 1) * value;
    return true;
  } else {
    return false;
  }
}

String createMessage(int *arr, int count) {
  String res = "";
  for (int i = 0; i < count; i++) {
    if (i != 0) {
      res += ',';
    }
    res += String(arr[i]);
  }

  return res;
}
