export const gridSize = 24;

export function growToFitGrid(val: number) {
    return Math.ceil((val - 1) / gridSize) * gridSize + 1;
}

export function alignToGrid(val: number) {
    return Math.round(val / gridSize) * gridSize;
}