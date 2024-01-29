import { makeAutoObservable } from "mobx";
import { MotorCommand, MotorCommands } from "./MotorCommand";

export enum MotorType {
  Default = 0,
  Extruder = 1,
  CutterBottom = 2,
  CutterTop = 3,
}

export class Motor {
  public angle: number = 0;
  public lastSavedAngle: number = 0;

  constructor(
    public id: number,
    public motorType: MotorType,
    private port: MotorController,
  ) {
    makeAutoObservable(this);
  }

  async moveTo(value: number) {
    this.angle = value;
    console.info(`Motor ${this.id}: Move to : ${value}`);
    await this.runCommand([
      MotorCommands.MotorAbsoluteMove,
      this.id,
      this.angle,
    ]);
  }

  // deprecated
  async moveBy(value: number) {
    this.angle += value;
    console.log(`Motor ${this.id}: Move by : ${value}`);
    await this.runCommand([MotorCommands.MotorAbsoluteMove, this.id, value]);
  }

  async undo() {
    this.angle = this.lastSavedAngle;
    this.moveTo(this.angle);
  }

  async reset() {
    this.angle = 0;
    this.lastSavedAngle = 0;
    await this.runCommand([MotorCommands.MotorReset, this.id]);
  }

  get hasChanged() {
    return this.angle != this.lastSavedAngle;
  }

  async runCommand(command: MotorCommand): Promise<boolean> {
    return false;
  }

  getCommand(): MotorCommand {
    return [MotorCommands.MotorAbsoluteMove, this.id, this.angle];
  }

  save() {
    this.lastSavedAngle = this.angle;
  }
}
