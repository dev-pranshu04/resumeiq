import { useEffect, useRef, useState } from "react";
import { useUiStore } from "@/store/ui-store";
import { Mascot } from "@/components/mascot";

/**
 * Renders nothing when cursorStyle is "system" (native cursor, the default — we don't
 * force a custom cursor on anyone who didn't ask for one). Otherwise hides the native
 * cursor and tracks the pointer with a small, spring-eased follower so it has a bit of
 * personality instead of rigidly snapping to the mouse position every frame.
 */
export function CustomCursor() {
  const cursorStyle = useUiStore((s) => s.cursorStyle);
  const dotRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);

  useEffect(() => {
    setCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (cursorStyle === "system" || coarsePointer) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { ...target };
    let raf = 0;

    function onMove(e: MouseEvent) {
      target.x = e.clientX;
      target.y = e.clientY;
      setVisible(true);
    }
    function onLeave() {
      setVisible(false);
    }

    function tick() {
      // Simple spring-ease toward the real pointer position for a bit of liveliness.
      current.x += (target.x - current.x) * 0.35;
      current.y += (target.y - current.y) * 0.35;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, [cursorStyle, coarsePointer]);

  if (cursorStyle === "system" || coarsePointer) return null;

  return (
    <>
      <style>{`html, body, * { cursor: none !important; }`}</style>
      <div
        ref={dotRef}
        className="pointer-events-none fixed left-0 top-0 z-[9999] transition-opacity duration-150"
        style={{ opacity: visible ? 1 : 0 }}
        aria-hidden
      >
        {cursorStyle === "mascot" ? <Mascot size={34} mood="point" /> : <SimpleCursor />}
      </div>
    </>
  );
}

function SimpleCursor() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
      <circle cx="11" cy="11" r="9" fill="none" stroke="var(--color-accent-purple)" strokeWidth="1.5" opacity="0.55" />
      <circle cx="11" cy="11" r="2.5" fill="var(--color-accent-purple)" />
    </svg>
  );
}
