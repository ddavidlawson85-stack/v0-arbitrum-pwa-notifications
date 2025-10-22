-- Add notification_type column to track different types of notifications
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS notification_type TEXT NOT NULL DEFAULT 'new_proposal';

-- Create index for notification type lookups
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);

-- Create composite index for checking if specific notification type was sent
CREATE INDEX IF NOT EXISTS idx_notifications_proposal_delegate_type 
ON notifications(proposal_id, delegate_id, notification_type);
