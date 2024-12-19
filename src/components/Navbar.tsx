'use client';

import Link from 'next/link';
import { useUserManagement } from '@/hooks/useUserManagement';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { userData, handleLogout } = useUserManagement();

  return (
    <nav className="border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div>
            <Link 
              href="/" 
              className="text-lg font-semibold hover:text-gray-600 transition-colors"
            >
              Home
            </Link>
          </div>
          
          {userData && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {userData.name || 'Guest'}
              </span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 