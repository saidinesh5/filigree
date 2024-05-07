// #define SIMULATOR
#include <Ethernet.h>
#include <SD.h>
#include <stdint.h>

#include "log.h"
#include "message.h"
#include "persistentsettings.h"

#include "notificationsmanager.h"

#ifndef SIMULATOR
#include "motor.h"
#else
#include "simulatedmotor.h"
#endif

Notification notify;
PersistentSettings SETTINGS;
const char *FILIGREE_FILE_NAME = "filigree.txt";
const char *FILIGREE_STARTUP_FILE_NAME = "startup.txt";

const char *FILIGREE_FILE_1 = "fili1.txt";
const char *FILIGREE_PLAY;
const char *FILIGREE_FILES[3] = {"fili2.txt", "fili3.txt", "fili1.txt"};

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

uint32_t set_velocity(uint32_t velocity) {
  SETTINGS.velocityLimit = velocity;
  save_persistent_settings(SETTINGS);
}

uint32_t get_velocity() { return SETTINGS.velocityLimit; }

uint32_t set_acceleration(uint32_t acceleration) {
  SETTINGS.accelerationLimit = acceleration;
  save_persistent_settings(SETTINGS);
}

uint32_t get_accleration() { return SETTINGS.accelerationLimit; }

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
#define file_selector_pin_1 A10
#define file_selector_pin_2 A11

//////////////////////////////////////////////////////////////////
File filigreeFile;
bool isMaster = false; // SD card is not available
bool isStartupRequired = false;

volatile bool isRunning = false;
volatile bool isDoorOpened = false;
volatile bool isIntialized = false;
volatile bool isEmergencyTriggered = false;
volatile bool isFilamentPresent = false;
volatile bool isButton = false;
volatile bool isEmergencyState = false;
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
      isButton = !isButton;
    }
  }
  if (!isButton && !isEmergencyState) {
    isRunning = false;
    notify.show(notify.pause);
  } else {
    if (!isEmergencyState && isFilamentPresent && !isDoorOpened) {
      notify.show(notify.running);
      isRunning = true;
      isStartupRequired = true;
    }
  }
}

void door_open_close_callback() {
  // when sensor away 0 when engaged 1
  uint8_t currentState = digitalRead(door_open_close_pin);

  // Check if enough time has passed since last debounce
  if (millis() - lastDebounceTime_sensor > DebounceDelay) { // debounce
    // Record the time of the state change
    lastDebounceTime_sensor = millis();

    // Update the global variable with the new state
    isDoorOpened = currentState;
    // if current state is 0 then it means that sensir is away. ie when when it
    // is far logic is zero which means that when sensor is far is running
    // should zero
  }
  if (isDoorOpened && !isEmergencyState) {
    notify.show(notify.doorOpened);
    isRunning = false;

  } else {
    if (!isEmergencyState && isFilamentPresent && isButton) {
      notify.show(notify.running);
      isRunning = true;
      isStartupRequired = true;
    }
  }
}

void filament_callback() {
  // works as NC when sesnor initial condition is 1, if engaged 0
  uint8_t currentState = digitalRead(filament_sensor_pin);

  if (millis() - lastDebounceTime_sensor > DebounceDelay) { // debounce
    lastDebounceTime_sensor = millis();

    // isRunning = !currentState;
    isFilamentPresent = !currentState;
    // orange tower blink
  }

  if (!isFilamentPresent && !isEmergencyState) {
    notify.show(notify.filamentOver);
    isRunning = false;
  } else {
    if (!isEmergencyState && isButton && !isDoorOpened) {
      notify.show(notify.running);
      isRunning = true;
      isStartupRequired = true;
    }
  }
}
void emergency_callback() {
  uint8_t currentState = digitalRead(emergency_button_pin);
  isEmergencyState = true;
  notify.show(notify.emergency);
  if (millis() - lastDebounceTime_emr > DebounceDelay) { // debounce
    lastDebounceTime_emr = millis();

    isEmergencyTriggered = currentState;
    if (isEmergencyTriggered == false) {
      SysMgr.ResetBoard(); // restarts board
    }
  }
}

void file_selector_reset_callack() {

  SysMgr.ResetBoard(); // restarts board
}

void setup() {

  notify.notification_init();
  load_persistent_settings(&SETTINGS);
  motor_setup();
  Serial.begin(115200, SERIAL_8N1);
  uint32_t timeout = 100;
  uint32_t startTime = millis();
  while (!Serial && millis() - startTime < timeout) {
    continue;
  }
  if (SD.begin() && SD.exists(FILIGREE_STARTUP_FILE_NAME) &&
      SD.exists(FILIGREE_FILE_NAME) && SD.exists(FILIGREE_FILES[0]) &&
      SD.exists(FILIGREE_FILES[1]) && SD.exists(FILIGREE_FILES[2])) {
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
    attachInterrupt(digitalPinToInterrupt(start_pause_button_pin),
                    start_pause_button_callback, RISING);
    attachInterrupt(digitalPinToInterrupt(door_open_close_pin),
                    door_open_close_callback, CHANGE);
    attachInterrupt(digitalPinToInterrupt(filament_sensor_pin),
                    filament_callback, CHANGE);
    attachInterrupt(digitalPinToInterrupt(emergency_button_pin),
                    emergency_callback, CHANGE);

    attachInterrupt(digitalPinToInterrupt(file_selector_pin_1),
                    file_selector_reset_callack, CHANGE);
    attachInterrupt(digitalPinToInterrupt(file_selector_pin_2),
                    file_selector_reset_callack, CHANGE);

    while (!digitalRead(emergency_button_pin)) {
      Log("emergency");
      notify.show(notify.emergency);
      isEmergencyState = true;
    }

    while (!isButton) {
      Log("inital");
      if (isEmergencyTriggered) {
        notify.show(notify.emergency);
      }

      else
        notify.show(notify.initialCondition);

      if (!digitalRead(door_open_close_pin)) {
        isDoorOpened = true;
      } else {
        isDoorOpened = false;
      }

      if (digitalRead(filament_sensor_pin)) {
        isFilamentPresent = true;
      } else {
        isFilamentPresent = false;
      }
    }

    if (!isDoorOpened && isFilamentPresent && !isEmergencyState) {
      Log("playing startup...");
      // call tower light green
      notify.show(notify.running);
      startup();
    }
    uint8_t file_bit_1 = digitalRead(file_selector_pin_1) << 1;
    uint8_t file_bit_2 = digitalRead(file_selector_pin_2);

    FILIGREE_PLAY = FILIGREE_FILES[(file_bit_1 + file_bit_2)];
    filigreeFile = SD.open(FILIGREE_PLAY);
  }

  delay(100);
}

void startup() {
  File startupFile = SD.open(FILIGREE_STARTUP_FILE_NAME);

  while (startupFile.available()) {
    if (isEmergencyTriggered || !isRunning) {
      break;
    }
    String line = startupFile.readStringUntil('\n');
    if (line.length() == 0 || line[0] == '#') {
      continue;
    } else {
      Serial.println(createMessage(executeCommand(line), PARAM_COUNT));
    }
  }
  // startupFile.flush();
  startupFile.close();

  isStartupRequired = false;
}

void loop() {

  if (isMaster) {
    if (isEmergencyTriggered) {
      Serial.println(isEmergencyTriggered);

      Serial.println(createMessage(executeCommand("0,19,1,0,0"), PARAM_COUNT));

      motors_disable();
      isEmergencyTriggered = false;
      isRunning = false;

      return;
    }

    if (!isRunning) {
      return;
    }

    if (isStartupRequired) {
      isStartupRequired = false;
      startup();
      filigreeFile.seek(0);
    }

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
  // motors_wait(1);
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

  case static_cast<int>(Commands::MotorGetVelocity): {
    res[PARAM_RESPONSE_RESULT] = get_velocity();
    break;
  }

  case static_cast<int>(Commands::MotorSetVelocity): {
    res[PARAM_RESPONSE_RESULT] = set_velocity(req[PARAM_COMMAND_PARAM]);
    break;
  }

  case static_cast<int>(Commands::MotorGetAcceleration): {
    res[PARAM_RESPONSE_RESULT] = get_accleration();
    break;
  }

  case static_cast<int>(Commands::MotorSetAcceleration): {
    res[PARAM_RESPONSE_RESULT] = set_acceleration(req[PARAM_COMMAND_PARAM]);
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
