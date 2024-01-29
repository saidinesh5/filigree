// Thanks to: https://github.com/tigoe/html-for-conndev/blob/main/webSerial/webserial.js

class MotorController {
  public port?: SerialPort;
  constructor(private onConnectionStatusChanged: (isConnected: boolean) => {}) {
    navigator.serial.addEventListener("connect", this.serialConnect);
    navigator.serial.addEventListener("disconnect", this.serialDisconnect);
  }

  async openPort() {
    try {
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 9600 });
    } catch (err) {
      console.error("There was an error opening the serial port:", err);
    }
  }

  async closePort() {
    if (this.port) {
      this.port.readable?.getReader().cancel();
      await this.port.close();
      this.port = undefined;
    }
  }

  async sendSerial(data: object) {
    // if there's no port open, skip this function:
    if (!this.port) return;
    // if the port's writable:
    if (this.port.writable) {
      const writer = this.port.writable.getWriter();
      var output = new TextEncoder().encode(JSON.stringify(data));
      await writer.write(output).then();
      writer.releaseLock();
    }
  }

  async readSerialString(): Promise<string> {
    let result = "";
    let textDecoder = new TextDecoder();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    while (this.port && this.port.readable) {
      reader = this.port?.readable?.getReader();
      try {
        const { value, done } = await reader.read();
        if (value) {
          result += textDecoder.decode(value);
        }
        if (done) {
          break;
        }
      } catch (err) {
        console.error(err);
      } finally {
        reader.releaseLock();
      }
    }

    return result;
  }

  // this event occurs every time a new serial device
  // connects via USB:
  serialConnect(event: Event) {
    console.log(event.target, "connected");
  }

  // this event occurs every time a new serial device
  // disconnects via USB:
  serialDisconnect(event: Event) {
    console.log(event.target, "disconnected");
    if (event.target == this.port) {
      this.port = undefined;
      this.onConnectionStatusChanged(false);
    }
  }
}
