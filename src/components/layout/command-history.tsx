"use client";

import { Play } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDrawingStore } from "@/store/use-drawing-store";

export default function CommandHistory() {
  const commands = useDrawingStore((s) => s.commands);
  const listRef = useRef<HTMLDivElement>(null);
  const [replaying, setReplaying] = useState<string | null>(null);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const hh = d.getHours().toString().padStart(2, "0");
    const mm = d.getMinutes().toString().padStart(2, "0");
    const ss = d.getSeconds().toString().padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
  };

  const handleReplay = async (cmdId: string) => {
    if (replaying) return;
    setReplaying(cmdId);

    const store = useDrawingStore.getState();
    const cmd = store.commands.find((c) => c.id === cmdId);
    if (!cmd) {
      setReplaying(null);
      return;
    }

    // 直接执行缓存的指令，不调 API
    if (cmd.instructions.length > 0) {
      store.executeInstructions(cmd.instructions);
    }

    setReplaying(null);
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l bg-muted/20">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Play className="size-4 text-voice-accent" />
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
            <Play className="size-8 text-muted-foreground/30" />
            <p className="text-muted-foreground/60 text-xs">还没有指令</p>
            <p className="max-w-40 text-[11px] text-muted-foreground/40">
              点击麦克风开始语音绘画吧
            </p>
          </div>
        ) : (
          [...commands].reverse().map((cmd, idx) => {
            const isLatest = idx === 0;
            const isReplaying = replaying === cmd.id;

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
                    className={cn(
                      "mt-0.5 shrink-0 transition-opacity",
                      isReplaying
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={() => handleReplay(cmd.id)}
                    size="icon-xs"
                    variant="ghost"
                  >
                    <Play
                      className={cn(
                        "size-3",
                        isReplaying && "animate-pulse text-voice-accent"
                      )}
                    />
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
