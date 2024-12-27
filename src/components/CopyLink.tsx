'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'lucide-react';

interface CopyLinkProps {
  shareCode: string;
}

export function CopyLink({ shareCode }: CopyLinkProps) {
  const { toast } = useToast();
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    try {
      setCopying(true);
      const url = `${window.location.origin}/trip/${shareCode}`;
      await navigator.clipboard.writeText(url);
      
      toast({
        title: "Success",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCopying(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      disabled={copying}
      className="gap-2"
      aria-label="Copy trip link to clipboard"
    >
      <Link className="h-4 w-4" />
      {copying ? "Copying..." : "Copy link"}
    </Button>
  );
} 