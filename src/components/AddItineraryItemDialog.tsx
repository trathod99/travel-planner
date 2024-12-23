import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ItineraryItem } from '@/types/trip';
import { processQuickAdd } from '@/lib/ai/processQuickAdd';
import { uploadAttachment, deleteAttachment, FileUploadResult } from '@/lib/firebase/storage';
import { Loader2, Trash2, Paperclip, X } from 'lucide-react';

interface AddItineraryItemDialogProps {
  selectedDate: Date;
  defaultHour?: number;
  onAdd: (item: ItineraryItem) => Promise<void>;
  onDelete?: (item: ItineraryItem) => Promise<void>;
  editItem?: ItineraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
}

export function AddItineraryItemDialog({ 
  selectedDate, 
  defaultHour,
  onAdd,
  onDelete,
  editItem,
  open,
  onOpenChange,
  tripId,
}: AddItineraryItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attachments, setAttachments] = useState<FileUploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    quickAdd: '',
    name: '',
    startTime: '',
    endTime: '',
    description: '',
  });

  // For debouncing and handling race conditions
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Set form data and attachments when editing
  useEffect(() => {
    if (editItem) {
      const startTime = editItem.startTime.split('T')[1].substring(0, 5);
      const endTime = editItem.endTime.split('T')[1].substring(0, 5);
      
      setFormData({
        quickAdd: '',
        name: editItem.name,
        startTime,
        endTime,
        description: editItem.description || '',
      });

      if (editItem.attachments) {
        setAttachments(editItem.attachments);
      }
    } else if (defaultHour !== undefined) {
      const defaultStart = `${defaultHour.toString().padStart(2, '0')}:00`;
      const defaultEnd = `${(defaultHour + 1).toString().padStart(2, '0')}:00`;
      
      setFormData(prev => ({
        ...prev,
        startTime: defaultStart,
        endTime: defaultEnd,
      }));
    }
  }, [editItem, defaultHour]);

  const handleQuickAddChange = async (value: string) => {
    setFormData(prev => ({ ...prev, quickAdd: value }));
    
    // Clear any pending timeouts
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Only process if input is substantial and different from last processed
    if (value.length > 5 && value !== lastProcessedRef.current) {
      setIsProcessing(true);

      // Set up new timeout for debouncing
      processingTimeoutRef.current = setTimeout(async () => {
        try {
          // Create new abort controller for this request
          abortControllerRef.current = new AbortController();
          lastProcessedRef.current = value;

          const processed = await processQuickAdd(value);
          
          // Only update if this is still the latest request
          if (value === lastProcessedRef.current) {
            setFormData(prev => ({
              ...prev,
              name: processed.title,
              startTime: processed.startTime,
              endTime: processed.endTime,
              description: processed.description,
            }));
          }
        } catch (error: any) {
          // Only log if not aborted
          if (error?.name !== 'AbortError') {
            console.error('Error processing quick add:', error);
          }
        } finally {
          setIsProcessing(false);
        }
      }, 1500); // 1.5 second delay
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setIsLoading(true);
    try {
      const itemId = editItem?.id || nanoid();
      const newAttachments = await Promise.all(
        Array.from(files).map(file => uploadAttachment(file, tripId, itemId))
      );
      
      setAttachments(prev => [...prev, ...newAttachments]);
    } catch (error) {
      console.error('Error uploading files:', error);
      if (error instanceof Error && error.message.includes('10MB')) {
        // Show toast or alert about file size limit
      }
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = async (attachment: FileUploadResult) => {
    try {
      await deleteAttachment(attachment.url);
      setAttachments(prev => prev.filter(a => a.url !== attachment.url));
    } catch (error) {
      console.error('Error removing attachment:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const itemData: ItineraryItem = {
        id: editItem?.id || nanoid(),
        name: formData.name || 'Untitled Item',
        startTime: `${dateString}T${formData.startTime || '09:00'}:00.000Z`,
        endTime: `${dateString}T${formData.endTime || '10:00'}:00.000Z`,
        description: formData.description,
        order: editItem?.order || Date.now(),
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      await onAdd(itemData);
      onOpenChange(false);
      setFormData({
        quickAdd: '',
        name: '',
        startTime: '',
        endTime: '',
        description: '',
      });
      setAttachments([]);
    } catch (error) {
      console.error('Error saving itinerary item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editItem || !onDelete) return;
    
    setIsLoading(true);
    try {
      await onDelete(editItem);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editItem ? 'Edit' : 'Add'} Itinerary Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {!editItem && (
            <div className="space-y-2">
              <label htmlFor="quickAdd" className="text-sm font-medium flex items-center gap-2">
                Quick Add
                {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
              </label>
              <Input
                id="quickAdd"
                value={formData.quickAdd}
                onChange={(e) => handleQuickAddChange(e.target.value)}
                placeholder="e.g. Lunch at Sushi Roku at 12:30pm"
                autoFocus
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
              Name
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter item name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="startTime" className="text-sm font-medium flex items-center gap-2">
                Start Time
                <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="endTime" className="text-sm font-medium flex items-center gap-2">
                End Time
                <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
              Description
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Attachments
              <span className="text-xs text-muted-foreground">(max 10MB)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div 
                  key={attachment.url}
                  className="flex items-center gap-2 bg-muted p-2 rounded-md group hover:bg-muted/80"
                >
                  <a 
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 flex-1 min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Paperclip className="h-4 w-4 shrink-0" />
                    <span className="text-sm truncate">
                      {attachment.name}
                    </span>
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAttachment(attachment);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*,application/pdf,video/*"
                multiple
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Add File
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center gap-3">
            {editItem && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : editItem ? "Save Changes" : "Add Item"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 