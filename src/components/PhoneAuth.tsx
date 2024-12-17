import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from 'react'
import { auth } from '@/lib/firebase/clientApp'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { useToast } from "@/hooks/use-toast"
import { useUserManagement } from '@/hooks/useUserManagement'

export function PhoneAuth() {
  const { toast } = useToast()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [showVerificationInput, setShowVerificationInput] = useState(false)
  const [userName, setUserName] = useState('')
  const [stage, setStage] = useState<'phone' | 'verify' | 'name'>('phone')
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)

  const { 
    userData, 
    isNewUser, 
    createOrFetchUser, 
    saveUserName, 
    initializeNewUser,
    handleLogout 
  } = useUserManagement()

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
        throw new Error('No confirmation result found')
      }
      
      const result = await window.confirmationResult.confirm(verificationCode)
      if (result.user) {
        // Check if user exists in database
        const existingUser = await createOrFetchUser(phoneNumber)

        if (existingUser) {
          // Existing user - populate name if exists
          setUserName(existingUser.name || '')
        } else {
          // New user - initialize in database
          await initializeNewUser(phoneNumber)
        }

        setStage('name')
        toast({
          title: "Successfully verified!",
          description: "You have been logged in successfully.",
          variant: "default",
        })
      }
    } catch (error) {
      console.error('Error verifying code:', error)
      toast({
        title: "Verification failed",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleNameSave = async () => {
    try {
      await saveUserName(userName)
      toast({
        title: "Success",
        description: "Name saved successfully!",
        variant: "default",
      })
    } catch (error) {
      console.error('Error saving name:', error)
      toast({
        title: "Error",
        description: "Failed to save name. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLogoutClick = async () => {
    try {
      await handleLogout();
      setStage('phone');
      setPhoneNumber('');
      setVerificationCode('');
      setUserName('');
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
        variant: "default",
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
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

      {stage === 'name' && (
        <>
          <Input 
            type="text" 
            placeholder="Enter your name" 
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <div className="space-y-2">
            <Button onClick={handleNameSave}>
              {isNewUser ? 'Save Name' : 'Update Name'}
            </Button>
            <Button 
              onClick={handleLogoutClick}
              variant="destructive"
              className="w-full"
            >
              Logout
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// Add type declaration for window
declare global {
  interface Window {
    confirmationResult: any;
  }
} 