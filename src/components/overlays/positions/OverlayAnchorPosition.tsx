import classNames from "classnames";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { useOverlayStore } from "@/stores/overlay/store";

interface AnchorPositionProps {
  children?: ReactNode;
  className?: string;
}

function useCalculatePositions() {
  const anchorPoint = useOverlayStore((s) => s.anchorPoint);
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth - 343 - 30;
    }
    return 0;
  });
  const [top, setTop] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return window.innerHeight - 496 - 100;
    }
    return 0;
  });
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const calculateAndSetCoords = useCallback(
    (anchor: typeof anchorPoint, card: DOMRect) => {
      const cardWidth = card?.width || 343;
      const cardHeight = card?.height || 496;
      if (!anchor || (anchor.x === 0 && anchor.y === 0)) {
        setTop(window.innerHeight - cardHeight - 100);
        setLeft(window.innerWidth - cardWidth - 30);
        return;
      }
      const buttonCenter = anchor.x + anchor.w / 2;
      const bottomReal = window.innerHeight - (anchor.y + anchor.h);
      setTop(window.innerHeight - bottomReal - anchor.h - cardHeight - 30);

      // If the button is in the right half of the screen, right-align the card
      // to the button's right edge so the menu doesn't bleed off screen
      const isRightSide = buttonCenter > window.innerWidth / 2;
      let leftPos: number;
      if (isRightSide) {
        // Align the card's right edge to the button's right edge
        const buttonRight = anchor.x + anchor.w;
        leftPos = Math.max(30, Math.min(buttonRight - cardWidth, window.innerWidth - cardWidth - 30));
      } else {
        // Align the card's left edge to the button's left edge
        leftPos = Math.max(30, Math.min(anchor.x, window.innerWidth - cardWidth - 30));
      }
      setLeft(leftPos);
    },
    [],
  );
  useEffect(() => {
    if (!anchorPoint || !cardRect) return;
    calculateAndSetCoords(anchorPoint, cardRect);
  }, [anchorPoint, calculateAndSetCoords, cardRect]);
  useEffect(() => {
    if (!ref.current) return;
    function checkBox() {
      const divRect = ref.current?.getBoundingClientRect();
      setCardRect(divRect ?? null);
    }
    checkBox();
    const observer = new ResizeObserver(checkBox);
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
    };
  }, []);
  return [ref, left, top] as const;
}

export function OverlayAnchorPosition(props: AnchorPositionProps) {
  const [ref, left, top] = useCalculatePositions();
  return (
    <div
      ref={ref}
      style={{
        transform: `translateX(${left}px) translateY(${top}px)`,
      }}
      className={classNames([
        "absolute top-0 left-0 [&>*]:pointer-events-auto z-10 flex dir-neutral:items-start touch-none",
        props.className,
      ])}
    >
      {props.children}
    </div>
  );
}

