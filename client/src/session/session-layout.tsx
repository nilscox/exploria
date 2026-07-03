import { Trans } from '@lingui/react/macro';
import clsx from 'clsx';
import { produce } from 'immer';
import { useCallback, useEffect, useReducer } from 'react';

import { ResizeHandle } from 'src/components/resize-handle';
import { useMediaQuery } from 'src/hooks/use-media-query';
import { useResizeElement } from 'src/hooks/use-resize-element';
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
  const mindMapResize = useResizeElement({
    axis: 'horizontal',
    initial: Math.max((window.innerWidth - 384) / 3, 280),
    min: 280,
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
      className={clsx('h-full min-h-0 overflow-hidden grid grid-rows-[auto_1fr]', {
        'grid-cols-1': Object.values(views).filter(Boolean).length <= 1,
        'grid-cols-[24rem_1fr]': views.info && xor(views.timeline, views.mindmap),
        'grid-cols-[1fr_var(--mindmap-width)]': !views.info && views.mindmap && views.timeline,
        'grid-cols-[24rem_1fr_var(--mindmap-width)]': views.info && views.mindmap && views.timeline,
      })}
      style={{ '--mindmap-width': `${mindMapResize.size}px` } as React.CSSProperties}
    >
      <header className="col-span-full">{header}</header>

      {!views.info && !views.mindmap && !views.timeline && (
        <main className="col text-dim items-center justify-center font-medium">
          <Trans>No view selected.</Trans>
        </main>
      )}

      <aside className={clsx('min-h-0 relative scrollbar-thin overflow-y-auto lg:max-w-96', { hidden: !views.info })}>
        {sessionInfo}
      </aside>

      <main
        className={clsx('relative lg:min-w-md min-h-0 scrollbar-thin col overflow-y-auto', { hidden: !views.timeline })}
      >
        {timeline}
      </main>

      <aside className={clsx('relative col min-h-0 flex-1 overflow-hidden lg:border-l', { hidden: !views.mindmap })}>
        {views.timeline && views.mindmap && (
          <ResizeHandle
            axis="horizontal"
            resizing={mindMapResize.resizing}
            onPointerDown={mindMapResize.startResize}
            className="absolute top-1/2 left-1 z-10 -translate-y-1/2"
          />
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
