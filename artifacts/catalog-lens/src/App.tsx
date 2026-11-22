import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Shell } from '@/components/shell';
import Studio from '@/pages/studio';
import Shop from '@/pages/shop';
import ProductPage from '@/pages/product';
import Cart from '@/pages/cart';
import OrderPage from '@/pages/order';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <Shell>
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Studio} />
        <Route path="/shop" component={Shop} />
        <Route path="/shop/:id" component={ProductPage} />
        <Route path="/cart" component={Cart} />
        <Route path="/order/:id" component={OrderPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
