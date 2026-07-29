/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Block, CanvasNode, LayoutDirection } from '../types';

export const NODE_WIDTH = 180;
export const NODE_HEIGHT = 72;
export const COLUMN_WIDTH = 200;
export const ROW_HEIGHT = 150;
export const DIAMOND_SIZE = 92;
export const DIAMOND_HALF_DIAG = 65;

/**
 * Finds the true root block of the flowchart (a block with no incoming connections).
 * Prefers 'terminator' type nodes (e.g. 'Start') if multiple roots exist.
 */
export function findRootBlock(blocks: Block[]): Block | null {
  if (blocks.length === 0) return null;

  const targetIds = new Set<string>();
  blocks.forEach((b) => {
    if (b.targetId && b.targetId !== b.id) targetIds.add(b.targetId);
    if (b.yesTargetId && b.yesTargetId !== b.id) targetIds.add(b.yesTargetId);
    if (b.noTargetId && b.noTargetId !== b.id) targetIds.add(b.noTargetId);
  });

  const roots = blocks.filter((b) => !targetIds.has(b.id));
  if (roots.length > 0) {
    const terminatorRoot = roots.find((b) => b.type === 'terminator');
    return terminatorRoot || roots[0];
  }

  return blocks[0];
}


/**
 * Automatically calculates visual X and Y layout coordinates for a list of blocks.
 * Uses BFS traversal of the connection graph to lay out flow branches.
 */
export function calculateLayout(blocks: Block[], layoutDirection: LayoutDirection = 'vertical'): CanvasNode[] {
  if (blocks.length === 0) return [];

  // 1. Identify roots and parents for each block
  const incomingMap = new Map<string, number>();
  const parentsMap = new Map<string, string[]>();
  
  blocks.forEach((b) => {
    incomingMap.set(b.id, 0);
    parentsMap.set(b.id, []);
  });

  // 1.5 Detect Back-Edges to prevent cyclic stalling
  const backEdges = new Set<string>();
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const dfs = (nodeId: string) => {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const block = blocks.find(b => b.id === nodeId);
    if (block) {
      const targets: string[] = [];
      if (block.type === 'decision') {
        if (block.yesTargetId) targets.push(block.yesTargetId);
        if (block.noTargetId) targets.push(block.noTargetId);
      } else {
        if (block.targetId) targets.push(block.targetId);
      }

      for (const targetId of targets) {
        if (!visited.has(targetId)) {
          dfs(targetId);
        } else if (recursionStack.has(targetId)) {
          backEdges.add(`${nodeId}->${targetId}`);
        }
      }
    }
    recursionStack.delete(nodeId);
  };

  blocks.forEach(b => {
    if (!visited.has(b.id)) {
      dfs(b.id);
    }
  });

  blocks.forEach((b) => {
    const addEdge = (childId: string, parentId: string) => {
      if (backEdges.has(`${parentId}->${childId}`)) return; // Ignore back-edges
      
      incomingMap.set(childId, (incomingMap.get(childId) || 0) + 1);
      if (parentsMap.has(childId)) {
        parentsMap.get(childId)!.push(parentId);
      }
    };
    if (b.type === 'decision') {
      if (b.yesTargetId && b.yesTargetId !== b.id) addEdge(b.yesTargetId, b.id);
      if (b.noTargetId && b.noTargetId !== b.id) addEdge(b.noTargetId, b.id);
    } else {
      if (b.targetId && b.targetId !== b.id) addEdge(b.targetId, b.id);
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
    const x = 600 + col * COLUMN_WIDTH;
    const y = 40 + row * ROW_HEIGHT;
    return {
      block,
      x,
      y,
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
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

/**
 * Calculates connection lines with beautiful bezier curves and arrow directions
 */
export function calculateConnections(nodes: CanvasNode[], layoutDirection: LayoutDirection = 'vertical'): SvgLine[] {
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

  const minX = nodes.length > 0 ? Math.min(...nodes.map(n => n.x)) : 0;
  const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.x + NODE_WIDTH)) : 0;
  const layoutBounds = { minX, maxX };
  const backwardLanes = { left: 0, right: 0 };

  nodes.forEach((source) => {
    const block = source.block;

    if (block.type === 'decision') {
      const sourceCx = source.x + NODE_WIDTH / 2;
      const sourceCy = source.y + NODE_HEIGHT / 2;

      // YES BRANCH
      if (block.yesTargetId) {
        const target = nodes.find((n) => n.block.id === block.yesTargetId);
        if (target) {
          lines.push(generateConnection(source, target, block.yesLabel || 'Yes', 'yes', sharedTargets.has(target.block.id), layoutDirection, layoutBounds, backwardLanes));
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
      if (block.noTargetId) {
        const target = nodes.find((n) => n.block.id === block.noTargetId);
        if (target) {
          lines.push(generateConnection(source, target, block.noLabel || 'No', 'no', sharedTargets.has(target.block.id), layoutDirection, layoutBounds, backwardLanes));
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
      if (block.targetId) {
        const target = nodes.find((n) => n.block.id === block.targetId);
        if (target) {
          lines.push(generateConnection(source, target, undefined, 'standard', sharedTargets.has(target.block.id), layoutDirection, layoutBounds, backwardLanes));
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
  isSharedTarget: boolean = false,
  layoutDirection: LayoutDirection = 'vertical',
  layoutBounds: { minX: number; maxX: number } = { minX: 0, maxX: 0 },
  backwardLanes: { left: number; right: number } = { left: 0, right: 0 }
): SvgLine {
  const isSourceDecision = source.block.type === 'decision';
  const isTargetDecision = target.block.type === 'decision';

  const sourceCx = source.x + NODE_WIDTH / 2;
  const sourceCy = source.y + NODE_HEIGHT / 2;
  const targetCx = target.x + NODE_WIDTH / 2;
  const targetCy = target.y + NODE_HEIGHT / 2;

  let startX = 0, startY = 0, endX = 0, endY = 0, path = '', labelX = 0, labelY = 0;
  const isBackward = layoutDirection === 'vertical' ? source.row >= target.row : source.col >= target.col;

  if (layoutDirection === 'vertical') {
    startX = sourceCx;
    startY = source.y + NODE_HEIGHT;
    
    if (isSourceDecision) {
      if (connectionType === 'yes') {
        startX = sourceCx + DIAMOND_HALF_DIAG;
        startY = sourceCy;
      } else {
        startX = sourceCx - DIAMOND_HALF_DIAG;
        startY = sourceCy;
      }
    }

    endX = targetCx;
    endY = target.y;

    if (!isBackward) {
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
    } else {
      // Backward edges always enter from top for simplicity
      endX = targetCx;
      endY = isTargetDecision ? targetCy - DIAMOND_HALF_DIAG : target.y;
    }

    labelX = (startX + endX) / 2;
    labelY = (startY + endY) / 2;

    if (isBackward) {
      let marginX: number;
      let isLeft = false;

      if (isSourceDecision) {
        isLeft = connectionType !== 'yes';
      } else {
        const distLeft = sourceCx - layoutBounds.minX;
        const distRight = layoutBounds.maxX - sourceCx;
        isLeft = distLeft < distRight;
      }

      if (isLeft) {
        const offset = 100 + backwardLanes.left * 40;
        marginX = layoutBounds.minX - offset;
        if (isSharedTarget) endX = targetCx - 10 - backwardLanes.left * 15;
        backwardLanes.left++;
      } else {
        const offset = 100 + backwardLanes.right * 40;
        marginX = layoutBounds.maxX + offset;
        if (isSharedTarget) endX = targetCx + 10 + backwardLanes.right * 15;
        backwardLanes.right++;
      }

      const upY = target.y - 30;

      if (isSourceDecision) {
        path = `M ${startX} ${startY} L ${marginX} ${startY} L ${marginX} ${upY} L ${endX} ${upY} L ${endX} ${endY}`;
        labelX = marginX;
        labelY = (startY + target.y) / 2;
      } else {
        const initialDrop = startY + 20;
        path = `M ${startX} ${startY} L ${startX} ${initialDrop} L ${marginX} ${initialDrop} L ${marginX} ${upY} L ${endX} ${upY} L ${endX} ${endY}`;
        labelX = marginX;
        labelY = (startY + target.y) / 2;
      }
    } else if (isSourceDecision) {
      if (isSharedTarget && source.col !== target.col) {
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
  } else {
    // Horizontal Layout Mode
    startX = source.x + NODE_WIDTH;
    startY = sourceCy;
    
    if (isSourceDecision) {
      if (connectionType === 'yes') {
        startX = sourceCx;
        startY = sourceCy + DIAMOND_HALF_DIAG;
      } else {
        startX = sourceCx;
        startY = sourceCy - DIAMOND_HALF_DIAG;
      }
    }

    endX = target.x;
    endY = targetCy;

    if (isSharedTarget) {
      if (source.col < target.col) {
        endX = targetCx;
        endY = target.y;
      } else if (source.col > target.col) {
        endX = targetCx;
        endY = target.y + NODE_HEIGHT;
      } else {
        endX = target.x;
        endY = targetCy;
      }
    } else if (isTargetDecision) {
      endX = targetCx - DIAMOND_HALF_DIAG;
      endY = targetCy;
    }

    labelX = (startX + endX) / 2;
    labelY = (startY + endY) / 2;

    if (isSourceDecision) {
      if (isSharedTarget && source.col !== target.col) {
        const midY = (sourceCy + targetCy) / 2;
        path = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
        
        if (connectionType === 'yes') {
          labelX = startX - 10;
          labelY = startY + 25;
        } else {
          labelX = startX - 10;
          labelY = startY - 25;
        }
      } else {
        path = `M ${startX} ${startY} L ${startX} ${endY} L ${endX} ${endY}`;
        if (connectionType === 'yes') {
          labelX = startX - 10;
          labelY = startY + 25;
        } else {
          labelX = startX - 10;
          labelY = startY - 25;
        }
      }
    } else if (isSharedTarget) {
      if (startY === endY) {
        path = `M ${startX} ${startY} L ${endX} ${endY}`;
        labelX = startX + (endX - startX) / 2;
        labelY = startY - 15;
      } else {
        path = `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${endY}`;
        labelX = endX - 10;
        labelY = (startY + endY) / 2;
      }
    } else {
      if (startY === endY) {
        path = `M ${startX} ${startY} L ${endX} ${endY}`;
        labelX = startX + (endX - startX) / 2;
        labelY = startY - 15;
      } else {
        const midX = (startX + endX) / 2;
        path = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
        labelX = startX + 25;
        labelY = startY - 15;
      }
    }
  }

  let bounds = { minX: startX, maxX: startX, minY: startY, maxY: startY };
  const nums = path.match(/-?\d+(\.\d+)?/g);
  if (nums && nums.length > 0) {
    const xs = [];
    const ys = [];
    for (let i = 0; i < nums.length; i += 2) {
      xs.push(parseFloat(nums[i]));
      ys.push(parseFloat(nums[i+1]));
    }
    bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
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
    bounds,
  };
}
