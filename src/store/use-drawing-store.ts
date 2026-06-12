"use client";

import { create } from "zustand";

export interface Shape {
  fill?: string;
  height?: number;
  points?: number[];
  radius?: number;
  stroke: string;
  strokeWidth: number;
  type: "rect" | "circle" | "line";
  width?: number;
  x: number;
  y: number;
}

export interface Command {
  id: string;
  shapeCount: number;
  text: string;
  timestamp: number;
}

interface DrawingStore {
  addCommand: (text: string) => void;
  addShape: (shape: Shape) => void;
  clearCanvas: () => void;
  clearCommands: () => void;
  // 画布配置
  commands: Command[];
  currentColor: string;
  currentStrokeWidth: number;

  // 历史记录（撤销/重做）
  history: Shape[][];
  historyIndex: number;

  // UI 状态
  isListening: boolean;
  redo: () => void;

  // Actions
  setColor: (color: string) => void;
  setListening: (v: boolean) => void;
  setStrokeWidth: (width: number) => void;

  // 图形列表
  shapes: Shape[];
  theme: "light" | "dark";
  toggleTheme: () => void;
  undo: () => void;
}

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  commands: [],
  currentColor: "#000000",
  currentStrokeWidth: 3,
  shapes: [],
  isListening: false,
  theme: "light",
  history: [[]],
  historyIndex: 0,

  addCommand: (text) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const command: Command = {
      id,
      text,
      timestamp: Date.now(),
      shapeCount: get().shapes.length,
    };
    set({ commands: [...get().commands, command] });
  },

  clearCommands: () => set({ commands: [] }),

  setColor: (color) => set({ currentColor: color }),

  setStrokeWidth: (width) => set({ currentStrokeWidth: width }),

  addShape: (shape) => {
    const newShapes = [...get().shapes, shape];
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(newShapes);
    set({
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  clearCanvas: () => {
    const newHistory = [...get().history.slice(0, get().historyIndex + 1), []];
    set({
      shapes: [],
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
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

  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),

  setListening: (v) => set({ isListening: v }),
}));
