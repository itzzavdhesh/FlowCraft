/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Play, 
  Save, 
  FolderOpen, 
  FileImage, 
  FileText, 
  Presentation, 
  Sparkles,
  MousePointer,
  HelpCircle,
  Database,
  ZoomIn,
  ZoomOut,
  FilePlus,
  Moon,
  Sun,
  Trash2,
  Download,
  Upload,
  Keyboard,
  X,
  ChevronDown
} from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import { Block, CanvasNode, LayoutDirection } from '../types';
import { calculateLayout, calculateConnections, NODE_WIDTH, NODE_HEIGHT, DIAMOND_SIZE } from '../utils/layout';

interface CenterCanvasProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onSave: (name: string) => void;
  onLoad: (name: string) => void;
  onDeleteWorkspace: (name: string) => void;
  onExport: (format: 'png' | 'pdf' | 'pptx') => void;
  onExportJSON: () => void;
  onImportJSON: (file: File) => void;
  onNewFlowchart: () => void;
  onAddFirstBlock: () => void;
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  workspaces: string[];
  currentWorkspace: string;
  layoutDirection: LayoutDirection;
  onLayoutDirectionChange: (direction: LayoutDirection) => void;
  showShortcutsHelp?: boolean;
  onToggleShortcutsHelp?: () => void;
}

export default function CenterCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onSave,
  onLoad,
  onDeleteWorkspace,
  onExport,
  onExportJSON,
  onImportJSON,
  onNewFlowchart,
  onAddFirstBlock,
  showToast,
  isDarkMode,
  toggleDarkMode,
  workspaces,
  currentWorkspace,
  layoutDirection,
  onLayoutDirectionChange,
  showShortcutsHelp = false,
  onToggleShortcutsHelp,
}: CenterCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply layout algorithm
  const nodes = calculateLayout(blocks, layoutDirection);
  const connections = calculateConnections(nodes, layoutDirection);

  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number }>>({});
  const [remoteSelections, setRemoteSelections] = useState<Record<string, string>>({});
  const [userColors, setUserColors] = useState<Record<string, string>>({});
  
  const getUserColor = useCallback((userId: string) => {
    setUserColors(prev => {
      if (prev[userId]) return prev;
      const colors = ['#f43f5e', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
      const color = colors[Object.keys(prev).length % colors.length];
      return { ...prev, [userId]: color };
    });
  }, []);

  useEffect(() => {
    const onCursorUpdate = (data: { x: number; y: number; userId: string }) => {
      setRemoteCursors(prev => ({ ...prev, [data.userId]: { x: data.x, y: data.y } }));
      getUserColor(data.userId);
    };

    const onSelectionUpdate = (data: { selectedId: string | null; userId: string }) => {
      setRemoteSelections(prev => {
        const next = { ...prev };
        if (data.selectedId === null) {
          delete next[data.userId];
        } else {
          next[data.userId] = data.selectedId;
        }
        return next;
      });
      getUserColor(data.userId);
    };
    
    const onUserLeft = (data: { userId: string }) => {
      setRemoteCursors(prev => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
      setRemoteSelections(prev => {
        const next = { ...prev };
        delete next[data.userId];
        return next;
      });
    };

    socket.on('cursor-update', onCursorUpdate);
    socket.on('selection-update', onSelectionUpdate);
    socket.on('user-left', onUserLeft);

    return () => {
      socket.off('cursor-update', onCursorUpdate);
      socket.off('selection-update', onSelectionUpdate);
      socket.off('user-left', onUserLeft);
    };
  }, [getUserColor]);

  useEffect(() => {
    socket.emit('node-select', { selectedId: selectedBlockId });
  }, [selectedBlockId]);

  // Zoom & Pan states
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportMenuPos, setExportMenuPos] = useState({ top: 0, right: 0 });
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const panStart = useRef({ x: 0, y: 0 });

  const toggleExportMenu = () => {
    if (!showExportMenu && exportBtnRef.current) {
      const rect = exportBtnRef.current.getBoundingClientRect();
      setExportMenuPos({
        top: rect.bottom + 6,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    }
    setShowExportMenu((prev) => !prev);
  };

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(target) &&
        exportBtnRef.current &&
        !exportBtnRef.current.contains(target)
      ) {
        setShowExportMenu(false);
      }
    };

    const updateMenuPos = () => {
      if (showExportMenu && exportBtnRef.current) {
        const rect = exportBtnRef.current.getBoundingClientRect();
        setExportMenuPos({
          top: rect.bottom + 6,
          right: Math.max(16, window.innerWidth - rect.right),
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', updateMenuPos);
    window.addEventListener('scroll', updateMenuPos, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updateMenuPos);
      window.removeEventListener('scroll', updateMenuPos, true);
    };
  }, [showExportMenu]);

  // Focus management & focus trap for Keyboard Shortcuts modal
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const modalCloseBtnRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (showShortcutsHelp) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        modalCloseBtnRef.current?.focus();
      }, 50);

      const handleModalKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab' && modalRef.current) {
          const focusables = modalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length === 0) return;
          const first = focusables[0];
          const last = focusables[focusables.length - 1];

          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      document.addEventListener('keydown', handleModalKeyDown);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleModalKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [showShortcutsHelp]);

  // Mouse pan event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with left mouse button click
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    // Do not initiate pan on interactive child elements
    if (
      target.closest('[id^="flow-node"]') || 
      target.closest('button') || 
      target.closest('.zoom-controls')
    ) {
      return;
    }

    setIsPanning(true);
    panStart.current = {
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    };
  };

  const lastEmit = useRef<number>(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - lastEmit.current > 32 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / scale;
      const y = (e.clientY - rect.top - pan.y) / scale;
      socket.volatile.emit('cursor-move', { x, y });
      lastEmit.current = now;
    }

    if (!isPanning) return;
    const newX = e.clientX - panStart.current.x;
    const newY = e.clientY - panStart.current.y;
    setPan({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleMouseLeave = () => {
    setIsPanning(false);
  };

  // Wheel zoom listener with passive ref to prevent page scroll
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = 0.05;
      const direction = e.deltaY < 0 ? 1 : -1;

      setScale((prev) => {
        let newScale = prev + direction * zoomFactor;
        newScale = Math.min(Math.max(0.25, newScale), 3);
        return parseFloat(newScale.toFixed(2));
      });
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Determine bounds of the layout to ensure the canvas scroll area fits all nodes comfortably
  // Set minimum height and width larger than standard viewports to guarantee spacious scroll bounds
  const minWidth = 1200;
  const minHeight = 800;
  let minLayoutX = 0;
  let minLayoutY = 0;
  let maxLayoutX = MIN_WIDTH;
  let maxLayoutY = MIN_HEIGHT;

  nodes.forEach(node => {
    minLayoutX = Math.min(minLayoutX, node.x);
    minLayoutY = Math.min(minLayoutY, node.y);
    maxLayoutX = Math.max(maxLayoutX, node.x + NODE_WIDTH);
    maxLayoutY = Math.max(maxLayoutY, node.y + NODE_HEIGHT);
  });


  connections.forEach(conn => {
    if (conn.bounds) {
      minLayoutX = Math.min(minLayoutX, conn.bounds.minX);
      minLayoutY = Math.min(minLayoutY, conn.bounds.minY);
      maxLayoutX = Math.max(maxLayoutX, conn.bounds.maxX);
      maxLayoutY = Math.max(maxLayoutY, conn.bounds.maxY);
    }
  });

  const offsetX = minLayoutX < 50 ? Math.abs(minLayoutX) + 100 : 0;
  const offsetY = minLayoutY < 50 ? Math.abs(minLayoutY) + 100 : 0;

  const maxWidth = maxLayoutX + offsetX + 250;
  const maxHeight = maxLayoutY + offsetY + 250;

  const handleExportPNG = async () => {
    if (!canvasRef.current) return;
    try {
      showToast?.('Generating PNG...', 'info');
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: isDarkMode ? '#0f172a' : '#f8f9fa',
        style: {
          transform: 'translate(0px, 0px) scale(1)',
        },
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = 'flowforge-chart.png';
      link.href = dataUrl;
      link.click();
      showToast?.('Flowchart saved as PNG!', 'success');
    } catch (error) {
      console.error('Error generating PNG:', error);
      showToast?.('Failed to capture PNG.', 'error');
    }
  };

  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    try {
      showToast?.('Generating PDF...', 'info');
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: isDarkMode ? '#0f172a' : '#f8f9fa',
        style: {
          transform: 'translate(0px, 0px) scale(1)',
        },
        cacheBust: true,
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const canvasWidth = canvasRef.current.clientWidth || 3000;
      const canvasHeight = canvasRef.current.clientHeight || 2000;
      const ratio = Math.min(pdfWidth / canvasWidth, pdfHeight / canvasHeight);

      const width = canvasWidth * ratio;
      const height = canvasHeight * ratio;

      const x = (pdfWidth - width) / 2;
      const y = (pdfHeight - height) / 2;

      pdf.addImage(dataUrl, 'PNG', x, y, width, height);
      pdf.save('flowforge-chart.pdf');
      showToast?.('Flowchart saved as PDF!', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast?.('Failed to capture PDF.', 'error');
    }
  };

  const handleExportPPTX = async () => {
    try {
      showToast?.('Generating PPTX...', 'info');
      const pres = new pptxgen();

      // Custom dimensions: convert pixels to inches for slide size
      const slideWidth = Math.max(10, maxWidth / 96);
      const slideHeight = Math.max(5.625, maxHeight / 96);

      pres.defineLayout({ name: 'FLOW_LAYOUT', width: slideWidth, height: slideHeight });
      pres.layout = 'FLOW_LAYOUT';

      const slide = pres.addSlide();
      slide.background = { color: 'F8F9FA' };

      // 1. Draw connections/edges first (rendered below nodes)
      connections.forEach((c) => {
        const sourceNode = nodes.find(n => n.block.id === c.sourceId);
        const targetNode = nodes.find(n => n.block.id === c.targetId);
        if (!sourceNode || !targetNode) return;

        // Use exact edge start and end points calculated in layout.ts or default to node centers
        const x1 = (c.startX !== undefined ? c.startX : (sourceNode.x + NODE_WIDTH / 2)) / 96;
        const y1 = (c.startY !== undefined ? c.startY : (sourceNode.y + NODE_HEIGHT / 2)) / 96;
        const x2 = (c.endX !== undefined ? c.endX : (targetNode.x + NODE_WIDTH / 2)) / 96;
        const y2 = (c.endY !== undefined ? c.endY : (targetNode.y + NODE_HEIGHT / 2)) / 96;

        const lx = Math.min(x1, x2);
        const ly = Math.min(y1, y2);
        const lw = Math.abs(x2 - x1);
        const lh = Math.abs(y2 - y1);

        const shapeIsFlipped = (x2 < x1) !== (y2 < y1);
        const beginArrow = shapeIsFlipped ? 'triangle' : 'none';
        const endArrow = shapeIsFlipped ? 'none' : 'triangle';

        const lineOptions: any = {
          x: lx,
          y: ly,
          w: lw || 0.01,
          h: lh || 0.01,
          beginArrowType: beginArrow,
          endArrowType: endArrow,
          line: {
            color: '6366F1',
            width: 2,
            beginArrowType: beginArrow,
            endArrowType: endArrow,
            line_end: { type: 'arrow', size: 2 }
          },
          line_end: { type: 'arrow', size: 2 }
        };

        if (x2 < x1) lineOptions.flipH = true;
        if (y2 < y1) lineOptions.flipV = true;

        slide.addShape(pres.ShapeType.line, lineOptions);

        if (c.label) {
          const lXIn = c.labelX / 96;
          const lYIn = c.labelY / 96;

          slide.addText(c.label, {
            x: lXIn - 0.3,
            y: lYIn - 0.15,
            w: 0.6,
            h: 0.3,
            align: 'center',
            valign: 'middle',
            fontSize: 8,
            color: '4F46E5',
            fill: { color: 'FFFFFF' },
            line: { color: 'E2E8F0', width: 1 },
            bold: true,
            fontFace: 'Arial'
          });
        }
      });

      // 2. Draw flowchart blocks on top
      nodes.forEach((node) => {
        const xIn = node.x / 96;
        const yIn = node.y / 96;
        const wIn = NODE_WIDTH / 96;
        const hIn = NODE_HEIGHT / 96;

        let shapeType = pres.ShapeType.rect;
        if (node.block.type === 'terminator') {
          shapeType = pres.ShapeType.ellipse;
        } else if (node.block.type === 'process') {
          shapeType = pres.ShapeType.rect;
        } else if (node.block.type === 'decision') {
          shapeType = pres.ShapeType.diamond;
        } else if (node.block.type === 'io') {
          shapeType = pres.ShapeType.parallelogram;
        }

        slide.addText(node.block.label || '', {
          shape: shapeType,
          x: xIn,
          y: yIn,
          w: wIn,
          h: hIn,
          fill: { color: 'FFFFFF' },
          line: { color: '4f46e5', width: 2 },
          color: '1E1B4B',
          fontSize: 10,
          bold: true,
          align: 'center',
          valign: 'middle',
          fontFace: 'Arial'
        });
      });

      await pres.writeFile({ fileName: 'flowforge-chart.pptx' });
      showToast?.('Flowchart saved as PPTX!', 'success');
    } catch (error) {
      console.error('Error generating PPTX:', error);
      showToast?.('Failed to export PPTX.', 'error');
    }
  };

  const getShapeStyle = (type: string, isSelected: boolean, remoteColor?: string) => {
    const baseClass = "absolute transition-all duration-250 cursor-pointer flex items-center justify-center border-2 shadow-md ";
    const selectedClass = isSelected 
      ? "border-indigo-600 dark:border-indigo-400 ring-4 ring-indigo-100 dark:ring-indigo-900 shadow-indigo-150 dark:shadow-indigo-900/50 shadow-lg scale-102"
      : remoteColor
      ? "shadow-lg scale-101 border-transparent"
      : "border-indigo-500 dark:border-indigo-400 hover:border-indigo-650 dark:hover:border-indigo-300 hover:shadow-lg hover:scale-101";

    switch (type) {
      case 'terminator':
        return `${baseClass} ${selectedClass} rounded-full bg-white dark:bg-slate-800 text-indigo-900 dark:text-indigo-100`;
      case 'process':
        return `${baseClass} ${selectedClass} rounded-xl bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-100`;
      case 'decision':
        // A rotated square needs specific sizing and text handling
        return `${baseClass} ${selectedClass} bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-100`;
      case 'io':
        return `${baseClass} ${selectedClass} bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-100`;
      default:
        return `${baseClass} ${selectedClass} bg-white dark:bg-slate-800 text-indigo-950 dark:text-indigo-100`;
    }
  };

  return (
    <div className="flex-grow h-full flex flex-col min-w-0 bg-[#fbfbfc] dark:bg-slate-900">
      {/* Top Toolbar */}
      <header className="h-[64px] bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 shadow-xs px-4 flex items-center justify-between shrink-0 select-none z-10 relative min-w-0 max-w-full overflow-x-auto overflow-y-hidden custom-scrollbar flex-nowrap">
        <div className="flex items-center gap-2 shrink-0 max-w-[45%] overflow-x-auto custom-scrollbar">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500">Workspace</span>
          <span className="text-gray-300 dark:text-slate-600">/</span>
          <select 
            value={currentWorkspace} 
            onChange={(e) => onLoad(e.target.value)}
            className="text-sm font-bold text-gray-800 dark:text-slate-100 bg-transparent border-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-sm max-w-[140px] truncate appearance-none"
            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
          >
            {workspaces.map(w => <option key={w} value={w} className="dark:bg-slate-800">{w}</option>)}
          </select>
          <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-[10px] text-indigo-600 dark:text-indigo-300 rounded-md font-semibold font-mono hidden sm:inline">STABLE</span>
          <button onClick={() => {
            let name = prompt('Save workspace as (enter new name):', currentWorkspace + ' Copy');
            if (name) {
              name = name.trim();
              if (name === '') return;
              if (workspaces.includes(name) && name !== currentWorkspace) {
                if (!confirm(`Workspace "${name}" already exists. Overwrite?`)) return;
              }
              onSave(name);
            }
          }} title="Save As" className="text-gray-400 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer ml-1 p-1">
             <Save className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => {
            if(confirm(`Are you sure you want to delete the workspace "${currentWorkspace}"?`)) onDeleteWorkspace(currentWorkspace);
          }} title="Delete Workspace" className="text-gray-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 cursor-pointer p-1">
             <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
          <button
            onClick={toggleDarkMode}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="px-2 py-1.5 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            id="toolbar-btn-shortcuts"
            onClick={onToggleShortcutsHelp}
            title="Keyboard Shortcuts (Shift + ?)"
            className="px-2 py-1.5 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Keyboard className="w-4 h-4" />
            <span className="hidden md:inline">Shortcuts</span>
          </button>

          <button
            id="toolbar-btn-save"
            onClick={() => onSave(currentWorkspace)}
            title="Save blueprint to Local Storage"
            className="px-2.5 py-1.5 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
          
          <label className="px-2.5 py-1.5 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import</span>
            <input type="file" accept=".json" className="hidden" onChange={(e) => {
               if(e.target.files?.[0]) onImportJSON(e.target.files[0]);
               e.target.value = '';
            }} />
          </label>

          <button
            onClick={() => onLayoutDirectionChange(layoutDirection === 'vertical' ? 'horizontal' : 'vertical')}
            title="Toggle layout direction"
            className="px-2.5 py-1.5 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            {layoutDirection === 'vertical' ? '↕ Vertical' : '↔ Horizontal'}
          </button>

          <button
            id="toolbar-btn-new-flowchart"
            onClick={() => setShowConfirmModal(true)}
            title="Start an empty flowchart"
            className="px-2.5 py-1.5 border border-red-200 dark:border-red-900 hover:border-red-350 dark:hover:border-red-700 text-red-650 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
            New
          </button>

          <div className="h-4 w-px bg-gray-200 dark:bg-slate-600 mx-0.5"></div>

          {/* Unified Sleek Export Dropdown */}
          <div className="relative">
            <button
              ref={exportBtnRef}
              id="toolbar-btn-export-menu"
              onClick={toggleExportMenu}
              aria-expanded={showExportMenu}
              aria-haspopup="true"
              aria-controls="export-menu-dropdown"
              title="Export diagram in various formats"
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-150 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Portalled Export Dropdown Menu */}
      {showExportMenu && createPortal(
        <div
          ref={exportMenuRef}
          id="export-menu-dropdown"
          role="menu"
          style={{
            position: 'fixed',
            top: `${exportMenuPos.top}px`,
            right: `${exportMenuPos.right}px`,
          }}
          className="w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            role="menuitem"
            onClick={() => { handleExportPNG(); setShowExportMenu(false); }}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileImage className="w-4 h-4 text-indigo-500" />
            <span>Export PNG Image</span>
          </button>
          <button
            role="menuitem"
            onClick={() => { handleExportPDF(); setShowExportMenu(false); }}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            <span>Export PDF Document</span>
          </button>
          <button
            role="menuitem"
            onClick={() => { handleExportPPTX(); setShowExportMenu(false); }}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Presentation className="w-4 h-4 text-amber-500" />
            <span className="flex items-center gap-1">
              Export PPTX
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-200 animate-pulse" />
            </span>
          </button>
          <div className="my-1 border-t border-gray-100 dark:border-slate-700"></div>
          <button
            role="menuitem"
            onClick={() => { onExportJSON(); setShowExportMenu(false); }}
            className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            <span>Export JSON Blueprint</span>
          </button>
        </div>,
        document.body
      )}

      {/* Grid Canvas area with zoom and pan interaction */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`flex-grow relative overflow-hidden bg-[#f8f9fa] dark:bg-slate-900 select-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          backgroundImage: isDarkMode 
            ? 'radial-gradient(#334155 1.5px, transparent 1.5px)'
            : 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {blocks.length === 0 ? (
          // Empty State Component
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 select-none">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center mb-5 animate-bounce shadow-inner">
              <MousePointer className="w-10 h-10 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 tracking-tight text-center">Unleash Your Structured Flow</h3>
            <p className="text-xs text-gray-400 dark:text-slate-400 mt-1 max-w-[280px] text-center leading-relaxed">
              No blocks yet. Add your first block from the left panel.
            </p>
            <button
              id="empty-add-block-btn"
              onClick={onAddFirstBlock}
              className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Quickstart with Demo Template
            </button>
          </div>
        ) : (
          <>
            {/* Play flowchart view */}
            <div 
              ref={canvasRef}
              className={`relative origin-top-left ${isDarkMode ? 'dark' : ''}`}
              style={{ 
                width: `${maxWidth}px`, 
                height: `${maxHeight}px`,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              }}
            >
              {/* SVG Vectors connecting elements */}
              <svg className="absolute inset-0 pointer-events-none w-full h-full z-0 overflow-visible">
                <defs>
                  <marker
                    id="arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#6366f1" />
                  </marker>
                  <marker
                    id="unconnected-arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#94a3b8" />
                  </marker>
                </defs>
                <g transform={`translate(${offsetX}, ${offsetY})`}>

                {connections.map((c) => {
                  const isUnconnected = !!(c as any).isUnconnected;
                  const endX = (c as any).endX;
                  const endY = (c as any).endY;

                  return (
                    <g key={c.id}>
                      {isUnconnected ? (
                        <>
                          {/* Faint dashed arrow line */}
                          <path
                            d={c.path}
                            fill="none"
                            stroke="#cbd5e1"
                            strokeWidth="1.5"
                            strokeDasharray="4,4"
                            markerEnd="url(#unconnected-arrow)"
                            className="transition-all"
                          />
                          {/* "?" endpoint circle */}
                          {endX !== undefined && endY !== undefined && (
                            <g transform={`translate(${endX}, ${endY})`}>
                              <circle
                                r="9"
                                fill="white"
                                stroke="#94a3b8"
                                strokeWidth="1.5"
                                strokeDasharray="2,2"
                              />
                              <text
                                textAnchor="middle"
                                alignmentBaseline="central"
                                className="text-[10px] font-extrabold fill-slate-500 font-mono select-none"
                                y="0.5"
                              >
                                ?
                              </text>
                            </g>
                          )}
                          {/* Connection Label for Unconnected Branch */}
                          {c.label && (
                            <g transform={`translate(${c.labelX}, ${c.labelY})`}>
                              <rect
                                x="-20"
                                y="-10"
                                width="38"
                                height="18"
                                rx="5"
                                fill="white"
                                stroke="#cbd5e1"
                                strokeWidth="1"
                                className="shadow-xs"
                              />
                              <text
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                className="text-[10px] font-bold fill-slate-500 select-none font-sans"
                                y="-2"
                              >
                                {c.label}
                              </text>
                            </g>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Subtle drop shadow underneath path line */}
                          <path
                            d={c.path}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="4"
                            className="transition-all"
                          />
                          {/* Indigo active line */}
                          <path
                            d={c.path}
                            fill="none"
                            stroke="#6366f1"
                            strokeWidth="2"
                            markerEnd="url(#arrow)"
                            className="transition-all"
                          />
                          {/* Connection Label */}
                          {c.label && (
                            <g transform={`translate(${c.labelX}, ${c.labelY})`}>
                              <rect
                                x="-20"
                                y="-10"
                                width="38"
                                height="18"
                                rx="5"
                                fill="white"
                                stroke="#e2e8f0"
                                strokeWidth="1"
                                className="shadow"
                              />
                              <text
                                textAnchor="middle"
                                alignmentBaseline="middle"
                                className="text-[10px] font-bold fill-indigo-600 select-none font-sans"
                                y="-1"
                              >
                                {c.label}
                              </text>
                            </g>
                          )}
                        </>
                      )}
                    </g>
                  );
                })}
                </g>
              </svg>

              {/* Render absolute divs representing the custom visual nodes */}
              {nodes.map((node) => {
                const isSelected = selectedBlockId === node.block.id;
                
                // Determine remote selection color
                const remoteUserIds = Object.entries(remoteSelections).filter(([_, id]) => id === node.block.id).map(([userId]) => userId);
                const remoteColor = remoteUserIds.length > 0 ? userColors[remoteUserIds[0]] : undefined;
                
                // Custom structures for specialized Shapes
                if (node.block.type === 'decision') {
                  return (
                    <div
                      key={node.block.id}
                      id={`flow-node-${node.block.id}`}
                      onClick={() => onSelectBlock(node.block.id)}
                      style={{
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: `${NODE_WIDTH}px`,
                        height: `${NODE_HEIGHT}px`,
                      }}
                      className="absolute group cursor-pointer origin-center text-indigo-950 dark:text-indigo-100"
                    >
                      {/* Diamond visually rotated 45 degrees, sized as a neat background */}
                      <div 
                        style={{
                          width: `${DIAMOND_SIZE}px`,
                          height: `${DIAMOND_SIZE}px`,
                          left: `${(NODE_WIDTH - DIAMOND_SIZE) / 2}px`,
                          top: `${(NODE_HEIGHT - DIAMOND_SIZE) / 2}px`,
                          ...(remoteColor && !isSelected ? { borderColor: remoteColor, boxShadow: `0 0 0 4px ${remoteColor}40` } : {})
                        }}
                        className={`absolute border-2 shadow-md transition-all duration-200 bg-white dark:bg-slate-800 rotate-45 ${
                          isSelected 
                            ? 'border-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-900 shadow-indigo-150 dark:shadow-indigo-900/50 scale-102' 
                            : remoteColor 
                              ? 'shadow-lg scale-101 border-transparent'
                              : 'border-indigo-500 dark:border-indigo-400 hover:border-indigo-650 dark:hover:border-indigo-300 group-hover:scale-101 group-hover:shadow-lg'
                        }`}
                      />
                      {/* Text wrapper kept upright at the same coordinates, centered perfectly */}
                      <div 
                        style={{
                          width: `${DIAMOND_SIZE - 12}px`,
                          height: `${DIAMOND_SIZE - 12}px`,
                          left: `${(NODE_WIDTH - DIAMOND_SIZE) / 2 + 6}px`,
                          top: `${(NODE_HEIGHT - DIAMOND_SIZE) / 2 + 6}px`,
                        }}
                        className="absolute flex items-center justify-center p-2 text-center z-10 pointer-events-none"
                      >
                        <span className="text-xs font-bold line-clamp-3 leading-tight select-none">
                          {node.block.label}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (node.block.type === 'io') {
                  return (
                    <div
                      key={node.block.id}
                      id={`flow-node-${node.block.id}`}
                      onClick={() => onSelectBlock(node.block.id)}
                      style={{
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: `${NODE_WIDTH}px`,
                        height: `${NODE_HEIGHT}px`,
                      }}
                      className="absolute group cursor-pointer origin-center text-indigo-950 dark:text-indigo-100"
                    >
                      {/* Parallelogram Shape */}
                      <div 
                        className={`absolute inset-0 transition-all duration-250 bg-white dark:bg-slate-800 border-2 rounded-md shadow-md ${
                          isSelected 
                            ? 'border-indigo-600 ring-4 ring-indigo-100 dark:ring-indigo-900 shadow-indigo-150 dark:shadow-indigo-900/50 scale-102' 
                            : remoteColor
                              ? 'shadow-lg scale-101 border-transparent'
                              : 'border-indigo-500 dark:border-indigo-400 hover:border-indigo-650 dark:hover:border-indigo-300 group-hover:scale-101 group-hover:shadow-lg'
                        }`}
                        style={{
                          transform: 'skewX(-15deg)',
                          ...(remoteColor && !isSelected ? { borderColor: remoteColor, boxShadow: `0 0 0 4px ${remoteColor}40` } : {})
                        }}
                      />
                      
                      {/* Counter-skewed text container */}
                      <div 
                        className="absolute inset-0 flex items-center justify-center px-4 text-center z-10 pointer-events-none"
                      >
                        <span className="text-xs font-bold line-clamp-2 leading-tight select-none">
                          {node.block.label}
                        </span>
                      </div>
                    </div>
                  );
                }

                // Standard Process or Terminator shapes
                return (
                  <div
                    key={node.block.id}
                    id={`flow-node-${node.block.id}`}
                    onClick={() => onSelectBlock(node.block.id)}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: `${NODE_WIDTH}px`,
                      height: `${NODE_HEIGHT}px`,
                      ...(remoteColor && !isSelected ? { borderColor: remoteColor, boxShadow: `0 0 0 4px ${remoteColor}40` } : {})
                    }}
                    className={getShapeStyle(node.block.type, isSelected, remoteColor)}
                  >
                    <div className="px-4 text-center">
                      <span className="text-xs font-bold line-clamp-2 leading-tight">
                        {node.block.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Render Remote Cursors */}
            {Object.entries(remoteCursors).map(([userId, pos]) => {
              const color = userColors[userId] || '#6366f1';
              return (
                <div
                  key={userId}
                  className="absolute pointer-events-none z-50 transition-all duration-75"
                  style={{
                    left: 0,
                    top: 0,
                    transform: `translate(${pan.x + pos.x * scale}px, ${pan.y + pos.y * scale}px)`,
                  }}
                >
                  <MousePointer 
                    className="w-5 h-5 drop-shadow-md" 
                    fill={color}
                    color="white" 
                    strokeWidth={1.5} 
                  />
                  <div
                    className="absolute top-5 left-3 px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-sm whitespace-nowrap"
                    style={{ backgroundColor: color }}
                  >
                    Guest {userId.substring(0, 4)}
                  </div>
                </div>
              );
            })}

            {/* Float Zoom and Pan Control HUD Panel */}
            <div className="zoom-controls absolute bottom-6 right-6 flex items-center gap-2 bg-white dark:bg-gray-900 px-3 py-2 rounded-xl shadow-lg border border-gray-150 z-20 select-none">
              <button
                onClick={() => setScale(prev => Math.max(0.25, parseFloat((prev - 0.1).toFixed(2))))}
                disabled={scale <= 0.25}
                title="Zoom Out"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:border-gray-350 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-400 min-w-[48px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(prev => Math.min(3, parseFloat((prev + 0.1).toFixed(2))))}
                disabled={scale >= 3}
                title="Zoom In"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:border-gray-350 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-gray-200 mx-1"></div>
              <button
                onClick={() => {
                  setScale(1);
                  setPan({ x: 0, y: 0 });
                }}
                title="Reset Zoom & Pan"
                className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-200 rounded-lg transition-colors cursor-pointer"
              >
                Reset
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirmation Dialog Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 max-w-sm w-full mx-4 transform transition-all scale-100">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">New Flowchart Confirmation</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              Start a new flowchart? Current work will be lost.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                id="btn-confirm-cancel"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-2 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-clear"
                onClick={() => {
                  setScale(1);
                  setPan({ x: 0, y: 0 });
                  onNewFlowchart();
                  setShowConfirmModal(false);
                }}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-red-100 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
              >
                Start New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 max-w-md w-full p-6 transform transition-all scale-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="shortcuts-modal-title" className="text-sm font-bold text-gray-900 dark:text-slate-100">
                    Keyboard Shortcuts
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-slate-400">Power-user efficiency cheatsheet</p>
                </div>
              </div>
              <button
                ref={modalCloseBtnRef}
                onClick={onToggleShortcutsHelp}
                aria-label="Close keyboard shortcuts"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-2.5 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {[
                { key: 'Delete / Backspace', desc: 'Delete selected block' },
                { key: 'Ctrl + A / Cmd + A', desc: 'Select top / root block' },
                { key: 'Ctrl + D / Cmd + D', desc: 'Duplicate selected block' },
                { key: 'Ctrl + S / Cmd + S', desc: 'Save workspace state' },
                { key: 'Escape', desc: 'Deselect block & clear focus' },
                { key: 'Tab / Shift + Tab', desc: 'Cycle selection forward / backward' },
                { key: 'Arrow Keys', desc: 'Navigate connected diagram paths' },
                { key: 'Shift + ?', desc: 'Toggle shortcuts help dialog' },
              ].map((s) => (
                <div key={s.key} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900/50 border border-gray-100 dark:border-slate-700/60">
                  <span className="text-xs font-semibold text-gray-600 dark:text-slate-300">{s.desc}</span>
                  <kbd className="px-2 py-1 bg-white dark:bg-slate-800 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-300 border border-gray-200 dark:border-slate-600 rounded-md shadow-xs">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-slate-700 text-center">
              <button
                onClick={onToggleShortcutsHelp}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
