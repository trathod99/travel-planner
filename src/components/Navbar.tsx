'use client';

import { useRouter } from 'next/navigation';
import { useUserManagement } from '@/hooks/useUserManagement';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useState } from 'react';
import { PhoneAuth } from './PhoneAuth';
import { 
  Dialog, 
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TripPicker } from './TripPicker';

export function Navbar() {
  const router = useRouter();
  const { userData, handleLogout } = useUserManagement();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const handleMyTripsClick = () => {
    router.push('/my-trips');
  };

  const handleAuthSuccess = () => {
    setShowAuthDialog(false);
  };

  return (
    <>
      <nav className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <TripPicker />
            
            {userData ? (
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
            ) : (
              <Button
                variant="ghost"
                onClick={() => setShowAuthDialog(true)}
                className="text-sm font-medium"
              >
                Log In
              </Button>
            )}
          </div>
        </div>
      </nav>

      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log In or Sign Up</DialogTitle>
          </DialogHeader>
          <PhoneAuth onAuthSuccess={handleAuthSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
} 