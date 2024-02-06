import { makeAutoObservable } from "mobx";
import { MotorCommand, MotorCommands } from "./MotorCommand";
import MotorController from "./MotorController";

export enum MotorType {
  Default = 0,
  Extruder = 1,
  CutterBottom = 2,
  CutterTop = 3,
  Disabled = 4,
}

export class Motor {
  public angle: number = 0;
  public lastSavedAngle: number = 0;

  constructor(
    private controller: MotorController,
    public id: number,
    public motorType: MotorType,
    public displayIndex: number,
  ) {
    makeAutoObservable(this);
  }

  async moveTo(value: number) {
    this.angle = value;
    console.info(`Motor ${this.displayIndex}: Move to : ${value}`);
    await this.runCommand([
      MotorCommands.MotorAbsoluteMove,
      this.controller.id,
      this.id,
      this.angle,
    ]);
  }

  // deprecated
  async moveBy(value: number) {
    this.angle += value;
    console.log(`Motor ${this.displayIndex}: Move by : ${value}`);
    await this.runCommand([
      MotorCommands.MotorAbsoluteMove,
      this.controller.id,
      this.id,
      value,
    ]);
  }

  async undo() {
    this.angle = this.lastSavedAngle;
    this.moveTo(this.angle);
  }

  async reset() {
    this.angle = 0;
    this.lastSavedAngle = 0;
    await this.runCommand([
      MotorCommands.MotorReset,
      this.controller.id,
      this.id,
    ]);
  }

  get hasChanged() {
    return this.angle != this.lastSavedAngle;
  }

  async runCommand(command: MotorCommand): Promise<boolean> {
    return false;
  }

  getCommand(): MotorCommand {
    return [
      MotorCommands.MotorAbsoluteMove,
      this.controller.id,
      this.id,
      this.angle,
    ];
  }

  save() {
    this.lastSavedAngle = this.angle;
  }
}
