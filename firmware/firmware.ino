#include "ClearCore.h"
#include <Ethernet.h>
#include <SPI.h>
#include <stdint.h>

#include "NvmManager.h"
#include <SD.h>
#include <SPI.h>

namespace ClearCore {
extern NvmManager &NvmMgr;
}

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
    message[paramIndex] = value;
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

const char *FILIGREE_FILE_NAME = "filigree.txt";

///////////////////////////
// Ethernet stuff
// Configure with a manually assigned IP address
/*
Slave acts as a server
Master acts as a client
*/

byte client_mac[] = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED};
byte server_mac[] = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xEE};
// Set ClearCore's IP address | slave==server
IPAddress client_ip = IPAddress(192, 168, 0, 100);
IPAddress server_ip = IPAddress(192, 168, 0, 101);
const int PORT_NUM = 8888;
EthernetServer server = EthernetServer(PORT_NUM);
EthernetClient slave;

#define start_pause_button_pin DI6

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

PersistentSettings SETTINGS;

void save_persistent_settings() {
  NvmMgr.BlockWrite(NvmManager::NVM_LOC_USER_START, sizeof(PersistentSettings),
                    SETTINGS.data);
}

void load_persistent_settings() {
  NvmMgr.BlockRead(NvmManager::NVM_LOC_USER_START, sizeof(PersistentSettings),
                   SETTINGS.data);
  if (SETTINGS.isInitialized != 0 && SETTINGS.isInitialized != 1) {
    SETTINGS.isInitialized = 1;
    SETTINGS.velocityLimit = 5000;      // 10,000 steps per sec
    SETTINGS.accelerationLimit = 10000; // 100000  // pulses per sec^2
    SETTINGS.resolution = 1600;
    SETTINGS.cuttingVelocityLimit = 6000;        // 60000
    SETTINGS.cuttingAccelerationLimit = 2000000; // 2000000
    SETTINGS.motorType[0] = static_cast<int>(MotorType::Default);
    SETTINGS.motorType[1] = static_cast<int>(MotorType::Default);
    SETTINGS.motorType[2] = static_cast<int>(MotorType::Default);
    SETTINGS.motorType[3] = static_cast<int>(MotorType::Default);
  }
}

////////////////////////////
// Motor stuff
MotorDriver *motors[] = {&ConnectorM0, &ConnectorM1, &ConnectorM2,
                         &ConnectorM3};

//////////////////////////////////////////////////////////////////
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

File filigreeFile;
bool isMaster = false; // SD card is not available
volatile bool isRunning = true;
bool isLogging = false;

void Log(const char msg[]) {
  if (isLogging) {
    Serial.println(msg);
  }
}

const uint8_t motor_count() { return sizeof(motors) / sizeof(motors[0]); }

uint32_t motor_status(int motor_id) {
  return motors[motor_id]->StatusReg().reg;
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

uint32_t motor_reset(int motor_id) {
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

uint8_t motor_init_flag = false;
uint32_t motors_initalize() {
  if (motor_init_flag) {
    return false;
  }

  else {
    motor_init_flag = true;
    for (int motor_id = 0; motor_id < motor_count(); motor_id++) {
      motor_reset(motor_id);
    }
    return true;
  }
}

uint32_t motor_get_type(int motor_id) {
  return static_cast<uint32_t>(SETTINGS.motorType[motor_id]);
}

uint32_t motor_set_type(int motor_id, int Type) {
  // Update the specific motor type
  if (motor_id >= 0 && motor_id < 4) {
    SETTINGS.motorType[motor_id] = static_cast<char>(Type);
    save_persistent_settings();
  }
}
/////////////////////////////////////////////////////////////////////////

void start_pause_button_callback() { isRunning = !isRunning; }

void setup() {
  load_persistent_settings();
  Serial.begin(9600);
  uint32_t timeout = 5000;
  uint32_t startTime = millis();
  while (!Serial && millis() - startTime < timeout) {
    continue;
  }

  if (SD.begin() && SD.exists(FILIGREE_FILE_NAME)) {
    Log("Found filigree.txt. Working as master.");
    isMaster = true;
    filigreeFile = SD.open(FILIGREE_FILE_NAME);
    Ethernet.begin(server_mac, server_ip);
    Log("Assigned manual IP address: ");
    delay(3000);
    slave.connect(server_ip, 8888);
    if (slave.connected()) {
      Log("connected");
    } else {
      Log("not connected");
    }
  } else {
    Log("Unable to fetch filigree.txt. Working as slave.");
    Ethernet.begin(client_mac, server_ip);
    server.begin();
    delay(2000);
  }

  // Motor setup ////////////////////////////////////////////
  MotorMgr.MotorInputClocking(
      MotorManager::CLOCK_RATE_NORMAL); // input clocking rate
  MotorMgr.MotorModeSet(
      MotorManager::MOTOR_ALL,
      Connector::CPM_MODE_STEP_AND_DIR); // sets all motor connectors to step
                                         // and direction mode
  ///////////////////////////////////////////////////////

  attachInterrupt(digitalPinToInterrupt(start_pause_button_pin),
                  start_pause_button_callback, RISING);

  delay(100);
}

/*
 json rpc format:
              0         1          2        3
"method": [command , cntrl_id, motor_id ,parameter]
 */
void loop() {

  if (!isRunning)
    return;

  if (isMaster) {                    // this will contain client code
    if (!filigreeFile.available()) { // for looping to work
      filigreeFile.seek(0);
    }

    String line = filigreeFile.readStringUntil('\n');
    if (line.length() == 0 || line[0] == '#') {
      return;
    }
    Serial.println(createMessage(
        executeCommand(filigreeFile.readStringUntil('\n')), PARAM_COUNT));
  } else {
    EthernetClient client = server.available();
    if (Serial.available()) {
      Serial.println(createMessage(executeCommand(Serial.readStringUntil('\n')),
                                   PARAM_COUNT));
    } else if (client.connected() && client.available()) {
      Serial.println(createMessage(executeCommand(client.readStringUntil('\n')),
                                   PARAM_COUNT));
    } else {
      // Do nothing
    }
  }
}

int *executeCommand(const String &line) {
  int req[] = {0, 0, 0, 0, 0};
  static int res[] = {0, 0, 0, 0, 0};
  if (!parseMessage(line, req, PARAM_COUNT)) {
    return res;
  }
  res[PARAM_REQUEST_ID] = req[PARAM_REQUEST_ID];

  if (req[PARAM_CONTROLLER_ID] == 1 && isMaster == true) {
    slave.println(line);
    while (!slave.available()) {
      Log("Waiting for slave...");
    }

    String line = slave.readStringUntil('\n');
    parseMessage(line, res, 5);
    if (res[PARAM_RESPONSE_ERROR] != 0) {
      isRunning = false;
    }
    return res;
  }

  int cmd = req[PARAM_COMMAND_ID];
  switch (cmd) {
  case static_cast<int>(Commands::MotorsInitialize):
    res[PARAM_RESPONSE_RESULT] = motors_initalize();
    break;

  case static_cast<int>(Commands::MotorsCount):
    res[PARAM_RESPONSE_RESULT] = motor_count();
    break;

  case static_cast<int>(Commands::MotorStatus):
    res[PARAM_RESPONSE_RESULT] = motor_status(req[PARAM_MOTOR_ID]);
    break;

  case static_cast<int>(Commands::MotorAlerts):
    res[PARAM_RESPONSE_RESULT] = motor_alerts(req[PARAM_MOTOR_ID]);
    break;

  case static_cast<int>(Commands::MotorAbsoluteMove):
  case static_cast<int>(Commands::MotorRelativeMove):
  case static_cast<int>(Commands::MotorCutMove): {
    bool isCut = (cmd == static_cast<int>(Commands::MotorCutMove));
    MotorDriver::MoveTarget moveTarget =
        (cmd == static_cast<int>(Commands::MotorRelativeMove))
            ? MotorDriver::MOVE_TARGET_REL_END_POSN
            : MotorDriver::MOVE_TARGET_ABSOLUTE;
    res[PARAM_RESPONSE_RESULT] =
        motor_move(res[PARAM_MOTOR_ID],
                   static_cast<float>(res[PARAM_COMMAND_PARAM]) / 1000.0,
                   moveTarget, isCut);
  } break;

  case static_cast<int>(Commands::MotorReset): {
    res[PARAM_RESPONSE_RESULT] = motor_reset(res[PARAM_MOTOR_ID]);
  } break;

  case static_cast<int>(Commands::MotorGetType): {
    res[PARAM_RESPONSE_RESULT] = motor_get_type(res[PARAM_MOTOR_ID]);
  } break;

  case static_cast<int>(Commands::MotorSetType): {
    res[PARAM_RESPONSE_RESULT] =
        motor_set_type(res[PARAM_MOTOR_ID], res[PARAM_COMMAND_PARAM]);
  } break;

  default:
    res[PARAM_RESPONSE_ERROR] = -1;
  }

  return res;
}
