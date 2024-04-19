#include <Arduino.h>

#define RED_LIGHT IO0
#define ORANGE_LIGHT IO1
#define GREEN_LIGHT IO2

void tower_lamp_init() {
  pinMode(RED_LIGHT, OUTPUT);
  pinMode(ORANGE_LIGHT, OUTPUT);
  pinMode(GREEN_LIGHT, OUTPUT);
}



void reset_indication(uint32_t color) { digitalWrite(color, LOW); }

void set_indication(uint32_t color) {
  switch (color) {
  case RED_LIGHT:
    reset_indication(ORANGE_LIGHT);
    reset_indication(GREEN_LIGHT);
    break;

  case ORANGE_LIGHT:
    reset_indication(GREEN_LIGHT);
    reset_indication(RED_LIGHT);

    break;

  case GREEN_LIGHT:
    reset_indication(RED_LIGHT);
    reset_indication(ORANGE_LIGHT);

    break;
  default:
    break;
  }
  digitalWrite(color, HIGH);
}
