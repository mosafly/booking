import { UserRole } from '@/lib/contexts/Auth';

export const hasAdminAccess = (role: UserRole): boolean => {
  return role === 'admin' || role === 'super_admin';
};

export const hasCoachAccess = (role: UserRole): boolean => {
  return role === 'coach' || role === 'super_admin';
};

export const hasClientAccess = (role: UserRole): boolean => {
  return role === 'client' || role === 'admin' || role === 'coach' || role === 'super_admin';
};

export const hasSuperAdminAccess = (role: UserRole): boolean => {
  return role === 'super_admin';
};

export const hasRoleAccess = (userRole: UserRole, requiredRole: UserRole): boolean => {
  // Super admin has access to everything
  if (userRole === 'super_admin') {
    return true;
  }
  
  // Exact role match
  if (userRole === requiredRole) {
    return true;
  }
  
  // Admin can access coach and client routes
  if (userRole === 'admin' && (requiredRole === 'coach' || requiredRole === 'client')) {
    return true;
  }
  
  // Coach can access client routes
  if (userRole === 'coach' && requiredRole === 'client') {
    return true;
  }
  
  return false;
};

export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'super_admin':
      return 'Super Administrateur';
    case 'admin':
      return 'Administrateur';
    case 'coach':
      return 'Coach';
    case 'client':
      return 'Client';
    default:
      return 'Utilisateur';
  }
};
