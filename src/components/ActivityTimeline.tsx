import { format, formatDistanceToNow } from 'date-fns';
import { Activity } from '@/types/activity';

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  const formatActivityMessage = (activity: Activity): string => {
    const userName = activity.userName || 'Someone';

    switch (activity.type) {
      case 'ITINERARY_ADD':
        return `${userName} added "${activity.details.itemName}" on ${
          activity.details.itemDate ? format(new Date(activity.details.itemDate), 'MMM d') : 'the itinerary'
        }`;

      case 'RSVP_CHANGE':
        const formatRsvpStatus = (status: string | undefined) => {
          switch (status) {
            case 'going': return 'Going';
            case 'maybe': return 'Maybe';
            case 'not_going': return 'Not Going';
            default: return status;
          }
        };
        return `${userName} changed RSVP from ${formatRsvpStatus(activity.details.oldStatus)} to ${formatRsvpStatus(activity.details.newStatus)}`;

      case 'ITINERARY_VOTE':
        return `${userName} ${activity.details.voted ? 'added' : 'removed'} a thumbs up to "${activity.details.itemName}"`;

      case 'TRIP_UPDATE':
        const fieldDisplay = {
          name: 'trip name',
          location: 'trip location',
          startDate: 'start date',
          endDate: 'end date'
        }[activity.details.field!];
        
        return `${userName} changed ${fieldDisplay} to "${activity.details.newValue}"`;

      case 'TASK_CREATE':
        return `${userName} created task: ${activity.details.taskName}`;

      case 'TASK_COMPLETE':
        return `${userName} ${activity.details.completed ? 'completed' : 'uncompleted'} task: ${activity.details.taskName}`;

      default:
        return 'Unknown activity';
    }
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div key={activity.id} className="flex gap-4 items-start">
          <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
          <div className="flex-1 space-y-1">
            <p className="text-sm">{formatActivityMessage(activity)}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
} 