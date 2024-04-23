// #define SIMULATOR
#include <Ethernet.h>
#include <SD.h>
#include <stdint.h>

#include "log.h"
#include "message.h"
#include "persistentsettings.h"
#include "tower_lamp_indication.h"

#ifndef SIMULATOR
#include "motor.h"
#else
#include "simulatedmotor.h"
#endif

PersistentSettings SETTINGS;

const char *FILIGREE_FILE_NAME = "filigree.txt";
const char *FILIGREE_STARTUP_FILE_NAME = "startup.txt";

uint32_t motor_get_type(int motor_id) {
  return static_cast<uint32_t>(SETTINGS.motorType[motor_id]);
}

uint32_t motor_set_type(int motor_id, int Type) {
  // Update the specific motor type
  if (motor_id >= 0 && motor_id < 4) {
    SETTINGS.motorType[motor_id] = static_cast<char>(Type);
    save_persistent_settings(SETTINGS);
  }
}

uint8_t isMotorInitialized = false;
uint32_t motors_initalize() {
  if (isMotorInitialized) {
    return false;
  }

  else {
    isMotorInitialized = true;
    for (int motor_id = 0; motor_id < motor_count(); motor_id++) {
      motor_reset(motor_id);
    }
    return true;
  }
}

uint32_t motors_disable() {
  for (int motor_id = 0; motor_id < motor_count(); motor_id++) {
    motor_disable(motor_id);
  }
  isMotorInitialized = false;
  return true;
}

uint32_t motors_wait(int del) {
  delay(del);
  return 0;
}
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
#ifndef SIMULATOR
#define start_pause_button_pin DI6
#else
#define start_pause_button_pin A1
#endif
#define door_open_close_pin DI7
#define emergency_button_pin DI8
#define filament_sensor_pin A9
//////////////////////////////////////////////////////////////////
File filigreeFile;
bool isMaster = false; // SD card is not available
bool isStartupRequired = false;
bool isEmergencyTriggered =
    true; // Flag to track if emergency condition has been triggered
volatile bool isRunning = false;
volatile bool isDoorClosed = false;
volatile bool isEmergency = false;
volatile bool isFilamentPresent = false;
volatile uint8_t lastButtonState = 1;
volatile uint32_t lastDebounceTime_button = 0;
volatile uint32_t lastDebounceTime_sensor = 0;
volatile uint32_t lastDebounceTime_emr = 0;
uint8_t DebounceDelay = 50;

/////////////////////////////////////////////////////////////////////////
// call back functions
void start_pause_button_callback() {
  uint8_t buttonState = digitalRead(start_pause_button_pin);
  if (buttonState != lastButtonState &&
      millis() - lastDebounceTime_button > DebounceDelay) { // debounce
    lastDebounceTime_button = millis();
    if (buttonState == false) {
      isRunning = !isRunning;
    }
  }
}

void door_open_close_callback() {
  uint8_t currentState = digitalRead(door_open_close_pin);

  // Check if enough time has passed since last debounce
  if (millis() - lastDebounceTime_sensor > DebounceDelay) { // debounce
    // Record the time of the state change
    lastDebounceTime_sensor = millis();

    // Update the global variable with the new state
    isDoorClosed = !currentState;
  }
}

void filament_callback() {
  uint8_t currentState = digitalRead(filament_sensor_pin);

  if (millis() - lastDebounceTime_sensor > DebounceDelay) { // debounce
    lastDebounceTime_sensor = millis();

    isFilamentPresent = !currentState;
  }
}

void emergency_callback() {
  uint8_t currentState = digitalRead(emergency_button_pin);

  if (millis() - lastDebounceTime_emr > DebounceDelay) { // debounce
    lastDebounceTime_emr = millis();

    isEmergency = currentState;
    if (isEmergency == false) {
      SysMgr.ResetBoard(); // restarts board
    }
  }
}

void setup() {
  load_persistent_settings(&SETTINGS);
  motor_setup();
  Serial.begin(57600, SERIAL_8N1);
  uint32_t timeout = 100;
  uint32_t startTime = millis();
  while (!Serial && millis() - startTime < timeout) {
    continue;
  }
  if (SD.begin() && SD.exists(FILIGREE_STARTUP_FILE_NAME) &&
      SD.exists(FILIGREE_FILE_NAME)) {
    Log("Found filigree.txt and filigree_startup.txt, Working as master.");
    isMaster = true;

    Ethernet.begin(server_mac, server_ip);
    Log("Assigned manual IP address: ");
    delay(1000);
    slave.connect(server_ip, 8888);
    delay(500);
    if (slave.connected()) {
      Log("connected");
    } else {
      Log("not connected");
    }

  } else {
    Log("Unable to fetch filigree.txt. Working as slave.");
    Ethernet.begin(client_mac, server_ip);
    server.begin();
    delay(400);
  }

  if (isMaster) {
    tower_lamp_init();
    attachInterrupt(digitalPinToInterrupt(start_pause_button_pin),
                    start_pause_button_callback, RISING);
    attachInterrupt(digitalPinToInterrupt(door_open_close_pin),
                    door_open_close_callback, CHANGE);
    attachInterrupt(digitalPinToInterrupt(filament_sensor_pin),
                    filament_callback, CHANGE);
    attachInterrupt(digitalPinToInterrupt(emergency_button_pin),
                    emergency_callback, CHANGE);

    if (digitalRead(emergency_button_pin) == false) {
      isEmergency = !digitalRead(emergency_button_pin);
      while (isEmergency) {
        set_indication(tower_red_light);
      }
    }
    while (!isRunning) {
      set_indication(tower_orange_light);
    }
    set_indication(button_green_light);
    isDoorClosed = (digitalRead(door_open_close_pin) != 0);
    isFilamentPresent = (digitalRead(filament_sensor_pin) != 0);

    if (isDoorClosed && isFilamentPresent) {
      set_indication(tower_green_light);
      startup();
    }
    filigreeFile = SD.open(FILIGREE_FILE_NAME);
  }

  delay(100);
}

void startup() {
  File startupFile;
  startupFile = SD.open(FILIGREE_STARTUP_FILE_NAME);

  while (startupFile.available()) {
    String line = startupFile.readStringUntil('\n');
    if (line.length() == 0 || line[0] == '#') {
      continue;
    } else {
      Serial.println(createMessage(executeCommand(line), PARAM_COUNT));
    }

    if (isEmergency) {
      break;
    }
  }
  // startupFile.flush();
  startupFile.close();

  isStartupRequired = false;
}

void loop() {
  if (isMaster) {
    if (isEmergency) {
      set_indication(tower_red_light);
      if (isEmergencyTriggered) {
        Serial.println(
            createMessage(executeCommand("0,19,1,0,0"), PARAM_COUNT));

        Serial.println(
            createMessage(executeCommand("0,19,0,0,0"), PARAM_COUNT));
        isEmergencyTriggered = false;
      }
      return;
    }
    if ((!isDoorClosed && isRunning) || (!isRunning) ||
        (!isFilamentPresent && isRunning)) {
      set_indication(tower_orange_light);
      isStartupRequired = true;
      return;
    }

    if (isStartupRequired) {
      isStartupRequired = false;
      startup();
      filigreeFile.seek(0);
    }

    set_indication(tower_green_light);
    if (!filigreeFile.available()) // for looping to work
      filigreeFile.seek(0);

    String line = filigreeFile.readStringUntil('\n');
    if (line.length() == 0 || line[0] == '#')
      return;
    Serial.println(createMessage(executeCommand(line), PARAM_COUNT));
  } else {
    EthernetClient client = server.available();
    if (Serial.available()) {
      Serial.println(createMessage(executeCommand(Serial.readStringUntil('\n')),
                                   PARAM_COUNT));
    } else if (client.connected() && client.available()) {
      client.println(createMessage(executeCommand(client.readStringUntil('\n')),
                                   PARAM_COUNT));
      client.flush();
    } else {
      // Do nothing
    }
    Serial.flush();
  }
}

int *executeCommand(const String &line) {
  int req[] = {0, 0, 0, 0, 0};
  static int res[] = {0, 0, 0, 0, 0};
  if (line == ":D") {
    Serial.println(":D");
    return res;
  }
  if (!parseMessage(line, req, PARAM_COUNT)) {
    return res;
  }

  res[PARAM_REQUEST_ID] = req[PARAM_REQUEST_ID];

  if (req[PARAM_CONTROLLER_ID] == 1 && isMaster == true) {
    slave.println(line);
    slave.flush();
    bool responseReceived = false;
    while (!responseReceived) {
      while (!slave.available()) {
        Log("Waiting for slave...");
      }

      String line = slave.readStringUntil('\n');
      parseMessage(line, res, 5);
      if (res[PARAM_REQUEST_ID] == req[PARAM_REQUEST_ID]) {
        responseReceived = true;
      }
      if (res[PARAM_RESPONSE_ERROR] != 0) {
        isRunning = false;
      }
    }
    return res;
  }

  int cmd = req[PARAM_COMMAND_ID];
  switch (cmd) {
  case static_cast<int>(Commands::MotorsInitialize): {
    res[PARAM_RESPONSE_RESULT] = motors_initalize();
    break;
  }

  case static_cast<int>(Commands::MotorsCount): {
    res[PARAM_RESPONSE_RESULT] = motor_count();
    break;
  }

  case static_cast<int>(Commands::MotorStatus): {
    res[PARAM_RESPONSE_RESULT] = motor_status(req[PARAM_MOTOR_ID]);
    break;
  }

  case static_cast<int>(Commands::MotorAlerts): {
    res[PARAM_RESPONSE_RESULT] = motor_alerts(req[PARAM_MOTOR_ID]);
    break;
  }

  case static_cast<int>(Commands::MotorAbsoluteMove):
  case static_cast<int>(Commands::MotorRelativeMove):
  case static_cast<int>(Commands::MotorCutMove): {
    bool isCut = (cmd == static_cast<int>(Commands::MotorCutMove));
    MotorDriver::MoveTarget moveTarget =
        (cmd == static_cast<int>(Commands::MotorRelativeMove))
            ? MotorDriver::MOVE_TARGET_REL_END_POSN
            : MotorDriver::MOVE_TARGET_ABSOLUTE;
    res[PARAM_RESPONSE_RESULT] =
        motor_move(req[PARAM_MOTOR_ID],
                   static_cast<float>(req[PARAM_COMMAND_PARAM]) / 1000.0,
                   moveTarget, isCut);
    break;
  }

  case static_cast<int>(Commands::MotorReset): {
    res[PARAM_RESPONSE_RESULT] = motor_reset(req[PARAM_MOTOR_ID]);
    break;
  }

  case static_cast<int>(Commands::MotorGetType): {
    res[PARAM_RESPONSE_RESULT] = motor_get_type(req[PARAM_MOTOR_ID]);
    break;
  }

  case static_cast<int>(Commands::MotorSetType): {
    res[PARAM_RESPONSE_RESULT] =
        motor_set_type(req[PARAM_MOTOR_ID], req[PARAM_COMMAND_PARAM]);
    break;
  }

  case static_cast<int>(Commands::MotorDelay): {
    res[PARAM_RESPONSE_RESULT] = motors_wait(req[PARAM_COMMAND_PARAM]);
    break;
  }

  case static_cast<int>(Commands::MotorsDisable): {
    res[PARAM_RESPONSE_RESULT] = motors_disable();
    break;
  }

  default:
    res[PARAM_RESPONSE_ERROR] = -1;
  }

  return res;
}
