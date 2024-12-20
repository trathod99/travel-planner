import { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface InlineEditProps {
  value: string;
  displayValue?: string;
  onSave: (value: string) => Promise<void>;
  type?: 'text' | 'date';
  className?: string;
}

export function InlineEdit({ value, displayValue, onSave, type = 'text', className = '' }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      // Reset to original value on error
      setEditValue(value);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setEditValue(newValue);
    
    if (type === 'date') {
      try {
        await onSave(newValue);
        setIsEditing(false);
      } catch (error) {
        console.error('Error saving date:', error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type={type}
          value={editValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={type === 'date' ? undefined : handleSave}
          disabled={isLoading}
          className={className}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <div className={className}>
        {displayValue || value}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
} 