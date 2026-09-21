import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  IconBot as Bot,
  IconX as X,
  IconSend as Send,
  IconDatabase as Database,
  IconBookOpen as BookOpen,
  IconUser as User,
  IconArrowRight as ExternalLink,
  IconCode as Code,
} from '../icons';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolInvoked?: 'query_inventory_db' | 'search_docs';
  sqlQuery?: string;
  docCitation?: string;
}

interface InvenzaChatbotProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

const BUTTON_SIZE = 48; // h-12 w-12 = 48px
const MARGIN = 12; // 12px safe viewport edge margin

export const InvenzaChatbot: React.FC<InvenzaChatbotProps> = ({ isOpen, onClose, onOpen }) => {
  const { products, locations, purchaseOrders } = useInventory();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Per-user position persistence key
  const userKey = user?.id || user?.email || 'guest';
  const storageKey = `invenza_copilot_pos_${userKey}`;

  // Viewport clamping utility
  const clampPosition = useCallback((x: number, y: number): { x: number; y: number } => {
    if (typeof window === 'undefined') return { x, y };
    const minX = MARGIN;
    const maxX = Math.max(MARGIN, window.innerWidth - BUTTON_SIZE - MARGIN);
    const minY = MARGIN;
    const maxY = Math.max(MARGIN, window.innerHeight - BUTTON_SIZE - MARGIN);
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y: Math.min(Math.max(y, minY), maxY),
    };
  }, []);

  const getDefaultPosition = useCallback((): { x: number; y: number } => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    return clampPosition(
      window.innerWidth - BUTTON_SIZE - 24, // right-6 (24px)
      window.innerHeight - BUTTON_SIZE - 56  // bottom-14 (56px)
    );
  }, [clampPosition]);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
            return { x: parsed.x, y: parsed.y };
          }
        }
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
    moved: boolean;
  } | null>(null);
  const dragMovedRef = useRef(false);

  // Restore and clamp position when user changes or on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setPosition(clampPosition(parsed.x, parsed.y));
          return;
        }
      }
    } catch {
      // ignore
    }
    setPosition(getDefaultPosition());
  }, [storageKey, clampPosition, getDefaultPosition]);

  // Keep button within bounds on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return getDefaultPosition();
        return clampPosition(prev.x, prev.y);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition, getDefaultPosition]);

  // Drag handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    const currentPos = position || getDefaultPosition();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: currentPos.x,
      posY: currentPos.y,
      moved: false,
    };
    dragMovedRef.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (!dragStartRef.current.moved && Math.hypot(deltaX, deltaY) > 4) {
      dragStartRef.current.moved = true;
      dragMovedRef.current = true;
      setIsDragging(true);
    }

    if (dragStartRef.current.moved) {
      const nextX = dragStartRef.current.posX + deltaX;
      const nextY = dragStartRef.current.posY + deltaY;
      setPosition(clampPosition(nextX, nextY));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current) return;
    const wasMoved = dragStartRef.current.moved;
    dragStartRef.current = null;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (wasMoved) {
      setPosition((curr) => {
        if (curr) {
          const clamped = clampPosition(curr.x, curr.y);
          try {
            localStorage.setItem(storageKey, JSON.stringify(clamped));
          } catch {
            // ignore
          }
          return clamped;
        }
        return curr;
      });
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    if (dragMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      dragMovedRef.current = false;
      return;
    }
    if (onOpen) {
      onOpen();
    } else if (onClose) {
      onClose();
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        "Hello! I am **Invenza Copilot**, your enterprise inventory assistant. I can execute live queries against the double-entry movement ledger, check warehouse stock thresholds, or explain accounting rules (FIFO vs Weighted Average).",
      timestamp: 'Now',
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulated Copilot Orchestration
    setTimeout(() => {
      const lower = query.toLowerCase();
      let reply: ChatMessage;

      if (lower.includes('low stock') || lower.includes('reorder') || lower.includes('out of stock')) {
        const lowItems = products.filter((p) => p.currentStock <= p.reorderPoint);
        const count = lowItems.length;

        reply = {
          id: `reply-${Date.now()}`,
          role: 'assistant',
          content: `I executed a read-only **Text-to-SQL** query over the inventory ledger. We currently have **${count} SKUs** below their safety reorder thresholds:\n\n${lowItems
            .map(
              (p) =>
                `• **${p.name}** (\`${p.sku}\`): **${p.currentStock} ${p.unitOfMeasure}** in stock (Reorder Point: ${p.reorderPoint})`
            )
            .join('\n')}\n\n*Actionable insight*: Purchase Order \`PO-2026-005\` has already been created for AeroCraft Industrial Supplies to replenish these units.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolInvoked: 'query_inventory_db',
          sqlQuery:
            'SELECT p.sku, p.name, p.reorder_point, COALESCE(SUM(m.quantity), 0) AS stock FROM products p LEFT JOIN stock_movements m ON p.id = m.product_id WHERE p.tenant_id = :tenant_id GROUP BY p.id HAVING stock <= p.reorder_point;',
        };
      } else if (
        lower.includes('fifo') ||
        lower.includes('valuation') ||
        lower.includes('weighted average') ||
        lower.includes('ledger')
      ) {
        reply = {
          id: `reply-${Date.now()}`,
          role: 'assistant',
          content:
            "I retrieved the relevant SOP documentation via **pgvector RAG**:\n\n### How FIFO Works in Invenza:\nInvenza calculates inventory assets using an **immutable movement ledger** (`IN`, `OUT`, `ADJUST`, `TRANSFER`). In **FIFO (First-In, First-Out)** costing:\n1. Incoming stock batches from Purchase Orders (GRN) are chronologically logged with their exact unit cost.\n2. When Sales Orders or adjustments consume stock, units are liquidated against the oldest active batch first.\n3. This reflects physical inventory rotation and preserves accurate profit margin calculations during inflationary periods.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolInvoked: 'search_docs',
          docCitation: 'Invenza Standard Operations Guide (SOP-VAL-04: Inventory Costing & Ledger Aggregation)',
        };
      } else if (lower.includes('po') || lower.includes('purchase order')) {
        reply = {
          id: `reply-${Date.now()}`,
          role: 'assistant',
          content: `You currently have **${purchaseOrders.length} Purchase Orders** on file.\n\n• **PO-2026-005** (AeroCraft): Pending delivery to Central Hub (₹3,135.00)\n• **PO-2026-004** (OmniDesk): Fully received with auto-written GRN movements (₹170.00)`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolInvoked: 'query_inventory_db',
          sqlQuery: 'SELECT po_number, supplier_name, status, total_amount FROM purchase_orders WHERE tenant_id = :tenant_id ORDER BY order_date DESC LIMIT 5;',
        };
      } else {
        reply = {
          id: `reply-${Date.now()}`,
          role: 'assistant',
          content:
            "I can assist with real-time stock balances, warehouse rebalancing, purchase order tracking, and inventory accounting guidelines. All answers are verified against your live database ledger.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }

      setMessages((prev) => [...prev, reply]);
      setIsTyping(false);
    }, 600);
  };

  if (!isOpen) {
    const pos = position || getDefaultPosition();
    return (
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleButtonClick}
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
        }}
        className={`fixed z-40 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-card select-none touch-none ${
          isDragging ? 'cursor-grabbing scale-105 shadow-modal' : 'cursor-grab transition-colors'
        }`}
        aria-label="Open Invenza AI Assistant"
        title="Invenza Copilot (Drag to reposition)"
      >
        <Bot className="h-6 w-6 text-white pointer-events-none" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-12 sm:bottom-14 right-3 sm:right-6 z-50 flex h-[min(620px,calc(100vh-5rem))] w-96 max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] shadow-modal overflow-hidden transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-teal-700 text-white">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white">Invenza Copilot</span>
              <span className="rounded bg-teal-500/10 px-1.5 py-0.2 font-mono text-[9px] font-bold text-teal-700 dark:text-teal-400">
                v1.0
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">Text-to-SQL + pgvector RAG</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-teal-700 text-white rounded-br-none'
                  : 'bg-slate-100 dark:bg-[#0C1017] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-bl-none'
              }`}
            >
              {/* Tool Execution Badge */}
              {msg.toolInvoked && (
                <div className="mb-2 flex items-center gap-1.5 rounded bg-teal-500/10 px-2 py-1 text-[10px] font-mono font-bold text-teal-800 dark:text-teal-300 border border-teal-500/20">
                  {msg.toolInvoked === 'query_inventory_db' ? (
                    <>
                      <Database className="h-3 w-3" />
                      <span>Tool: query_inventory_db (Text-to-SQL)</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-3 w-3" />
                      <span>Tool: search_docs (pgvector RAG)</span>
                    </>
                  )}
                </div>
              )}

              {/* Message text with basic markdown styling */}
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

              {/* SQL Inspector Card */}
              {msg.sqlQuery && (
                <div className="mt-2.5 rounded bg-black/40 p-2 text-[10px] font-mono text-emerald-400 border border-slate-700 overflow-x-auto">
                  <div className="flex items-center gap-1 text-[9px] text-slate-400 uppercase font-sans mb-1">
                    <Code className="h-2.5 w-2.5" /> Executed Tenant-Safe SELECT Query
                  </div>
                  {msg.sqlQuery}
                </div>
              )}

              {/* Citation */}
              {msg.docCitation && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-teal-600 dark:text-teal-400 italic">
                  <ExternalLink className="h-3 w-3" /> Source: {msg.docCitation}
                </div>
              )}
            </div>

            <span className="mt-1 px-1 text-[10px] font-mono text-slate-400">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <Bot className="h-3.5 w-3.5 animate-spin text-teal-600" />
            <span>Consulting database schema & ledger...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="border-t border-slate-100 dark:border-slate-800 p-2.5 bg-[#F4F5F8] dark:bg-[#0C1017]">
        <div className="text-[10px] uppercase font-mono font-bold text-slate-400 mb-1.5">
          Suggested Audit Queries
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            'Which SKUs are below reorder threshold?',
            'Explain FIFO costing vs Weighted Avg',
            'Pending Purchase Orders summary',
          ].map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(prompt)}
              className="rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131924] px-2 py-1 text-[10px] text-slate-600 dark:text-slate-300 hover:border-teal-600 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-[#131924] flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Copilot about SKUs, stock levels, ledgers..."
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#F4F5F8] dark:bg-[#0C1017] px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50 transition-colors"
          aria-label="Send query"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
};
