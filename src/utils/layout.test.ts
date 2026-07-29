import { describe, it } from 'node:test';
import assert from 'node:assert';
import { calculateLayout, calculateConnections } from './layout.js';

describe('Layout and Connections', () => {
  it('should handle a simple cycle without stalling', () => {
    const nodes = [
      { id: '1', type: 'process', label: 'A', targetId: '2' },
      { id: '2', type: 'process', label: 'B', targetId: '1' }
    ] as any;
    const layout = calculateLayout(nodes);
    assert.strictEqual(layout.length, 2);
    assert.strictEqual(layout.find(n => n.block.id === '1')?.row, 0);
    assert.strictEqual(layout.find(n => n.block.id === '2')?.row, 1);
  });

  it('should handle a backward route to an earlier process node', () => {
    const nodes = [
      { id: '1', type: 'process', label: 'A', targetId: '2' },
      { id: '2', type: 'process', label: 'B', targetId: '1' }
    ] as any;
    const layout = calculateLayout(nodes);
    const connections = calculateConnections(layout);
    
    const backEdge = connections.find(c => c.sourceId === '2' && c.targetId === '1');
    assert.ok(backEdge);
    // Backward route uses multi-segment path and enters from the top
    assert.strictEqual(backEdge.path.split('L').length, 6);
    // Target is '1' (row 0), which is top-entry, meaning endY is node 1's top Y.
    assert.strictEqual(backEdge.endY, 40);
  });

  it('should route decision-branch back-edge to an earlier node', () => {
    const nodes = [
      { id: '1', type: 'process', label: 'A', targetId: '2' },
      { id: '2', type: 'decision', label: 'B', yesTargetId: '3', noTargetId: '1' },
      { id: '3', type: 'process', label: 'C' }
    ] as any;
    const layout = calculateLayout(nodes);
    const connections = calculateConnections(layout);
    
    const backEdge = connections.find(c => c.sourceId === '2' && c.targetId === '1');
    assert.ok(backEdge);
    // Decision backward routing uses 5 segments (M + 4 Ls = 5 parts)
    assert.strictEqual(backEdge.path.split('L').length, 5);
    assert.strictEqual(backEdge.endY, 40);
  });

  it('should offset converging backward edges', () => {
    const nodes = [
      { id: 'target', type: 'process', label: 'Target', targetId: 'n1' },
      { id: 'n1', type: 'process', label: 'N1', targetId: 'target' },
      { id: 'n2', type: 'process', label: 'N2', targetId: 'target' }
    ] as any;
    const layoutNodes = [
      { block: nodes[0], id: 'target', x: 600, y: 100, row: 0, col: 0 },
      { block: nodes[1], id: 'n1', x: 600, y: 300, row: 1, col: 0 },
      { block: nodes[2], id: 'n2', x: 800, y: 300, row: 1, col: 1 }
    ] as any;
    
    const connections = calculateConnections(layoutNodes);
    const backEdges = connections.filter(c => c.targetId === 'target');
    assert.strictEqual(backEdges.length, 2);
    assert.notStrictEqual(backEdges[0].endX, backEdges[1].endX);
  });
});
