-- Add test_notification_sent field to push_subscriptions table
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS test_notification_sent BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups of subscriptions needing test notifications
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_test_sent 
ON push_subscriptions(test_notification_sent, created_at) 
WHERE test_notification_sent = FALSE;
