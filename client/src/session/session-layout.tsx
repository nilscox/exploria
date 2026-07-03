import { Trans } from '@lingui/react/macro';
import clsx from 'clsx';
import { produce } from 'immer';
import { useCallback, useEffect, useReducer, useState } from 'react';

import { useMediaQuery } from 'src/hooks/use-media-query';
import { xor } from 'src/utils';

export type Layout = 'mobile' | 'tablet' | 'desktop';
export type View = 'timeline' | 'info' | 'mindmap';

export function SessionLayout({
  views,
  setView,
  header,
  sessionInfo,
  timeline,
  mindMap,
}: {
  views: Record<View, boolean>;
  setView: (view: View, visible: boolean) => void;
  header: React.ReactNode;
  sessionInfo: React.ReactNode;
  timeline: React.ReactNode;
  mindMap: React.ReactNode;
}) {
  const mindMapResize = useResizeColumn({
    initial: Math.max((window.innerWidth - 384) / 3, 280),
    minimum: 280,
    onResize: useCallback(
      (size) => {
        if (size < 20) {
          setView('mindmap', false);
        }
      },
      [setView],
    ),
  });

  return (
    <div
      className={clsx('h-full overflow-hidden grid grid-rows-[auto_1fr]', {
        'grid-cols-1': Object.values(views).filter(Boolean).length <= 1,
        'grid-cols-[24rem_1fr]': views.info && xor(views.timeline, views.mindmap),
        'grid-cols-[1fr_var(--mindmap-width)]': !views.info && views.mindmap && views.timeline,
        'grid-cols-[24rem_1fr_var(--mindmap-width)]': views.info && views.mindmap && views.timeline,
      })}
      style={{ '--mindmap-width': `${mindMapResize.width}px` } as React.CSSProperties}
    >
      <header className="col-span-full">{header}</header>

      {!views.info && !views.mindmap && !views.timeline && (
        <main className="col text-dim h-full items-center justify-center font-medium">
          <Trans>No view selected.</Trans>
        </main>
      )}

      <aside className={clsx('min-h-0 scrollbar-thin overflow-y-auto lg:max-w-96', { hidden: !views.info })}>
        {sessionInfo}
      </aside>

      <main
        className={clsx('relative lg:min-w-md min-h-0 scrollbar-thin col overflow-y-auto', { hidden: !views.timeline })}
      >
        {timeline}
      </main>

      <aside className={clsx('relative min-h-0 flex-1 overflow-hidden lg:border-l', { hidden: !views.mindmap })}>
        {views.timeline && views.mindmap && (
          <ColumnResizeHandle resizing={mindMapResize.resizing} onPointerDown={mindMapResize.startResize} />
        )}
        {mindMap}
      </aside>
    </div>
  );
}

export function useSessionLayout() {
  const isMobile = useMediaQuery('(width < 64rem)');
  const isTablet = useMediaQuery('(width < 96rem)');
  const layout = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';

  const [state, dispatch] = useReducer(reducer, {
    layout,
    views: {
      timeline: true,
      info: !isMobile,
      mindmap: !isTablet,
    },
  });

  useEffect(() => {
    dispatch({ type: 'resized', layout });
  }, [layout]);

  return [
    state,
    useCallback((view: View, visible: boolean) => dispatch({ type: 'view-changed', view, visible }), []),
  ] as const;
}

const reducer = produce(
  (
    state: { layout: Layout; views: Record<View, boolean> },
    action: { type: 'resized'; layout: Layout } | { type: 'view-changed'; view: View; visible: boolean },
  ) => {
    if (action.type === 'resized') {
      state.layout = action.layout;
    }

    if (action.type === 'view-changed') {
      state.views[action.view] = action.visible;
    }

    const { layout, views } = state;

    if (layout === 'mobile' && Object.values(views).filter(Boolean).length > 1) {
      if (action.type === 'view-changed') {
        state.views = { info: false, mindmap: false, timeline: false, [action.view]: action.visible };
      } else {
        state.views = { info: false, mindmap: false, timeline: true };
      }
    }

    if (layout !== 'mobile' && action.type === 'resized') {
      state.views.info = true;

      if (!views.timeline && !views.mindmap) {
        state.views.timeline = true;
      }
    }

    if (layout === 'tablet' && views.timeline && views.mindmap) {
      if (action.type === 'view-changed' && action.view === 'mindmap') {
        state.views.timeline = false;
      } else {
        state.views.mindmap = false;
      }
    }
  },
);

function useResizeColumn({
  initial,
  minimum,
  onResize,
}: {
  initial: number;
  minimum: number;
  onResize?: (size: number) => void;
}) {
  const [resizing, setResizing] = useState(false);
  const [width, setWidth] = useState(Math.max(initial, minimum));

  const startResize = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      setResizing(true);

      const onMove = (moveEvent: PointerEvent) => {
        const width = window.innerWidth - moveEvent.clientX;

        onResize?.(width);
        setWidth(Math.min(Math.max(width, minimum), window.innerWidth * 0.6));
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
    [minimum, onResize],
  );

  return { width, resizing, startResize };
}

function ColumnResizeHandle({
  resizing,
  onPointerDown,
}: {
  resizing: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="group absolute inset-y-0 left-1.5 z-10 flex w-4 -translate-x-1/2 cursor-col-resize items-center justify-center"
    >
      <div
        className={clsx(
          'h-8 w-1.5 rounded-full bg-border transition-colors group-hover:bg-primary/60',
          resizing && 'bg-primary/60',
        )}
      />
    </div>
  );
}
