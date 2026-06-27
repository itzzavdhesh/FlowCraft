/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
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
  FileCode
} from 'lucide-react';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import { Block, CanvasNode } from '../types';
import { calculateLayout, calculateConnections, NODE_WIDTH, NODE_HEIGHT, DIAMOND_SIZE } from '../utils/layout';

interface CenterCanvasProps {
  blocks: Block[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onSave: () => void;
  onLoad: () => void;
  onExport: (format: 'png' | 'pdf' | 'pptx') => void;
  onNewFlowchart: () => void;
  onAddFirstBlock: () => void;
  showToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export default function CenterCanvas({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onSave,
  onLoad,
  onExport,
  onNewFlowchart,
  onAddFirstBlock,
  showToast,
}: CenterCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply layout algorithm
  const nodes = calculateLayout(blocks);
  const connections = calculateConnections(nodes);

  // Zoom & Pan states
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
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
  const minWidth = 1400;
  const minHeight = 1000;
  let maxWidth = minWidth;
  let maxHeight = minHeight;
  nodes.forEach(node => {
    maxWidth = Math.max(maxWidth, node.x + NODE_WIDTH + 250);
    maxHeight = Math.max(maxHeight, node.y + NODE_HEIGHT + 250);
  });

  const handleExportPNG = async () => {
    if (!canvasRef.current) return;
    try {
      showToast?.('Generating PNG...', 'info');
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: '#f8f9fa',
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

  const handleExportSVG = async () => {
    if (!canvasRef.current) return;
    try {
      showToast?.('Generating SVG...', 'info');
      const dataUrl = await toSvg(canvasRef.current, {
        backgroundColor: '#f8f9fa',
        style: {
          transform: 'translate(0px, 0px) scale(1)',
        },
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.download = 'flowforge-chart.svg';
      link.href = dataUrl;
      link.click();
      showToast?.('Flowchart saved as SVG!', 'success');
    } catch (error) {
      console.error('Error generating SVG:', error);
      showToast?.('Failed to capture SVG.', 'error');
    }
  };

  const handleExportPDF = async () => {
    if (!canvasRef.current) return;
    try {
      showToast?.('Generating PDF...', 'info');
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: '#f8f9fa',
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

      const canvasWidth = canvasRef.current.clientWidth || minWidth;
      const canvasHeight = canvasRef.current.clientHeight || minHeight;
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

  const getShapeStyle = (type: string, isSelected: boolean) => {
    const baseClass = "absolute transition-all duration-250 cursor-pointer flex items-center justify-center border-2 shadow-md ";
    const selectedClass = isSelected 
      ? "border-indigo-600 ring-4 ring-indigo-100 shadow-indigo-150 shadow-lg scale-102"
      : "border-indigo-500 hover:border-indigo-650 hover:shadow-lg hover:scale-101";

    switch (type) {
      case 'terminator':
        return `${baseClass} ${selectedClass} rounded-full bg-white text-indigo-900`;
      case 'process':
        return `${baseClass} ${selectedClass} rounded-xl bg-white text-indigo-950`;
      case 'decision':
        // A rotated square needs specific sizing and text handling
        return `${baseClass} ${selectedClass} bg-white text-indigo-950`;
      case 'io':
        return `${baseClass} ${selectedClass} bg-white text-indigo-950`;
      default:
        return `${baseClass} ${selectedClass} bg-white text-indigo-950`;
    }
  };

  return (
    <div className="flex-grow h-full flex flex-col min-w-0 bg-[#fbfbfc]">
      {/* Top Toolbar */}
      <header className="h-[64px] bg-white border-b border-gray-100 shadow-xs px-6 flex items-center justify-between shrink-0 select-none z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Workspace</span>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            Form-Flow Sandbox
            <span className="px-1.5 py-0.5 bg-indigo-50 text-[10px] text-indigo-600 rounded-md font-semibold font-mono">STABLE</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="toolbar-btn-save"
            onClick={onSave}
            title="Save blueprint to Local Storage"
            className="px-3 py-1.5 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
          
          <button
            id="toolbar-btn-load"
            onClick={onLoad}
            title="Load blueprint from Local Storage"
            className="px-3 py-1.5 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Load
          </button>

          <button
            id="toolbar-btn-new-flowchart"
            onClick={() => setShowConfirmModal(true)}
            title="Start an empty flowchart"
            className="px-3 py-1.5 border border-red-200 hover:border-red-350 text-red-650 hover:text-red-800 hover:bg-red-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5 text-red-500" />
            New Flowchart
          </button>

          <div className="h-4 w-px bg-gray-200 mx-1"></div>

          <button
            id="toolbar-btn-export-png"
            onClick={handleExportPNG}
            className="px-3 py-1.5 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileImage className="w-3.5 h-3.5" />
            Export PNG
          </button>

          <button
            id="toolbar-btn-export-svg"
            onClick={handleExportSVG}
            className="px-3 py-1.5 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" />
            Export SVG
          </button>

          <button
            id="toolbar-btn-export-pdf"
            onClick={handleExportPDF}
            className="px-3 py-1.5 border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>

          <button
            id="toolbar-btn-export-pptx"
            onClick={handleExportPPTX}
            title="Export full premium presentation blueprint"
            className="px-4 py-1.8 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-150 hover:scale-[1.02] cursor-pointer"
          >
            <Presentation className="w-4 h-4" />
            <Sparkles className="w-3 h-3 fill-white/20 animate-pulse text-indigo-200" />
            Export PPTX
          </button>
        </div>
      </header>

      {/* Grid Canvas area with zoom and pan interaction */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`flex-grow relative overflow-hidden bg-[#f8f9fa] select-none ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {blocks.length === 0 ? (
          // Empty State Component
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 select-none">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mb-5 animate-bounce shadow-inner">
              <MousePointer className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-base font-bold text-gray-800 tracking-tight text-center">Unleash Your Structured Flow</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-[280px] text-center leading-relaxed">
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
              className="relative origin-top-left"
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
              </svg>

              {/* Render absolute divs representing the custom visual nodes */}
              {nodes.map((node) => {
                const isSelected = selectedBlockId === node.block.id;
                
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
                      className="absolute group cursor-pointer origin-center"
                    >
                      {/* Diamond visually rotated 45 degrees, sized as a neat background */}
                      <div 
                        style={{
                          width: `${DIAMOND_SIZE}px`,
                          height: `${DIAMOND_SIZE}px`,
                          left: `${(NODE_WIDTH - DIAMOND_SIZE) / 2}px`,
                          top: `${(NODE_HEIGHT - DIAMOND_SIZE) / 2}px`,
                        }}
                        className={`absolute border-2 shadow-md transition-all duration-200 bg-white rotate-45 ${
                          isSelected 
                            ? 'border-indigo-600 ring-4 ring-indigo-100 shadow-indigo-150 scale-102' 
                            : 'border-indigo-500 hover:border-indigo-650 group-hover:scale-101 group-hover:shadow-lg'
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
                        <span className="text-xs font-bold text-indigo-950 line-clamp-3 leading-tight select-none">
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
                      className="absolute group cursor-pointer origin-center"
                    >
                      {/* Parallelogram Shape */}
                      <div 
                        className={`absolute inset-0 transition-all duration-250 bg-white border-2 rounded-md shadow-md ${
                          isSelected 
                            ? 'border-indigo-600 ring-4 ring-indigo-100 shadow-indigo-150 scale-102' 
                            : 'border-indigo-500 hover:border-indigo-650 group-hover:scale-101 group-hover:shadow-lg'
                        }`}
                        style={{
                          transform: 'skewX(-15deg)',
                        }}
                      />
                      
                      {/* Counter-skewed text container */}
                      <div 
                        className="absolute inset-0 flex items-center justify-center px-4 text-center z-10 pointer-events-none"
                      >
                        <span className="text-xs font-bold text-indigo-950 line-clamp-2 leading-tight select-none">
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
                    }}
                    className={getShapeStyle(node.block.type, isSelected)}
                  >
                    <div className="px-4 text-center">
                      <span className="text-xs font-bold text-indigo-950 line-clamp-2 leading-tight">
                        {node.block.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Float Zoom and Pan Control HUD Panel */}
            <div className="zoom-controls absolute bottom-6 right-6 flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-lg border border-gray-150 z-20 select-none">
              <button
                onClick={() => setScale(prev => Math.max(0.25, parseFloat((prev - 0.1).toFixed(2))))}
                disabled={scale <= 0.25}
                title="Zoom Out"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 hover:border-gray-350 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-gray-600 min-w-[48px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(prev => Math.min(3, parseFloat((prev + 0.1).toFixed(2))))}
                disabled={scale >= 3}
                title="Zoom In"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 hover:border-gray-350 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
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
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-sm w-full mx-4 transform transition-all scale-100">
            <h3 className="text-sm font-bold text-gray-900 mb-2">New Flowchart Confirmation</h3>
            <p className="text-xs text-gray-500 leading-relaxed mb-6">
              Start a new flowchart? Current work will be lost.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                id="btn-confirm-cancel"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-2 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-600 hover:text-gray-900 rounded-lg transition-all cursor-pointer"
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
    </div>
  );
}
