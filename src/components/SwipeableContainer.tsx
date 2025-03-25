import React, { ReactNode } from 'react';
import { useSwipeable, SwipeEventData } from 'react-swipeable';
import { useNavigate } from 'react-router-dom';

interface SwipeableContainerProps {
  children: ReactNode;
  leftRoute?: string;
  rightRoute?: string;
  upRoute?: string;
  downRoute?: string;
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  delta?: number;
  trackTouch?: boolean;
  trackMouse?: boolean;
  rotationAngle?: number;
}

export function SwipeableContainer({
  children,
  leftRoute,
  rightRoute,
  upRoute,
  downRoute,
  threshold = 50,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  delta = 10,
  trackTouch = true,
  trackMouse = false,
  rotationAngle = 0,
}: SwipeableContainerProps) {
  const navigate = useNavigate();

  const handlers = useSwipeable({
    onSwipedLeft: (eventData: SwipeEventData) => {
      if (eventData.absX < threshold) return;
      console.log('Swiped left!', eventData);
      if (leftRoute) navigate(leftRoute);
      if (onSwipeLeft) onSwipeLeft();
    },
    onSwipedRight: (eventData: SwipeEventData) => {
      if (eventData.absX < threshold) return;
      console.log('Swiped right!', eventData);
      if (rightRoute) navigate(rightRoute);
      if (onSwipeRight) onSwipeRight();
    },
    onSwipedUp: (eventData: SwipeEventData) => {
      if (eventData.absY < threshold) return;
      console.log('Swiped up!', eventData);
      if (upRoute) navigate(upRoute);
      if (onSwipeUp) onSwipeUp();
    },
    onSwipedDown: (eventData: SwipeEventData) => {
      if (eventData.absY < threshold) return;
      console.log('Swiped down!', eventData);
      if (downRoute) navigate(downRoute);
      if (onSwipeDown) onSwipeDown();
    },
    delta,
    trackTouch,
    trackMouse,
    rotationAngle,
  });

  return (
    <div {...handlers} className="swipeable-container">
      <div className="swipe-indicator-left">
        {leftRoute && <div className="swipe-arrow left-arrow">›</div>}
      </div>
      <div className="swipe-indicator-right">
        {rightRoute && <div className="swipe-arrow right-arrow">‹</div>}
      </div>
      <div className="swipe-content">{children}</div>
    </div>
  );
}

// Add these styles to your global CSS or styled components
const styles = `
.swipeable-container {
  position: relative;
  overflow: hidden;
  touch-action: pan-y;
  height: 100%;
}

.swipe-content {
  height: 100%;
  width: 100%;
}

.swipe-indicator-left,
.swipe-indicator-right {
  position: absolute;
  top: 0;
  height: 100%;
  width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.swipe-indicator-left {
  left: 0;
}

.swipe-indicator-right {
  right: 0;
}

.swipe-arrow {
  font-size: 24px;
  color: #f472b6;
  background-color: rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.left-arrow {
  transform: rotate(180deg);
}

/* Show indicators on touch */
@media (hover: none) {
  .swipeable-container:active .swipe-indicator-left,
  .swipeable-container:active .swipe-indicator-right {
    opacity: 0.7;
  }
}
`; 