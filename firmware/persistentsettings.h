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

#include <stdint.h>

#ifndef SIMULATOR
#include "ClearCore.h"
#include "NvmManager.h"
namespace ClearCore {
extern NvmManager &NvmMgr;
}
#endif

enum class MotorType {
  Default = 0,
  Extruder = 1,
  CutterBottom = 2,
  CutterTop = 3,
  Disable = 4
};

union PersistentSettings {
  struct {
    int32_t isInitialized;
    int32_t velocityLimit;
    int32_t accelerationLimit;
    int32_t cuttingVelocityLimit;
    int32_t cuttingAccelerationLimit;
    int32_t resolution;
    int8_t motorType[4];
  };
  uint8_t data[7 * 4];
};

void save_persistent_settings(const PersistentSettings &settings) {
#ifndef SIMULATOR
  NvmMgr.BlockWrite(NvmManager::NVM_LOC_USER_START, sizeof(PersistentSettings),
                    settings.data);
#endif
}

void load_persistent_settings(PersistentSettings *settings) {
#ifndef SIMULATOR
  NvmMgr.BlockRead(NvmManager::NVM_LOC_USER_START, sizeof(PersistentSettings),
                   settings->data);
#endif
  if (settings->isInitialized != 0 && settings->isInitialized != 1) {
    settings->isInitialized = 1;
    settings->velocityLimit = 500;      // 10,000 steps per sec
    settings->accelerationLimit = 1000; // 100000  // pulses per sec^2
    settings->resolution = 1600;
    settings->cuttingVelocityLimit = 60000;        // 60000
    settings->cuttingAccelerationLimit = 2000000; // 2000000
    settings->motorType[0] = static_cast<uint8_t>(MotorType::Default);
    settings->motorType[1] = static_cast<uint8_t>(MotorType::Default);
    settings->motorType[2] = static_cast<uint8_t>(MotorType::Default);
    settings->motorType[3] = static_cast<uint8_t>(MotorType::Default);
  }
}
