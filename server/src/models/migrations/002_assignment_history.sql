-- ProPR assignment history
-- Records every assignment change so the AI assignee recommender can learn
-- from past resolved tickets and the UI can display assignment history.

CREATE TABLE IF NOT EXISTS assignment_history (
  id          SERIAL PRIMARY KEY,
  bug_id      INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason      VARCHAR(60),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_history_bug_id
  ON assignment_history(bug_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_assigned_to
  ON assignment_history(assigned_to);
