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
import { processAttachment } from '@/lib/ai/processAttachment';
import { uploadAttachment, deleteAttachment, FileUploadResult, getAttachmentDownloadUrl } from '@/lib/firebase/storage';
import { Loader2, Trash2, Paperclip, X, FileImage, FileText, FileVideo, Sparkles, Lightbulb } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { uploadFile } from '@/hooks/useFileUpload';
import { database } from '@/lib/firebase/clientApp';
import { ref, update, get } from 'firebase/database';
import { useTripUpdate } from '@/contexts/TripUpdateContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserManagement } from '@/hooks/useUserManagement';
import { recordActivity } from '@/lib/firebase/recordActivity';

interface AddItineraryItemDialogProps {
  selectedDate: Date;
  defaultHour?: number;
  onAdd: (item: ItineraryItem) => Promise<void>;
  onDelete?: (item: ItineraryItem) => Promise<void>;
  editItem?: ItineraryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripLocation: string;
}

function AttachmentThumbnail({ type, url }: { type: string; url: string }) {
  if (type.startsWith('image/')) {
    return (
      <div className="w-8 h-8 rounded overflow-hidden bg-muted">
        <img 
          src={url} 
          alt="" 
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (type.startsWith('video/')) {
    return <FileVideo className="w-8 h-8 text-blue-500" />;
  }

  if (type === 'application/pdf') {
    return <FileText className="w-8 h-8 text-red-500" />;
  }

  return <Paperclip className="w-8 h-8 text-gray-500" />;
}

interface AttachmentWithFile extends FileUploadResult {
  file?: File;
  isProcessing?: boolean;
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
  tripLocation,
}: AddItineraryItemDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentWithFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { triggerUpdate } = useTripUpdate();
  const { userData } = useUserManagement();
  const [formData, setFormData] = useState({
    quickAdd: '',
    name: '',
    startTime: '',
    endTime: '',
    description: '',
    category: editItem?.category || 'None'
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

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (editItem) {
        setFormData({
          quickAdd: '',
          name: editItem.name,
          startTime: editItem.startTime.split('T')[1].substring(0, 5),
          endTime: editItem.endTime.split('T')[1].substring(0, 5),
          description: editItem.description || '',
          category: editItem.category
        });
        setAttachments(editItem.attachments || []);
      } else {
        // Reset form when dialog opens for new item
        setFormData({
          quickAdd: '',
          name: '',
          startTime: defaultHour ? `${defaultHour.toString().padStart(2, '0')}:00` : '',
          endTime: defaultHour ? `${(defaultHour + 1).toString().padStart(2, '0')}:00` : '',
          description: '',
          category: 'None'
        });
        setAttachments([]);
      }
    } else {
      // Reset form when dialog closes
      setFormData({
        quickAdd: '',
        name: '',
        startTime: '',
        endTime: '',
        description: '',
        category: 'None'
      });
      setAttachments([]);
    }
  }, [open, editItem, defaultHour]);

  // Listen for smart upload events
  useEffect(() => {
    const handleSmartUpload = (e: CustomEvent) => {
      const { name, startTime, endTime, description, category, attachments } = e.detail;
      console.log('Smart upload event received:', e.detail); // Debug log
      
      // Directly set form data with the AI analysis results
      setFormData(prev => ({
        ...prev,
        quickAdd: '',
        name: name || '',
        startTime: startTime || '',
        endTime: endTime || '',
        description: description || '',
        category: category || prev.category // Use the AI-detected category or keep existing
      }));

      if (attachments) {
        setAttachments(attachments);
      }
    };

    window.addEventListener('smart-upload', handleSmartUpload as EventListener);
    return () => {
      window.removeEventListener('smart-upload', handleSmartUpload as EventListener);
    };
  }, []);

  const handleQuickAddChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
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

          const processed = await processQuickAdd(value, "");
          
          // Only update if this is still the latest request
          if (value === lastProcessedRef.current) {
            setFormData(prev => ({
              ...prev,
              name: processed.title,
              startTime: processed.startTime,
              endTime: processed.endTime,
              description: processed.description,
              category: processed.category || prev.category
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    try {
      const file = e.target.files[0];
      const attachment = await uploadFile(
        file, 
        tripId, 
        editItem?.id || 'new'
      );
      
      setAttachments(prev => [...prev, attachment]);
      
      toast({
        title: "File uploaded",
        description: "Click the sparkles icon to analyze the file contents.",
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAnalyzeAttachment = async (attachment: AttachmentWithFile) => {
    if (!attachment.file || attachment.isProcessing) return;

    try {
      setAttachments(prev => 
        prev.map(a => a.url === attachment.url ? { ...a, isProcessing: true } : a)
      );

      const analysis = await processAttachment(
        attachment.file,
        formData.name || editItem?.name || '',
        formData.description || editItem?.description
      );

      console.log('AI Response:', analysis); // Debug log
      const parsedData = JSON.parse(analysis);
      console.log('Parsed Data:', parsedData); // Debug log

      // Immediately update form with AI response data
      const updatedFormData = {
        ...formData,
        name: parsedData.Title || formData.name,
        startTime: parsedData["Start Time"] || formData.startTime,
        endTime: parsedData["End Time"] || formData.endTime,
        description: formData.description 
          ? `${formData.description}\n\n${parsedData.Description}` 
          : parsedData.Description,
        category: parsedData.Category || formData.category
      };
      
      console.log('Updating form with:', updatedFormData); // Debug log
      setFormData(updatedFormData);

      toast({
        title: "Analysis complete",
        description: "Details extracted and added to the form.",
      });
    } catch (error) {
      console.error('Error analyzing attachment:', error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze file. Please try again or enter details manually.",
        variant: "destructive",
      });
    } finally {
      setAttachments(prev => 
        prev.map(a => a.url === attachment.url ? { ...a, isProcessing: false } : a)
      );
    }
  };

  const handleRemoveAttachment = async (attachment: FileUploadResult) => {
    try {
      // First filter the attachments
      const remainingAttachments = attachments.filter(a => a.url !== attachment.url);
      
      // Update local state
      setAttachments(remainingAttachments);
      
      // Delete from storage
      await deleteAttachment(attachment.path);
      
      // If this is an edit, update the database
      if (editItem) {
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const itemPath = `trips/${tripId}/itinerary/${dateString}/${editItem.id}`;
        
        const updatedItem = {
          ...editItem,
          attachments: remainingAttachments.length > 0 ? remainingAttachments : null
        };

        const updates = {
          [`${itemPath}/attachments`]: remainingAttachments.length > 0 ? remainingAttachments : null
        };

        await update(ref(database), updates);
      }

      toast({
        title: "Attachment removed",
        description: "File has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error removing attachment:', error);
      toast({
        title: "Error",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
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
        attachments: attachments.length > 0 ? attachments : null,
        category: formData.category,
        createdBy: editItem?.createdBy || {
          phoneNumber: userData?.phoneNumber || '',
          name: userData?.name || null
        }
      };

      // Update the item in the database
      const itemPath = `trips/${tripId}/itinerary/${dateString}/${itemData.id}`;
      await update(ref(database), {
        [itemPath]: itemData
      });

      // Record activity if this is a new item
      if (!editItem && userData) {
        await recordActivity({
          tripId,
          type: 'ITINERARY_ADD',
          userId: userData.phoneNumber,
          userName: userData.name,
          details: {
            itemName: itemData.name,
            itemDate: dateString
          }
        });
      }
      
      await triggerUpdate(); // Trigger UI refresh
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving itinerary item:', error);
      toast({
        title: "Error",
        description: "Failed to save item. Please try again.",
        variant: "destructive",
      });
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
                onChange={handleQuickAddChange}
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
            <div className="flex items-center justify-between">
              <label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                Description
                <span className="text-xs text-muted-foreground">(optional)</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-primary"
                onClick={async () => {
                  try {
                    setIsLoading(true);
                    const response = await fetch('/api/generate-description', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        title: formData.name,
                        location: tripLocation,
                        category: formData.category
                      }),
                    });

                    if (!response.ok) throw new Error('Failed to generate ideas');
                    
                    const { description } = await response.json();
                    
                    // Append the new description to any existing content
                    setFormData(prev => ({
                      ...prev,
                      description: prev.description
                        ? `${prev.description}\n\n${description}`
                        : description
                    }));

                    toast({
                      title: "Ideas generated",
                      description: "AI suggestions have been added to the description.",
                    });
                  } catch (error) {
                    console.error('Error generating description:', error);
                    toast({
                      title: "Error",
                      description: "Failed to generate ideas. Please try again.",
                      variant: "destructive",
                    });
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading || !formData.name}
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lightbulb className="h-3.5 w-3.5" />
                )}
                Ideas
              </Button>
            </div>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add a description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="category" className="text-sm font-medium">
              Category
            </label>
            <Select
              value={formData.category}
              onValueChange={(value: 'None' | 'Travel' | 'Food' | 'Accommodation' | 'Activity') => 
                setFormData(prev => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="None">None</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Food">Food</SelectItem>
                <SelectItem value="Accommodation">Accommodation</SelectItem>
                <SelectItem value="Activity">Activity</SelectItem>
              </SelectContent>
            </Select>
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
                    <AttachmentThumbnail type={attachment.type} url={attachment.url} />
                    <span className="text-sm truncate">
                      {attachment.name}
                    </span>
                  </a>
                  <div className="flex items-center gap-1">
                    {attachment.file && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleAnalyzeAttachment(attachment)}
                        disabled={attachment.isProcessing}
                      >
                        {attachment.isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive/90"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAttachment(attachment);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
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