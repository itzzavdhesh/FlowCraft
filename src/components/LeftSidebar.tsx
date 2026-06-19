/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Zap, Edit2, Trash2, Plus, X } from 'lucide-react';
import { ShapeType, Block } from '../types';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateFlowchart } from '../utils/gemini';

interface LeftSidebarProps {
  onGenerateBlocks: (blocks: Block[]) => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onAddBlock: (blockData: Omit<Block, 'id'>) => void;
  onDeleteBlock: (id: string) => void;
  activeParentId: string | null;
  onCancelActiveParent: () => void;
  
}

export default function LeftSidebar({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onAddBlock,
  onDeleteBlock,
  activeParentId,
  onCancelActiveParent,
  onGenerateBlocks,
  showToast,
}: LeftSidebarProps) {
  const [selectedType, setSelectedType] = useState<ShapeType>('terminator');
  const [blockLabel, setBlockLabel] = useState('');
  
  // Decision specific branch labels
  const [yesLabel, setYesLabel] = useState('Yes');
  const [noLabel, setNoLabel] = useState('No');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    try {
      const blocks = await generateFlowchart(aiPrompt.trim());
      onGenerateBlocks(blocks);
      setAiPrompt('');
      showToast(`Generated ${blocks.length} blocks from AI!`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'AI generation failed.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const activeParentBlock = blocks.find((b) => b.id === activeParentId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockLabel.trim()) return;

    if (selectedType === 'decision') {
      onAddBlock({
        type: selectedType,
        label: blockLabel.trim(),
        yesLabel: yesLabel.trim() || 'Yes',
        noLabel: noLabel.trim() || 'No',
        yesTargetId: '',
        noTargetId: '',
      });
    } else {
      onAddBlock({
        type: selectedType,
        label: blockLabel.trim(),
        targetId: '',
      });
    }

    // Reset fields
    setBlockLabel('');
    setYesLabel('Yes');
    setNoLabel('No');
  };

  const shapeCards: Array<{ type: ShapeType; name: string; desc: string; render: React.ReactNode }> = [
    {
      type: 'terminator',
      name: 'Terminator',
      desc: 'Start / End',
      render: <div className="w-10 h-5 border-2 border-current rounded-full mx-auto" />
    },
    {
      type: 'process',
      name: 'Process',
      desc: 'Action / Step',
      render: <div className="w-10 h-5 border-2 border-current rounded mx-auto" />
    },
    {
      type: 'decision',
      name: 'Decision',
      desc: 'Yes / No Branch',
      render: <div className="w-5 h-5 border-2 border-current rotate-45 mx-auto my-0.5" />
    },
    {
      type: 'io',
      name: 'Input/Output',
      desc: 'Data / IO',
      render: <div className="w-10 h-5 border-2 border-current -skew-x-[15deg] mx-auto" />
    }
  ];

  const getBadgeStyle = (type: ShapeType) => {
    switch (type) {
      case 'terminator':
        return 'bg-blue-50 text-blue-700 border border-blue-150 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide';
      case 'process':
        return 'bg-indigo-50 text-indigo-700 border border-indigo-150 rounded px-2.5 py-0.5 text-[10px] font-medium tracking-wide';
      case 'decision':
        return 'bg-amber-50 text-amber-700 border border-amber-150 rounded-md px-2.5 py-0.5 text-[10px] font-medium tracking-wide';
      case 'io':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-150 rounded px-2.5 py-0.5 text-[10px] font-medium tracking-wide';
    }
  };

  return (
    <aside className="w-[280px] h-full bg-white border-r border-gray-100 shadow-sm flex flex-col shrink-0 overflow-hidden select-none">
      {/* App Logo */}
      <div className="p-5 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-150">
          <Zap className="w-5 h-5 text-white fill-white/10" />
        </div>
        <div>
          <h1 id="app-logo-text" className="text-lg font-bold text-gray-900 tracking-tight">FlowCraft</h1>
          <p className="text-[10px] font-medium text-gray-400 tracking-wide uppercase">Interactive Builder</p>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex-grow p-5 overflow-y-auto space-y-5 custom-scrollbar">
        {activeParentBlock && (
          <div className="flex items-center justify-between px-3 py-2 bg-indigo-50/70 border border-indigo-100 rounded-xl mb-1.5 transition-all duration-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-xs font-semibold text-indigo-700 truncate">
                Adding after: <strong className="text-indigo-900 font-bold">{activeParentBlock.label}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={onCancelActiveParent}
              title="Cancel chain connection"
              className="p-1 hover:bg-indigo-100 rounded-md text-indigo-500 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* AI Generate Section */}
        <div className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Generate with AI
          </h2>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Describe your flow… e.g. &quot;User login with password reset fallback&quot;"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans bg-gray-50/50 hover:bg-gray-50/20 focus:bg-white placeholder:text-gray-400 resize-none"
          />
          <button
            type="button"
            onClick={handleAiGenerate}
            disabled={!aiPrompt.trim() || aiLoading}
            className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {aiLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Flowchart
              </>
            )}
          </button>
        </div>
        <div className="border-t border-gray-100" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h2 id="left-sidebar-add-title" className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Add Block</h2>
            <div className="grid grid-cols-2 gap-2">
              {shapeCards.map((card) => {
                const isSelected = selectedType === card.type;
                return (
                  <button
                    key={card.type}
                    type="button"
                    onClick={() => setSelectedType(card.type)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col justify-between h-20 group ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-600 shadow-sm'
                        : 'border-gray-200 hover:border-gray-350 hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <div className={`${isSelected ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-600'} transition-colors`}>
                      {card.render}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold tracking-tight">{card.name}</div>
                      <div className="text-[9px] text-gray-400">{card.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="block-label-input" className="block text-xs font-bold text-gray-700 mb-1.5">Block Label</label>
              <input
                id="block-label-input"
                type="text"
                value={blockLabel}
                onChange={(e) => setBlockLabel(e.target.value)}
                placeholder="e.g. Start, Check Age, Get Input..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans bg-gray-50/50 hover:bg-gray-50/20 focus:bg-white placeholder:text-gray-450"
              />
            </div>

            {selectedType === 'decision' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label htmlFor="yes-label-input" className="block text-[10px] font-bold text-gray-600 mb-1">Yes Label</label>
                  <input
                    id="yes-label-input"
                    type="text"
                    value={yesLabel}
                    onChange={(e) => setYesLabel(e.target.value)}
                    placeholder="e.g. Yes"
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500 bg-gray-50/50 focus:bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="no-label-input" className="block text-[10px] font-bold text-gray-600 mb-1">No Label</label>
                  <input
                    id="no-label-input"
                    type="text"
                    value={noLabel}
                    onChange={(e) => setNoLabel(e.target.value)}
                    placeholder="e.g. No"
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-indigo-500 bg-gray-50/50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            <button
              id="add-block-submit"
              type="submit"
              disabled={!blockLabel.trim()}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-lg transition-colors shadow-sm shadow-indigo-150 flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              <Plus className="w-4 h-4" />
              Add Block
            </button>
          </div>
        </form>

        <div className="border-t border-gray-100 pt-5">
          <h2 id="left-sidebar-list-title" className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 block">Blocks</h2>
          
          {blocks.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <p className="text-[11px] text-gray-400 font-medium">No blocks yet</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {blocks.map((block) => {
                const isSelected = selectedBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-200 bg-indigo-50/30'
                        : 'border-gray-150 hover:border-gray-300 bg-white hover:bg-gray-50/50'
                    }`}
                    onClick={() => onSelectBlock(block.id)}
                  >
                    <div className="flex flex-col items-start gap-1 min-w-0 flex-grow pr-1">
                      <span className={getBadgeStyle(block.type)}>
                        {block.type.toUpperCase()}
                      </span>
                      <span className="text-xs font-semibold text-gray-755 truncate w-full pl-0.5">
                        {block.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Edit Block"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectBlock(block.id);
                        }}
                        className="p-1 text-gray-400 hover:text-indigo-600 rounded hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete Block"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBlock(block.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
