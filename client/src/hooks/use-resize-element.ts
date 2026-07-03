import { useCallback, useRef, useState } from 'react';

type Axis = 'horizontal' | 'vertical';

export function useResizeElement({
  axis,
  initial,
  min,
  onResize,
}: {
  axis: Axis;
  initial: number;
  min: number;
  onResize?: (size: number) => void;
}) {
  const [size, setSize] = useState(() => Math.max(initial, min));
  const [resizing, setResizing] = useState(false);
  const sizeRef = useRef(size);

  sizeRef.current = size;

  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      setResizing(true);

      const startPosition = axis === 'horizontal' ? event.clientX : event.clientY;
      const startSize = sizeRef.current;

      const onMove = (moveEvent: PointerEvent) => {
        const position = axis === 'horizontal' ? moveEvent.clientX : moveEvent.clientY;
        const next = startSize + (startPosition - position);

        onResize?.(next);
        setSize(Math.max(next, min));
      };

      const onUp = () => {
        setResizing(false);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.userSelect = '';
      };

      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [axis, min, onResize],
  );

  return { size, resizing, startResize };
}
