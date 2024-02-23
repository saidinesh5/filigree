// Thanks to: https://github.com/tigoe/html-for-conndev/blob/main/webSerial/webserial.js

import { makeAutoObservable } from 'mobx'
import {
  MessageParam,
  MotorCommand,
  MotorCommands,
  deserializeCommand,
  serializeCommand
} from './MotorCommand'
import { sleep } from './utils'

interface RequestTracker {
  resolver: (value: any) => void
  rejecter: (value: any) => void
}

export default class MotorController {
  public port?: SerialPort
  public isConnected: boolean = false
  public motorCount: number = 4
  private static requestId: number = 0

  private activeRequests: { [requestID: number]: RequestTracker } = {}
  public statusRequestTimeout: number = 3000
  public motorMoveRequestTimeout: number = 5000
  private buffer: string = ''
  private bufferReadTimeout: number = 10
  private bufferPollerTimer: number | undefined
  private outbox: MotorCommand[] = []

  constructor(public id: number) {
    makeAutoObservable(this)
  }

  static nextRequestId() {
    return MotorController.requestId++
  }

  async startPollingBuffer() {
    this.bufferPollerTimer = setTimeout(async () => {
      const response = await this.readBufferLineTimeout(this.bufferReadTimeout)
      if (response.length > 0) {
        const id = response[MessageParam.PARAM_REQUEST_ID]
        if (id in this.activeRequests) {
          if (response[MessageParam.PARAM_RESPONSE_ERROR]) {
            this.activeRequests[id].resolver(
              response[MessageParam.PARAM_RESPONSE_ERROR]
            )
          } else {
            this.activeRequests[id].resolver(
              response[MessageParam.PARAM_RESPONSE_RESULT]
            )
          }
          delete this.activeRequests[id]
        } else {
          console.error('dropping response:', response)
        }
      }

      // Write out any pending messages before trying to read any new ones
      while (this.outbox.length > 0) {
        try {
          await this.sendSerial(this.outbox.shift()!)
        } catch (err) {
          console.error(err)
        }
      }

      this.startPollingBuffer()
    }, this.bufferReadTimeout)
  }

  async stopPollingBuffer() {
    if (this.bufferPollerTimer) {
      clearTimeout(this.bufferPollerTimer)
      this.bufferPollerTimer = undefined
    }
  }

  async openPort() {
    try {
      this.port = await navigator.serial.requestPort()
      if (!this.port.writable) await this.port.open({ baudRate: 57600 })

      // Wait until the setup is over
      await sleep(2000)

      this.startPollingBuffer()

      try {
        this.motorCount = await this.sendRequest([
          MotorController.nextRequestId(),
          MotorCommands.MotorsCount,
          this.id
        ]).then()
        console.log('Motor Count: ', this.motorCount)

        // Initialize the motors
        await this.sendRequest([
          MotorController.nextRequestId(),
          MotorCommands.MotorsInitialize,
          this.id
        ]).then()
      } catch (err) {
        console.error(err)
      }

      this.isConnected = this.port.writable ? true : false
    } catch (err) {
      console.error('There was an error opening the serial port:', err)
    }
  }

  async closePort() {
    if (this.port) {
      await this.stopPollingBuffer()
      await sleep(this.bufferReadTimeout)
      await this.port.readable?.cancel()
      await this.port.writable?.abort()
      await this.port.close()
      this.motorCount = 0
      this.port = undefined
    }

    this.isConnected = false
    this.stopPollingBuffer()
  }

  async sendSerial(data: number[]) {
    // console.log(JSON.stringify(data), this.port, this.port?.writable);
    if (this.port && this.port.writable) {
      const writer = this.port.writable.getWriter()
      var output = new TextEncoder().encode(serializeCommand(data))
      await writer.write(output).then()
      console.log('Sent: ', serializeCommand(data))
      writer.releaseLock()
    }
  }

  async readBufferLineTimeout(timeout: number): Promise<number[]> {
    const textDecoder = new TextDecoder()
    let reader = this.port?.readable?.getReader()

    const timer = setTimeout(() => {
      reader?.cancel()
    }, timeout)

    let result: number[] = []

    while (reader) {
      const { value, done } = await reader.read()
      if (value) {
        this.buffer += textDecoder.decode(value)
      }
      const lineBreakIndex = this.buffer.indexOf('\n')
      if (lineBreakIndex >= 0) {
        console.log(
          'Received: ',
          this.buffer.substring(0, lineBreakIndex).trim()
        )
        try {
          result = deserializeCommand(
            this.buffer.substring(0, lineBreakIndex).trim()
          )
          this.buffer = this.buffer.substring(lineBreakIndex + 1)
        } catch (err) {}
        break
      }
      if (done) {
        break
      }
    }

    reader?.releaseLock()
    clearTimeout(timer)
    return result
  }

  async sendRequest(command: MotorCommand): Promise<Promise<number>> {
    const requestId = command[MessageParam.PARAM_REQUEST_ID]
    let commandId = command[MessageParam.PARAM_COMMAND_ID]
    let timeout =
      commandId >= MotorCommands.MotorAbsoluteMove &&
      commandId <= MotorCommands.MotorCutMove
        ? this.motorMoveRequestTimeout
        : this.statusRequestTimeout
    // await this.sendSerial(command)
    this.outbox.push(command)

    const self = this
    return new Promise((resolve, reject) => {
      self.activeRequests[requestId] = {
        resolver: resolve,
        rejecter: reject
      }
      setTimeout(() => {
        if (self.activeRequests[requestId]) {
          delete self.activeRequests[requestId]
          reject('Request timed out!')
        }
      }, timeout)
    })
  }
}

// TODO: Handle BOM
// TODO: See what https://fmgrafikdesign.gitbook.io/simplewebserial/ does
