import React, { useState, useMemo } from 'react';
import { RoleDefinition, Permission } from '../types';
import { Search, Download, Copy, RefreshCw, ChevronDown, ChevronRight, Check, X } from 'lucide-react';

interface PermissionMatrixProps {
  roles: RoleDefinition[];
  permissions: Permission[];
  onUpdateRole: (role: RoleDefinition) => void;
  onSyncRoles?: () => void;
}

interface GroupedPermissions {
  [module: string]: Permission[];
}

const PermissionMatrix: React.FC<PermissionMatrixProps> = ({ roles, permissions, onUpdateRole, onSyncRoles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const grouped: GroupedPermissions = {};
    permissions.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });
    return grouped;
  }, [permissions]);

  // Get unique modules
  const modules = useMemo(() => Object.keys(groupedPermissions).sort(), [groupedPermissions]);

  // Filter permissions by search term
  const filteredModules = useMemo(() => {
    if (!searchTerm) return modules;
    return modules.filter(module => {
      const modulePerms = groupedPermissions[module];
      return modulePerms.some(perm => 
        perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        perm.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [modules, groupedPermissions, searchTerm]);

  const toggleModule = (module: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(module)) {
      newExpanded.delete(module);
    } else {
      newExpanded.add(module);
    }
    setExpandedModules(newExpanded);
  };

  const togglePermission = (role: RoleDefinition, permissionCode: string) => {
    const hasPermission = role.permissions.includes(permissionCode);
    const newPermissions = hasPermission
      ? role.permissions.filter(p => p !== permissionCode)
      : [...role.permissions, permissionCode];
    
    onUpdateRole({ ...role, permissions: newPermissions });
  };

  const toggleAllPermissionsForRole = (role: RoleDefinition, module: string) => {
    const modulePerms = groupedPermissions[module];
    const moduleCodes = modulePerms.map(p => p.code);
    const hasAll = moduleCodes.every(code => role.permissions.includes(code));
    
    let newPermissions: string[];
    if (hasAll) {
      // Remove all module permissions
      newPermissions = role.permissions.filter(p => !moduleCodes.includes(p));
    } else {
      // Add all module permissions
      const existing = new Set(role.permissions);
      moduleCodes.forEach(code => existing.add(code));
      newPermissions = Array.from(existing);
    }
    
    onUpdateRole({ ...role, permissions: newPermissions });
  };

  const copyRolePermissions = (sourceRole: RoleDefinition, targetRole: RoleDefinition) => {
    if (window.confirm(`Copy all permissions from "${sourceRole.name}" to "${targetRole.name}"?`)) {
      onUpdateRole({ ...targetRole, permissions: [...sourceRole.permissions] });
    }
  };

  const exportMatrix = () => {
    const matrix: any = {
      exportDate: new Date().toISOString(),
      roles: roles.map(role => ({
        id: role.id,
        name: role.name,
        permissions: role.permissions,
        isAdmin: role.isAdmin
      }))
    };
    
    const blob = new Blob([JSON.stringify(matrix, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `permission-matrix-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const expandAll = () => {
    setExpandedModules(new Set(modules));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  const hasPermission = (role: RoleDefinition, code: string) => {
    return role.isAdmin || role.permissions.includes(code);
  };

  const getModuleStats = (module: string, role: RoleDefinition) => {
    const modulePerms = groupedPermissions[module];
    const granted = modulePerms.filter(p => hasPermission(role, p.code)).length;
    return { granted, total: modulePerms.length };
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search permissions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={expandAll}
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <ChevronDown className="w-4 h-4" />
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4" />
            Collapse All
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={exportMatrix}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          {onSyncRoles && (
            <button
              onClick={onSyncRoles}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reset to Defaults
            </button>
          )}
        </div>
      </div>

      {/* Matrix Container */}
      <div className="flex-1 overflow-auto border border-slate-200 rounded-lg">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-slate-50 z-10">
            <tr>
              <th className="sticky left-0 bg-slate-50 z-20 min-w-[300px] px-4 py-3 text-left text-sm font-semibold text-slate-900 border-b border-r">
                Permission
              </th>
              {roles.map(role => (
                <th
                  key={role.id}
                  className="min-w-[120px] px-4 py-3 text-center text-sm font-semibold text-slate-900 border-b border-r last:border-r-0"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span>{role.name}</span>
                    {role.isAdmin && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Admin</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredModules.map(module => {
              const isExpanded = expandedModules.has(module);
              const modulePerms = groupedPermissions[module];
              
              return (
                <React.Fragment key={module}>
                  {/* Module Header Row */}
                  <tr className="bg-slate-100 hover:bg-slate-150">
                    <td
                      className="sticky left-0 bg-slate-100 z-10 px-4 py-3 font-semibold text-slate-900 border-b border-r cursor-pointer"
                      onClick={() => toggleModule(module)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                        <span>{module}</span>
                        <span className="text-xs text-slate-500">({modulePerms.length})</span>
                      </div>
                    </td>
                    {roles.map(role => {
                      const stats = getModuleStats(module, role);
                      return (
                        <td
                          key={role.id}
                          className="px-4 py-3 text-center border-b border-r last:border-r-0 cursor-pointer hover:bg-slate-200"
                          onClick={() => toggleAllPermissionsForRole(role, module)}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-slate-600">
                              {stats.granted}/{stats.total}
                            </span>
                            {stats.granted === stats.total && stats.total > 0 && (
                              <Check className="w-4 h-4 text-green-600" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  
                  {/* Permission Rows */}
                  {isExpanded && modulePerms.map((perm, idx) => (
                    <tr
                      key={perm.code}
                      className={`hover:bg-slate-50 ${idx === modulePerms.length - 1 ? 'border-b-2 border-slate-300' : ''}`}
                    >
                      <td className="sticky left-0 bg-white z-10 px-4 py-3 border-b border-r">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">{perm.name}</span>
                          <span className="text-xs text-slate-500">{perm.description}</span>
                          <span className="text-xs text-slate-400 font-mono mt-1">{perm.code}</span>
                        </div>
                      </td>
                      {roles.map(role => {
                        const granted = hasPermission(role, perm.code);
                        const isFromAdmin = role.isAdmin && !role.permissions.includes(perm.code);
                        
                        return (
                          <td
                            key={role.id}
                            className={`px-4 py-3 text-center border-b border-r last:border-r-0 cursor-pointer transition-colors ${
                              granted
                                ? isFromAdmin
                                  ? 'bg-indigo-50 hover:bg-indigo-100'
                                  : 'bg-green-50 hover:bg-green-100'
                                : 'bg-white hover:bg-slate-50'
                            }`}
                            onClick={() => !role.isAdmin && togglePermission(role, perm.code)}
                          >
                            {granted ? (
                              <div className="flex items-center justify-center">
                                <Check className={`w-5 h-5 ${isFromAdmin ? 'text-indigo-600' : 'text-green-600'}`} />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <X className="w-5 h-5 text-slate-300" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-6">
            <span><strong>{roles.length}</strong> roles</span>
            <span><strong>{permissions.length}</strong> permissions</span>
            <span><strong>{modules.length}</strong> modules</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Explicitly Granted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-indigo-500 rounded"></div>
              <span>Admin (All Access)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Copy Panel (Optional) */}
      {selectedRole && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              Copy permissions from: {roles.find(r => r.id === selectedRole)?.name}
            </span>
            <button
              onClick={() => setSelectedRole(null)}
              className="text-blue-700 hover:text-blue-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionMatrix;
