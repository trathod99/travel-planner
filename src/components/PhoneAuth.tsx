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
  const [stage, setStage] = useState<'phone' | 'verify'>('phone');
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const { createOrFetchUser, initializeNewUser } = useUserManagement();

  useEffect(() => {
    // Initialize reCAPTCHA when component mounts
    if (!recaptchaVerifierRef.current && recaptchaContainerRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'normal',
        callback: () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          alert('reCAPTCHA expired. Please try again.')
        }
      })
    }

    // Cleanup function
    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
        recaptchaVerifierRef.current = null
      }
    }
  }, [])

  const handleSendCode = async () => {
    try {
      // Check if user exists before sending verification
      await createOrFetchUser(phoneNumber)

      if (!recaptchaVerifierRef.current) {
        throw new Error('reCAPTCHA not initialized')
      }

      const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhoneNumber, 
        recaptchaVerifierRef.current
      )
      
      window.confirmationResult = confirmationResult
      setStage('verify')
    } catch (error) {
      console.error('Error sending verification code:', error)
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleVerifyCode = async () => {
    try {
      if (!window.confirmationResult) {
        throw new Error('No confirmation result found');
      }
      
      const result = await window.confirmationResult.confirm(verificationCode);
      if (result.user) {
        // Check if user exists in database
        const existingUser = await createOrFetchUser(phoneNumber);

        if (!existingUser) {
          // New user - initialize in database
          await initializeNewUser(phoneNumber);
        }

        toast({
          title: "Successfully verified!",
          description: "You have been logged in successfully.",
          variant: "default",
        });
        
        // Handle success callback or redirect
        if (onAuthSuccess) {
          onAuthSuccess();
        } else if (redirectPath) {
          // Force a full page reload when redirecting
          window.location.href = redirectPath;
        }
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      toast({
        title: "Verification failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {stage === 'phone' && (
        <>
          <Input 
            type="tel" 
            placeholder="Enter phone number (e.g., +1234567890)" 
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
          <div ref={recaptchaContainerRef}></div>
          <Button onClick={handleSendCode}>Send Code</Button>
        </>
      )}
      
      {stage === 'verify' && (
        <>
          <Input
            type="text"
            placeholder="Enter verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <Button onClick={handleVerifyCode}>Verify Code</Button>
        </>
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