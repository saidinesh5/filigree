// Thanks to: https://github.com/tigoe/html-for-conndev/blob/main/webSerial/webserial.js

import { makeAutoObservable } from "mobx";
import {
  MessageParam,
  MotorCommand,
  MotorCommands,
  deserializeCommand,
  serializeCommand,
} from "./MotorCommand";

export default class MotorController {
  public port?: SerialPort;
  public isConnected: boolean = false;
  public motorCount: number = 4;
  private requestId: number = 0;

  private activeRequests: { [requestID: number]: (value: any) => void } = {};
  public statusRequestTimeout: number = 3000;
  public motorMoveRequestTimeout: number = 5000;
  private buffer: string = "";
  private bufferReadTimeout: number = 10;
  private bufferPollerTimer: number | undefined;

  constructor(public id: number) {
    makeAutoObservable(this);
  }

  async startPollingBuffer() {
    this.bufferPollerTimer = setTimeout(async () => {
      const response = await this.readBufferLineTimeout(this.bufferReadTimeout);
      if (response.length > 0) {
        const id = response[MessageParam.PARAM_REQUEST_ID];
        if (id in this.activeRequests) {
          this.activeRequests[id](response);
          delete this.activeRequests[id];
        } else {
          console.error("dropping response:", response);
        }
      }

      this.startPollingBuffer();
    }, this.bufferReadTimeout);
  }

  async stopPollingBuffer() {
    if (this.bufferPollerTimer) {
      clearTimeout(this.bufferPollerTimer);
      this.bufferPollerTimer = undefined;
    }
  }

  async openPort() {
    try {
      this.port = await navigator.serial.requestPort();
      if (!this.port.writable) await this.port.open({ baudRate: 9600 });
      this.isConnected = this.port.writable ? true : false;
      this.startPollingBuffer();

      try {
        console.log(
          "motorCount",
          await this.sendRequest(
            [MotorCommands.MotorsCount, 0],
            this.statusRequestTimeout,
          ).then(),
        );
      } catch (err) {
        console.error(err);
      }
      try {
        console.log(
          "motorCount",
          await this.sendRequest(
            [MotorCommands.MotorsCount, 0],
            this.statusRequestTimeout,
          ).then(),
        );
      } catch (err) {
        console.error(err);
      }
      console.log(
        "motors intialize",
        await this.sendRequest(
          [MotorCommands.MotorsInitialize, 0],
          this.motorMoveRequestTimeout,
        ).then(),
      );

      try {
        console.log(
          "motorCount",
          await this.sendRequest(
            [MotorCommands.MotorsCount, 0],
            this.statusRequestTimeout,
          ).then(),
        );
      } catch (err) {
        console.error(err);
      }
    } catch (err) {
      console.error("There was an error opening the serial port:", err);
    }
  }

  async closePort() {
    if (this.port) {
      await this.stopPollingBuffer();
      await this.port.readable?.cancel();
      await this.port.writable?.abort();
      await this.port.close();
      this.port = undefined;
    }

    this.isConnected = false;
    this.stopPollingBuffer();
  }

  async sendSerial(data: number[]) {
    // console.log(JSON.stringify(data), this.port, this.port?.writable);
    if (this.port && this.port.writable) {
      const writer = this.port.writable.getWriter();
      var output = new TextEncoder().encode(serializeCommand(data));
      await writer.write(output).then();
      writer.releaseLock();
    }
  }

  async readBufferLineTimeout(timeout: number): Promise<number[]> {
    const textDecoder = new TextDecoder();
    let reader = this.port?.readable?.getReader();

    const timer = setTimeout(() => {
      reader?.cancel();
    }, timeout);

    let result: number[] = [];

    while (reader) {
      const { value, done } = await reader.read();
      if (value) {
        this.buffer += textDecoder.decode(value);
      }
      const lineBreakIndex = this.buffer.indexOf("\n");
      if (lineBreakIndex >= 0) {
        console.log("line: ", this.buffer.substring(0, lineBreakIndex).trim());
        try {
          result = deserializeCommand(
            this.buffer.substring(0, lineBreakIndex).trim(),
          );
          this.buffer = this.buffer.substring(lineBreakIndex + 1);
        } catch (err) {}
        break;
      }
      if (done) {
        break;
      }
    }

    reader?.releaseLock();
    clearTimeout(timer);
    return result;
  }

  async sendRequest(
    command: MotorCommand,
    timeout: number,
  ): Promise<Promise<number[]>> {
    const requestId = this.requestId++;
    await this.sendSerial([requestId, ...command]);

    const self = this;
    return new Promise((resolve, reject) => {
      self.activeRequests[requestId] = resolve;
      setTimeout(() => {
        if (self.activeRequests[requestId]) {
          delete self.activeRequests[requestId];
          reject("Request timed out!");
        }
      }, timeout);
    });
  }
}

// TODO: Handle BOM
