import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useRef, useEffect } from 'react'
import { auth } from '@/lib/firebase/clientApp'
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth'
import { useToast } from "@/hooks/use-toast"

export function PhoneAuth() {
  const { toast } = useToast()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [showVerificationInput, setShowVerificationInput] = useState(false)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)

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
      if (!recaptchaVerifierRef.current) {
        throw new Error('reCAPTCHA not initialized')
      }

      const formattedPhoneNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhoneNumber, 
        recaptchaVerifierRef.current
      )
      
      // Store confirmationResult in window for verification
      window.confirmationResult = confirmationResult
      setShowVerificationInput(true)
    } catch (error) {
      console.error('Error sending verification code:', error)
      alert('Error sending code. Please try again.')
    }
  }

  const handleVerifyCode = async () => {
    try {
      if (!window.confirmationResult) {
        throw new Error('No confirmation result found')
      }
      
      const result = await window.confirmationResult.confirm(verificationCode)
      if (result.user) {
        toast({
          title: "Successfully verified!",
          description: "You have been logged in successfully.",
          variant: "default",
        })
        console.log('User signed in:', result.user)
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

  return (
    <div className="space-y-4">
      <Input 
        type="tel" 
        placeholder="Enter phone number (e.g., +1234567890)" 
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />
      <div ref={recaptchaContainerRef}></div>
      
      {!showVerificationInput ? (
        <Button onClick={handleSendCode}>
          Send Code
        </Button>
      ) : (
        <div className="space-y-4">
          <Input
            type="text"
            placeholder="Enter verification code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <Button onClick={handleVerifyCode}>
            Verify Code
          </Button>
        </div>
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