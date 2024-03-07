import { makeAutoObservable } from 'mobx'
import { MotorCommand, MotorCommands, serializeCommand } from './MotorCommand'
import MotorController from './MotorController'
import { toast } from 'react-toastify'

export enum MotorType {
  Default = 0,
  Extruder = 1,
  CutterBottom = 2,
  CutterTop = 3,
  Disabled = 4
}

export class Motor {
  public angle: number = 0
  public lastSavedAngle: number = 0

  constructor(
    private controller: MotorController,
    public id: number,
    public motorType: MotorType,
    public displayIndex: number
  ) {
    makeAutoObservable(this)
  }

  async setMotorType(value: number) {
    if (value >= MotorType.Default && value <= MotorType.Disabled) {
      this.motorType = value
      let result = await this.runCommand([
        MotorController.nextRequestId(),
        MotorCommands.MotorSetType,
        this.controller.id,
        this.id,
        value
      ])

      console.log('done: ', result)
    } else {
      toast.error(`Invalid motor type: ${value}`)
    }
  }

  async fetchMotorType() {
    this.motorType = await this.runCommand([
      MotorController.nextRequestId(),
      MotorCommands.MotorGetType,
      this.controller.id,
      this.id
    ])

    console.log(`Motor id: ${this.id} ; type: ${this.motorType}`)
  }

  async moveTo(value: number) {
    this.angle = value

    console.info(`Motor ${this.displayIndex}: Move to : ${value} ...`)
    let result = await this.runCommand([
      MotorController.nextRequestId(),
      MotorCommands.MotorAbsoluteMove,
      this.controller.id,
      this.id,
      this.angle
    ])
    console.info('done: ', result)
  }

  async moveBy(value: number) {
    this.angle += value

    console.log(`Motor ${this.displayIndex}: Move by : ${value}`)
    let result = await this.runCommand([
      MotorController.nextRequestId(),
      MotorCommands.MotorRelativeMove,
      this.controller.id,
      this.id,
      value
    ])
    console.info('done: ', result)
  }

  async undo() {
    if (this.angle != this.lastSavedAngle) {
      this.angle = this.lastSavedAngle
      this.moveTo(this.angle)
    }
  }

  async reset() {
    this.angle = 0
    this.lastSavedAngle = 0
    await this.runCommand([
      MotorController.nextRequestId(),
      MotorCommands.MotorReset,
      this.controller.id,
      this.id
    ])
  }

  get hasChanged() {
    return this.angle != this.lastSavedAngle
  }

  async runCommand(command: MotorCommand): Promise<number> {
    try {
      const result = await this.controller.sendRequest(command)
      return result
    } catch (err) {
      console.error(`Error executing ${command}:`, err)
      toast.error(`Error executing ${serializeCommand(command)}:`)
      return -1
    }
  }

  getMoveCommand(): MotorCommand {
    if (this.motorType == MotorType.Extruder) {
      return [
        MotorController.nextRequestId(),
        MotorCommands.MotorRelativeMove,
        this.controller.id,
        this.id,
        this.angle
      ]
    } else {
      return [
        MotorController.nextRequestId(),
        MotorCommands.MotorAbsoluteMove,
        this.controller.id,
        this.id,
        this.angle
      ]
    }
  }

  getDelayCommand(): MotorCommand {
    return [MotorController.nextRequestId(), MotorCommands.MotorDelay, 0, 0, 50]
  }

  getCutEndCommand(): MotorCommand | undefined {
    if (this.motorType === MotorType.CutterBottom) {
      return [
        MotorController.nextRequestId(),
        MotorCommands.MotorCutMove,
        this.controller.id,
        this.id,
        0
      ]
    } else if (this.motorType === MotorType.CutterTop) {
      return [
        MotorController.nextRequestId(),
        MotorCommands.MotorCutMove,
        this.controller.id,
        this.id,
        0
      ]
    } else {
      return undefined
    }
  }

  getCutStartCommand(): MotorCommand | undefined {
    if (this.motorType === MotorType.CutterBottom) {
      return [
        MotorController.nextRequestId(),
        MotorCommands.MotorCutMove,
        this.controller.id,
        this.id,
        135
      ]
    } else if (this.motorType === MotorType.CutterTop) {
      return [
        MotorController.nextRequestId(),
        MotorCommands.MotorCutMove,
        this.controller.id,
        this.id,
        124
      ]
    } else {
      return undefined
    }
  }

  save() {
    if (this.motorType == MotorType.Extruder) {
      this.lastSavedAngle = 0
      this.angle = 0
    } else {
      this.lastSavedAngle = this.angle
    }
  }
}
