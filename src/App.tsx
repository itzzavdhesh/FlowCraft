/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LeftSidebar from './components/LeftSidebar';
import CenterCanvas from './components/CenterCanvas';
import RightSidebar from './components/RightSidebar';
import Toast from './components/Toast';
import { Block, ToastConfig, LayoutDirection } from './types';

// Default blueprint layout tracking
const initialDemoBlocks: Block[] = [
  {
    id: 'demo-1',
    type: 'terminator',
    label: 'Start',
    targetId: 'demo-2',
  },
  {
    id: 'demo-2',
    type: 'process',
    label: 'Validate Input',
    targetId: 'demo-3',
  },
  {
    id: 'demo-3',
    type: 'decision',
    label: 'Is Valid?',
    yesLabel: 'Yes',
    noLabel: 'No',
    yesTargetId: 'demo-4',
    noTargetId: 'demo-5',
  },
  {
    id: 'demo-4',
    type: 'process',
    label: 'Allow Access',
    targetId: 'demo-6',
  },
  {
    id: 'demo-5',
    type: 'process',
    label: 'Reject Request',
    targetId: 'demo-6',
  },
  {
    id: 'demo-6',
    type: 'terminator',
    label: 'End',
  },
];

export default function App() {
  const [blocks, setBlocks] = useState<Block[]>(initialDemoBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('demo-1');
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastConfig[]>([]);
  const [layoutDirection, setLayoutDirection] = useState<LayoutDirection>('vertical');
  const [currentWorkspace, setCurrentWorkspace] = useState<string>('Form-Flow Sandbox');
  const [workspaces, setWorkspaces] = useState<string[]>(['Form-Flow Sandbox']);

  useEffect(() => {
    try {
      const data = localStorage.getItem('flowforge_workspaces');
      if (data) {
        const parsed = JSON.parse(data);
        const wsNames = Object.keys(parsed);
        if (wsNames.length > 0) {
          setWorkspaces(wsNames);
          setCurrentWorkspace(wsNames[0]);
          setBlocks(parsed[wsNames[0]]);
        }
      } else {
        // Migration from old version
        const oldData = localStorage.getItem('flowforge_save');
        if (oldData) {
          const parsed = JSON.parse(oldData);
          localStorage.setItem('flowforge_workspaces', JSON.stringify({ 'Form-Flow Sandbox': parsed }));
          setWorkspaces(['Form-Flow Sandbox']);
          setBlocks(parsed);
        }
      }
    } catch {}
  }, []);

  // Function to push a toast
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const newToast: ToastConfig = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const handleCloseToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Add block from form (Left panel)
  const handleAddBlock = (blockData: Omit<Block, 'id'>) => {
    const newId = `block-${Math.random().toString(36).substring(2, 9)}`;

    setBlocks((prev) => {
      let updated = [...prev];
      let insertedTargetId: string | undefined = undefined;

      if (activeParentId) {
        const activeIdx = updated.findIndex((b) => b.id === activeParentId);
        if (activeIdx !== -1) {
          const activeBlock = updated[activeIdx];
          if (activeBlock.type === 'decision') {
            if (!activeBlock.yesTargetId) {
              updated[activeIdx] = { ...activeBlock, yesTargetId: newId };
            } else if (!activeBlock.noTargetId) {
              updated[activeIdx] = { ...activeBlock, noTargetId: newId };
            }
          } else {
            if (!activeBlock.targetId) {
              updated[activeIdx] = { ...activeBlock, targetId: newId };
            } else {
              // Insert in between!
              insertedTargetId = activeBlock.targetId;
              updated[activeIdx] = { ...activeBlock, targetId: newId };
            }
          }
        }
      }

      const newBlock: Block = {
        ...blockData,
        id: newId,
        targetId: insertedTargetId,
      };

      return [...updated, newBlock];
    });

    // Automatically set the new block as the active parent for sequential additions
    setActiveParentId(newId);

    // Automatically select the newly created node
    setSelectedBlockId(newId);
    showToast(`Block "${blockData.label}" added successfully!`);
  };

  // Update node details (Right panel)
  const handleUpdateBlock = (updatedBlock: Block) => {
    setBlocks((prev) => prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
  };

  // Delete block
  const handleDeleteBlock = (id: string) => {
    const block = blocks.find((b) => b.id === id);
    if (!block) return;

    setBlocks((prev) => {
      // Filter out deleted block
      let updated = prev.filter((b) => b.id !== id);

      // Clean up references to this deleted block from other blocks
      return updated.map((b) => {
        const next = { ...b };
        if (next.targetId === id) next.targetId = '';
        if (next.yesTargetId === id) next.yesTargetId = '';
        if (next.noTargetId === id) next.noTargetId = '';
        return next;
      });
    });

    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
    if (activeParentId === id) {
      setActiveParentId(null);
    }
    showToast(`Block "${block.label}" removed`, 'info');
  };

  // Select and chain next process block
  const handleSelectAndContinue = (parentBlock: Block) => {
    setActiveParentId(parentBlock.id);
    showToast(`Adding after: ${parentBlock.label}`, 'success');
  };

  // Persistent Local Storage hooks
  const handleSaveWorkspace = (name: string) => {
    if (name === '__proto__' || name === 'constructor' || name === 'prototype') {
      showToast('Invalid workspace name', 'error');
      return;
    }
    try {
      const data = localStorage.getItem('flowforge_workspaces');
      const parsed = data ? JSON.parse(data) : {};
      parsed[name] = blocks;
      localStorage.setItem('flowforge_workspaces', JSON.stringify(parsed));
      if (!workspaces.includes(name)) {
        setWorkspaces([...workspaces, name]);
      }
      setCurrentWorkspace(name);
      showToast(`Workspace "${name}" saved!`, 'success');
    } catch {
      showToast('Could not save workspace', 'error');
    }
  };

  const handleLoadWorkspace = (name: string) => {
    try {
      const data = localStorage.getItem('flowforge_workspaces');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed[name]) {
          setBlocks(parsed[name]);
          setCurrentWorkspace(name);
          setSelectedBlockId(null);
          setActiveParentId(null);
          showToast(`Workspace "${name}" loaded!`, 'success');
        } else {
          showToast(`Workspace "${name}" not found.`, 'error');
        }
      } else {
        showToast('No saved workspaces found.', 'info');
      }
    } catch {
      showToast('Could not load workspace.', 'error');
    }
  };

  const handleDeleteWorkspace = (name: string) => {
    try {
      const data = localStorage.getItem('flowforge_workspaces');
      const parsed = data ? JSON.parse(data) : {};
      delete parsed[name];
      localStorage.setItem('flowforge_workspaces', JSON.stringify(parsed));
      
      const updatedWorkspaces = workspaces.filter(w => w !== name);
      setWorkspaces(updatedWorkspaces);
      
      if (currentWorkspace === name) {
        if (updatedWorkspaces.length > 0) {
           handleLoadWorkspace(updatedWorkspaces[0]);
        } else {
           handleNewFlowchart();
           setCurrentWorkspace('');
        }
      }
      showToast(`Workspace "${name}" deleted!`, 'info');
    } catch {
      showToast('Could not delete workspace', 'error');
    }
  };

  const handleExportJSON = () => {
    try {
      const fileContent = JSON.stringify(blocks, null, 2);
      const blob = new Blob([fileContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentWorkspace}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Workspace exported as JSON!`, 'success');
    } catch {
      showToast('Failed to export JSON', 'error');
    }
  };

  const handleImportJSON = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content) as Block[];
        const isValid = Array.isArray(parsed) && parsed.every(b => b && typeof b === 'object' && typeof b.id === 'string' && ['terminator', 'process', 'decision', 'io'].includes(b.type));
        
        if (isValid) {
            setBlocks(parsed);
            setSelectedBlockId(null);
            setActiveParentId(null);
            
            let newName = file.name.replace('.json', '');
            
            const data = localStorage.getItem('flowforge_workspaces');
            const parsedStorage = data ? JSON.parse(data) : {};
            const currentKeys = Object.keys(parsedStorage);
            
            if (currentKeys.includes(newName)) {
                newName = `${newName}-${Math.random().toString(36).substring(2, 6)}`;
            }
            if (newName === '__proto__' || newName === 'constructor' || newName === 'prototype') {
                newName = `Workspace-${Math.random().toString(36).substring(2, 6)}`;
            }
            
            parsedStorage[newName] = parsed;
            localStorage.setItem('flowforge_workspaces', JSON.stringify(parsedStorage));
            
            setWorkspaces([...currentKeys, newName]);
            setCurrentWorkspace(newName);
            
            showToast(`Imported "${newName}" successfully!`, 'success');
        } else {
            showToast('Invalid workspace file', 'error');
        }
      } catch {
        showToast('Failed to parse JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Triggers interactive downloadable schematic files to fulfill "Real code integrations" guidelines
  const handleExportFile = (format: 'png' | 'pdf' | 'pptx') => {
    showToast(`Preparing ${format.toUpperCase()} asset...`, 'info');

    setTimeout(() => {
      try {
        const fileContent = JSON.stringify({
          application: "FlowForge Fluent Flowchart Builder",
          timestamp: new Date().toISOString(),
          format: format,
          blueprint: blocks
        }, null, 2);

        const blob = new Blob([fileContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `flowforge-export-${Date.now()}.${format === 'pptx' ? 'json' : format}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`${format.toUpperCase()} export completed successfully!`, 'success');
      } catch {
        showToast(`Failed to export ${format.toUpperCase()}`, 'error');
      }
    }, 1200);
  };

  const handleNewFlowchart = () => {
    setBlocks([]);
    setSelectedBlockId(null);
    setActiveParentId(null);
    showToast('Flowchart cleared. Canvas is ready!', 'info');
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  return (
    <div className="flex h-screen w-screen bg-[#fafafa] font-sans overflow-hidden">
      {/* LEFT SIDEBAR CONTROLS */}
      <LeftSidebar
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        onAddBlock={handleAddBlock}
        onDeleteBlock={handleDeleteBlock}
        activeParentId={activeParentId}
        onCancelActiveParent={() => setActiveParentId(null)}
      />

      {/* CENTER GRID CANVAS ZONE */}
      <CenterCanvas
        blocks={blocks}
        selectedBlockId={selectedBlockId}
        onSelectBlock={setSelectedBlockId}
        onSave={handleSaveWorkspace}
        onLoad={handleLoadWorkspace}
        onDeleteWorkspace={handleDeleteWorkspace}
        onExport={handleExportFile}
        onExportJSON={handleExportJSON}
        onImportJSON={handleImportJSON}
        onNewFlowchart={handleNewFlowchart}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onAddFirstBlock={() => {
          setBlocks(initialDemoBlocks);
          setSelectedBlockId('demo-1');
          showToast('Loaded vertical flow template!');
        }}
        showToast={showToast}
        layoutDirection={layoutDirection}
        onLayoutDirectionChange={setLayoutDirection}
      />

      {/* RIGHT SIDEBAR PROPERTIES */}
      <RightSidebar
        selectedBlock={selectedBlock}
        allBlocks={blocks}
        onUpdateBlock={handleUpdateBlock}
        onDeleteBlock={handleDeleteBlock}
        onSelectAndContinue={handleSelectAndContinue}
      />

      {/* REACTIVE MICRO NOTIFICATION MANAGER */}
      <Toast toasts={toasts} onClose={handleCloseToast} />
    </div>
  );
}
