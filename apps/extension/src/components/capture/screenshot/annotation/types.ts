/**
 * Annotation tool & shape types.
 *
 * Drawing is shape-based (vector list), not raster — every stroke / shape
 * is stored as an object so the select tool can hit-test, highlight, and
 * delete individual items.
 */
export type DrawTool =
  | 'grab'
  | 'pen'
  | 'rect'
  | 'circle'
  | 'arrow'
  | 'text'
  | 'blur';

export interface PenPt { x: number; y: number; w: number }

export interface PenShape    { type: 'pen';    pts: PenPt[]; color: string }
export interface RectShape   { type: 'rect';   x1: number; y1: number; x2: number; y2: number; color: string; lw: number }
export interface CircleShape { type: 'circle'; x1: number; y1: number; x2: number; y2: number; color: string; lw: number }
export interface ArrowShape  { type: 'arrow';  x1: number; y1: number; x2: number; y2: number; color: string; lw: number }
export interface TextShape   { type: 'text';   x: number;  y: number;  text: string; color: string; fontSize: number }
export interface BlurShape   { type: 'blur';   x: number;  y: number;  w: number; h: number }

export type Shape = PenShape | RectShape | CircleShape | ArrowShape | TextShape | BlurShape;
