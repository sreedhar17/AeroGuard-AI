import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import BOMReconciliation from './components/BOMReconciliation';
import RegulatoryAlerts from './components/RegulatoryAlerts';
import CCBAssistant from './components/CCBAssistant';
import VirtualAuditor from './components/VirtualAuditor';
import RegulationParser from './components/RegulationParser';
import ComplianceAuditHub from './components/ComplianceAuditHub';
import { AppView } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard onNavigate={setCurrentView} />;
      case AppView.BOM_RECONCILIATION:
        return <BOMReconciliation />;
      case AppView.REGULATION_PARSER:
        return <RegulationParser />;
      case AppView.COMPLIANCE_HUB:
        return <ComplianceAuditHub />;
      case AppView.REGULATORY_ALERTS:
        return <RegulatoryAlerts />;
      case AppView.CCB_ASSISTANT:
        return <CCBAssistant />;
      case AppView.VIRTUAL_AUDITOR:
        return <VirtualAuditor />;
      default:
        return <Dashboard onNavigate={setCurrentView} />;
    }
  };

  return (
    <Layout currentView={currentView} setCurrentView={setCurrentView}>
      {renderContent()}
    </Layout>
  );
};

export default App;