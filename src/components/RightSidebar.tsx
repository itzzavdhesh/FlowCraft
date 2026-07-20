/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useId } from 'react';
import { Trash2, Link, CornerDownRight, ArrowRight, CornerRightDown } from 'lucide-react';
import { Block, ShapeType } from '../types';

interface RightSidebarProps {
  selectedBlock: Block | null;
  allBlocks: Block[];
  onUpdateBlock: (updated: Block) => void;
  onDeleteBlock: (id: string) => void;
  onSelectAndContinue: (parentBlock: Block) => void;
}

export default function RightSidebar({
  selectedBlock,
  allBlocks,
  onUpdateBlock,
  onDeleteBlock,
  onSelectAndContinue,
}: RightSidebarProps) {
  // Generate unique IDs for the form inputs
  const labelInputId = useId();
  const targetSelectId = useId();
  const yesTargetSelectId = useId();
  const noTargetSelectId = useId();

  if (!selectedBlock) {
    return (
      <aside className="w-[260px] h-full bg-white border-l border-gray-100 shadow-sm flex flex-col items-center justify-center p-6 text-center shrink-0 select-none">
        <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-3 border border-dashed border-gray-200">
          <Link className="w-6 h-6" />
        </div>
        <h3 className="text-xs font-bold text-gray-700 tracking-tight">Inspect Properties</h3>
        <p className="text-[10px] text-gray-400 mt-1 max-w-[180px] leading-normal">
          Select a block from the list or canvas to edit its properties & routing
        </p>
      </aside>
    );
  }

  // Filter list of nodes to loop into, excluding yourself
  const linkableBlocks = allBlocks.filter((b) => b.id !== selectedBlock.id);

  const getBadgeStyle = (type: ShapeType) => {
    switch (type) {
      case 'terminator':
        return 'bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-3 py-1 text-xs font-semibold';
      case 'process':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg px-3 py-1 text-xs font-semibold';
      case 'decision':
        return 'bg-amber-50 text-amber-700 border border-amber-100 rounded-md px-3 py-1 text-xs font-semibold';
      case 'io':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 text-xs font-semibold skew-x-[-5deg] inline-block';
    }
  };

  const handleLabelChange = (val: string) => {
    onUpdateBlock({ ...selectedBlock, label: val });
  };

  const handleTargetChange = (val: string) => {
    onUpdateBlock({ ...selectedBlock, targetId: val || undefined });
  };

  const handleYesTargetChange = (val: string) => {
    onUpdateBlock({ ...selectedBlock, yesTargetId: val || undefined });
  };

  const handleNoTargetChange = (val: string) => {
    onUpdateBlock({ ...selectedBlock, noTargetId: val || undefined });
  };

  const branches = selectedBlock.branches || [
    { id: 'legacy-yes', label: selectedBlock.yesLabel || 'Yes', targetId: selectedBlock.yesTargetId },
    { id: 'legacy-no', label: selectedBlock.noLabel || 'No', targetId: selectedBlock.noTargetId }
  ];

  const handleUpdateBranchLabel = (branchId: string, label: string) => {
    const updatedBranches = branches.map(br => br.id === branchId ? { ...br, label } : br);
    onUpdateBlock({ ...selectedBlock, branches: updatedBranches });
  };

  const handleUpdateBranchTarget = (branchId: string, targetId: string) => {
    const updatedBranches = branches.map(br => br.id === branchId ? { ...br, targetId: targetId || undefined } : br);
    onUpdateBlock({ ...selectedBlock, branches: updatedBranches });
  };

  const handleAddBranch = () => {
    const newBranch = {
      id: `br-${Math.random().toString(36).substring(2, 9)}`,
      label: `Branch ${branches.length + 1}`,
      targetId: ''
    };
    onUpdateBlock({ ...selectedBlock, branches: [...branches, newBranch] });
  };

  const handleDeleteBranch = (branchId: string) => {
    if (branches.length <= 1) return;
    const updatedBranches = branches.filter(br => br.id !== branchId);
    onUpdateBlock({ ...selectedBlock, branches: updatedBranches });
  };

  return (
    <aside className="w-[260px] h-full bg-white border-l border-gray-100 shadow-sm flex flex-col justify-between shrink-0 select-none overflow-hidden">
      <div className="p-5 border-b border-gray-105">
        <h2 id="right-sidebar-title" className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Block Properties</h2>
        
        {/* Node type badge */}
        <div>
          <span className={getBadgeStyle(selectedBlock.type)}>
            {selectedBlock.type.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="flex-grow p-5 space-y-4 overflow-y-auto custom-scrollbar">
        {/* Warning Indicator for Missing Decision connections */}
        {selectedBlock.type === 'decision' && (
          branches.some(br => !br.targetId || br.targetId === selectedBlock.id)
        ) && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-semibold tracking-wide flex items-start gap-1.5 leading-normal">
            <span className="text-amber-600 shrink-0 select-none">⚠</span>
            <span>Set all branch targets</span>
          </div>
        )}

        {/* Label Field */}
        <div>
          <label htmlFor={labelInputId} className="block text-xs font-bold text-gray-700 mb-1.5 font-sans">Label</label>
          <input
            id={labelInputId}
            type="text"
            value={selectedBlock.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 font-sans font-medium focus:ring-1 focus:ring-indigo-500 bg-gray-50/50 hover:bg-gray-50/20 focus:bg-white"
          />
        </div>

        {/* Dynamic Branch Connection Settings */}
        {selectedBlock.type === 'decision' ? (
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-gray-700 font-sans">Decision Branches</h3>
            <div className="space-y-4">
              {branches.map((br, index) => (
                <div key={br.id} className="p-3 bg-gray-50/50 border border-gray-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400">Branch {index + 1}</span>
                    {branches.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBranch(br.id)}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Label</label>
                    <input
                      type="text"
                      value={br.label}
                      onChange={(e) => handleUpdateBranchLabel(br.id, e.target.value)}
                      placeholder="e.g. Yes, No, Maybe"
                      className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">Target</label>
                    <select
                      value={br.targetId || ''}
                      onChange={(e) => handleUpdateBranchTarget(br.id, e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:border-indigo-500 cursor-pointer text-gray-700 font-medium"
                    >
                      <option value="">-- Disconnected --</option>
                      {linkableBlocks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label} ({b.type.substring(0, 4).toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddBranch}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100/80 text-indigo-650 font-bold text-xs rounded-lg transition-colors border border-indigo-100 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              + Add Branch
            </button>
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div>
              <label htmlFor={targetSelectId} className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 mb-1">
                <CornerDownRight className="w-3.5 h-3.5" />
                Next Connect Block
              </label>
              <select
                id={targetSelectId}
                value={selectedBlock.targetId || ''}
                onChange={(e) => handleTargetChange(e.target.value)}
                className="w-full px-2.5 py-1.8 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-500 cursor-pointer text-gray-700 font-medium"
              >
                <option value="">-- Disconnected --</option>
                {linkableBlocks.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} ({b.type.substring(0, 4).toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 pt-4 mt-2">
          <button
            id="properties-select-continue"
            onClick={() => onSelectAndContinue(selectedBlock)}
            title="Create next process block, automatically connecting to this block"
            className="w-full py-2 border border-indigo-600 hover:border-indigo-700 hover:bg-indigo-50/40 text-indigo-600 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <ArrowRight className="w-4 h-4 animate-pulse" />
            Select & Continue
          </button>
          <span className="block text-[9px] text-gray-400 text-center mt-1.5 leading-normal">
            Quickly chain a connecting process step
          </span>
        </div>
      </div>

      <div className="p-5 border-t border-gray-105 bg-gray-50/30">
        <button
          id="properties-delete-btn"
          onClick={() => onDeleteBlock(selectedBlock.id)}
          className="w-full py-2 border border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Block
        </button>
      </div>
    </aside>
  );
}
