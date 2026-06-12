'use client';

import { create } from 'zustand';

export interface Shape {
  type: 'rect' | 'circle' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  fill?: string;
  stroke: string;
  strokeWidth: number;
}

interface DrawingStore {
  // 画布配置
  currentColor: string;
  currentStrokeWidth: number;

  // 图形列表
  shapes: Shape[];

  // UI 状态
  isListening: boolean;
  theme: 'light' | 'dark';

  // 历史记录（撤销/重做后续补充）
  history: Shape[][];
  historyIndex: number;

  // Actions
  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  addShape: (shape: Shape) => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  toggleTheme: () => void;
  setListening: (v: boolean) => void;
}

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  currentColor: '#000000',
  currentStrokeWidth: 3,
  shapes: [],
  isListening: false,
  theme: 'light',
  history: [[]],
  historyIndex: 0,

  setColor: (color) => set({ currentColor: color }),

  setStrokeWidth: (width) => set({ currentStrokeWidth: width }),

  addShape: (shape) => {
    const newShapes = [...get().shapes, shape];
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(newShapes);
    set({ shapes: newShapes, history: newHistory, historyIndex: newHistory.length - 1 });
  },

  clearCanvas: () => {
    const newHistory = [...get().history.slice(0, get().historyIndex + 1), []];
    set({ shapes: [], history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    if (get().historyIndex > 0) {
      const newIndex = get().historyIndex - 1;
      set({ shapes: get().history[newIndex], historyIndex: newIndex });
    }
  },

  redo: () => {
    if (get().historyIndex < get().history.length - 1) {
      const newIndex = get().historyIndex + 1;
      set({ shapes: get().history[newIndex], historyIndex: newIndex });
    }
  },

  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

  setListening: (v) => set({ isListening: v }),
}));
