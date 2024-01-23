#include <SPI.h>
#include <Ethernet.h>
#include <stdint.h>
#include "ClearCore.h"

///////////////////////////
// Ethernet stuff
// Configure with a manually assigned IP address
byte mac[] = { 0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xED }; // ClearCore MAC address
IPAddress ip = IPAddress(192, 168, 0, 100); // Set ClearCore's IP address
const int PORT_NUM = 8888; // The port number on the server over which packets will be sent/received
const int MAX_PACKET_LENGTH = 100; // The maximum number of characters to receive from an incoming packet
unsigned char packetReceived[MAX_PACKET_LENGTH]; // Buffer for holding received packets

// Initialize the ClearCore as a server listening for incoming
// client connections on specified port (8888 by default)
EthernetServer server = EthernetServer(PORT_NUM);

////////////////////////////
// Motor stuff
MotorDriver *motors[] = { &ConnectorM0, &ConnectorM1, &ConnectorM2, &ConnectorM3 };

const long homing_velocity_limit = 10000;
const long velocityLimit = 200;         // 10,000 steps per sec
const long accelerationLimit = 100000;  // pulses per sec^2
const long resolution = 1600;           // number of steps for 1 revolution
const long cutting_velocity = 60000;
const long cutting_acceleration = 2000000;

//////////////////////////////////////////////////////////////////
bool isLogging = true;
void Log(const char msg[]) {
  if (isLogging) {
    Serial.println(msg);
  }
}

const uint8_t motor_count() {
  return sizeof(motors)/sizeof(motors[0]);
}

uint32_t motor_status(int motor_id) {
  return motors[motor_id]->StatusReg().reg;
}

uint32_t motor_alerts(int motor_id) {
  return motors[motor_id]->AlertReg().reg;
}

uint32_t motor_move(int motor_id, float angle, bool is_cutting = false, bool is_absolute = true) {
  MotorDriver *motor = motors[motor_id];

  if (motor->StatusReg().bit.AlertsPresent) {
    return motor->StatusReg().reg;
  }

  if (is_cutting) {
    motor->VelMax(cutting_velocity);
    motor->AccelMax(cutting_acceleration);
  } else {
    motor->VelMax(velocityLimit);
    motor->AccelMax(accelerationLimit);
  }

  Log("Moving motors at particular velocity and position");

  if (is_absolute) {
    motor->Move(angle * resolution / 360.0, MotorDriver::MOVE_TARGET_ABSOLUTE);
  } else {
    motor->Move(angle * resolution / 360.0);
  }

  while ((!motor->StepsComplete() || motor->HlfbState() != MotorDriver::HLFB_ASSERTED) && !motor->StatusReg().bit.AlertsPresent) {
    MotorDriver::HlfbStates hlfbState = motor->HlfbState();

    // Write the HLFB state to the serial port
    if (hlfbState == MotorDriver::HLFB_HAS_MEASUREMENT) {
      // Writes the torque measured, as a percent of motor peak torque rating
      if (int(round(motor->HlfbPercent())) < 0) break;
    }
  }

  Log("Move completed");
  return motor->AlertReg().reg;
}

uint32_t motor_reset(int motor_id) {
  MotorDriver *motor = motors[motor_id];
  motor->HlfbMode(MotorDriver::HLFB_MODE_HAS_BIPOLAR_PWM);  // sets the motors HLFB mode to bipolar PWM
  motor->HlfbCarrier(MotorDriver::HLFB_CARRIER_482_HZ);  // sets the HLFB carrier frequency to 482 Hz
  motor->VelMax(velocityLimit);
  motor->AccelMax(accelerationLimit);  // sets the max acceleration for each move
  motor->EnableRequest(true);
  Log("Motor Enabled, Waiting for HLFB...");
  // Waits for HLFB to assert (waits for homing to complete if applicable)
  while (motor->HlfbState() != MotorDriver::HLFB_ASSERTED && !motor->StatusReg().bit.AlertsPresent);

  if (!motor->PolarityInvertSDDirection(true)) {
    while (true);
  }
  Log("HLFB asserted");
  return motor->AlertReg().reg;
}

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
  uint32_t timeout = 5000;
  uint32_t startTime = millis();
  while (!Serial && millis() - startTime < timeout) {
    continue;
  }

  // Ethernet stuff
  // Make sure the physical link is active before continuing
  while (Ethernet.linkStatus() == LinkOFF) {
    Serial.println("The Ethernet cable is unplugged...");
    delay(10);
  }

  Ethernet.begin(mac, ip);
  Serial.println("Assigned manual IP address: ");
  Serial.println(Ethernet.localIP());

  server.begin();

  // Motor setup ////////////////////////////////////////////
  MotorMgr.MotorInputClocking(MotorManager::CLOCK_RATE_NORMAL);  // input clocking rate
  MotorMgr.MotorModeSet(MotorManager::MOTOR_ALL,
                        Connector::CPM_MODE_STEP_AND_DIR);  // sets all motor connectors to step and direction mode
  ///////////////////////////////////////////////////////
}

void loop() {
  int current_motor_num;
  EthernetClient client = server.available();

  if (client.connected() && client.available() > 0) {
    // TODO: Fill out RPC code
    // Commands to support:
    // enum class Commands {
    // MotorsCount = 0,        // () -> uint32_t uint8 should be enough
    // MotorAngle = 1,         // (motor_id: uint8_t) -> float
    // MotorStatus = 2,        // (motor_id: uint8_t) -> uint32_t // As per MotorDriver.h
    // MotorAlerts = 3,        // (motor_id: uint8_t) -> uint32_t // As per MotorDriver.h
    // MotorAbsoluteMove = 4,  // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
    // MotorRelativeMove = 5   // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
    // MotorCutMove = 6        // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
    // MotorReset = 7          // (motor_id: uint8_t)  -> uint32_t // Motor_alerts
    // };
  }
}
