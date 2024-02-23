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
    await this.runCommand([
      MotorController.nextRequestId(),
      MotorCommands.MotorRelativeMove,
      this.controller.id,
      this.id,
      value
    ])
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
    return [
      MotorController.nextRequestId(),
      MotorCommands.MotorAbsoluteMove,
      this.controller.id,
      this.id,
      this.angle
    ]
  }

  getCutCommand(): MotorCommand | undefined {
    if (this.motorType === MotorType.CutterBottom) {
      return [
        MotorController.nextRequestId(),
        MotorCommands.MotorCutMove,
        this.controller.id,
        this.id,
        142
      ]
    } else if (this.motorType === MotorType.CutterTop) {
      return [
        MotorController.nextRequestId(),
        MotorCommands.MotorCutMove,
        this.controller.id,
        this.id,
        122
      ]
    } else {
      return undefined
    }
  }

  save() {
    this.lastSavedAngle = this.angle
  }
}
