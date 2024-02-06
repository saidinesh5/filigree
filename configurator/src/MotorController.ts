// Thanks to: https://github.com/tigoe/html-for-conndev/blob/main/webSerial/webserial.js

import { action, makeObservable, observable } from "mobx";

export default class MotorController {
  public port?: SerialPort;
  public isConnected: boolean = false;
  public motorCount: number = 4;

  private activeRequests: { requestID: number; callback: () => {} } = {};

  constructor(public id: number) {
    makeObservable(this, {
      isConnected: observable,
      motorCount: observable,
      updateConnectionStatus: action,
    });
  }

  updateConnectionStatus(value: boolean) {
    this.isConnected = value;
  }

  async openPort() {
    try {
      this.port = await navigator.serial.requestPort();
      // if(!this.port.) await this.port.open({ baudRate: 9600 });
      this.updateConnectionStatus(this.port?.readable ? true : false);
      console.log("~~~", this.port.getInfo());
      console.log("~~", await this.readSerialString());
    } catch (err) {
      console.error("There was an error opening the serial port:", err);
    }
  }

  async closePort() {
    if (this.port) {
      this.port.readable?.getReader().cancel();
      await this.port.close();
      this.port = undefined;
      this.updateConnectionStatus(false);
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

  async doRequest(): Promise<any> {
    return {};
  }
}
