"use client";

import { History, Play } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { routeCommandStream } from "@/lib/command-router";
import { cn } from "@/lib/utils";
import { useDrawingStore } from "@/store/use-drawing-store";
import type { Instruction } from "@/types/drawing";

export default function CommandHistory() {
  const commands = useDrawingStore((s) => s.commands);
  const listRef = useRef<HTMLDivElement>(null);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const ss = d.getSeconds().toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const handleReplay = async (text: string) => {
    const store = useDrawingStore.getState();
    store.addCommand(`🔁 ${text}`);
    toast.info(`正在重新执行: "${text}"`);

    // 缓冲所有指令，等流结束后逐条延迟执行
    const buffer: Instruction[] = [];

    const ok = await routeCommandStream(
      text,
      (drawShape) => {
        buffer.push(drawShape);
      },
      (setStyle) => {
        buffer.push(setStyle);
      },
      (canvasControl) => {
        buffer.push(canvasControl);
      }
    );

    if (buffer.length > 0) {
      for (const instruction of buffer) {
        await new Promise((r) => setTimeout(r, 600));
        useDrawingStore.getState().executeInstructions([instruction]);
      }
    } else if (!ok) {
      toast.error(`无法重新执行指令: "${text}"`);
    }
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l bg-muted/20">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <History className="size-4 text-voice-accent" />
        <h2 className="font-medium text-sm">指令历史</h2>
        {commands.length > 0 && (
          <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground tabular-nums">
            {commands.length}
          </span>
        )}
      </div>

      {/* List */}
      <div
        className="sidebar-scroll flex-1 space-y-1 overflow-y-auto p-3"
        ref={listRef}
      >
        {commands.length === 0 ? (
          <div className="flex flex-col items-center gap-2 pt-12 text-center">
            <History className="size-8 text-muted-foreground/30" />
            <p className="text-muted-foreground/60 text-xs">还没有指令</p>
            <p className="max-w-40 text-[11px] text-muted-foreground/40">
              点击麦克风开始语音绘画吧
            </p>
          </div>
        ) : (
          [...commands].reverse().map((cmd, idx) => {
            const isLatest = idx === 0;
            return (
              <div
                className={cn(
                  "group rounded-lg border px-3 py-2.5 transition-colors",
                  isLatest
                    ? "border-voice-accent/20 bg-voice-accent/[0.03]"
                    : "border-transparent bg-background hover:border-border"
                )}
                key={cmd.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-[13px] leading-snug">
                    {cmd.text}
                  </p>
                  <Button
                    aria-label="回放此指令"
                    className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100"
                    onClick={() => handleReplay(cmd.text)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Play className="size-3" />
                  </Button>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground/60">
                  <time>{formatTime(cmd.timestamp)}</time>
                  {cmd.shapeCount > 0 && (
                    <>
                      <span>·</span>
                      <span>{cmd.shapeCount} 个图形</span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
