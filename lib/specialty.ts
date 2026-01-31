/**
 * Specialty-based task assignment system
 * Maps user roles to task types for automatic assignment in Smart Project Setup
 */

import { User, UserRole, TaskType } from '../types';

/**
 * Specialty-based task assignment rules
 * Maps user roles to task types they can handle
 */
export const ROLE_SPECIALTY_MAPPING: Record<string, TaskType[]> = {
  // Production roles
  'videographer': ['video', 'production'],
  'video editor': ['video', 'post_production'],
  'photographer': ['photo'],
  
  // Creative roles
  'motion designer': ['motion'],
  'designer': ['design', 'photo'],
  'graphic designer': ['design', 'photo'],
  'art director': ['design', 'photo', 'motion'],
  'creative director': ['design', 'photo', 'motion', 'video'],
  
  // Content roles
  'copywriter': ['copywriting'],
  'social manager': ['social_content', 'social_publishing', 'copywriting'],
  
  // Management roles (typically don't receive production tasks by default)
  'account manager': [],
  'project manager': [],
  'production manager': ['video', 'photo', 'motion', 'production'],
  'general manager': [],
};

/**
 * Get allowed task types for a given role
 * Uses case-insensitive matching and supports partial role matching
 */
export function getAllowedTaskTypesForRole(role: UserRole | string): TaskType[] {
  const roleLower = role.toLowerCase();
  
  // Direct match
  if (ROLE_SPECIALTY_MAPPING[roleLower]) {
    return ROLE_SPECIALTY_MAPPING[roleLower];
  }
  
  // Partial match (e.g., "Senior Videographer" matches "videographer")
  for (const [key, taskTypes] of Object.entries(ROLE_SPECIALTY_MAPPING)) {
    if (roleLower.includes(key) || key.includes(roleLower)) {
      return taskTypes;
    }
  }
  
  // No match - return empty array
  return [];
}

/**
 * Get allowed roles for a given task type
 */
export function getAllowedRolesForTaskType(taskType: TaskType): string[] {
  const roles: string[] = [];
  
  for (const [role, taskTypes] of Object.entries(ROLE_SPECIALTY_MAPPING)) {
    if (taskTypes.includes(taskType)) {
      roles.push(role);
    }
  }
  
  return roles;
}

/**
 * Get team members who can handle a specific task type
 */
export function getMatchingMembersForTaskType(
  taskType: TaskType,
  members: User[]
): User[] {
  return members.filter(member => {
    const allowedTypes = getAllowedTaskTypesForRole(member.role);
    return allowedTypes.includes(taskType);
  });
}

/**
 * Get a fallback assignee when no specialty match is found
 * Priority: Account Manager > Production Manager > General Manager
 */
export function getAssignmentFallback(members: User[]): User | null {
  // Try Account Manager first
  const accountManager = members.find(m => 
    m.role.toLowerCase().includes('account manager')
  );
  if (accountManager) return accountManager;
  
  // Try Production Manager
  const productionManager = members.find(m => 
    m.role.toLowerCase().includes('production manager')
  );
  if (productionManager) return productionManager;
  
  // Try General Manager
  const generalManager = members.find(m => 
    m.role.toLowerCase().includes('general manager')
  );
  if (generalManager) return generalManager;
  
  // Last resort: return first member
  return members[0] || null;
}

/**
 * Assign tasks to team members based on specialty
 * Uses round-robin distribution within each specialty group
 */
export function assignTasksBySpecialty(
  tasks: Array<{ type: TaskType; id: string }>,
  members: User[]
): Record<string, string[]> {
  const assignments: Record<string, string[]> = {};
  const roundRobinCounters: Record<string, number> = {};
  
  // Initialize assignments
  tasks.forEach(task => {
    assignments[task.id] = [];
  });
  
  // Process each task
  tasks.forEach(task => {
    const matchingMembers = getMatchingMembersForTaskType(task.type, members);
    
    if (matchingMembers.length === 0) {
      // No specialty match - use fallback
      const fallback = getAssignmentFallback(members);
      if (fallback) {
        assignments[task.id] = [fallback.id];
      }
    } else if (matchingMembers.length === 1) {
      // Single match - assign directly
      assignments[task.id] = [matchingMembers[0].id];
    } else {
      // Multiple matches - use round-robin
      const specialtyKey = task.type;
      if (!roundRobinCounters[specialtyKey]) {
        roundRobinCounters[specialtyKey] = 0;
      }
      
      const assigneeIndex = roundRobinCounters[specialtyKey] % matchingMembers.length;
      const assignee = matchingMembers[assigneeIndex];
      assignments[task.id] = [assignee.id];
      
      roundRobinCounters[specialtyKey]++;
    }
  });
  
  return assignments;
}

/**
 * Calculate workload distribution per member based on specialty matching
 */
export function calculateWorkloadBySpecialty(
  tasks: Array<{ type: TaskType; id: string }>,
  members: User[]
): Record<string, { VIDEO: number; PHOTO: number; MOTION: number; total: number }> {
  const workload: Record<string, { VIDEO: number; PHOTO: number; MOTION: number; total: number }> = {};
  
  // Initialize workload for all members
  members.forEach(member => {
    workload[member.id] = { VIDEO: 0, PHOTO: 0, MOTION: 0, total: 0 };
  });
  
  // Assign tasks and calculate workload
  const assignments = assignTasksBySpecialty(tasks, members);
  
  tasks.forEach(task => {
    const assigneeIds = assignments[task.id];
    assigneeIds.forEach(assigneeId => {
      if (workload[assigneeId]) {
        // Map task type to content type for workload display
        if (task.type === 'video' || task.type === 'production' || task.type === 'post_production') {
          workload[assigneeId].VIDEO++;
        } else if (task.type === 'photo' || task.type === 'design') {
          workload[assigneeId].PHOTO++;
        } else if (task.type === 'motion') {
          workload[assigneeId].MOTION++;
        }
        workload[assigneeId].total++;
      }
    });
  });
  
  return workload;
}

/**
 * Get a human-readable specialty label for a role
 */
export function getSpecialtyLabel(role: UserRole | string): string {
  const allowedTypes = getAllowedTaskTypesForRole(role);
  
  if (allowedTypes.length === 0) {
    return 'Management';
  }
  
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes('video')) return 'Video Production';
  if (roleLower.includes('motion')) return 'Motion Design';
  if (roleLower.includes('photo')) return 'Photography';
  if (roleLower.includes('designer') || roleLower.includes('art director')) return 'Design';
  if (roleLower.includes('copywriter')) return 'Copywriting';
  if (roleLower.includes('social')) return 'Social Media';
  if (roleLower.includes('production manager')) return 'Production';
  
  return 'General';
}

/**
 * Check if there are missing specialties for the given tasks
 */
export function getMissingSpecialties(
  tasks: Array<{ type: TaskType }>,
  members: User[]
): Array<{ taskType: TaskType; suggestedRoles: string[] }> {
  const missing: Array<{ taskType: TaskType; suggestedRoles: string[] }> = [];
  const uniqueTaskTypes = [...new Set(tasks.map(t => t.type))];
  
  uniqueTaskTypes.forEach(taskType => {
    const matchingMembers = getMatchingMembersForTaskType(taskType, members);
    if (matchingMembers.length === 0) {
      const suggestedRoles = getAllowedRolesForTaskType(taskType);
      missing.push({
        taskType,
        suggestedRoles
      });
    }
  });
  
  return missing;
}
