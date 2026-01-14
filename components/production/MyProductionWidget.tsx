import React, { useState, useEffect, useMemo } from 'react';
import { ProductionAssignment, Task, CalendarContentType } from '../../types';
import { 
  Calendar, 
  Clock, 
  Video, 
  Image as ImageIcon, 
  Zap,
  ChevronRight,
  Package
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getProductionCountdown } from '../../utils/productionUtils';

interface MyProductionWidgetProps {
  currentUserId: string;
  onTaskClick?: (task: Task) => void;
}

interface ProductionWithTasks {
  assignment: ProductionAssignment;
  tasks: Task[];
  countdown: {
    days: number;
    label: string;
    color: string;
  };
}

const MyProductionWidget: React.FC<MyProductionWidgetProps> = ({
  currentUserId,
  onTaskClick
}) => {
  const [productions, setProductions] = useState<ProductionWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduction, setSelectedProduction] = useState<ProductionWithTasks | null>(null);

  useEffect(() => {
    loadMyProductions();
  }, [currentUserId]);

  const loadMyProductions = async () => {
    try {
      setLoading(true);

      // Calculate date range: 7 days ago to future
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // Load production assignments for current user
      const assignmentsQuery = query(
        collection(db, 'production_assignments'),
        where('userId', '==', currentUserId),
        where('productionDate', '>=', sevenDaysAgoStr),
        where('status', '!=', 'ARCHIVED')
      );

      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignments = assignmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ProductionAssignment));

      // Load tasks for each production
      const productionsWithTasks: ProductionWithTasks[] = [];

      for (const assignment of assignments) {
        // Query production tasks
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('productionPlanId', '==', assignment.productionPlanId),
          where('assigneeIds', 'array-contains', currentUserId),
          where('isArchived', '==', false)
        );

        const tasksSnapshot = await getDocs(tasksQuery);
        const tasks = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Task));

        const countdown = getProductionCountdown(assignment.productionDate);

        productionsWithTasks.push({
          assignment,
          tasks,
          countdown
        });
      }

      // Sort by production date (soonest first)
      productionsWithTasks.sort((a, b) => 
        new Date(a.assignment.productionDate).getTime() - new Date(b.assignment.productionDate).getTime()
      );

      setProductions(productionsWithTasks);
    } catch (error) {
      console.error('Error loading my productions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case 'video': return <Video className="w-4 h-4 text-blue-400" />;
      case 'photo': return <ImageIcon className="w-4 h-4 text-purple-400" />;
      case 'motion': return <Zap className="w-4 h-4 text-yellow-400" />;
      default: return null;
    }
  };

  const getTypeBadgeClass = (type: string) => {
    const lowerType = type.toLowerCase();
    switch (lowerType) {
      case 'video': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'photo': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'motion': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  // Group tasks by type
  const groupedTasks = useMemo(() => {
    if (!selectedProduction) return { VIDEO: [], PHOTO: [], MOTION: [] };

    const groups: Record<string, Task[]> = {
      VIDEO: [],
      PHOTO: [],
      MOTION: []
    };

    selectedProduction.tasks.forEach(task => {
      const type = task.taskType.toUpperCase();
      if (groups[type]) {
        groups[type].push(task);
      }
    });

    return groups;
  }, [selectedProduction]);

  if (loading) {
    return (
      <div className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-lg p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (productions.length === 0) {
    return (
      <div className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-[color:var(--dash-primary)]" />
          <h3 className="text-lg font-semibold text-slate-100">My Productions</h3>
        </div>
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No upcoming productions assigned</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[color:var(--dash-surface-elevated)] border border-[color:var(--dash-glass-border)] rounded-lg">
      <div className="p-6 border-b border-[color:var(--dash-glass-border)]">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-[color:var(--dash-primary)]" />
          <h3 className="text-lg font-semibold text-slate-100">My Productions</h3>
          <span className="ml-auto text-xs px-2 py-1 rounded-full bg-[color:var(--dash-primary)]/10 text-[color:var(--dash-primary)]">
            {productions.length} {productions.length === 1 ? 'Assignment' : 'Assignments'}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {productions.map((production) => (
          <div
            key={production.assignment.id}
            onClick={() => setSelectedProduction(selectedProduction?.assignment.id === production.assignment.id ? null : production)}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              selectedProduction?.assignment.id === production.assignment.id
                ? 'bg-[color:var(--dash-primary)]/10 border-[color:var(--dash-primary)]/30'
                : 'bg-[color:var(--dash-surface)] border-[color:var(--dash-glass-border)] hover:border-slate-500'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="font-medium text-slate-100 text-sm mb-1">
                  {production.assignment.clientName}
                </div>
                <div className="text-xs text-slate-400 mb-2">
                  {production.assignment.planName}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-300">
                      {new Date(production.assignment.productionDate).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${production.countdown.color}`}>
                    {production.countdown.label}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-500/20 text-slate-300">
                    {production.tasks.length} {production.tasks.length === 1 ? 'Task' : 'Tasks'}
                  </span>
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${
                selectedProduction?.assignment.id === production.assignment.id ? 'rotate-90' : ''
              }`} />
            </div>

            {/* Expanded Task List */}
            {selectedProduction?.assignment.id === production.assignment.id && (
              <div className="mt-4 pt-4 border-t border-[color:var(--dash-glass-border)] space-y-3">
                {/* VIDEO Tasks */}
                {groupedTasks.VIDEO.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-blue-400 mb-2 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" />
                      Video ({groupedTasks.VIDEO.length})
                    </h5>
                    <div className="space-y-2">
                      {groupedTasks.VIDEO.map(task => (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick?.(task);
                          }}
                          className="p-3 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-blue-500/20 hover:border-blue-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-200">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="text-xs text-slate-400 mt-1 line-clamp-1">
                                  {task.description}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' :
                                  task.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300' :
                                  'bg-slate-500/20 text-slate-300'
                                }`}>
                                  {task.status}
                                </span>
                                {task.publishAt && (
                                  <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock className="w-3 h-3" />
                                    Publish: {new Date(task.publishAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PHOTO Tasks */}
                {groupedTasks.PHOTO.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Photo ({groupedTasks.PHOTO.length})
                    </h5>
                    <div className="space-y-2">
                      {groupedTasks.PHOTO.map(task => (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick?.(task);
                          }}
                          className="p-3 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-purple-500/20 hover:border-purple-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-200">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="text-xs text-slate-400 mt-1 line-clamp-1">
                                  {task.description}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' :
                                  task.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300' :
                                  'bg-slate-500/20 text-slate-300'
                                }`}>
                                  {task.status}
                                </span>
                                {task.publishAt && (
                                  <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock className="w-3 h-3" />
                                    Publish: {new Date(task.publishAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MOTION Tasks */}
                {groupedTasks.MOTION.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      Motion ({groupedTasks.MOTION.length})
                    </h5>
                    <div className="space-y-2">
                      {groupedTasks.MOTION.map(task => (
                        <div
                          key={task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick?.(task);
                          }}
                          className="p-3 rounded-lg bg-[color:var(--dash-surface-elevated)] border border-yellow-500/20 hover:border-yellow-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-200">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="text-xs text-slate-400 mt-1 line-clamp-1">
                                  {task.description}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  task.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' :
                                  task.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300' :
                                  'bg-slate-500/20 text-slate-300'
                                }`}>
                                  {task.status}
                                </span>
                                {task.publishAt && (
                                  <div className="flex items-center gap-1 text-xs text-slate-400">
                                    <Clock className="w-3 h-3" />
                                    Publish: {new Date(task.publishAt).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyProductionWidget;
