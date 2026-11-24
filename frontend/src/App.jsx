import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import { Navbar } from './components/Navbar.jsx';
import { Footer } from './components/Footer.jsx';

import DashboardPage from './pages/DashboardPage.jsx';
import CoursesPage from './pages/CoursesPage.jsx';
import TaxonomyPage from './pages/TaxonomyPage.jsx';
import AssessmentsPage from './pages/AssessmentsPage.jsx';
import CareersPage from './pages/CareersPage.jsx';
import ProjectsPage from './pages/ProjectsPage.jsx';
import TutorChatPage from './pages/TutorChatPage.jsx';
import CodingPracticePage from './pages/CodingPracticePage.jsx';
import FeedbackPage from './pages/FeedbackPage.jsx';
import AdminConsolePage from './pages/AdminConsolePage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages.jsx';

export default function App() {
  const { user, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTabState] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || (localStorage.getItem('skillbridge_access_token') ? 'dashboard' : 'login');
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveTabState(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // When authentication state resolves
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated && !['login', 'register', 'forgot-password'].includes(activeTab)) {
        setActiveTab('login');
      } else if (isAuthenticated && ['login', 'register', 'forgot-password'].includes(activeTab)) {
        setActiveTab('dashboard');
      }
    }
  }, [isAuthenticated, loading]);

  const renderContent = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="glass-panel" style={{ padding: '30px 50px', textAlign: 'center' }}>
            <span className="spinner" style={{ width: '32px', height: '32px', margin: '0 auto 16px auto', display: 'block' }}></span>
            <span style={{ color: 'var(--text-muted)' }}>Initializing SkillBridge environment...</span>
          </div>
        </div>
      );
    }

    // Public / Auth views
    if (!isAuthenticated) {
      switch (activeTab) {
        case 'register':
          return <RegisterPage onNavigate={setActiveTab} />;
        case 'forgot-password':
          return <ForgotPasswordPage onNavigate={setActiveTab} />;
        case 'login':
        default:
          return <LoginPage onNavigate={setActiveTab} />;
      }
    }

    // Authenticated views
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveTab} />;
      case 'courses':
        return <CoursesPage onNavigate={setActiveTab} />;
      case 'taxonomy':
        return <TaxonomyPage onNavigate={setActiveTab} />;
      case 'assessments':
        return <AssessmentsPage onNavigate={setActiveTab} />;
      case 'careers':
        return <CareersPage onNavigate={setActiveTab} />;
      case 'projects':
        return <ProjectsPage onNavigate={setActiveTab} />;
      case 'tutor':
        return <TutorChatPage onNavigate={setActiveTab} />;
      case 'coding':
        return <CodingPracticePage onNavigate={setActiveTab} />;
      case 'feedback':
        return <FeedbackPage onNavigate={setActiveTab} />;
      case 'profile':
        return <ProfilePage onNavigate={setActiveTab} />;
      case 'admin':
        return <AdminConsolePage onNavigate={setActiveTab} />;
      default:
        return <DashboardPage onNavigate={setActiveTab} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {renderContent()}
      </main>
      <Footer />
    </div>
  );
}
