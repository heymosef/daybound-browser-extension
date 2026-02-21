import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./ui/utils";

interface MorphingTimeProps {
  children: string; // The time string to morph
  className?: string;
}

// Short tween instead of spring — much cheaper when 50+ chars animate at once
const tweenTransition = {
  type: "tween" as const,
  ease: [0, 0, 0.2, 1] as const, // ease-out decelerate
  duration: 0.25,
};

export const MorphingTime: React.FC<MorphingTimeProps> = ({
  children,
  className,
}) => {
  // Split the string into characters
  const characters = children.split("");

  return (
    <div className={cn("inline-flex overflow-hidden relative", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        {characters.map((char, index) => {
          // Key by index AND char to trigger animation only when char changes at that position
          const key = `${index}-${char}`;
          
          return (
            <motion.span
              key={key}
              initial={{ 
                y: "50%", 
                opacity: 0,
              }}
              animate={{ 
                y: "0%", 
                opacity: 1,
              }}
              exit={{ 
                y: "-50%", 
                opacity: 0,
                position: "absolute" // Take out of flow immediately
              }}
              transition={tweenTransition}
              className="inline-block whitespace-pre text-center"
              style={{
                minWidth: char === " " ? "0.3em" : "auto",
                willChange: "transform, opacity",
              }}
            >
              {char}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
};