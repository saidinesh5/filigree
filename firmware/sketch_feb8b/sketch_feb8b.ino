#include "ClearCore.h"
#include <Ethernet.h>
#include <SPI.h>
namespace ClearCore {
extern NvmManager &NvmMgr;
}

byte mac[] = {0xDE, 0xAD, 0xBE, 0xEF, 0xFE, 0xEE}; // ClearCore MAC address
IPAddress ip = IPAddress(192, 168, 0, 101);        // Set ClearCore's IP address

const int PORT_NUM = 8888;
EthernetServer server = EthernetServer(PORT_NUM);

EthernetClient client;
unsigned char packetReceived[MAX_PACKET_LENGTH];

void setup() {
  Serial.begin(9600);
  uint32_t timeout = 5000;
  uint32_t startTime = millis();
  while (!Serial && millis() - startTime < timeout) {
    continue;

  }

    Ethernet.begin(mac, ip);
  Log("Assigned manual IP address: ");
  Serial.println(Ethernet.localIP());


}

void loop() {
  // put your main code here, to run repeatedly:
  if(client.read())

}
