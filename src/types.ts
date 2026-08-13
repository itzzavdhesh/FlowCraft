/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShapeType = 'terminator' | 'process' | 'decision' | 'io';
export type LayoutDirection = 'vertical' | 'horizontal';

export interface Branch {
  id: string;
  label: string;
  targetId?: string;
}

export interface Block {
  id: string;
  type: ShapeType;
  label: string;
  targetId?: string; // For standard nodes (terminator, process, io)
  yesLabel?: string; // For decision nodes
  noLabel?: string;  // For decision nodes
  yesTargetId?: string; // Target for "Yes" branch
  noTargetId?: string;  // Target for "No" branch
  groupId?: string;      // Optional parent group ID
  groupLabel?: string;   // Optional parent group label
  isGroupCollapsed?: boolean; // Optional group collapse state
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
