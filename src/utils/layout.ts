/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Block, CanvasNode } from '../types';

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 72;
export const COLUMN_WIDTH = 200;
export const ROW_HEIGHT = 150;
export const DIAMOND_SIZE = 92;
export const DIAMOND_HALF_DIAG = 65;


/**
 * Automatically calculates visual X and Y layout coordinates for a list of blocks.
 * Uses BFS traversal of the connection graph to lay out flow branches.
 */
export function calculateLayout(blocks: Block[]): CanvasNode[] {
  if (blocks.length === 0) return [];

  // 1. Identify roots and parents for each block
  const incomingMap = new Map<string, number>();
  const parentsMap = new Map<string, string[]>();
  
  blocks.forEach((b) => {
    incomingMap.set(b.id, 0);
    parentsMap.set(b.id, []);
  });

  blocks.forEach((b) => {
    const addParent = (childId: string, parentId: string) => {
      if (parentsMap.has(childId)) {
        parentsMap.get(childId)!.push(parentId);
      }
    };
    if (b.type === 'decision') {
      if (b.yesTargetId && b.yesTargetId !== b.id) {
        incomingMap.set(b.yesTargetId, (incomingMap.get(b.yesTargetId) || 0) + 1);
        addParent(b.yesTargetId, b.id);
      }
      if (b.noTargetId && b.noTargetId !== b.id) {
        incomingMap.set(b.noTargetId, (incomingMap.get(b.noTargetId) || 0) + 1);
        addParent(b.noTargetId, b.id);
      }
    } else {
      if (b.targetId && b.targetId !== b.id) {
        incomingMap.set(b.targetId, (incomingMap.get(b.targetId) || 0) + 1);
        addParent(b.targetId, b.id);
      }
    }
  });

  // Find a good starting node (root with 0 incoming, or terminator, or just first node)
  let rootId = blocks[0].id;
  let minIncoming = Infinity;
  
  // Prefer a root with 0 incoming edges
  for (const b of blocks) {
    const inc = incomingMap.get(b.id) || 0;
    if (inc === 0) {
      rootId = b.id;
      break;
    }
    if (inc < minIncoming) {
      minIncoming = inc;
      rootId = b.id;
    }
  }

  const layoutMap = new Map<string, { row: number; col: number }>();
  const occupied = new Set<string>();
  const pending = new Set<string>(blocks.map(b => b.id));

  let iterations = 0;
  const maxIterations = blocks.length * 10; // safety ceiling

  while (pending.size > 0 && iterations < maxIterations) {
    iterations++;
    let placedAny = false;

    for (const bId of pending) {
      const parents = parentsMap.get(bId) || [];
      // Check if all parents are already placed
      const allParentsPlaced = parents.every(pId => layoutMap.has(pId));

      if (allParentsPlaced && (parents.length > 0 || bId === rootId)) {
        placeBlock(bId, parents);
        pending.delete(bId);
        placedAny = true;
        break;
      }
    }

    if (!placedAny) {
      // If we are stuck (cyclic dependency or disconnected components),
      // grab the first pending block and place it
      const firstBId = Array.from(pending)[0];
      if (firstBId) {
        const parents = parentsMap.get(firstBId) || [];
        placeBlock(firstBId, parents.filter(pId => layoutMap.has(pId)));
        pending.delete(firstBId);
      }
    }
  }

  // Handle remaining unconnected blocks
  blocks.forEach((b) => {
    if (!layoutMap.has(b.id)) {
      let row = 0;
      while (occupied.has(`${row},0`)) {
        row++;
      }
      layoutMap.set(b.id, { row, col: 0 });
      occupied.add(`${row},0`);
    }
  });

  // Helper function to place an individual block
  function placeBlock(id: string, placedParents: string[]) {
    const block = blocks.find(b => b.id === id);
    if (!block) return;

    let row = 0;
    let col = 0;

    if (id === rootId) {
      row = 0;
      col = 0;
      while (occupied.has(`${row},${col}`)) {
        row++;
      }
    } else if (placedParents.length === 1) {
      const pId = placedParents[0];
      const parentCoord = layoutMap.get(pId)!;
      const parentBlock = blocks.find(b => b.id === pId);
      
      if (parentBlock?.type === 'decision') {
        if (parentBlock.yesTargetId === id) {
          // YES BRANCH: Placed to the BOTTOM-RIGHT of the diamond
          // Same X position as center + 200px (right column), Y below diamond (+150px)
          row = parentCoord.row + 1;
          col = parentCoord.col + 1;
          while (occupied.has(`${row},${col}`)) {
            row++;
          }
        } else {
          // NO BRANCH: Placed to the BOTTOM-LEFT of the diamond
          // Same X position as center - 200px (left column), Y below diamond (+150px)
          row = parentCoord.row + 1;
          col = parentCoord.col - 1;
          while (occupied.has(`${row},${col}`)) {
            row++;
          }
        }
      } else {
        // STANDARD LINE: placed directly below parent
        row = parentCoord.row + 1;
        col = parentCoord.col;
        while (occupied.has(`${row},${col}`)) {
          row++;
        }
      }
    } else if (placedParents.length > 1) {
      // REJOINING NODE: row is strictly max row of ALL parents + 1
      const parentCoords = placedParents.map(pId => layoutMap.get(pId)!);
      const maxParentRow = Math.max(...parentCoords.map(c => c.row));
      row = maxParentRow + 1;
      
      // col is the average of parent columns (CENTER)
      const sumCols = parentCoords.reduce((sum, c) => sum + c.col, 0);
      col = Math.round(sumCols / parentCoords.length);

      while (occupied.has(`${row},${col}`)) {
        row++;
      }
    } else {
      row = 0;
      col = 0;
      while (occupied.has(`${row},${col}`)) {
        row++;
      }
    }

    layoutMap.set(id, { row, col });
    occupied.add(`${row},${col}`);
  }

  // Convert row and col to absolute X and Y coordinates
  // Start from a base offset and center X around canvas
  return blocks.map((block) => {
    const { row, col } = layoutMap.get(block.id) || { row: 0, col: 0 };
    // col = 0 is centered, col = 1 is shifted right, etc.
    const baseX = 600 + col * COLUMN_WIDTH;
    const baseY = 40 + row * ROW_HEIGHT;
    const offsetX = block.positionOffset ? block.positionOffset.x : 0;
    const offsetY = block.positionOffset ? block.positionOffset.y : 0;
    return {
      block,
      x: baseX + offsetX,
      y: baseY + offsetY,
      row,
      col,
    };
  });
}

export interface SvgLine {
  id: string;
  sourceId: string;
  targetId?: string;
  path: string;
  label?: string;
  labelX: number;
  labelY: number;
  isUnconnected?: boolean;
  unconnectedDir?: 'right' | 'down';
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

/**
 * Calculates connection lines with beautiful bezier curves and arrow directions
 */
export function calculateConnections(nodes: CanvasNode[]): SvgLine[] {
  const lines: SvgLine[] = [];

  // Identify shared target nodes (targeted by more than 1 block)
  const sharedTargets = new Set<string>();
  nodes.forEach((targetCandidate) => {
    let incomingCount = 0;
    nodes.forEach((src) => {
      const b = src.block;
      const targetsTgt = (tgtId: string) => tgtId === targetCandidate.block.id;
      if (b.type === 'decision') {
        if (b.yesTargetId && targetsTgt(b.yesTargetId)) incomingCount++;
        if (b.noTargetId && targetsTgt(b.noTargetId)) incomingCount++;
      } else {
        if (b.targetId && targetsTgt(b.targetId)) incomingCount++;
      }
    });
    if (incomingCount > 1) {
      sharedTargets.add(targetCandidate.block.id);
    }
  });

  nodes.forEach((source) => {
    const block = source.block;

    if (block.type === 'decision') {
      const sourceCx = source.x + NODE_WIDTH / 2;
      const sourceCy = source.y + NODE_HEIGHT / 2;

      // YES BRANCH
      if (block.yesTargetId && block.yesTargetId !== block.id) {
        const target = nodes.find((n) => n.block.id === block.yesTargetId);
        if (target) {
          lines.push(generateConnection(source, target, block.yesLabel || 'Yes', 'yes', sharedTargets.has(target.block.id)));
        } else {
          // If the target is set but somehow not in the nodes, treat as unconnected
          const startX = sourceCx + DIAMOND_HALF_DIAG;
          const startY = sourceCy;
          const endX = startX + 60;
          const endY = startY;
          lines.push({
            id: `${source.block.id}-unconnected-yes`,
            sourceId: source.block.id,
            path: `M ${startX} ${startY} L ${endX} ${endY}`,
            label: block.yesLabel || 'Yes',
            labelX: startX + 25,
            labelY: startY - 14,
            isUnconnected: true,
            unconnectedDir: 'right',
            endX,
            endY,
          });
        }
      } else {
        // Unconnected or pointing to self
        const startX = sourceCx + DIAMOND_HALF_DIAG;
        const startY = sourceCy;
        const endX = startX + 60;
        const endY = startY;
        lines.push({
          id: `${source.block.id}-unconnected-yes`,
          sourceId: source.block.id,
          path: `M ${startX} ${startY} L ${endX} ${endY}`,
          label: block.yesLabel || 'Yes',
          labelX: startX + 25,
          labelY: startY - 14,
          isUnconnected: true,
          unconnectedDir: 'right',
          endX,
          endY,
        });
      }

      // NO BRANCH
      if (block.noTargetId && block.noTargetId !== block.id) {
        const target = nodes.find((n) => n.block.id === block.noTargetId);
        if (target) {
          lines.push(generateConnection(source, target, block.noLabel || 'No', 'no', sharedTargets.has(target.block.id)));
        } else {
          // If the target is set but somehow not in the nodes, treat as unconnected
          const startX = sourceCx - DIAMOND_HALF_DIAG;
          const startY = sourceCy;
          const endX = startX - 60;
          const endY = startY;
          lines.push({
            id: `${source.block.id}-unconnected-no`,
            sourceId: source.block.id,
            path: `M ${startX} ${startY} L ${endX} ${endY}`,
            label: block.noLabel || 'No',
            labelX: startX - 25,
            labelY: startY - 14,
            isUnconnected: true,
            unconnectedDir: 'right',
            endX,
            endY,
          });
        }
      } else {
        // Unconnected or pointing to self
        const startX = sourceCx - DIAMOND_HALF_DIAG;
        const startY = sourceCy;
        const endX = startX - 60;
        const endY = startY;
        lines.push({
          id: `${source.block.id}-unconnected-no`,
          sourceId: source.block.id,
          path: `M ${startX} ${startY} L ${endX} ${endY}`,
          label: block.noLabel || 'No',
          labelX: startX - 25,
          labelY: startY - 14,
          isUnconnected: true,
          unconnectedDir: 'right',
          endX,
          endY,
        });
      }
    } else {
      // Standard Connection (Terminator, Process, IO)
      if (block.targetId && block.targetId !== block.id) {
        const target = nodes.find((n) => n.block.id === block.targetId);
        if (target) {
          lines.push(generateConnection(source, target, undefined, 'standard', sharedTargets.has(target.block.id)));
        }
      }
    }
  });

  return lines;
}

function generateConnection(
  source: CanvasNode,
  target: CanvasNode,
  label: string | undefined,
  connectionType: 'yes' | 'no' | 'standard',
  isSharedTarget: boolean = false
): SvgLine {
  const isSourceDecision = source.block.type === 'decision';
  const isTargetDecision = target.block.type === 'decision';

  const sourceCx = source.x + NODE_WIDTH / 2;
  const sourceCy = source.y + NODE_HEIGHT / 2;
  const targetCx = target.x + NODE_WIDTH / 2;
  const targetCy = target.y + NODE_HEIGHT / 2;

  let startX = sourceCx;
  let startY = source.y + NODE_HEIGHT;

  if (isSourceDecision) {
    if (connectionType === 'yes') {
      startX = sourceCx + DIAMOND_HALF_DIAG;
      startY = sourceCy;
    } else {
      startX = sourceCx - DIAMOND_HALF_DIAG;
      startY = sourceCy;
    }
  }

  let endX = targetCx;
  let endY = target.y;

  if (isSharedTarget) {
    if (source.col < target.col) {
      endX = target.x;
      endY = target.y + NODE_HEIGHT / 2;
    } else if (source.col > target.col) {
      endX = target.x + NODE_WIDTH;
      endY = target.y + NODE_HEIGHT / 2;
    } else {
      endX = targetCx;
      endY = target.y;
    }
  } else if (isTargetDecision) {
    endX = targetCx;
    endY = targetCy - DIAMOND_HALF_DIAG;
  }

  let path = '';
  let labelX = (startX + endX) / 2;
  let labelY = (startY + endY) / 2;

  if (isSourceDecision) {
    if (isSharedTarget && source.col !== target.col) {
      // Decision node to a shared target in a different column:
      // Exits horizontally, drops down along the middle corridor, and enters horizontally into the side.
      const midX = (sourceCx + targetCx) / 2;
      path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
      
      if (connectionType === 'yes') {
        labelX = startX + 25;
        labelY = startY - 10;
      } else {
        labelX = startX - 25;
        labelY = startY - 10;
      }
    } else {
      // Decision node to a non-shared target (or same column):
      // Exits horizontally, then drops down vertically to target top.
      path = `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`;
      
      if (connectionType === 'yes') {
        labelX = startX + 25;
        labelY = startY - 10;
      } else {
        labelX = startX - 25;
        labelY = startY - 10;
      }
    }
  } else if (isSharedTarget) {
    // Rejoining arrows: exits bottom of last branch node, goes vertically down to target center level, then horizontally into left/right side
    if (startX === endX) {
      path = `M ${startX} ${startY} L ${endX} ${endY}`;
      labelX = startX + 15;
      labelY = startY + (endY - startY) / 2;
    } else {
      path = `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;
      labelX = (startX + endX) / 2;
      labelY = endY - 10;
    }
  } else {
    // Standard connector
    if (startX === endX) {
      path = `M ${startX} ${startY} L ${endX} ${endY}`;
      labelX = startX + 15;
      labelY = startY + (endY - startY) / 2;
    } else {
      const midY = (startY + endY) / 2;
      path = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
      labelX = startX + 15;
      labelY = startY + 25;
    }
  }

  return {
    id: `${source.block.id}-${target.block.id}-${connectionType}`,
    sourceId: source.block.id,
    targetId: target.block.id,
    path,
    label,
    labelX,
    labelY,
    startX,
    startY,
    endX,
    endY,
  };
}
