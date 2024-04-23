#include <Arduino.h>

#define tower_red_light IO0
#define tower_orange_light IO1
#define tower_green_light IO2
#define button_green_light IO3

void tower_lamp_init() {
  pinMode(tower_red_light, OUTPUT);
  pinMode(tower_orange_light, OUTPUT);
  pinMode(tower_green_light, OUTPUT);
  pinMode(button_green_light, OUTPUT);
}

void reset_indication(uint32_t color) { digitalWrite(color, LOW); }

void set_indication(uint32_t color) {
  switch (color) {
  case tower_red_light:
    reset_indication(tower_orange_light);
    reset_indication(tower_green_light);
    break;

  case tower_orange_light:
    reset_indication(tower_green_light);
    reset_indication(tower_red_light);

    break;

  case tower_green_light:
    reset_indication(tower_red_light);
    reset_indication(tower_orange_light);

    break;
  default:
    break;
  }
  digitalWrite(color, HIGH);
}
