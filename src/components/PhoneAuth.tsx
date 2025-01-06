'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from '@/lib/firebase/clientApp';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";
import { useUserManagement } from '@/hooks/useUserManagement';
import { useRouter } from 'next/navigation';

interface PhoneAuthProps {
  redirectPath?: string;
  onAuthSuccess?: () => void;
}

export function PhoneAuth({ redirectPath, onAuthSuccess }: PhoneAuthProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'verify' | 'name'>('phone');
  const [userName, setUserName] = useState('');
  const [needsName, setNeedsName] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const { createOrFetchUser, initializeNewUser, saveUserName } = useUserManagement();

  useEffect(() => {
    // Initialize invisible reCAPTCHA when component mounts
    if (!recaptchaVerifierRef.current) {
      try {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'sign-in-button', {
          size: 'invisible',
          callback: () => {
            // reCAPTCHA solved
          },
          'expired-callback': () => {
            toast({
              title: "reCAPTCHA expired",
              description: "Please try again.",
              variant: "destructive",
            });
            setIsLoading(false);
          }
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to initialize authentication. Please try again.",
          variant: "destructive",
        });
      }
    }

    // Cleanup function
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (error) {
          // Silently handle cleanup errors
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, [toast]);

  const handleSendCode = async () => {
    if (!phoneNumber) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Format phone number to E.164 format
      const formattedPhone = phoneNumber.startsWith('+')
        ? phoneNumber
        : `+1${phoneNumber.replace(/\D/g, '')}`;

      // Create new reCAPTCHA verifier if it doesn't exist
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'sign-in-button', {
          size: 'invisible',
        });
      }

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifierRef.current
      );

      window.confirmationResult = confirmationResult;
      setStage('verify');
      toast({
        title: "Code sent!",
        description: "Please check your phone for the verification code.",
      });
    } catch (error: any) {
      // Clear the reCAPTCHA if there's an error
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        } catch (clearError) {
          // Silently handle cleanup errors
        }
      }
      toast({
        title: "Error sending code",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      toast({
        title: "Verification code required",
        description: "Please enter the code sent to your phone.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await window.confirmationResult.confirm(verificationCode);
      const user = result.user;

      // Check if user exists in our database
      const existingUser = await createOrFetchUser(user.phoneNumber!);
      if (!existingUser) {
        setNeedsName(true);
        setStage('name');
      } else {
        handleAuthenticationSuccess();
      }
    } catch (error: any) {
      toast({
        title: "Invalid code",
        description: "Please check the code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetName = async () => {
    if (!userName) {
      toast({
        title: "Name required",
        description: "Please enter your name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await saveUserName(userName);
      handleAuthenticationSuccess();
    } catch (error: any) {
      toast({
        title: "Error saving name",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticationSuccess = () => {
    if (onAuthSuccess) {
      onAuthSuccess();
    }
    if (redirectPath) {
      router.push(redirectPath);
    }
  };

  return (
    <div className="space-y-4">
      {stage === 'phone' && (
        <div className="space-y-4">
          <Input
            type="tel"
            placeholder="Enter your phone number"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            id="sign-in-button"
            onClick={handleSendCode}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Code"}
          </Button>
        </div>
      )}

      {stage === 'verify' && (
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Enter verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            onClick={handleVerifyCode}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Verifying..." : "Verify Code"}
          </Button>
        </div>
      )}

      {stage === 'name' && (
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Enter your name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSetName}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Name"}
          </Button>
        </div>
      )}
    </div>
  );
}

// Add type declaration for window
declare global {
  interface Window {
    confirmationResult: any;
  }
} 