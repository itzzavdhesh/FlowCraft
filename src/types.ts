/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShapeType = 'terminator' | 'process' | 'decision' | 'io';

export interface Block {
  id: string;
  type: ShapeType;
  label: string;
  targetId?: string; // For standard nodes (terminator, process, io)
  yesLabel?: string; // For decision nodes
  noLabel?: string;  // For decision nodes
  yesTargetId?: string; // Target for "Yes" branch
  noTargetId?: string;  // Target for "No" branch
  positionOffset?: { x: number; y: number }; // For manual drag offsets
}

export interface CanvasNode {
  block: Block;
  x: number;
  y: number;
  row: number;
  col: number;
}

export interface ToastConfig {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}
