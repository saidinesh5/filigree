#pragma once

#include "ClearCore.h"
#include <Arduino.h>
#include <stdint.h>

// Pin definitions for the LED lights on the tower and the button.
#define tower_red_pin IO0
#define tower_orange_pin IO1
#define tower_green_pin IO2
#define button_green_pin IO3

// Function prototype to configure timer interrupt at a given frequency.
void ConfigurePeriodicInterrupt(uint32_t frequencyHz);

// Forward declaration of interrupt handlers using extern "C" for C linkage.
extern "C" void TCC2_0_Handler(void)
    __attribute__((alias("PeriodicInterruptHandler")));
extern "C" void PeriodicInterruptHandler();

// Priority level for the interrupt, recommended to be >= 4 to avoid conflicts
// with other critical operations.
#define PERIODIC_INTERRUPT_PRIORITY 4
// Macro to acknowledge the periodic interrupt in the interrupt handler.
#define ACK_PERIODIC_INTERRUPT TCC2->INTFLAG.reg = TCC_INTFLAG_MASK

// Frequency settings for LED blinking and stopping.
uint8_t interruptBlinkFreqHz = 1;
uint8_t interruptStopFreqHz = 0;

class Notification {
public:
  // Enum for possible states of the machine.
  enum states {
    emergency = 0,
    initialCondition,
    running,
    pause,
    doorOpened,
    filamentOver
  };

  // Enum for specifying which LED to control.
  enum LED_type { tower_red = 0, tower_orange, tower_green, start_stop_green };

  // Enum for LED operating modes.
  enum LED_modes { solid = 0, blink, off };

  // Show method to control LED based on the machine's current state.
  void show(states state) {
    switch (state) {
    case emergency:
      manageLED(tower_red, solid);
      break;
    case initialCondition:
      manageLED(tower_orange, solid);
      manageLED(start_stop_green, off);
      break;
    case running:
      manageLED(tower_green, solid);
      manageLED(start_stop_green, solid);
      break;
    case pause:
      manageLED(tower_orange, solid);
      manageLED(start_stop_green, solid);
      break;
    case doorOpened:
      manageLED(tower_orange, solid);
      manageLED(start_stop_green, solid);
      break;
    case filamentOver:
      manageLED(tower_orange, blink);
      manageLED(start_stop_green, solid);
      break;
    default:
      break;
    }
  }

  // Hide method to turn off LEDs based on the state.
  void hide(states state) {
    switch (state) {
    case emergency:
      manageLED(tower_red, off);
      break;
    case initialCondition:
      manageLED(tower_orange, off);
      manageLED(start_stop_green, off);
      break;
    case running:
      manageLED(tower_green, off);
      manageLED(start_stop_green, off);
      break;
    case pause:
      manageLED(tower_orange, off);
      manageLED(start_stop_green, off);
      break;
    case doorOpened:
      manageLED(tower_orange, off);
      manageLED(tower_green, off);
      break;
    case filamentOver:
      manageLED(tower_orange, off);
      manageLED(start_stop_green, off);
      break;
    default:
      break;
    }
  }

  // Static initialization function for notification setup.
  static void notification_init() {
    for (int i = 0; i < sizeof(availableLEDs) / sizeof(availableLEDs[0]); i++) {
      pinMode(availableLEDs[i].pin, OUTPUT);
    }
    // Optional: Configure a 1 Hz blinking interrupt.
    // ConfigurePeriodicInterrupt(1);
  }

private:
  // LED structure to hold properties of each LED.
  struct LED {
    uint8_t pin;
    bool isTowerLED;
    LED_modes currentMode;
    bool isBlinking = false;

    LED(uint8_t pin, bool isTowerLED = false)
        : pin(pin), isTowerLED(isTowerLED), currentMode(off) {}

    // Update the LED based on the requested mode.
    void update_LED(LED_modes mode) {
      if (mode != currentMode) {
        currentMode = mode;
        switch (currentMode) {
        case solid:
          digitalWrite(pin, HIGH);
          break;
        case off:
          digitalWrite(pin, LOW);
          if (isBlinking)
            ConfigurePeriodicInterrupt(interruptStopFreqHz);
          break;
        case blink:
          isBlinking = true;
          ConfigurePeriodicInterrupt(interruptBlinkFreqHz);
          // Blink state managed by the interrupt handler.
          break;
        }
      }
    }

    // Toggle the LED state if it is set to blink.
    void toggle() {
      if (currentMode == blink) {
        int state = digitalRead(pin);
        digitalWrite(pin, !state);
      }
    }
  };

  // Array of available LEDs.
  static LED availableLEDs[4];

  static void ConfigurePeriodicInterrupt(uint32_t frequencyHz) {

    CLOCK_ENABLE(APBCMASK, TCC2_);

    // Disable TCC2.
    TCC2->CTRLA.bit.ENABLE = 0;
    SYNCBUSY_WAIT(TCC2, TCC_SYNCBUSY_ENABLE);

    // Reset the TCC module so we know we are starting from a clean state.
    TCC2->CTRLA.bit.SWRST = 1;
    while (TCC2->CTRLA.bit.SWRST) {
      continue;
    }

    if (!frequencyHz) {
      NVIC_DisableIRQ(TCC2_0_IRQn);
      return;
    }

    // Determine the clock prescaler and period value needed to achieve the
    // requested frequency.
    uint32_t period = (CPU_CLK + frequencyHz / 2) / frequencyHz;
    uint8_t prescale;

    period = max(period, 1U);

    // Prescale values 0-4 map to prescale divisors of 1-16,
    // dividing by 2 each increment.
    for (prescale = TCC_CTRLA_PRESCALER_DIV1_Val;
         prescale < TCC_CTRLA_PRESCALER_DIV16_Val && (period - 1) > UINT16_MAX;
         prescale++) {
      period = period >> 1;
    }

    for (; prescale < TCC_CTRLA_PRESCALER_DIV1024_Val &&
           (period - 1) > UINT16_MAX;
         prescale++) {
      period = period >> 2;
    }

    // If we have maxed out the prescaler and the period is still too big,
    // use the maximum period. This results in a ~1.788 Hz interrupt.
    if (period > UINT16_MAX) {
      TCC2->PER.reg = UINT16_MAX;
    } else {
      TCC2->PER.reg = period - 1;
    }
    TCC2->CTRLA.bit.PRESCALER = prescale;

    // Interrupt every period on counter overflow.
    TCC2->INTENSET.bit.OVF = 1;
    // Enable TCC2.
    TCC2->CTRLA.bit.ENABLE = 1;

    NVIC_SetPriority(TCC2_0_IRQn, PERIODIC_INTERRUPT_PRIORITY);
    NVIC_EnableIRQ(TCC2_0_IRQn);
  }

  static void manageLED(LED_type type, LED_modes mode) {
    // Check if the specified LED type is a tower LED and manage accordingly
    if (availableLEDs[type].isTowerLED) {
      for (LED &led : availableLEDs) {
        if (led.isTowerLED) {
          // Only the specified tower LED should be active, others should be
          // turned off
          led.update_LED(led.pin == availableLEDs[type].pin ? mode : off);
        }
      }
    } else {
      // For non-tower LEDs, simply update the mode
      availableLEDs[type].update_LED(mode);
    }
  }

  friend void PeriodicInterruptHandler();
};

// Define static members outside the class
Notification::LED Notification::availableLEDs[4] = {
    Notification::LED(tower_red_pin, true),
    Notification::LED(tower_orange_pin, true),
    Notification::LED(tower_green_pin, true),
    Notification::LED(button_green_pin)};

extern "C" void PeriodicInterruptHandler(void) {
  for (Notification::LED &led : Notification::availableLEDs) {
    led.toggle();
  }
  // Acknowledge the interrupt here, specific to your hardware
  ACK_PERIODIC_INTERRUPT;
}
