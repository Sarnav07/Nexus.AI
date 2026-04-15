import { createRoot } from 'react-dom/client';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from './lib/wagmi-config.ts';
import App from './App.tsx';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 30s for on-chain reads (chain data changes slowly)
      staleTime: 30_000,
      // Retry once on failure before showing error
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: 'hsl(72 100% 50%)',        // Nexus neon-yellow primary
          accentColorForeground: 'hsl(0 0% 5%)',  // Near-black for text on accent
          borderRadius: 'medium',
          fontStack: 'system',
        })}
      >
        <App />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

