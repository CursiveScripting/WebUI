export interface ICoord {
    x: number;
    y: number;
}

export interface ISize {
    width: number;
    height: number;
}

export interface IRect extends ICoord, ISize {}