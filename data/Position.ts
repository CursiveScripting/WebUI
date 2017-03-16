namespace Cursive {
    export class Position
    {
        constructor(public x: number, public y: number) { }
    }

    export class Orientation extends Position
    {
        constructor(x: number, y: number, public angle: number) {
            super(x, y);
        }
    }
}