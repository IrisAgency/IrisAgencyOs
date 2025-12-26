import React from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Department } from '../../types';

interface DashboardHeaderProps {
  selectedDate: Date;
  viewMode: 'today' | 'week' | 'month';
  searchTerm: string;
  selectedDepartment: Department | 'all';
  departmentColors: Record<Department, { bg: string; light: string; text: string; border: string }>;
  onSearchChange: (value: string) => void;
  onViewModeChange: (mode: 'today' | 'week' | 'month') => void;
  onDepartmentChange: (dept: Department | 'all') => void;
  onDateNavigate: (direction: 'prev' | 'next') => void;
  getDepartmentIcon: (dept: Department) => React.ComponentType<{ className?: string }>;
  currentUser: { name: string };
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  selectedDate,
  viewMode,
  searchTerm,
  selectedDepartment,
  departmentColors,
  onSearchChange,
  onViewModeChange,
  onDepartmentChange,
  onDateNavigate,
  getDepartmentIcon,
  currentUser,
}) => {
  return (
    <header className="bg-iris-black text-iris-white rounded-2xl p-3 sm:p-6 flex flex-col justify-between gap-4 sm:gap-6">
      <div>
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4 lg:gap-0">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-iris-white">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h1>
            <p className="text-iris-white/70 mt-1 text-xs sm:text-base">
              Welcome back, {currentUser.name}. Let's get things done!
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-iris-white/50" />
              <input
                type="text"
                placeholder="Search events, tasks..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="bg-iris-white/10 border-none rounded-full w-full sm:w-72 pl-10 pr-4 py-2.5 text-iris-white placeholder-iris-white/50 focus:ring-2 focus:ring-iris-red"
              />
            </div>
            <button className="flex items-center justify-center gap-2 bg-iris-red text-iris-white font-semibold px-4 py-2.5 rounded-full hover:bg-iris-red/90 transition-colors whitespace-nowrap">
              <span className="material-icons text-sm">auto_awesome</span>
              Ask IRIS AI
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => onViewModeChange('today')}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${
              viewMode === 'today'
                ? 'bg-iris-white/20 text-iris-white'
                : 'bg-iris-white/10 text-iris-white/70 hover:bg-iris-white/15'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => onViewModeChange('week')}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${
              viewMode === 'week'
                ? 'bg-iris-white/20 text-iris-white'
                : 'bg-iris-white/10 text-iris-white/70 hover:bg-iris-white/15'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewModeChange('month')}
            className={`px-4 py-2 rounded-full font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-iris-white/20 text-iris-white'
                : 'bg-iris-white/10 text-iris-white/70 hover:bg-iris-white/15'
            }`}
          >
            Month
          </button>
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onDateNavigate('prev')}
              className="p-2 rounded-full hover:bg-iris-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-iris-white/70" />
            </button>
            <button
              onClick={() => onDateNavigate('next')}
              className="p-2 rounded-full hover:bg-iris-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-iris-white/70" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {Object.values(Department).map((dept) => {
            const Icon = getDepartmentIcon(dept);
            const isActive = selectedDepartment === dept;
            return (
              <button
                key={dept}
                onClick={() => onDepartmentChange(isActive ? 'all' : dept)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-iris-red text-iris-white shadow-sm'
                    : 'bg-iris-white/10 text-iris-white/70 hover:bg-iris-white/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{dept}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
