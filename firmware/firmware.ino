#include <SPI.h>
#include <Ethernet.h>
#include <stdint.h>
#include "ClearCore.h"
#include "third-party/ArduinoJson/ArduinoJson.h"

#include <SPI.h>
#include <SD.h>
#include "NvmManager.h"

namespace ClearCore {
extern NvmManager &NvmMgr;
}
/* 
Notes:
id => 0,1,2,3

*/
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
const long homing_velocity_limit = 10000; //10000
const long velocityLimit = 200;     //200    // 10,000 steps per sec
const long accelerationLimit = 100000; //100000  // pulses per sec^2
const long resolution = 1600;  //1600         // number of steps for 1 revolution
const long cutting_velocity = 6000; //60000
const long cutting_acceleration = 2000000; //2000000

union motor_type {
  int data;
  char motor[4];

};

//////////////////////////////////////////////////////////////////

    enum class Commands {
    MotorsInitialize = 0,        // () -> uint32_t uint8 should be enough
    MotorsCount = 1,         // (motor_id: uint8_t) -> float
    MotorStatus = 2,        // (motor_id: uint8_t) -> uint32_t // As per MotorDriver.h
    MotorAlerts = 3,        // (motor_id: uint8_t) -> uint32_t // As per MotorDriver.h
    MotorAbsoluteMove = 4,  // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
    MotorRelativeMove = 5 ,  // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
    MotorCutMove = 6    ,    // (motor_id: uint8_t, angle: float) -> uint32_t // Motor_alerts
    MotorReset = 7    ,      // (motor_id: uint8_t)  -> uint32_t //  Motor_alerts
    MotorGetType = 8  ,
    MotorSetType =  9     
    };


    enum class MotorType{

      Default =0,
      Extruder=1,
      CutterBottom=2,
      CutterTop=3,
      Disable=4
    };

File myFile;
int master = LOW;  // SD card is not available
int filePosition = 0;

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

uint32_t motor_move(int motor_id, float angle,  MotorDriver::MoveTarget mode, bool is_cutting = false) {
  MotorDriver *motor = motors[motor_id];

  if (motor->StatusReg().bit.AlertsPresent) {
    return motor->AlertReg().reg;
  }

  if (is_cutting) {
    motor->VelMax(cutting_velocity);
    motor->AccelMax(cutting_acceleration);
  } else {
    motor->VelMax(velocityLimit);
    motor->AccelMax(accelerationLimit);
  }

  Log("Moving motors at particular velocity and position");


  motor->Move(angle * resolution / 360.0, mode);


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

uint32_t motor_angle(){
  int angle=0; //find the parameter where you can find angle
return angle;
  
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
  delay(50);
  return motor->AlertReg().reg;
}

uint8_t motor_init_flag= false;
uint32_t motors_initalize(){


  if(motor_init_flag){
    return false;
  }

  else{
    motor_init_flag= true;
    for (int motor_id = 0; motor_id<motor_count();motor_id++)
    {
      motor_reset(motor_id);
    }
    return true;
  }


}


uint32_t motor_get_type(int motor_id) {
    motor_type get_mtr;
    get_mtr.data = NvmMgr.Int32(NvmManager::NVM_LOC_USER_START);
    if (get_mtr.data == 0) {
        return 0;
    } else {
        return static_cast<uint32_t>(get_mtr.motor[motor_id]);
    }
}

uint32_t motor_set_type(int motor_id, int Type) {
    motor_type set_mtr;

    // Read the existing motor_type data from NVM
    set_mtr.data = NvmMgr.Int32(NvmManager::NVM_LOC_USER_START);

    // Update the specific motor type
    if (motor_id >= 0 && motor_id < 4) {
        set_mtr.motor[motor_id] = static_cast<char>(Type);
        NvmMgr.Int32(NvmManager::NVM_LOC_USER_START, set_mtr.data);
    }
}
/////////////////////////////////////////////////////////////////////////



void setup() {

//seeprom_init();
  // put your setup code here, to run once:
  Serial.begin(9600);
  uint32_t timeout = 5000;
  uint32_t startTime = millis();
  while (!Serial && millis() - startTime < timeout) {
    continue;
  }
 
    if (SD.begin()) {
        Serial.println("Initialization done. SD card available.");

        // Check if "steps.txt" exists
        if (SD.exists("STEPS.txt")) {
            Serial.println("steps.txt exists.");
            master = HIGH;  // Set master to high when the file is available
        } else {
            Serial.println("STEPS.txt does not exist.");
        }
    } else {
        Serial.println("Initialization failed! SD card not available.");
    }


  // Ethernet stuff
  // Make sure the physical link is active before continuing
  // while (Ethernet.linkStatus() == LinkOFF) {
  //   Serial.println("The Ethernet cable is unplugged...");
  //   delay(10);
  // }

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

/* 
 json rpc format:
              0         1          2        3
"method": [motor_id,  command, parameter]
"method": [command , cntrl_id, motor_id ,parameter] 



 */
void loop() {
  int current_motor_num;
  JsonDocument doc;
  EthernetClient client = server.available();

  if (master) {
    
    myFile = SD.open("STEPS.txt");

    if (myFile) {
      String line;
      myFile.seek(filePosition);
            
      while (myFile.available()) {
        line = myFile.readStringUntil('\n');

        
        deserializeJson(doc, line);
        filePosition = myFile.position();
        delay(100);
        break;
      }

      if (!myFile.available()) { // for looping to work
        myFile.seek(0);
        filePosition = 0;
      }
      myFile.close();
      if (doc.size() > 0) {
        Serial.println("checked doc size");
        int a = (doc["method"][1]).as<int>();
        if (a == 1){
          Serial.println(a);
        Parse(doc);
        }

        else{
          
          if(client.connected()){

            client.print(line);
            Serial.println("send to slave");
          }
        }
      }
    }
  } 
  
  else {
    if (Serial.available()) {
      deserializeJson(doc, Serial); //
      if (doc.size() > 0) {
        Parse(doc);
      }
    } else if (client.connected() && client.available() > 0) {
      deserializeJson(doc, client);

      if (doc.size() > 0) {
        Parse(doc);
      }
      
    }
  }
}






void Parse(JsonDocument& doc)
{
  JsonDocument res;
  uint8_t _motor_id =   doc["method"][2];
  
  res["id"] = doc["id"];


  Commands command;
  int cmd;
  if (doc.containsKey("method")){

    cmd = doc["method"][0].as<int>();
  }

  switch (cmd)
  { 
    case static_cast<int>(Commands::MotorsInitialize):
      res["Result"]=motors_initalize();
      break;

    case static_cast<int>(Commands::MotorsCount):
    Serial.println("count");
      res["Result"]= motor_count();
    break;

    case static_cast<int>(Commands::MotorStatus):
      res["Result"] = motor_status(doc["method"][2]);
      
      break;

    case static_cast<int>(Commands::MotorAlerts):
     res["Result"] = motor_alerts(doc["method"][2]);
    break; 

    case static_cast<int>(Commands::MotorAbsoluteMove ):

    case static_cast<int>(Commands::MotorRelativeMove) :

    case static_cast<int>(Commands::MotorCutMove ):
    {
      bool _iscut;
      MotorDriver::MoveTarget moveTarget ;
      

      
     _iscut = (cmd == static_cast<int>(Commands::MotorCutMove));
     if (_iscut)
     {
      moveTarget = MotorDriver::MOVE_TARGET_ABSOLUTE;
      Log("cut");
     // Log(moveTarget);
     }
     if (cmd == static_cast<int>(Commands::MotorAbsoluteMove))
     {
       moveTarget =  MotorDriver::MOVE_TARGET_ABSOLUTE;
    //   Log(moveTarget);
       _iscut=false;
     }
     else if (cmd == static_cast<int>(Commands::MotorRelativeMove))
     {
       moveTarget =  MotorDriver::MOVE_TARGET_REL_END_POSN;
   //    Log(moveTarget);
       _iscut=false;
     }

        int a = motor_move(doc["method"][2], static_cast<float>(doc["method"][3]), moveTarget , _iscut);
     res["Result"] = a ;
    }
    break;

    case static_cast<int>(Commands::MotorReset):
    {
      res["Result"] =  motor_reset(doc["method"][2]);
    }
    break;

    case static_cast<int>(Commands::MotorGetType):
    {
      res["Result"] = motor_get_type(doc["method"][2]);
    }
    break;

    case static_cast<int>(Commands::MotorSetType):
    {
      Serial.println("int motor set type");
      res["Result"] = motor_set_type(static_cast<int>(doc["method"][2]),static_cast<int>(doc["method"][3]));
    }


  }

serializeJson (res,Serial);
 
}



