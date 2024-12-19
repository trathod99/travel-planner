'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserManagement } from '@/hooks/useUserManagement';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

export function Navbar() {
  const router = useRouter();
  const { userData, handleLogout } = useUserManagement();

  const handleMyTripsClick = () => {
    router.push('/my-trips');
  };

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
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm hover:text-gray-600">
                Hi, {userData.name || 'Guest'}
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleMyTripsClick}>
                  My Trips
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </nav>
  );
} 