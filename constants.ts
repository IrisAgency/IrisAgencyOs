import { UserRole, Department, TaskStatus, Priority, User, Task, Project, ProductionAsset, Invoice, Client, ClientSocialLink, ClientNote, ClientMeeting, ClientBrandAsset, ClientMonthlyReport, ProjectMember, ProjectMilestone, ProjectActivityLog, TaskComment, TaskTimeLog, TaskDependency, TaskActivityLog, ApprovalStep, ClientApproval, AgencyFile, FileFolder, AgencyLocation, AgencyEquipment, ShotList, CallSheet, Quotation, Payment, Expense, Vendor, Freelancer, FreelancerAssignment, VendorServiceOrder, LeaveRequest, AttendanceRecord, Notification, NotificationPreference, AppBranding, AppSettings, Permission, RoleDefinition, AuditLog, WorkflowTemplate, ProjectMarketingAsset, Note } from './types';

export const USERS: User[] = [
  {
    id: 'u1', name: 'Alex Sterling', role: UserRole.GENERAL_MANAGER, department: Department.MANAGEMENT, avatar: 'https://picsum.photos/id/1005/100/100',
    passwordHash: '', forcePasswordChange: false,
    jobTitle: 'General Manager', employeeCode: 'IRIS-001', email: 'alex@iris.com', phone: '555-0001', status: 'active', dateJoined: '2020-01-01', location: 'New York'
  },
  {
    id: 'u2', name: 'Sarah Chen', role: UserRole.CREATIVE_DIRECTOR, department: Department.CREATIVE, avatar: 'https://picsum.photos/id/1011/100/100',
    passwordHash: '', forcePasswordChange: false,
    jobTitle: 'Creative Director', employeeCode: 'IRIS-005', email: 'sarah@iris.com', phone: '555-0005', status: 'active', dateJoined: '2020-06-15', location: 'Los Angeles'
  },
  {
    id: 'u3', name: 'Mike Ross', role: UserRole.ART_DIRECTOR, department: Department.CREATIVE, avatar: 'https://picsum.photos/id/1012/100/100',
    passwordHash: '', forcePasswordChange: false,
    jobTitle: 'Art Director', employeeCode: 'IRIS-012', email: 'mike@iris.com', phone: '555-0012', status: 'active', dateJoined: '2021-03-01', location: 'New York'
  },
  {
    id: 'u4', name: 'Jessica Pearson', role: UserRole.ACCOUNT_MANAGER, department: Department.ACCOUNTS, avatar: 'https://picsum.photos/id/1027/100/100',
    passwordHash: '', forcePasswordChange: false,
    jobTitle: 'Senior Account Manager', employeeCode: 'IRIS-008', email: 'jessica@iris.com', phone: '555-0008', status: 'active', dateJoined: '2020-09-01', location: 'New York'
  },
  {
    id: 'u5', name: 'Louis Litt', role: UserRole.PRODUCER, department: Department.PRODUCTION, avatar: 'https://picsum.photos/id/1025/100/100',
    passwordHash: '', forcePasswordChange: false,
    jobTitle: 'Production Manager', employeeCode: 'IRIS-015', email: 'louis@iris.com', phone: '555-0015', status: 'on_leave', dateJoined: '2021-06-01', location: 'Los Angeles'
  },
];

export const LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr1', userId: 'u3', startDate: '2024-06-10', endDate: '2024-06-15', type: 'annual', reason: 'Summer Vacation', status: 'pending', createdAt: '2024-05-20' },
  { id: 'lr2', userId: 'u5', startDate: '2024-05-20', endDate: '2024-05-25', type: 'sick', reason: 'Flu', status: 'approved', approverId: 'u1', createdAt: '2024-05-19' }
];

export const ATTENDANCE_RECORDS: AttendanceRecord[] = [
  { id: 'ar1', userId: 'u1', date: '2024-05-22', status: 'present', checkInTime: '09:00', checkOutTime: '18:00' },
  { id: 'ar2', userId: 'u2', date: '2024-05-22', status: 'present', checkInTime: '09:15', checkOutTime: '18:15' },
  { id: 'ar3', userId: 'u3', date: '2024-05-22', status: 'remote', checkInTime: '08:45', checkOutTime: '17:45' },
  { id: 'ar4', userId: 'u4', date: '2024-05-22', status: 'present', checkInTime: '09:30', checkOutTime: '18:30' },
  { id: 'ar5', userId: 'u5', date: '2024-05-22', status: 'on_leave' }
];

export const CLIENTS: Client[] = [
  {
    id: 'c1',
    name: 'Le Bon Designs',
    industry: 'Fashion',
    email: 'contact@lebon.com',
    phone: '+1 (555) 123-4567',
    address: '123 Fashion Ave, New York, NY',
    website: 'www.lebondesigns.com',
    notes: 'Premium fashion brand focusing on sustainable materials.',
    status: 'active',
    createdAt: '2023-01-15',
    updatedAt: '2024-05-10',
    accountManagerId: 'u4',
    contacts: [
      { id: 'cc1', clientId: 'c1', name: 'Marie Le Bon', role: 'CEO', email: 'marie@lebon.com', phone: '555-0101', isPrimary: true },
      { id: 'cc2', clientId: 'c1', name: 'Jean Pierre', role: 'Marketing Head', email: 'jp@lebon.com', phone: '555-0102', isPrimary: false }
    ]
  },
  {
    id: 'c2',
    name: 'Shisha Kartel',
    industry: 'Lifestyle',
    email: 'hello@kartel.com',
    phone: '+1 (555) 987-6543',
    address: '45 Sunset Blvd, Los Angeles, CA',
    website: 'www.shishakartel.com',
    notes: 'High-energy lifestyle brand. Prefers bold, edgy visuals.',
    status: 'active',
    createdAt: '2023-06-20',
    updatedAt: '2024-04-22',
    accountManagerId: 'u1',
    contacts: [
      { id: 'cc3', clientId: 'c2', name: 'Dante Russo', role: 'Director', email: 'dante@kartel.com', phone: '555-0201', isPrimary: true }
    ]
  },
  {
    id: 'c3',
    name: 'Box Café',
    industry: 'Hospitality',
    email: 'info@boxcafe.com',
    phone: '+1 (555) 321-7654',
    address: '88 Coffee Lane, Seattle, WA',
    website: 'www.boxcafe.com',
    notes: 'Franchise coffee shop looking for rebrand.',
    status: 'active',
    createdAt: '2024-02-10',
    updatedAt: '2024-05-01',
    accountManagerId: 'u4',
    contacts: [
      { id: 'cc4', clientId: 'c3', name: 'Sarah Connor', role: 'Owner', email: 'sarah@boxcafe.com', phone: '555-0301', isPrimary: true }
    ]
  },
  {
    id: 'c4',
    name: 'Magic Stick',
    industry: 'Entertainment',
    email: 'bookings@magicstick.com',
    phone: '+1 (555) 111-2222',
    address: 'Detroit, MI',
    website: 'www.magicstick.com',
    notes: 'Historic music venue.',
    status: 'lead',
    createdAt: '2024-05-01',
    updatedAt: '2024-05-01',
    accountManagerId: 'u1',
    contacts: []
  }
];

export const CLIENT_SOCIAL_LINKS: ClientSocialLink[] = [
  { id: 'csl1', clientId: 'c1', platform: 'instagram', url: 'https://instagram.com/lebon', username: '@lebon', label: null, createdBy: 'u4', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
  { id: 'csl2', clientId: 'c1', platform: 'website', url: 'https://lebon.com', username: null, label: null, createdBy: 'u4', createdAt: '2024-01-15T00:00:00Z', updatedAt: '2024-01-15T00:00:00Z' },
  { id: 'csl3', clientId: 'c2', platform: 'tiktok', url: 'https://tiktok.com/@shishakartel', username: '@shishakartel', label: null, createdBy: 'u1', createdAt: '2024-06-20T00:00:00Z', updatedAt: '2024-06-20T00:00:00Z' }
];

export const CLIENT_NOTES: ClientNote[] = [
  { id: 'cn1', clientId: 'c1', text: 'Client prefers communication via email over phone.', createdBy: 'u4', createdByName: 'Jessica Pearson', createdAt: '2024-02-10T09:00:00Z', updatedAt: null },
  { id: 'cn2', clientId: 'c1', text: 'Meeting scheduled for next week to discuss Q3 budget.', createdBy: 'u4', createdByName: 'Jessica Pearson', createdAt: '2024-05-15T14:00:00Z', updatedAt: null },
  { id: 'cn3', clientId: 'c2', text: 'Very particular about brand colors. Always double check hex codes.', createdBy: 'u1', createdByName: 'Alex Sterling', createdAt: '2024-03-01T11:30:00Z', updatedAt: null }
];

export const CLIENT_MEETINGS: any[] = [
  {
    id: 'cm1',
    clientId: 'c1',
    title: 'Monthly Performance Review',
    description: 'Reviewing Q1 metrics and planning for Q2.',
    date: '2024-05-14T10:00:00Z',
    durationMinutes: 60,
    status: 'scheduled',
    locationType: 'online',
    locationDetails: 'https://zoom.us/j/123456789',
    organizerId: 'u4',
    participantIds: ['u4', 'u2'],
    clientParticipants: ['Marie Le Bon'],
    meetingFolderId: null,
    summary: null,
    createdAt: '2024-05-01T09:00:00Z',
    updatedAt: '2024-05-01T09:00:00Z',
    completedAt: null
  },
  {
    id: 'cm2',
    clientId: 'c2',
    title: 'New Campaign Brief',
    description: 'Kickoff for the summer launch.',
    date: '2024-06-01T15:00:00Z',
    durationMinutes: 90,
    status: 'scheduled',
    locationType: 'client_office',
    locationDetails: '45 Sunset Blvd, Los Angeles',
    organizerId: 'u1',
    participantIds: ['u1', 'u5'],
    clientParticipants: ['Dante Russo'],
    meetingFolderId: null,
    summary: null,
    createdAt: '2024-05-10T11:00:00Z',
    updatedAt: '2024-05-10T11:00:00Z',
    completedAt: null
  },
  {
    id: 'cm3',
    clientId: 'c1',
    title: 'Q1 Strategy Kickoff',
    description: 'Initial planning session.',
    date: '2024-04-10T12:00:00Z',
    durationMinutes: 60,
    status: 'completed',
    locationType: 'office',
    locationDetails: 'Meeting Room A',
    organizerId: 'u4',
    participantIds: ['u4', 'u2', 'u3'],
    clientParticipants: ['Marie Le Bon', 'Jean Pierre'],
    meetingFolderId: null,
    summary: 'Agreed on the new direction for the summer line. Budget approved.',
    createdAt: '2024-04-01T09:00:00Z',
    updatedAt: '2024-04-10T13:00:00Z',
    completedAt: '2024-04-10T13:00:00Z'
  }
];

export const CLIENT_BRAND_ASSETS: ClientBrandAsset[] = [];

export const CLIENT_MONTHLY_REPORTS: ClientMonthlyReport[] = [];

export const PROJECT_MARKETING_ASSETS: ProjectMarketingAsset[] = [];

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    clientId: 'c1',
    name: 'Summer Campaign 2024',
    client: 'Le Bon Designs',
    code: 'LBD-SUM-24',
    type: 'campaign',
    status: 'active',
    budget: 50000,
    spent: 12000,
    currency: 'USD',
    deadline: '2024-06-30',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
    brief: 'Launch the sustainable swimwear line.',
    objectives: '- Increase brand awareness by 20%\n- Drive 5000 pre-orders',
    notes: '',
    accountManagerId: 'u4',
    projectManagerId: 'u2',
    thumbnail: 'https://picsum.photos/id/20/400/300',
    createdAt: '2024-03-15',
    updatedAt: '2024-05-15'
  },
  {
    id: 'p2',
    clientId: 'c2',
    name: 'Product Launch',
    client: 'Shisha Kartel',
    code: 'SK-LNCH-01',
    type: 'campaign',
    status: 'active',
    budget: 75000,
    spent: 45000,
    currency: 'USD',
    deadline: '2024-05-15',
    startDate: '2024-02-01',
    endDate: '2024-05-15',
    brief: 'High energy launch event and social takeover.',
    objectives: '- Viral social traction\n- 100 Influencer kits sent',
    notes: '',
    accountManagerId: 'u1',
    thumbnail: 'https://picsum.photos/id/30/400/300',
    createdAt: '2024-01-20',
    updatedAt: '2024-05-01'
  },
  {
    id: 'p3',
    clientId: 'c3',
    name: 'Rebranding',
    client: 'Box Café',
    code: 'BOX-REB-24',
    type: 'one_time',
    status: 'on_hold',
    budget: 30000,
    spent: 5000,
    currency: 'USD',
    deadline: '2024-08-01',
    startDate: '2024-03-01',
    endDate: '2024-08-01',
    brief: 'Complete visual overhaul of the franchise.',
    objectives: '- New Logo\n- Store interior guidelines',
    notes: 'Client pausing due to real estate issues.',
    accountManagerId: 'u4',
    thumbnail: 'https://picsum.photos/id/42/400/300',
    createdAt: '2024-02-28',
    updatedAt: '2024-04-10'
  },
  {
    id: 'p4',
    clientId: 'c4',
    name: 'Social Media Q2',
    client: 'Magic Stick',
    code: 'MS-SOC-Q2',
    type: 'retainer',
    status: 'active',
    budget: 15000,
    spent: 7500,
    currency: 'USD',
    deadline: '2024-06-01',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
    brief: 'Daily social content management.',
    objectives: '- 3 posts per week\n- Community management',
    notes: '',
    accountManagerId: 'u1',
    thumbnail: 'https://picsum.photos/id/56/400/300',
    createdAt: '2024-03-25',
    updatedAt: '2024-05-12'
  },
];

export const PROJECT_MEMBERS: ProjectMember[] = [
  { id: 'pm1', projectId: 'p1', userId: 'u4', roleInProject: 'Account Manager', isExternal: false },
  { id: 'pm2', projectId: 'p1', userId: 'u2', roleInProject: 'Creative Director', isExternal: false },
  { id: 'pm3', projectId: 'p2', userId: 'u1', roleInProject: 'Project Lead', isExternal: false },
  { id: 'pm4', projectId: 'p2', userId: 'u5', roleInProject: 'Producer', isExternal: false },
];

export const PROJECT_MILESTONES: ProjectMilestone[] = [
  { id: 'm1', projectId: 'p1', name: 'Concept Approval', description: 'Client signs off on moodboards', dueDate: '2024-04-15', status: 'completed', progressPercent: 100, order: 1 },
  { id: 'm2', projectId: 'p1', name: 'Shoot Day', description: 'Main photography session', dueDate: '2024-05-20', status: 'in_progress', progressPercent: 50, order: 2 },
  { id: 'm3', projectId: 'p2', name: 'Venue Booking', description: 'Secure launch location', dueDate: '2024-03-01', status: 'completed', progressPercent: 100, order: 1 },
];

export const PROJECT_ACTIVITY_LOGS: ProjectActivityLog[] = [
  { id: 'log1', projectId: 'p1', userId: 'u4', type: 'status_change', message: 'Project created', createdAt: '2024-03-15T09:00:00Z' },
  { id: 'log2', projectId: 'p1', userId: 'u2', type: 'milestone_completed', message: 'Concept Approval marked as completed', createdAt: '2024-04-16T14:30:00Z' },
  { id: 'log3', projectId: 'p2', userId: 'u1', type: 'comment', message: 'Budget increased by $5k due to venue change', createdAt: '2024-03-10T11:00:00Z' },
];

export const TASKS: Task[] = [
  {
    id: 't1',
    projectId: 'p1',
    title: 'Concept Sketches',
    description: 'Initial sketches for the summer collection vibe.',
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    taskType: 'design',
    assigneeIds: ['u3', 'u2'],
    startDate: '2024-04-05',
    dueDate: '2024-05-20',
    department: Department.CREATIVE,
    createdBy: 'u4',
    approvalPath: ['u3', 'u2', 'u4'], // AD -> CD -> AM
    currentApprovalLevel: 0,
    isClientApprovalRequired: true,
    isArchived: false,
    attachments: [],
    client: 'Le Bon Designs',
    createdAt: '2024-04-01T10:00:00Z',
    updatedAt: '2024-04-05T14:00:00Z'
  },
  {
    id: 't2',
    projectId: 'p2',
    title: 'Location Scouting',
    description: 'Find urban rooftops for the hero video shoot.',
    status: TaskStatus.AWAITING_REVIEW,
    priority: Priority.MEDIUM,
    taskType: 'production',
    assigneeIds: ['u5'],
    startDate: '2024-03-01',
    dueDate: '2024-03-15',
    department: Department.PRODUCTION,
    createdBy: 'u1',
    approvalPath: ['u5', 'u2'], // Producer -> CD
    currentApprovalLevel: 0,
    isClientApprovalRequired: false,
    isArchived: false,
    attachments: [],
    client: 'Shisha Kartel',
    createdAt: '2024-02-28T09:00:00Z',
    updatedAt: '2024-03-14T16:00:00Z'
  },
  {
    id: 't3',
    projectId: 'p3',
    title: 'Copywriting - Social',
    description: 'Draft captions for the teaser campaign.',
    status: TaskStatus.NEW,
    priority: Priority.LOW,
    taskType: 'copywriting',
    assigneeIds: ['u2'],
    startDate: '2024-05-01',
    dueDate: '2024-05-25',
    department: Department.MARKETING,
    createdBy: 'u4',
    approvalPath: ['u4'],
    currentApprovalLevel: 0,
    isClientApprovalRequired: true,
    isArchived: false,
    attachments: [],
    client: 'Box Café',
    createdAt: '2024-04-20T11:00:00Z',
    updatedAt: '2024-04-20T11:00:00Z'
  },
  {
    id: 't4',
    projectId: 'p2',
    title: 'Final Cut Review',
    description: 'Review the 30s spot edits.',
    status: TaskStatus.APPROVED,
    priority: Priority.HIGH,
    taskType: 'post_production',
    assigneeIds: ['u2', 'u5'],
    startDate: '2024-05-10',
    dueDate: '2024-05-19',
    department: Department.CREATIVE,
    createdBy: 'u1',
    approvalPath: ['u2', 'u1'],
    currentApprovalLevel: 2, // Fully approved internally
    isClientApprovalRequired: false,
    isArchived: false,
    attachments: [],
    client: 'Shisha Kartel',
    createdAt: '2024-05-01T10:00:00Z',
    updatedAt: '2024-05-18T15:00:00Z'
  },
  {
    id: 't5',
    projectId: 'p4',
    title: 'Budget Approval',
    description: 'Sign off on Q2 media spend.',
    status: TaskStatus.CLIENT_REVIEW,
    priority: Priority.HIGH,
    taskType: 'meeting',
    assigneeIds: ['u1', 'u4'],
    startDate: '2024-04-01',
    dueDate: '2024-04-05',
    department: Department.ACCOUNTS,
    createdBy: 'u4',
    approvalPath: ['u1'],
    currentApprovalLevel: 1,
    isClientApprovalRequired: true,
    isArchived: false,
    attachments: [],
    client: 'Magic Stick',
    createdAt: '2024-03-25T09:00:00Z',
    updatedAt: '2024-04-02T11:00:00Z'
  }
];

export const APPROVAL_STEPS: ApprovalStep[] = [
  // Steps for t2 (Location Scouting) - Currently pending first approver (u5)
  { id: 'as1', taskId: 't2', approverId: 'u5', level: 0, status: 'pending', milestoneId: null, createdAt: '2024-03-01T09:00:00Z' },
  { id: 'as2', taskId: 't2', approverId: 'u2', level: 1, status: 'waiting', milestoneId: null, createdAt: '2024-03-01T09:00:00Z' },

  // Steps for t4 (Final Cut Review) - Fully Approved
  { id: 'as3', taskId: 't4', approverId: 'u2', level: 0, status: 'approved', reviewedAt: '2024-05-15T10:00:00Z', comment: 'Looks great!', milestoneId: null, createdAt: '2024-05-01T10:00:00Z' },
  { id: 'as4', taskId: 't4', approverId: 'u1', level: 1, status: 'approved', reviewedAt: '2024-05-18T14:00:00Z', comment: 'Good to go.', milestoneId: null, createdAt: '2024-05-01T10:00:00Z' },

  // Steps for t5 (Budget Approval) - Internal Approved, Waiting Client
  { id: 'as5', taskId: 't5', approverId: 'u1', level: 0, status: 'approved', reviewedAt: '2024-03-30T09:00:00Z', milestoneId: null, createdAt: '2024-03-25T09:00:00Z' }
];

export const CLIENT_APPROVALS: ClientApproval[] = [
  // Client approval for t5
  { id: 'ca1', taskId: 't5', clientId: 'c4', status: 'pending' }
];

export const TASK_COMMENTS: TaskComment[] = [
  { id: 'tc1', taskId: 't1', userId: 'u2', message: 'I like the second concept, but lets make it bolder.', createdAt: '2024-04-06T10:00:00Z' },
  { id: 'tc2', taskId: 't2', userId: 'u1', message: 'Is the permit secured for the rooftop?', createdAt: '2024-03-10T14:00:00Z' }
];

export const TASK_TIME_LOGS: TaskTimeLog[] = [
  { id: 'tl1', taskId: 't1', userId: 'u3', hours: 4.5, logDate: '2024-04-05', note: 'Initial sketching' },
  { id: 'tl2', taskId: 't1', userId: 'u3', hours: 2.0, logDate: '2024-04-06', note: 'Revisions based on feedback' }
];

export const TASK_DEPENDENCIES: TaskDependency[] = [
  { id: 'td1', taskId: 't4', dependsOnTaskId: 't2' } // Final Cut depends on Location Scouting (abstractly)
];

export const TASK_ACTIVITY_LOGS: TaskActivityLog[] = [
  { id: 'tal1', taskId: 't1', userId: 'u4', type: 'status_change', message: 'Created task', createdAt: '2024-04-01T10:00:00Z' },
  { id: 'tal2', taskId: 't1', userId: 'u2', type: 'comment', message: 'Commented on task', createdAt: '2024-04-06T10:00:00Z' }
];

// --- FILES MOCK DATA ---

export const FOLDERS: FileFolder[] = [
  // Client Root Folders
  { id: 'client_c1', clientId: 'c1', projectId: null, parentId: null, name: 'Le Bon Designs', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'client_root', linkedEntityType: 'client', linkedEntityId: 'c1' },
  { id: 'client_c1_projects', clientId: 'c1', projectId: null, parentId: 'client_c1', name: 'Projects', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'project' },
  { id: 'client_c1_videos', clientId: 'c1', projectId: null, parentId: 'client_c1', name: 'Videos', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'videos' },
  { id: 'client_c1_photos', clientId: 'c1', projectId: null, parentId: 'client_c1', name: 'Photos', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'photos' },
  { id: 'client_c1_documents', clientId: 'c1', projectId: null, parentId: 'client_c1', name: 'Documents', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'documents' },
  { id: 'client_c1_strategies', clientId: 'c1', projectId: null, parentId: 'client_c1', name: 'Strategies', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'strategy' },
  { id: 'client_c1_archive', clientId: 'c1', projectId: null, parentId: 'client_c1', name: 'Archive', isArchiveRoot: true, isTaskArchiveFolder: false, folderType: 'archive' },

  // Project Folders within Client
  { id: 'proj_p1', clientId: 'c1', projectId: 'p1', parentId: 'client_c1_projects', name: 'LBD-SUM-24 - Summer Campaign 2024', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'project', linkedEntityType: 'project', linkedEntityId: 'p1' },
  { id: 'proj_p1_tasks', clientId: 'c1', projectId: 'p1', parentId: 'proj_p1', name: 'Tasks', isArchiveRoot: false, isTaskArchiveFolder: false },
  { id: 'proj_p1_videos', clientId: 'c1', projectId: 'p1', parentId: 'proj_p1', name: 'Videos', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'videos' },
  { id: 'proj_p1_photos', clientId: 'c1', projectId: 'p1', parentId: 'proj_p1', name: 'Photos', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'photos' },
  { id: 'proj_p1_deliverables', clientId: 'c1', projectId: 'p1', parentId: 'proj_p1', name: 'Deliverables', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'deliverables' },

  // Task Folders
  { id: 'task_t1', clientId: 'c1', projectId: 'p1', parentId: 'proj_p1_tasks', name: 'Concept Sketches', isArchiveRoot: false, isTaskArchiveFolder: true, taskId: 't1', folderType: 'task', linkedEntityType: 'task', linkedEntityId: 't1' },

  // Client 2 Folders
  { id: 'client_c2', clientId: 'c2', projectId: null, parentId: null, name: 'Shisha Kartel', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'client_root', linkedEntityType: 'client', linkedEntityId: 'c2' },
  { id: 'client_c2_projects', clientId: 'c2', projectId: null, parentId: 'client_c2', name: 'Projects', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'project' },
  { id: 'proj_p2', clientId: 'c2', projectId: 'p2', parentId: 'client_c2_projects', name: 'SK-LNCH-01 - Product Launch', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'project', linkedEntityType: 'project', linkedEntityId: 'p2' },
  { id: 'proj_p2_tasks', clientId: 'c2', projectId: 'p2', parentId: 'proj_p2', name: 'Tasks', isArchiveRoot: false, isTaskArchiveFolder: false },

  // Legacy folders for backward compatibility
  { id: 'f1', projectId: 'p1', clientId: 'c1', parentId: null, name: 'Creative Assets', isArchiveRoot: false, isTaskArchiveFolder: false },
  { id: 'f2', projectId: 'p1', clientId: 'c1', parentId: null, name: 'Documents', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'documents' },
  { id: 'f3', projectId: 'p1', clientId: 'c1', parentId: 'f1', name: 'Raw Footage', isArchiveRoot: false, isTaskArchiveFolder: false, folderType: 'videos' },
  { id: 'f4', projectId: 'p2', clientId: 'c2', parentId: null, name: 'Launch Event', isArchiveRoot: false, isTaskArchiveFolder: false },
];

export const FILES: AgencyFile[] = [
  {
    id: 'file1', projectId: 'p1', clientId: 'c1', taskId: 't1', folderId: 'task_t1', uploaderId: 'u3',
    name: 'LBD-ConceptSketches-v1-Sketch.jpg', originalName: 'Concept_Sketch_v1.jpg',
    type: 'image/jpeg', category: 'image', size: 2400000,
    url: 'https://picsum.photos/id/10/800/600', version: 1, isDeliverable: false,
    isArchived: false,
    tags: ['sketch', 'concept'], createdAt: '2024-04-02T10:00:00Z'
  },
  {
    id: 'file2', projectId: 'p1', clientId: 'c1', taskId: 't1', folderId: 'task_t1', uploaderId: 'u3',
    name: 'LBD-ConceptSketches-v2-Final.jpg', originalName: 'Concept_Sketch_v2.jpg',
    type: 'image/jpeg', category: 'image', size: 2600000,
    url: 'https://picsum.photos/id/11/800/600', version: 2, isDeliverable: true,
    isArchived: false,
    tags: ['sketch', 'final', 'approved'], createdAt: '2024-04-05T15:00:00Z'
  },
  {
    id: 'file3', projectId: 'p1', clientId: 'c1', taskId: null, folderId: 'client_c1_documents', uploaderId: 'u4',
    name: 'LBD-SummerCampaign-Brief.pdf', originalName: 'Project_Brief.pdf',
    type: 'application/pdf', category: 'document', size: 500000,
    url: '#', version: 1, isDeliverable: false,
    isArchived: false,
    tags: ['brief', 'strategy'], createdAt: '2024-03-15T09:00:00Z'
  },
  {
    id: 'file4', projectId: 'p2', clientId: 'c2', taskId: 't4', folderId: 'proj_p2_tasks', uploaderId: 'u5',
    name: 'SK-LaunchTeaser-v1-Edit.mp4', originalName: 'Launch_Teaser_Edit_01.mp4',
    type: 'video/mp4', category: 'video', size: 45000000,
    url: '#', version: 1, isDeliverable: false,
    isArchived: false,
    tags: ['video', 'draft', 'edit'], createdAt: '2024-05-12T14:00:00Z'
  },
  {
    id: 'file5', projectId: 'p2', clientId: 'c2', taskId: 't2', folderId: 'proj_p2_tasks', uploaderId: 'u5',
    name: 'SK-LocationScout-Rooftop.jpg', originalName: 'Rooftop_Location_Scout.jpg',
    type: 'image/jpeg', category: 'image', size: 3100000,
    url: 'https://picsum.photos/id/40/800/600', version: 1, isDeliverable: false,
    isArchived: false,
    tags: ['location', 'photo', 'scout'], createdAt: '2024-03-05T11:00:00Z'
  }
];

// --- PRODUCTION MOCK DATA ---

export const AGENCY_LOCATIONS: AgencyLocation[] = [
  { id: 'loc1', projectId: 'p2', name: 'Downtown Rooftop', address: '450 S Broadway, Los Angeles, CA', contactPerson: 'Mike Owner', phone: '555-9090', notes: 'Best at sunset. Windy.', permitsRequired: true, mapUrl: 'https://picsum.photos/id/122/400/300' },
  { id: 'loc2', projectId: 'p1', name: 'Malibu Beach Zone 3', address: 'PCH Hwy, Malibu, CA', contactPerson: 'Parks Dept', phone: '555-1111', notes: 'Golden hour restricted.', permitsRequired: true, mapUrl: 'https://picsum.photos/id/133/400/300' }
];

export const AGENCY_EQUIPMENT: AgencyEquipment[] = [
  { id: 'eq1', name: 'Sony A7SIII Body A', category: 'Camera', serialNumber: 'SN-998877', status: 'available', nextMaintenance: '2024-08-01' },
  { id: 'eq2', name: 'Sony A7SIII Body B', category: 'Camera', serialNumber: 'SN-998878', status: 'checked_out', checkedOutBy: 'u5', checkedOutAt: '2024-05-10T09:00:00Z', nextMaintenance: '2024-08-01' },
  { id: 'eq3', name: 'G Master 24-70mm', category: 'Lens', serialNumber: 'LN-112233', status: 'available', nextMaintenance: '2024-07-15' },
  { id: 'eq4', name: 'Aputure 600d Pro', category: 'Lighting', serialNumber: 'LT-445566', status: 'available', nextMaintenance: '2024-09-01' },
  { id: 'eq5', name: 'Ronin RS3 Pro', category: 'Grip', serialNumber: 'GP-778899', status: 'maintenance', nextMaintenance: '2024-05-20' },
];

export const SHOT_LISTS: ShotList[] = [
  {
    id: 'sl1', projectId: 'p2', taskId: 't2', name: 'Rooftop Sequence', description: 'Hero shots for launch video', createdBy: 'u2', date: '2024-05-12', locationId: 'loc1', createdAt: '2024-05-01',
    shots: [
      { id: 's1', shotListId: 'sl1', shotNumber: 1, description: 'Establish shot of skyline', cameraMovement: 'Static', framing: 'Wide', duration: '5s', equipment: ['eq1', 'eq3'], notes: 'Golden hour' },
      { id: 's2', shotListId: 'sl1', shotNumber: 2, description: 'Model enters frame left', cameraMovement: 'Pan Right', framing: 'Mid', duration: '8s', equipment: ['eq1', 'eq3'], notes: '' }
    ]
  }
];

export const CALL_SHEETS: CallSheet[] = [
  {
    id: 'cs1', projectId: 'p2', date: '2024-05-12', callTime: '06:00 AM', locationId: 'loc1', productionNotes: 'Parking in rear alley only.', status: 'Published', createdBy: 'u5', createdAt: '2024-05-10', equipmentList: ['eq1', 'eq3', 'eq4'],
    crew: [
      { id: 'crew1', callSheetId: 'cs1', userId: 'u5', role: 'Producer', phone: '555-0100', callTime: '06:00 AM' },
      { id: 'crew2', callSheetId: 'cs1', userId: 'u2', role: 'Director', phone: '555-0101', callTime: '06:30 AM' },
      { id: 'crew3', callSheetId: 'cs1', userId: null, role: 'Makeup Artist (Freelance)', phone: '555-0999', callTime: '05:30 AM' }
    ]
  }
];

// Legacy support for production assets
export const PRODUCTION_ASSETS: ProductionAsset[] = [
  { id: 'pa1', name: 'Day 1 Call Sheet', type: 'Call Sheet', status: 'Approved', date: '2024-05-10' },
  { id: 'pa2', name: 'Downtown Rooftop', type: 'Location', status: 'Pending', date: '2024-05-12' },
];

// --- FINANCE MOCK DATA ---

export const QUOTATIONS: Quotation[] = [
  {
    id: 'q1', projectId: 'p1', clientId: 'c1', quotationNumber: 'QUO-2024-001', date: '2024-03-01',
    items: [
      { id: 'qi1', description: 'Creative Direction', quantity: 1, unitPrice: 5000, total: 5000 },
      { id: 'qi2', description: 'Photography Day Rate', quantity: 2, unitPrice: 3500, total: 7000 },
      { id: 'qi3', description: 'Retouching (per image)', quantity: 20, unitPrice: 150, total: 3000 }
    ],
    subtotal: 15000, discount: 0, tax: 1500, total: 16500,
    notes: 'Includes 3 rounds of revisions.', status: 'approved', createdBy: 'u4', createdAt: '2024-03-01'
  },
  {
    id: 'q2', projectId: 'p2', clientId: 'c2', quotationNumber: 'QUO-2024-012', date: '2024-01-15',
    items: [
      { id: 'qi4', description: 'Event Production Fee', quantity: 1, unitPrice: 20000, total: 20000 },
      { id: 'qi5', description: 'Influencer Kits', quantity: 100, unitPrice: 150, total: 15000 }
    ],
    subtotal: 35000, discount: 2000, tax: 3300, total: 36300,
    notes: 'Discount applied for early payment.', status: 'approved', createdBy: 'u1', createdAt: '2024-01-15'
  }
];

export const INVOICES: Invoice[] = [
  {
    id: 'inv1', projectId: 'p1', clientId: 'c1', invoiceNumber: 'INV-2024-001', date: '2024-04-01', dueDate: '2024-04-15',
    items: [
      { id: 'ii1', description: 'Advance Payment (50%) - Summer Campaign', quantity: 1, unitPrice: 8250, total: 8250 }
    ],
    subtotal: 8250, discount: 0, tax: 0, total: 8250, paid: 8250, balance: 0,
    status: 'paid', notes: '', createdBy: 'u4', createdAt: '2024-04-01',
    client: 'Le Bon Designs', amount: 8250
  },
  {
    id: 'inv2', projectId: 'p2', clientId: 'c2', invoiceNumber: 'INV-2024-005', date: '2024-05-01', dueDate: '2024-05-15',
    items: [
      { id: 'ii2', description: 'Event Production Services', quantity: 1, unitPrice: 36300, total: 36300 }
    ],
    subtotal: 36300, discount: 0, tax: 0, total: 36300, paid: 15000, balance: 21300,
    status: 'partially_paid', notes: '', createdBy: 'u1', createdAt: '2024-05-01',
    client: 'Shisha Kartel', amount: 36300
  },
  {
    id: 'inv3', projectId: 'p3', clientId: 'c3', invoiceNumber: 'INV-2024-009', date: '2024-04-10', dueDate: '2024-04-24',
    items: [
      { id: 'ii3', description: 'Rebranding Strategy - Phase 1', quantity: 1, unitPrice: 4500, total: 4500 }
    ],
    subtotal: 4500, discount: 0, tax: 0, total: 4500, paid: 0, balance: 4500,
    status: 'overdue', notes: 'Client requested delay.', createdBy: 'u4', createdAt: '2024-04-10',
    client: 'Box Café', amount: 4500
  },
];

export const PAYMENTS: Payment[] = [
  { id: 'pay1', clientId: 'c1', projectId: 'p1', invoiceId: 'inv1', paymentNumber: 'PAY-001', amount: 8250, date: '2024-04-05', method: 'bank_transfer', reference: 'TRX-998811', note: '', createdBy: 'u4' },
  { id: 'pay2', clientId: 'c2', projectId: 'p2', invoiceId: 'inv2', paymentNumber: 'PAY-002', amount: 15000, date: '2024-05-10', method: 'cheque', reference: 'CHQ-554433', note: 'Partial payment', createdBy: 'u1' }
];

export const EXPENSES: Expense[] = [
  { id: 'exp1', projectId: 'p2', vendor: 'Downtown Studios', amount: 2500, date: '2024-05-12', category: 'location_fee', description: 'Rooftop rental deposit', createdBy: 'u5' },
  { id: 'exp2', projectId: 'p2', vendor: 'Adorama Rental', amount: 1200, date: '2024-05-11', category: 'equipment_rent', description: 'Additional lighting kit', createdBy: 'u5' },
  { id: 'exp3', projectId: 'p1', vendor: 'Uber', amount: 45.50, date: '2024-04-15', category: 'transport', description: 'Ride to client meeting', createdBy: 'u4' }
];

// --- VENDORS & FREELANCERS MOCK DATA ---

export const VENDORS: Vendor[] = [
  { id: 'v1', name: 'Baghdad Camera Rental', type: 'rental', contactName: 'Ahmed K.', email: 'rentals@bcr.com', phone: '555-1010', address: '14th July St, Baghdad', taxNumber: 'IQ-8877', paymentTerms: 'Net 30', notes: 'Preferred vendor for Arri Alexa', createdAt: '2023-01-01', updatedAt: '2023-01-01' },
  { id: 'v2', name: 'PrintFast Solutions', type: 'printing', contactName: 'Sara L.', email: 'orders@printfast.com', phone: '555-2020', address: 'Downtown, NY', paymentTerms: 'Immediate', notes: 'Great for rush jobs', createdAt: '2023-05-10', updatedAt: '2023-05-10' },
  { id: 'v3', name: 'Downtown Studios', type: 'location', contactName: 'Mike Studio', email: 'booking@dtstudios.com', phone: '555-9090', address: 'SoHo, NY', paymentTerms: '50% Advance', notes: 'Includes lighting grip', createdAt: '2023-02-15', updatedAt: '2023-02-15' }
];

export const FREELANCERS: Freelancer[] = [
  { id: 'fl1', name: 'John Doe', specialization: 'Video Editor', email: 'john.editor@gmail.com', phone: '555-3344', location: 'Remote', portfolioUrl: 'vimeo.com/johndoe', rateType: 'daily', defaultRate: 350, notes: 'Fast turnaround, uses Premiere', active: true, createdAt: '2023-03-01', updatedAt: '2023-03-01' },
  { id: 'fl2', name: 'Jane Smith', specialization: 'Colorist', email: 'jane.colors@gmail.com', phone: '555-4455', location: 'Los Angeles', rateType: 'hourly', defaultRate: 85, notes: 'Davinci Resolve expert', active: true, createdAt: '2023-04-20', updatedAt: '2023-04-20' },
  { id: 'fl3', name: 'Ali Basim', specialization: 'DOP', email: 'ali.dop@gmail.com', phone: '555-6677', location: 'Dubai', portfolioUrl: 'ali-cam.com', rateType: 'daily', defaultRate: 600, notes: 'Great with natural light', active: true, createdAt: '2023-06-01', updatedAt: '2023-06-01' }
];

export const FREELANCER_ASSIGNMENTS: FreelancerAssignment[] = [
  { id: 'fa1', freelancerId: 'fl1', projectId: 'p2', taskId: 't4', role: 'Editor', startDate: '2024-05-10', endDate: '2024-05-15', agreedRateType: 'daily', agreedRate: 350, currency: 'USD', notes: 'Editing the launch video', status: 'confirmed' },
  { id: 'fa2', freelancerId: 'fl3', projectId: 'p2', taskId: null, role: 'Camera Operator', startDate: '2024-05-12', endDate: '2024-05-12', agreedRateType: 'daily', agreedRate: 600, currency: 'USD', notes: 'Shoot day', status: 'completed' }
];

export const VENDOR_SERVICE_ORDERS: VendorServiceOrder[] = [
  { id: 'vso1', projectId: 'p2', vendorId: 'v1', orderNumber: 'VSO-2024-001', date: '2024-05-05', serviceDescription: 'Camera Package Rental (Alexa Mini)', amount: 4500, currency: 'USD', status: 'confirmed', notes: 'Pick up at 8 AM', createdBy: 'u5' },
  { id: 'vso2', projectId: 'p2', vendorId: 'v3', orderNumber: 'VSO-2024-002', date: '2024-05-12', serviceDescription: 'Studio Rental - Stage A', amount: 2500, currency: 'USD', status: 'completed', notes: '', createdBy: 'u5' }
];

// --- ADMIN & MOCK DATA ---

// Import centralized branding configuration
import { DEFAULT_BRANDING_CONFIG } from './config/branding.config';

export const DEFAULT_BRANDING: AppBranding = DEFAULT_BRANDING_CONFIG;

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'settings-1',
  timezone: 'UTC',
  defaultCurrency: 'USD',
  taxRateDefault: 10,
  security: {
    requireStrongPassword: true,
    sessionTimeoutMinutes: 120,
    enable2FA: false
  }
};

export const PERMISSIONS_LIST: Permission[] = [
  // ==================== AUTHENTICATION ====================
  { code: 'auth.login', module: 'Authentication', name: 'Login', description: 'Can log into the system' },

  // ==================== CLIENTS (Sidebar: "Clients") ====================
  // 🔹 Uncheck ALL permissions below to hide "Clients" from sidebar
  { code: 'clients.view.own', module: 'Clients', name: 'View Own Clients', description: '⭐ Controls sidebar visibility - Can view only assigned clients' },
  { code: 'clients.view.dept', module: 'Clients', name: 'View Department Clients', description: '⭐ Controls sidebar visibility - Can view clients in own department' },
  { code: 'clients.view.all', module: 'Clients', name: 'View All Clients', description: '⭐ Controls sidebar visibility - Can view all clients' },
  { code: 'clients.create', module: 'Clients', name: 'Create Clients', description: 'Can create new clients' },
  { code: 'clients.edit', module: 'Clients', name: 'Edit Clients', description: 'Can edit client information' },
  { code: 'clients.archive', module: 'Clients', name: 'Archive Clients', description: 'Can archive clients' },
  { code: 'clients.delete', module: 'Clients', name: 'Delete Clients', description: 'Can delete clients' },
  { code: 'client.notes.view', module: 'Clients', name: 'View Client Notes', description: 'Can view client notes' },
  { code: 'client.notes.create', module: 'Clients', name: 'Create Client Notes', description: 'Can create new client notes' },
  { code: 'client.notes.edit', module: 'Clients', name: 'Edit Client Notes', description: 'Can edit client notes' },
  { code: 'client.notes.delete', module: 'Clients', name: 'Delete Client Notes', description: 'Can delete client notes' },
  { code: 'client.meetings.view', module: 'Clients', name: 'View Client Meetings', description: 'Can view client meetings' },
  { code: 'client.meetings.create', module: 'Clients', name: 'Create Client Meetings', description: 'Can schedule new meetings' },
  { code: 'client.meetings.edit', module: 'Clients', name: 'Edit Client Meetings', description: 'Can edit meeting details' },
  { code: 'client.meetings.delete', module: 'Clients', name: 'Delete Client Meetings', description: 'Can delete meetings' },
  { code: 'client.brand_assets.view', module: 'Clients', name: 'View Brand Assets', description: 'Can view brand guidelines and assets' },
  { code: 'client.brand_assets.manage', module: 'Clients', name: 'Manage Brand Assets', description: 'Can add/edit/delete brand assets' },
  { code: 'client.marketing_strategies.view', module: 'Clients', name: 'View Marketing Strategies', description: 'Can view marketing strategies' },
  { code: 'client.marketing_strategies.manage', module: 'Clients', name: 'Manage Marketing Strategies', description: 'Can create/edit/delete marketing strategies' },

  // ==================== PROJECTS (Sidebar: "Projects") ====================
  // 🔹 Uncheck ALL permissions below to hide "Projects" from sidebar
  { code: 'projects.view.own', module: 'Projects', name: 'View Own Projects', description: '⭐ Controls sidebar visibility - Can view only assigned projects' },
  { code: 'projects.view.dept', module: 'Projects', name: 'View Department Projects', description: '⭐ Controls sidebar visibility - Can view projects in own department' },
  { code: 'projects.view.all', module: 'Projects', name: 'View All Projects', description: '⭐ Controls sidebar visibility - Can view all projects' },
  { code: 'projects.create', module: 'Projects', name: 'Create Projects', description: 'Can create new projects' },
  { code: 'projects.edit.own', module: 'Projects', name: 'Edit Own Projects', description: 'Can edit only assigned projects' },
  { code: 'projects.edit.dept', module: 'Projects', name: 'Edit Department Projects', description: 'Can edit projects in own department' },
  { code: 'projects.edit.all', module: 'Projects', name: 'Edit All Projects', description: 'Can edit any project' },
  { code: 'projects.edit', module: 'Projects', name: 'Edit Projects', description: 'Can edit project information' },
  { code: 'projects.archive', module: 'Projects', name: 'Archive Projects', description: 'Can archive projects' },
  { code: 'projects.delete', module: 'Projects', name: 'Delete Projects', description: 'Can delete projects' },
  { code: 'milestones.view', module: 'Projects', name: 'View Milestones', description: 'Can view project milestones' },
  { code: 'milestones.create', module: 'Projects', name: 'Create Milestones', description: 'Can create new milestones' },
  { code: 'milestones.edit', module: 'Projects', name: 'Edit Milestones', description: 'Can edit milestone details' },
  { code: 'milestones.delete', module: 'Projects', name: 'Delete Milestones', description: 'Can delete milestones' },

  // ==================== TASKS (Sidebar: "Tasks & Workflow") ====================
  // 🔹 Uncheck ALL permissions below to hide "Tasks & Workflow" from sidebar
  { code: 'tasks.view.own', module: 'Tasks', name: 'View Own Tasks', description: '⭐ Controls sidebar visibility - Can view only assigned tasks' },
  { code: 'tasks.view.dept', module: 'Tasks', name: 'View Department Tasks', description: '⭐ Controls sidebar visibility - Can view tasks in own department' },
  { code: 'tasks.view.project', module: 'Tasks', name: 'View Project Tasks', description: '⭐ Controls sidebar visibility - Can view tasks in assigned projects' },
  { code: 'tasks.view.all', module: 'Tasks', name: 'View All Tasks', description: '⭐ Controls sidebar visibility - Can view all tasks in the system' },
  { code: 'tasks.create', module: 'Tasks', name: 'Create Tasks', description: 'Can create new tasks' },
  { code: 'tasks.edit.own', module: 'Tasks', name: 'Edit Own Tasks', description: 'Can edit only assigned tasks' },
  { code: 'tasks.edit.dept', module: 'Tasks', name: 'Edit Department Tasks', description: 'Can edit tasks in own department' },
  { code: 'tasks.edit.all', module: 'Tasks', name: 'Edit All Tasks', description: 'Can edit any task regardless of assignment' },
  { code: 'tasks.edit_completed', module: 'Tasks', name: 'Edit Completed Tasks', description: 'Can edit tasks marked as completed' },
  { code: 'tasks.assign.dept', module: 'Tasks', name: 'Assign Department Users', description: 'Can assign department members to tasks' },
  { code: 'tasks.assign.all', module: 'Tasks', name: 'Assign Any User', description: 'Can assign any user to tasks' },
  { code: 'tasks.reassign.dept', module: 'Tasks', name: 'Reassign Department Tasks', description: 'Can reassign department tasks' },
  { code: 'tasks.reassign.all', module: 'Tasks', name: 'Reassign Any Task', description: 'Can reassign any task to different users' },
  { code: 'tasks.manage_assignees', module: 'Tasks', name: 'Manage Task Assignees', description: 'Can assign or reassign people on a task' },
  { code: 'tasks.manage_publishing', module: 'Tasks', name: 'Manage Publishing', description: 'Can assign social managers and publishing notes' },
  { code: 'tasks.advance', module: 'Tasks', name: 'Advance Task Status', description: 'Can move task to next workflow step' },
  { code: 'tasks.submit_for_review', module: 'Tasks', name: 'Submit for Review', description: 'Can submit task for review' },
  { code: 'tasks.request_revision', module: 'Tasks', name: 'Request Revision', description: 'Can request revisions on tasks' },
  { code: 'tasks.approve', module: 'Tasks', name: 'Approve Tasks', description: 'Can approve task submissions' },
  { code: 'tasks.reject', module: 'Tasks', name: 'Reject Tasks', description: 'Can reject task submissions' },
  { code: 'tasks.reopen', module: 'Tasks', name: 'Reopen Tasks', description: 'Can reopen completed or archived tasks' },
  { code: 'tasks.archive', module: 'Tasks', name: 'Archive Tasks', description: 'Can archive tasks' },
  { code: 'tasks.archive.view', module: 'Tasks', name: 'View Archived Tasks', description: 'Can view archived/completed tasks' },
  { code: 'tasks.manual_close.approve', module: 'Tasks', name: 'Manual Close as Approved', description: 'Can manually close and approve tasks bypassing workflow' },
  { code: 'tasks.manual_close.reject', module: 'Tasks', name: 'Manual Close as Rejected', description: 'Can manually close and reject tasks bypassing workflow' },
  { code: 'tasks.delete', module: 'Tasks', name: 'Delete Tasks', description: 'Can permanently delete tasks' },
  { code: 'tasks.references.view', module: 'Tasks', name: 'View Task References', description: 'Can view task reference materials' },
  { code: 'tasks.references.add', module: 'Tasks', name: 'Add Task References', description: 'Can add reference materials to tasks' },
  { code: 'tasks.references.delete', module: 'Tasks', name: 'Delete Task References', description: 'Can remove reference materials from tasks' },
  { code: 'task_files.view', module: 'Tasks', name: 'View Task Files', description: 'Can view files attached to tasks' },
  { code: 'task_files.upload', module: 'Tasks', name: 'Upload Task Files', description: 'Can upload files to tasks' },
  { code: 'task_files.delete', module: 'Tasks', name: 'Delete Task Files', description: 'Can delete files from tasks' },

  // ==================== POSTING & SOCIAL MEDIA (Sidebar: "Posting & Captions") ====================
  // 🔹 Uncheck ALL permissions below to hide "Posting & Captions" from sidebar
  { code: 'posting.view.dept', module: 'Social Media', name: 'View Department Posts', description: '⭐ Controls sidebar visibility - Can view posts for own department' },
  { code: 'posting.view.all', module: 'Social Media', name: 'View All Posts', description: '⭐ Controls sidebar visibility - Can view all social media posts' },
  { code: 'posting.create', module: 'Social Media', name: 'Create Posts', description: 'Can create social media posts' },
  { code: 'posting.edit', module: 'Social Media', name: 'Edit Posts', description: 'Can edit social media posts' },
  { code: 'posting.assign', module: 'Social Media', name: 'Assign Posts', description: 'Can assign posts to social managers' },
  { code: 'posting.submit_for_review', module: 'Social Media', name: 'Submit for Review', description: 'Can submit posts for approval' },
  { code: 'posting.request_revision', module: 'Social Media', name: 'Request Revision', description: 'Can request post revisions' },
  { code: 'posting.approve', module: 'Social Media', name: 'Approve Posts', description: 'Can approve posts for publishing' },
  { code: 'posting.schedule', module: 'Social Media', name: 'Schedule Posts', description: 'Can schedule posts for future publishing' },
  { code: 'posting.mark_published', module: 'Social Media', name: 'Mark Published', description: 'Can mark posts as published' },
  { code: 'posting.archive', module: 'Social Media', name: 'Archive Posts', description: 'Can archive social media posts' },
  { code: 'posting.delete', module: 'Social Media', name: 'Delete Posts', description: 'Can delete social media posts' },

  // ==================== CALENDAR (Sidebar: "Calendar") ====================
  // 🔹 Uncheck ALL permissions below to hide "Calendar" from sidebar
  { code: 'calendar.view', module: 'Calendar', name: 'View Calendar', description: '⭐ Controls sidebar visibility - Can view calendar' },
  { code: 'calendar.manage', module: 'Calendar', name: 'Manage Calendar', description: 'Can create and edit calendar entries' },
  { code: 'calendar.months.create', module: 'Calendar', name: 'Create Calendar Months', description: 'Can create calendar months' },
  { code: 'calendar.months.edit', module: 'Calendar', name: 'Edit Calendar Months', description: 'Can edit calendar months' },
  { code: 'calendar.months.delete', module: 'Calendar', name: 'Delete Calendar Months', description: 'Can delete calendar months' },
  { code: 'calendar.items.create', module: 'Calendar', name: 'Create Calendar Items', description: 'Can add calendar items' },
  { code: 'calendar.items.edit', module: 'Calendar', name: 'Edit Calendar Items', description: 'Can edit calendar items' },
  { code: 'calendar.items.delete', module: 'Calendar', name: 'Delete Calendar Items', description: 'Can delete calendar items' },

  // ==================== ASSETS (Sidebar: "Assets") ====================
  // 🔹 Uncheck ALL permissions below to hide "Assets" from sidebar
  { code: 'assets.view.dept', module: 'Assets', name: 'View Department Assets', description: '⭐ Controls sidebar visibility - Can view department assets' },
  { code: 'assets.view.all', module: 'Assets', name: 'View All Assets', description: '⭐ Controls sidebar visibility - Can view all production assets' },
  { code: 'assets.upload', module: 'Assets', name: 'Upload Assets', description: 'Can upload new assets' },
  { code: 'assets.edit_metadata', module: 'Assets', name: 'Edit Asset Metadata', description: 'Can edit asset information' },
  { code: 'assets.delete', module: 'Assets', name: 'Delete Assets', description: 'Can delete assets' },
  { code: 'assets.link_to_task', module: 'Assets', name: 'Link to Task', description: 'Can link assets to tasks' },
  { code: 'assets.archive', module: 'Assets', name: 'Archive Assets', description: 'Can archive assets' },

  // ==================== PRODUCTION (Sidebar: "Production Hub" - Currently Hidden) ====================
  // 🔹 Uncheck ALL permissions below to hide "Production Hub" from sidebar
  { code: 'production.view', module: 'Production', name: 'View Production', description: '⭐ Controls sidebar visibility - Can view production schedules and assets' },
  { code: 'production.create', module: 'Production', name: 'Create Production', description: 'Can create production items' },
  { code: 'production.edit', module: 'Production', name: 'Edit Production', description: 'Can edit production details' },
  { code: 'production.assign_crew', module: 'Production', name: 'Assign Crew', description: 'Can assign crew to productions' },
  { code: 'production.schedule', module: 'Production', name: 'Schedule Production', description: 'Can schedule production dates' },
  { code: 'production.close_job', module: 'Production', name: 'Close Production', description: 'Can close completed productions' },
  { code: 'production.delete', module: 'Production', name: 'Delete Production', description: 'Can delete production items' },
  // Production Planning Permissions
  { code: 'production.plans.view', module: 'Production', name: 'View Production Plans', description: 'Can view production planning schedules' },
  { code: 'production.plans.create', module: 'Production', name: 'Create Production Plans', description: 'Can create new production plans' },
  { code: 'production.plans.edit', module: 'Production', name: 'Edit Production Plans', description: 'Can edit existing production plans' },
  { code: 'production.plans.delete', module: 'Production', name: 'Delete Production Plans', description: 'Can delete/archive production plans' },
  { code: 'production.override_conflicts', module: 'Production', name: 'Override Conflicts', description: 'Can force update plans with conflicts or completed tasks' },
  { code: 'production.restore_archived', module: 'Production', name: 'Restore Archived Plans', description: 'Can restore archived production plans within 30 days' },

  // ==================== VENDORS (Sidebar: "Network") ====================
  // 🔹 Uncheck ALL permissions below to hide "Network" from sidebar
  { code: 'vendors.view', module: 'Vendors', name: 'View Vendors', description: '⭐ Controls sidebar visibility - Can view vendor list' },
  { code: 'vendors.create', module: 'Vendors', name: 'Create Vendors', description: 'Can add new vendors' },
  { code: 'vendors.edit', module: 'Vendors', name: 'Edit Vendors', description: 'Can edit vendor information' },
  { code: 'vendors.delete', module: 'Vendors', name: 'Delete Vendors', description: 'Can delete vendors' },
  { code: 'vendors.assign_to_project', module: 'Vendors', name: 'Assign to Projects', description: 'Can assign vendors to projects' },

  // ==================== FINANCE (Sidebar: "Finance") ====================
  // 🔹 Uncheck ALL permissions below to hide "Finance" from sidebar
  { code: 'finance.view.own', module: 'Finance', name: 'View Own Finances', description: '⭐ Controls sidebar visibility - Can view own financial records' },
  { code: 'finance.view.project', module: 'Finance', name: 'View Project Finances', description: '⭐ Controls sidebar visibility - Can view project finances' },
  { code: 'finance.view.all', module: 'Finance', name: 'View All Finances', description: '⭐ Controls sidebar visibility - Can view all financial data' },
  { code: 'finance.create_invoice', module: 'Finance', name: 'Create Invoices', description: 'Can create client invoices' },
  { code: 'finance.edit_invoice', module: 'Finance', name: 'Edit Invoices', description: 'Can edit invoices' },
  { code: 'finance.delete_invoice', module: 'Finance', name: 'Delete Invoices', description: 'Can delete invoices' },
  { code: 'finance.record_payment', module: 'Finance', name: 'Record Payments', description: 'Can record payment receipts' },
  { code: 'finance.approve_payment', module: 'Finance', name: 'Approve Payments', description: 'Can approve payment requests' },
  { code: 'finance.export', module: 'Finance', name: 'Export Financial Data', description: 'Can export financial reports' },
  { code: 'finance.manage_budgets', module: 'Finance', name: 'Manage Budgets', description: 'Can create and manage budgets' },

  // ==================== TEAM & HR (Sidebar: "Team & HR") ====================
  // 🔹 Uncheck ALL permissions below to hide "Team & HR" from sidebar
  { code: 'users.view.all', module: 'Team & HR', name: 'View All Users', description: '⭐ Controls sidebar visibility - Can view all users in the system' },
  { code: 'users.create', module: 'Team & HR', name: 'Create Users', description: 'Can create new user accounts' },
  { code: 'users.edit', module: 'Team & HR', name: 'Edit Users', description: 'Can edit user information' },
  { code: 'users.disable', module: 'Team & HR', name: 'Disable Users', description: 'Can deactivate user accounts' },
  { code: 'users.force_password_reset', module: 'Team & HR', name: 'Force Password Reset', description: 'Can force users to reset their password' },
  { code: 'departments.view', module: 'Team & HR', name: 'View Departments', description: 'Can view department list' },
  { code: 'departments.create', module: 'Team & HR', name: 'Create Departments', description: 'Can create new departments' },
  { code: 'departments.edit', module: 'Team & HR', name: 'Edit Departments', description: 'Can edit department information' },
  { code: 'departments.delete', module: 'Team & HR', name: 'Delete Departments', description: 'Can delete departments' },
  { code: 'departments.assign_members', module: 'Team & HR', name: 'Assign Members', description: 'Can assign users to departments' },

  // ==================== REPORTS & ANALYTICS (Sidebar: "Reports") ====================
  // 🔹 Uncheck ALL permissions below to hide "Reports" from sidebar
  { code: 'reports.view.dept', module: 'Reports & Analytics', name: 'View Department Reports', description: '⭐ Controls sidebar visibility - Can view department reports' },
  { code: 'reports.view.all', module: 'Reports & Analytics', name: 'View All Reports', description: '⭐ Controls sidebar visibility - Can view all reports' },
  { code: 'reports.export', module: 'Reports & Analytics', name: 'Export Reports', description: 'Can export report data' },
  { code: 'analytics.view.dept', module: 'Reports & Analytics', name: 'View Department Analytics', description: '⭐ Controls sidebar visibility - Can view department analytics' },
  { code: 'analytics.view.all', module: 'Reports & Analytics', name: 'View All Analytics', description: '⭐ Controls sidebar visibility - Can view system-wide analytics' },

  // ==================== ADMIN PANEL (Sidebar: "Admin Panel") ====================
  // 🔹 Uncheck ALL permissions below to hide "Admin Panel" from sidebar
  { code: 'roles.view', module: 'Admin', name: 'View Roles', description: '⭐ Controls sidebar visibility - Can view role definitions' },
  { code: 'roles.create', module: 'Admin', name: 'Create Roles', description: 'Can create new roles' },
  { code: 'roles.edit', module: 'Admin', name: 'Edit Roles', description: 'Can edit role permissions' },
  { code: 'roles.delete', module: 'Admin', name: 'Delete Roles', description: 'Can delete roles' },
  { code: 'roles.assign', module: 'Admin', name: 'Assign Roles', description: 'Can assign roles to users' },
  { code: 'permissions.view', module: 'Admin', name: 'View Permissions', description: 'Can view permission matrix' },
  { code: 'permissions.manage', module: 'Admin', name: 'Manage Permissions', description: 'Can modify permission assignments' },
  { code: 'admin.branding.view', module: 'Admin', name: 'View Branding', description: '⭐ Controls sidebar visibility - Can view branding settings' },
  { code: 'admin.branding.edit', module: 'Admin', name: 'Edit Branding', description: 'Can customize branding' },
  { code: 'admin.branding.upload_assets', module: 'Admin', name: 'Upload Branding Assets', description: 'Can upload logos and brand assets' },
  { code: 'admin.settings.view', module: 'Admin', name: 'View System Settings', description: '⭐ Controls sidebar visibility - Can view system configuration' },
  { code: 'admin.settings.edit', module: 'Admin', name: 'Edit System Settings', description: 'Can change system settings' },

  // ==================== OTHER PERMISSIONS ====================
  { code: 'approvals.view.own', module: 'Approvals', name: 'View Own Approvals', description: 'Can view approvals assigned to self' },
  { code: 'approvals.view.dept', module: 'Approvals', name: 'View Department Approvals', description: 'Can view department approval workflows' },
  { code: 'approvals.view.all', module: 'Approvals', name: 'View All Approvals', description: 'Can view all approval workflows' },
  { code: 'approvals.act', module: 'Approvals', name: 'Act on Approvals', description: 'Can approve or reject assigned approvals' },
  { code: 'approvals.configure', module: 'Approvals', name: 'Configure Approvals', description: 'Can set up approval workflows' },
  { code: 'notes.create', module: 'Notes', name: 'Create Notes', description: 'Can create notes' },
  { code: 'notes.edit_own', module: 'Notes', name: 'Edit Own Notes', description: 'Can edit own notes' },
  { code: 'notes.delete_own', module: 'Notes', name: 'Delete Own Notes', description: 'Can delete own notes' },
  { code: 'notes.manage_all', module: 'Notes', name: 'Manage All Notes', description: 'Can edit and delete any notes' },
  { code: 'dashboard.view_gm_urgent', module: 'Dashboard', name: 'View GM Urgent Panel', description: 'Can view GM urgent items on dashboard' },
];

export const DEFAULT_ROLES: RoleDefinition[] = [
  {
    id: 'r1',
    name: UserRole.GENERAL_MANAGER,
    description: 'Full system access - complete control over all modules',
    permissions: [
      // Auth & Users
      'auth.login', 'users.view.all', 'users.create', 'users.edit', 'users.disable', 'users.force_password_reset',
      // Roles & Permissions
      'roles.view', 'roles.create', 'roles.edit', 'roles.delete', 'roles.assign',
      'permissions.view', 'permissions.manage',
      // Departments
      'departments.view', 'departments.create', 'departments.edit', 'departments.delete', 'departments.assign_members',
      // Clients (all access)
      'clients.view.all', 'clients.create', 'clients.edit', 'clients.archive', 'clients.delete',
      'client.notes.view', 'client.notes.create', 'client.notes.edit', 'client.notes.delete',
      'client.meetings.view', 'client.meetings.create', 'client.meetings.edit', 'client.meetings.delete',
      'client.brand_assets.view', 'client.brand_assets.manage',
      'client.marketing_strategies.view', 'client.marketing_strategies.manage',
      // Projects & Milestones (all access)
      'projects.view.all', 'projects.create', 'projects.edit', 'projects.archive', 'projects.delete',
      'milestones.view', 'milestones.create', 'milestones.edit', 'milestones.delete',
      // Tasks (full access)
      'tasks.view.all', 'tasks.create', 'tasks.edit.all', 'tasks.assign.all', 'tasks.reassign.all',
      'tasks.advance', 'tasks.submit_for_review', 'tasks.request_revision', 'tasks.approve', 'tasks.reject',
      'tasks.archive', 'tasks.archive.view', 'tasks.manual_close.approve', 'tasks.manual_close.reject',
      'tasks.delete', 'tasks.reopen', 'tasks.edit_completed',
      'task_files.upload', 'task_files.delete', 'task_files.view',
      // Approvals
      'approvals.view.all', 'approvals.act', 'approvals.configure',
      // Posting
      'posting.view.all', 'posting.create', 'posting.edit', 'posting.assign', 'posting.submit_for_review',
      'posting.request_revision', 'posting.approve', 'posting.schedule', 'posting.mark_published',
      'posting.archive', 'posting.delete',
      // Assets
      'assets.view.all', 'assets.upload', 'assets.edit_metadata', 'assets.delete', 'assets.link_to_task', 'assets.archive',
      // Production
      'production.view', 'production.create', 'production.edit', 'production.assign_crew', 'production.schedule',
      'production.close_job', 'production.delete',
      // Production Planning
      'production.plans.view', 'production.plans.create', 'production.plans.edit', 'production.plans.delete',
      'production.override_conflicts', 'production.restore_archived',
      // Vendors
      'vendors.view', 'vendors.create', 'vendors.edit', 'vendors.delete', 'vendors.assign_to_project',
      // Finance (full access)
      'finance.view.all', 'finance.create_invoice', 'finance.edit_invoice', 'finance.delete_invoice',
      'finance.record_payment', 'finance.approve_payment', 'finance.export', 'finance.manage_budgets',
      // Analytics & Reports
      'reports.view.all', 'reports.export', 'analytics.view.all',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own', 'notes.manage_all',
      // Calendar (full access)
      'calendar.view', 'calendar.manage',
      'calendar.months.create', 'calendar.months.edit', 'calendar.months.delete',
      'calendar.items.create', 'calendar.items.edit', 'calendar.items.delete',
      // Admin
      'admin.branding.view', 'admin.branding.edit', 'admin.branding.upload_assets',
      'admin.settings.view', 'admin.settings.edit'
    ],
    isAdmin: true
  },
  {
    id: 'r2',
    name: UserRole.ACCOUNT_MANAGER,
    description: 'Client and project management, task oversight',
    permissions: [
      'auth.login',
      // Clients (full access)
      'clients.view.all', 'clients.create', 'clients.edit', 'clients.archive',
      'client.notes.view', 'client.notes.create', 'client.notes.edit', 'client.notes.delete',
      'client.meetings.view', 'client.meetings.create', 'client.meetings.edit', 'client.meetings.delete',
      'client.brand_assets.view', 'client.brand_assets.manage',
      'client.marketing_strategies.view', 'client.marketing_strategies.manage',
      // Projects (dept level)
      'projects.view.all', 'projects.create', 'projects.edit',
      'milestones.view', 'milestones.create', 'milestones.edit',
      // Tasks (dept level management)
      'tasks.view.all', 'tasks.create', 'tasks.edit.dept', 'tasks.assign.dept', 'tasks.reassign.dept',
      'tasks.advance', 'tasks.submit_for_review', 'tasks.request_revision', 'tasks.approve',
      'tasks.reopen', 'tasks.edit_completed', 'tasks.archive.view', 'tasks.manual_close.approve', 'tasks.manual_close.reject',
      'task_files.view', 'task_files.upload',
      // Approvals
      'approvals.view.all', 'approvals.act', 'approvals.configure',
      // Assets
      'assets.view.all', 'assets.upload', 'assets.link_to_task',
      // Finance (view all, manage budgets)
      'finance.view.all', 'finance.create_invoice', 'finance.edit_invoice', 'finance.manage_budgets',
      // Reports
      'reports.view.all', 'reports.export', 'analytics.view.all',
      // Calendar (full management)
      'calendar.manage',
      'calendar.months.create', 'calendar.months.edit', 'calendar.months.delete',
      'calendar.items.create', 'calendar.items.edit', 'calendar.items.delete',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own'
    ],
    isAdmin: false
  },
  {
    id: 'r3',
    name: UserRole.CREATIVE_DIRECTOR,
    description: 'Creative oversight, approvals, team management',
    permissions: [
      'auth.login',
      // Clients (view all)
      'clients.view.all',
      'client.notes.view', 'client.notes.create',
      'client.meetings.view', 'client.meetings.create',
      'client.brand_assets.view', 'client.brand_assets.manage',
      'client.marketing_strategies.view',
      // Projects (all)
      'projects.view.all', 'projects.create', 'projects.edit',
      'milestones.view', 'milestones.create', 'milestones.edit',
      // Tasks (full creative control)
      'tasks.view.all', 'tasks.create', 'tasks.edit.all', 'tasks.assign.dept', 'tasks.reassign.dept',
      'tasks.advance', 'tasks.submit_for_review', 'tasks.request_revision', 'tasks.approve', 'tasks.reject',
      'tasks.reopen', 'tasks.edit_completed',
      'task_files.view', 'task_files.upload', 'task_files.delete',
      // Approvals
      'approvals.view.all', 'approvals.act', 'approvals.configure',
      // Posting
      'posting.view.all', 'posting.create', 'posting.edit', 'posting.approve', 'posting.schedule',
      // Assets
      'assets.view.all', 'assets.upload', 'assets.edit_metadata', 'assets.link_to_task', 'assets.archive',
      // Production
      'production.view', 'production.edit', 'production.assign_crew',
      // Reports
      'reports.view.dept', 'analytics.view.dept',
      // Calendar (full management)
      'calendar.manage',
      'calendar.months.create', 'calendar.months.edit', 'calendar.months.delete',
      'calendar.items.create', 'calendar.items.edit', 'calendar.items.delete',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own'
    ],
    isAdmin: false
  },
  {
    id: 'r4',
    name: UserRole.ART_DIRECTOR,
    description: 'Design team lead, approval authority',
    permissions: [
      'auth.login',
      // Clients
      'clients.view.dept',
      'client.notes.view', 'client.notes.create',
      'client.meetings.view',
      'client.brand_assets.view',
      // Projects
      'projects.view.dept', 'projects.edit',
      'milestones.view',
      // Tasks (dept level)
      'tasks.view.dept', 'tasks.create', 'tasks.edit.dept', 'tasks.assign.dept',
      'tasks.advance', 'tasks.submit_for_review', 'tasks.request_revision', 'tasks.approve',
      'task_files.view', 'task_files.upload',
      // Approvals
      'approvals.view.dept', 'approvals.act',
      // Assets
      'assets.view.dept', 'assets.upload', 'assets.edit_metadata', 'assets.link_to_task',
      // Reports
      'reports.view.dept', 'analytics.view.dept',
      // Calendar (full management)
      'calendar.manage',
      'calendar.months.create', 'calendar.months.edit', 'calendar.months.delete',
      'calendar.items.create', 'calendar.items.edit', 'calendar.items.delete',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own'
    ],
    isAdmin: false
  },
  {
    id: 'r5',
    name: UserRole.DESIGNER,
    description: 'Creative execution - own tasks only',
    permissions: [
      'auth.login',
      // Clients (view only)
      'clients.view.own',
      'client.notes.view',
      'client.meetings.view',
      'client.brand_assets.view',
      // Projects (own only)
      'projects.view.own',
      'milestones.view',
      // Tasks (own only)
      'tasks.view.own', 'tasks.edit.own', 'tasks.submit_for_review',
      'task_files.view', 'task_files.upload',
      // Approvals
      'approvals.view.own',
      // Assets
      'assets.view.dept', 'assets.upload', 'assets.link_to_task',
      // Calendar (view only)
      'calendar.view',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own'
    ],
    isAdmin: false
  },
  {
    id: 'r6',
    name: UserRole.COPYWRITER,
    description: 'Content creation - own tasks only',
    permissions: [
      'auth.login',
      // Clients
      'clients.view.own',
      'client.notes.view',
      'client.brand_assets.view',
      'client.marketing_strategies.view',
      // Projects
      'projects.view.own',
      'milestones.view',
      // Tasks (own)
      'tasks.view.own', 'tasks.edit.own', 'tasks.submit_for_review',
      'task_files.view', 'task_files.upload',
      // Approvals
      'approvals.view.own',
      // Assets
      'assets.view.dept', 'assets.upload',
      // Calendar (full management for copywriter)
      'calendar.manage',
      'calendar.months.create', 'calendar.months.edit', 'calendar.months.delete',
      'calendar.items.create', 'calendar.items.edit', 'calendar.items.delete',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own'
    ],
    isAdmin: false
  },
  {
    id: 'r7',
    name: UserRole.SOCIAL_MANAGER,
    description: 'Social media content and posting management',
    permissions: [
      'auth.login',
      // Clients
      'clients.view.dept',
      'client.notes.view',
      'client.brand_assets.view',
      'client.marketing_strategies.view',
      // Projects
      'projects.view.dept',
      'milestones.view',
      // Tasks (dept view, own edit)
      'tasks.view.dept', 'tasks.create', 'tasks.edit.own', 'tasks.submit_for_review',
      'task_files.view', 'task_files.upload',
      // Posting (full access)
      'posting.view.dept', 'posting.create', 'posting.edit', 'posting.assign', 'posting.submit_for_review',
      'posting.request_revision', 'posting.schedule', 'posting.mark_published', 'posting.archive',
      // Assets
      'assets.view.dept', 'assets.upload', 'assets.link_to_task',
      // Reports
      'reports.view.dept', 'analytics.view.dept',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own'
    ],
    isAdmin: false
  },
  {
    id: 'r8',
    name: UserRole.PRODUCER,
    description: 'Production management and scheduling',
    permissions: [
      'auth.login',
      // Clients
      'clients.view.dept',
      'client.notes.view',
      'client.brand_assets.view',
      // Projects
      'projects.view.dept', 'projects.edit',
      'milestones.view', 'milestones.create', 'milestones.edit',
      // Tasks
      'tasks.view.dept', 'tasks.create', 'tasks.edit.dept', 'tasks.assign.dept',
      'tasks.advance', 'tasks.submit_for_review',
      'task_files.view', 'task_files.upload',
      // Production (full access)
      'production.view', 'production.create', 'production.edit', 'production.assign_crew',
      'production.schedule', 'production.close_job',
      // Vendors
      'vendors.view', 'vendors.assign_to_project',
      // Assets
      'assets.view.dept', 'assets.upload', 'assets.link_to_task',
      // Reports
      'reports.view.dept', 'analytics.view.dept',
      // Calendar (full management)
      'calendar.manage',
      'calendar.months.create', 'calendar.months.edit', 'calendar.months.delete',
      'calendar.items.create', 'calendar.items.edit', 'calendar.items.delete',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own'
    ],
    isAdmin: false
  },
  {
    id: 'r9',
    name: 'Videographer',
    description: 'Video production - own tasks and production access',
    permissions: [
      'auth.login',
      // Clients
      'clients.view.own',
      'client.brand_assets.view',
      // Projects
      'projects.view.own',
      // Tasks (own)
      'tasks.view.own', 'tasks.edit.own', 'tasks.submit_for_review',
      'task_files.view', 'task_files.upload',
      // Production (view and edit)
      'production.view', 'production.edit',
      // Assets
      'assets.view.dept', 'assets.upload', 'assets.link_to_task',
      // Calendar (view only)
      'calendar.view',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own'
    ],
    isAdmin: false
  },
  {
    id: 'r10',
    name: 'Finance Manager',
    description: 'Financial management and reporting',
    permissions: [
      'auth.login',
      // Clients
      'clients.view.all',
      // Projects
      'projects.view.all',
      'milestones.view',
      // Finance (full access)
      'finance.view.all', 'finance.create_invoice', 'finance.edit_invoice', 'finance.delete_invoice',
      'finance.record_payment', 'finance.approve_payment', 'finance.export', 'finance.manage_budgets',
      // Vendors
      'vendors.view', 'vendors.create', 'vendors.edit',
      // Reports
      'reports.view.all', 'reports.export', 'analytics.view.all',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own'
    ],
    isAdmin: false
  },
  {
    id: 'r11',
    name: 'Freelancer',
    description: 'External contractor - own tasks only',
    permissions: [
      'auth.login',
      // Clients
      'client.brand_assets.view',
      // Projects
      'projects.view.own',
      // Tasks (own only)
      'tasks.view.own', 'tasks.edit.own', 'tasks.submit_for_review',
      'task_files.view', 'task_files.upload',
      // Assets
      'assets.view.own', 'assets.upload',
      // Notes
      'notes.create', 'notes.edit_own', 'notes.delete_own'
    ],
    isAdmin: false
  },
  {
    id: 'r12',
    name: UserRole.CLIENT,
    description: 'Client portal access - view and approve only',
    permissions: [
      'auth.login',
      // Clients (own only)
      'clients.view.own',
      'client.notes.view', 'client.notes.create',
      'client.meetings.view',
      'client.brand_assets.view',
      // Projects (own)
      'projects.view.own',
      'milestones.view',
      // Tasks (view for approval)
      'tasks.view.own',
      'task_files.view',
      // Approvals (client approvals only)
      'approvals.view.own', 'approvals.act',
    ],
    isAdmin: false
  }
];


export const AUDIT_LOGS: AuditLog[] = [
  { id: 'log1', userId: 'u1', action: 'update_branding', entityType: 'AppBranding', entityId: 'branding-1', description: 'Updated primary color to #4f46e5', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 'log2', userId: 'u1', action: 'create_user', entityType: 'User', entityId: 'u5', description: 'Created user Louis Litt', createdAt: new Date(Date.now() - 172800000).toISOString() }
];

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'wf1',
    name: 'Standard Creative Flow',
    description: 'General approval for design tasks',
    departmentId: 'Creative',
    taskType: 'design',
    status: 'active',
    isDefault: true,
    requiresClientApproval: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    steps: [
      { id: 's1', workflowTemplateId: 'wf1', order: 0, label: 'Art Director Review', roleId: 'r3', projectRoleKey: null, specificUserId: null, useDepartmentHead: false }, // r3 is Art Director in DEFAULT_ROLES
      { id: 's2', workflowTemplateId: 'wf1', order: 1, label: 'Creative Director Approval', roleId: 'r2', projectRoleKey: null, specificUserId: null, useDepartmentHead: false }, // r2 is Creative Director
      { id: 's3', workflowTemplateId: 'wf1', order: 2, label: 'Account Manager Check', roleId: 'r4', projectRoleKey: 'Account Manager', specificUserId: null, useDepartmentHead: false } // r4 is Account Manager
    ]
  },
  {
    id: 'wf2',
    name: 'Video Production Approval',
    description: 'Strict flow for video content',
    departmentId: 'Production',
    taskType: 'video',
    status: 'active',
    isDefault: true,
    requiresClientApproval: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    steps: [
      { id: 's4', workflowTemplateId: 'wf2', order: 0, label: 'Producer Review', roleId: 'r5', projectRoleKey: null, specificUserId: null, useDepartmentHead: false }, // r5 is Producer
      { id: 's5', workflowTemplateId: 'wf2', order: 1, label: 'Creative Director Review', roleId: 'r2', projectRoleKey: null, specificUserId: null, useDepartmentHead: false }
    ]
  },
  {
    id: 'wf3',
    name: 'Simple Review',
    description: 'Quick check for minor tasks',
    departmentId: null,
    taskType: 'other',
    status: 'available',
    isDefault: false,
    requiresClientApproval: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    steps: [
      { id: 's6', workflowTemplateId: 'wf3', order: 0, label: 'Account Manager', roleId: 'r4', projectRoleKey: 'Account Manager', specificUserId: null, useDepartmentHead: false }
    ]
  },
  {
    id: 'wf_fallback',
    name: 'System Fallback',
    description: 'Emergency fallback workflow',
    departmentId: null,
    taskType: null,
    status: 'system_protected',
    isDefault: false,
    requiresClientApproval: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    steps: [
      { id: 's_fallback', workflowTemplateId: 'wf_fallback', order: 0, label: 'Manager Review', roleId: 'r1', projectRoleKey: null, specificUserId: null, useDepartmentHead: false }
    ]
  }
];

// --- SOCIAL POSTS MOCK DATA ---

export const SOCIAL_POSTS: any[] = [
  {
    id: 'sp1',
    sourceTaskId: 't3',
    projectId: 'p3',
    clientId: 'c3',
    title: 'Copywriting - Social',
    status: 'writing',
    platforms: ['instagram', 'facebook'],
    caption: 'Get ready for the summer vibes! ☀️☕️ #BoxCafe #Summer',
    publishAt: null,
    timezone: 'Asia/Baghdad',
    socialManagerId: 'u2',
    notesFromTask: 'Focus on the summer vibes.',
    createdBy: 'u4',
    createdAt: '2024-05-01T10:00:00Z',
    updatedAt: '2024-05-02T11:00:00Z'
  }
];

export const NOTES: Note[] = [
  { id: 'n1', title: 'Meeting Notes', content: 'Discussed Q3 goals with the team.', createdBy: 'u1', createdAt: '2024-05-20T10:00:00Z', updatedAt: '2024-05-20T10:00:00Z' },
  { id: 'n2', title: 'Project Idea', content: 'New campaign for Le Bon Designs.', linkedEntityId: 'p1', linkedEntityType: 'project', createdBy: 'u2', createdAt: '2024-05-21T14:30:00Z', updatedAt: '2024-05-21T14:30:00Z' }
];
