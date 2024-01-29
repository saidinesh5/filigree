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

  async moveTo(distance: number) {
    this.angle = distance;
    console.log(`Motor ${this.id}: Move to : ${distance}`);
  }

  async moveBy(distance: number) {
    this.angle += distance;
    console.log(`Motor ${this.id}: Move by : ${distance}`);
  }

  async undo() {
    this.angle = this.lastSavedAngle;
  }

  async reset() {
    this.angle = 0;
  }

  get hasChanged() {
    return this.angle != this.lastSavedAngle;
  }

  async runCommand(command: MotorCommand): Promise<boolean> {
    return true;
  }

  getCommand(): number[] {
    return [MotorCommands.MotorAbsoluteMove, this.id, this.angle];
  }

  save() {
    this.lastSavedAngle = this.angle;
  }
}
