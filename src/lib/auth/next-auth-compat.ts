// Compatibility layer for next-auth usage in our custom auth system
import { authenticateRequest } from '@/lib/auth';

export const authOptions = {
  // Minimal config for compatibility
};

export async function getServerSession(options?: any) {
  try {
    const { user, profile } = await authenticateRequest();
    return {
      user: {
        id: user.id,
        email: user.email,
        ...profile
      }
    };
  } catch (error) {
    return null;
  }
}