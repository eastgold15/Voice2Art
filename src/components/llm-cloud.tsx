"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Cloud } from "lucide-react";
import { useRef } from "react";

interface LlmCloudProps {
  thinking: boolean;
}

export default function LlmCloud({ thinking }: LlmCloudProps) {
  const randomX = useRef(Math.random() * 60 - 30);

  return (
    <AnimatePresence>
      {thinking && (
        <motion.div
          animate={{
            opacity: 1,
            y: -16,
            scale: 1,
            x: `calc(-50% + ${randomX.current}px)`,
          }}
          aria-hidden
          className="pointer-events-none absolute z-20"
          exit={{
            opacity: 0,
            y: -40,
            scale: 0.8,
            transition: { duration: 0.5 },
          }}
          initial={{ opacity: 0, y: 10, scale: 0.85, x: "-50%" }}
          style={{ bottom: "100%", left: "50%", marginBottom: "12px" }}
          transition={{
            duration: 0.35,
            ease: "easeOut",
            y: {
              duration: 2.5,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            },
          }}
        >
          {/* 云朵主体 */}
          <div className="relative flex items-center justify-center">
            {/* lucide Cloud 图标 */}
            <Cloud className="size-16 text-blue-200 drop-shadow-md dark:text-blue-800/60" />

            {/* 云中文字 */}
            <span className="absolute whitespace-nowrap font-medium text-[11px] text-blue-600 dark:text-blue-300">
              AI 思考中...
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
