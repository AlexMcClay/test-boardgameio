import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AnimatePresence } from 'motion/react'
import AssetLoader from '@/components/AssetLoader'
import { usePreloadAssets } from '@/hooks/usePreloadAssets'

/**
 * Gated here rather than in `routes/index.tsx` so it sits above the
 * `currentView` switch and can't be re-evaluated on every view change.
 */
function RootLayout() {
  const { progress, done } = usePreloadAssets()

  return (
    <>
      <AnimatePresence>
        {!done && <AssetLoader key="asset-loader" progress={progress} />}
      </AnimatePresence>
      {done && (
        <>
          <Outlet />
          <TanStackRouterDevtools />
        </>
      )}
    </>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
