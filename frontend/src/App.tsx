import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ConversationResponse, StatsResponse } from './types/api';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { ImportCard } from './components/ImportCard';
import { StatsGrid } from './components/StatsGrid';
import { SessionsPanel } from './components/SessionsPanel';
import { TopicsAsidePanel } from './components/TopicsAsidePanel';
import { LeaderboardSection } from './components/LeaderboardSection';
import { DetailModal } from './components/DetailModal';
import { SignInModal } from './components/SignInModal';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => api.isAuthenticated());
  const [username, setUsername] = useState<string>(() => api.getUsername());

  const [conversations, setConversations] = useState<ConversationResponse[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<ConversationResponse | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const urlInputRef = useRef<HTMLInputElement | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!api.isAuthenticated()) {
      setIsAuthenticated(false);
      return;
    }
    try {
      setDashboardError(null);
      const [convList, statsData] = await Promise.all([
        api.getConversations(),
        api.getStats(),
      ]);
      setConversations(convList);
      setStats(statsData);
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to connect to the backend server.';
      if (message.includes('Unauthorized')) {
        setIsAuthenticated(false);
      } else {
        setDashboardError(message);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboard();
    }
  }, [isAuthenticated, loadDashboard]);

  const handleLoginSuccess = (loggedInUser: string) => {
    setIsAuthenticated(true);
    setUsername(loggedInUser);
    loadDashboard();
  };

  const handleSignOut = () => {
    api.logout();
    setIsAuthenticated(false);
    setConversations([]);
    setStats(null);
    setSelectedConversation(null);
  };

  const handleNavigate = (section: string) => {
    setActiveSection(section);
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAddSessionClick = () => {
    const importCard = document.getElementById('import-card');
    if (importCard) {
      importCard.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => urlInputRef.current?.focus(), 300);
    }
  };

  const handleImportSuccess = async (imported: ConversationResponse) => {
    await loadDashboard();
    setSelectedConversation(imported);
  };

  const handleSelectId = async (id: string) => {
    const found = conversations.find((c) => c.id === id);
    if (found) {
      setSelectedConversation(found);
    } else {
      try {
        const fetched = await api.getConversation(id);
        setSelectedConversation(fetched);
      } catch {
        // Conversation could not be loaded
      }
    }
  };

  const handleReanalyze = async (id: string) => {
    const updated = await api.reanalyzeConversation(id);
    await loadDashboard();
    setSelectedConversation(updated);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    try {
      await api.deleteConversation(id);
      if (selectedConversation?.id === id) {
        setSelectedConversation(null);
      }
      await loadDashboard();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed.';
      alert(msg);
    }
  };

  return (
    <div className="shell">
      {!isAuthenticated && <SignInModal onSuccess={handleLoginSuccess} />}

      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        username={username}
        onSignOut={handleSignOut}
      />

      <main>
        <Topbar onAddSessionClick={handleAddSessionClick} />

        <ImportCard
          inputRef={urlInputRef}
          onImportSuccess={handleImportSuccess}
        />

        {dashboardError && (
          <div className="empty" style={{ borderColor: 'var(--danger)', color: 'var(--bone)' }}>
            <span style={{ color: 'var(--danger)' }}>!</span>
            <p>Could not connect to the Daily Conversation server</p>
            <small>{dashboardError}</small>
          </div>
        )}

        <StatsGrid stats={stats} />

        <section className="content-grid" id="sessions">
          <SessionsPanel
            conversations={conversations}
            filter={filter}
            onFilterChange={setFilter}
            onSelectConversation={setSelectedConversation}
            onDeleteConversation={handleDelete}
          />
          <TopicsAsidePanel stats={stats} />
        </section>

        <LeaderboardSection
          onSelectId={handleSelectId}
          onDeleteConversation={handleDelete}
          refreshTrigger={refreshTrigger}
        />

        <footer className="page-footer">
          Daily Conversation · your private learning journal
        </footer>
      </main>

      <DetailModal
        conversation={selectedConversation}
        onClose={() => setSelectedConversation(null)}
        onReanalyze={handleReanalyze}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default App;
