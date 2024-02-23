# Filigree

This is the firmware that runs on the Filigree machine

## Requirements:

- Arduino IDE with [ClearCore packages set up](https://teknic.com/products/io-motion-controller/clearcore-arduino-wrapper/)

## Notes:

There is a simulator build available, that lets you flash the firmware to a regular Arduino Uno.
To build the simulator version, uncomment the `#define SIMULATOR` in [firmware.ino](firmware.ino)

```c++
//firmware.ino
#define SIMULATOR

```
