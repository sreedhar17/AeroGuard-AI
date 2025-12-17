
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, CheckCircle, FileText, Activity, ArrowRight } from 'lucide-react';
import { AppView } from '../types';

interface DashboardProps {
  onNavigate: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const complianceData = [
    { name: 'Fleet A', compliant: 85, nonCompliant: 15 },
    { name: 'Fleet B', compliant: 92, nonCompliant: 8 },
    { name: 'Fleet C', compliant: 78, nonCompliant: 22 },
  ];

  const pieData = [
    { name: 'As-Designed Match', value: 750 },
    { name: 'Minor Deviations', value: 45 },
    { name: 'Critical Mismatches', value: 12 },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  const MetricCard = ({ 
    title, 
    value, 
    subtext, 
    icon: Icon, 
    iconColor, 
    bgColor, 
    targetView 
  }: { 
    title: string; 
    value: string; 
    subtext: React.ReactNode; 
    icon: React.ElementType; 
    iconColor: string; 
    bgColor: string;
    targetView: AppView;
  }) => (
    <div 
      onClick={() => onNavigate(targetView)}
      className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200 group"
    >
      <div>
        <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-2">{value}</h3>
        <div className="mt-1">{subtext}</div>
      </div>
      <div className={`p-3 rounded-lg ${bgColor}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Mission Control</h2>
        <p className="text-slate-500 mt-2">Fleet-wide Airworthiness Status & Compliance Overview</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Active Directives" 
          value="14" 
          subtext={
            <p className="text-xs text-amber-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> 2 Critical (Action Req)
            </p>
          }
          icon={Activity}
          iconColor="text-amber-600"
          bgColor="bg-amber-50"
          targetView={AppView.REGULATORY_ALERTS}
        />

        <MetricCard 
          title="Fleet Compliance" 
          value="94.2%" 
          subtext={
            <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> +1.2% this week
            </p>
          }
          icon={CheckCircle}
          iconColor="text-emerald-600"
          bgColor="bg-emerald-50"
          targetView={AppView.COMPLIANCE_HUB}
        />

        <MetricCard 
          title="Change Requests" 
          value="12" 
          subtext={<p className="text-xs text-slate-500">Active Change Pipeline</p>}
          icon={FileText}
          iconColor="text-blue-600"
          bgColor="bg-blue-50"
          targetView={AppView.CM_ASSISTANT}
        />

        <MetricCard 
          title="Next Audit" 
          value="12 Days" 
          subtext={<p className="text-xs text-slate-500">FAA Part 121 Check</p>}
          icon={Activity}
          iconColor="text-indigo-600"
          bgColor="bg-indigo-50"
          targetView={AppView.VIRTUAL_AUDITOR}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Fleet Compliance by Type</h3>
            <button 
              onClick={() => onNavigate(AppView.COMPLIANCE_HUB)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View Detail <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                    cursor={{fill: '#f1f5f9'}}
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="compliant" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} name="Compliant" />
                <Bar dataKey="nonCompliant" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Non-Compliant" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold text-slate-900">BOM Integrity Status</h3>
             <button 
              onClick={() => onNavigate(AppView.BOM_RECONCILIATION)}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Analyze <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="h-80 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index]}}></div>
                <span className="text-sm text-slate-600">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
