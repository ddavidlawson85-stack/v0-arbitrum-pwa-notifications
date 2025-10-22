-- Create notifications table to track sent notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES delegates(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent', -- sent, failed, clicked
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notifications_proposal_id ON notifications(proposal_id);
CREATE INDEX IF NOT EXISTS idx_notifications_delegate_id ON notifications(delegate_id);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- Create composite index for checking if notification was already sent
CREATE INDEX IF NOT EXISTS idx_notifications_proposal_delegate ON notifications(proposal_id, delegate_id);
