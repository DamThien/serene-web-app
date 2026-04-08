import React from 'react';
import { AudioEngineProvider } from './components/AudioEngineProvider';
import { Topbar } from './components/Topbar';
import { ToastContainer } from './components/Toast';
import { StudioPage } from './pages/StudioPage';
import { FeedPage } from './pages/FeedPage';
import { useMixerStore } from './store/mixerStore';

const Pages: React.FC = () => {
  const page = useMixerStore(s => s.page);
  return (
    <>
      <div style={{ display: page === 'studio' ? 'flex' : 'none' }} className="flex-col flex-1 overflow-hidden flex">
        <StudioPage />
      </div>
      <div style={{ display: page === 'feed' ? 'flex' : 'none' }} className="flex-col flex-1 overflow-hidden flex">
        <FeedPage />
      </div>
    </>
  );
};

const App: React.FC = () => (
  <AudioEngineProvider>
    <div className="flex flex-col overflow-hidden bg-[var(--ink)] text-[var(--soft)]" style={{ height: '100dvh' }}>
      <Topbar />
      <Pages />
      <ToastContainer />
    </div>
  </AudioEngineProvider>
);

export default App;
