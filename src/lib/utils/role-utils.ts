/**
 * Role-based access control utilities
 */

export type UserRole = 'client' | 'admin' | 'super_admin' | 'coach';

/**
 * Check if user has admin access (admin or super_admin)
 * @param role User role
 * @returns Whether user has admin access
 */
export const hasAdminAccess = (role: UserRole | null | undefined): boolean => {
  return role === 'admin' || role === 'super_admin';
};

/**
 * Check if user has super admin access
 * @param role User role
 * @returns Whether user has super admin access
 */
export const hasSuperAdminAccess = (role: UserRole | null | undefined): boolean => {
  return role === 'super_admin';
};

/**
 * Check if user has coach access
 * @param role User role
 * @returns Whether user has coach access
 */
export const hasCoachAccess = (role: UserRole | null | undefined): boolean => {
  return role === 'coach' || hasAdminAccess(role);
};

/**
 * Check if user has role access for a specific route
 * @param role User role
 * @param requiredRole Required role for access
 * @returns Whether user has access
 */
export const hasRoleAccess = (
  role: UserRole | null | undefined,
  requiredRole: UserRole
): boolean => {
  if (!role) return false;
  
  // Super admin has access to everything
  if (role === 'super_admin') return true;
  
  // Admin has access to admin and client routes
  if (role === 'admin' && (requiredRole === 'admin' || requiredRole === 'client')) {
    return true;
  }
  
  // Coach has access to coach and client routes
  if (role === 'coach' && (requiredRole === 'coach' || requiredRole === 'client')) {
    return true;
  }
  
  // Exact role match
  return role === requiredRole;
};

/**
 * Get role hierarchy level (higher number = more permissions)
 * @param role User role
 * @returns Role level
 */
export const getRoleLevel = (role: UserRole | null | undefined): number => {
  switch (role) {
    case 'super_admin': return 4;
    case 'admin': return 3;
    case 'coach': return 2;
    case 'client': return 1;
    default: return 0;
  }
};

/**
 * Check if user can perform action on target user
 * @param userRole Current user's role
 * @param targetRole Target user's role
 * @returns Whether action is allowed
 */
export const canManageUser = (
  userRole: UserRole | null | undefined,
  targetRole: UserRole | null | undefined
): boolean => {
  const userLevel = getRoleLevel(userRole);
  const targetLevel = getRoleLevel(targetRole);
  
  return userLevel > targetLevel;
};

/**
 * Get available roles for assignment based on current user's role
 * @param currentRole Current user's role
 * @returns Array of roles that can be assigned
 */
export const getAssignableRoles = (currentRole: UserRole | null | undefined): UserRole[] => {
  switch (currentRole) {
    case 'super_admin':
      return ['client', 'coach', 'admin', 'super_admin'];
    case 'admin':
      return ['client', 'coach', 'admin'];
    case 'coach':
      return ['client'];
    default:
      return [];
  }
};

/**
 * Get role display name
 * @param role User role
 * @returns Human-readable role name
 */
export const getRoleDisplayName = (role: UserRole | null | undefined): string => {
  switch (role) {
    case 'super_admin': return 'Super Administrateur';
    case 'admin': return 'Administrateur';
    case 'coach': return 'Coach';
    case 'client': return 'Client';
    default: return 'Utilisateur';
  }
};