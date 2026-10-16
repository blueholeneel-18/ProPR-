import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Button from '../components/Button.jsx';
import AIAssistPanel from '../components/AIAssistPanel.jsx';
import { bugService, userService } from '../services/api.js';
import { formatDateTime, priorityClass, titleCase } from '../utils/format.js';

export default function BugDetail() {
  const { id } = useParams();
  const [bug, setBug] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignee, setAssignee] = useState('');
  const [comment, setComment] = useState('');
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bugData, userData] = await Promise.all([
        bugService.get(id),
        userService.list().catch(() => []),
      ]);
      setBug(bugData);
      setUsers(userData);
      setAssignee(bugData.assigned_to ?? '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAssign = async () => {
    if (!assignee) return;
    try {
      const updated = await bugService.assign(id, Number(assignee));
      setBug((prev) => ({ ...prev, ...updated }));
      setNotice('Bug assigned successfully');
    } catch (err) {
      setNotice(err.message);
    }
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    try {
      await bugService.addComment(id, comment.trim());
      setComment('');
      await load();
    } catch (err) {
      setNotice(err.message);
    }
  };

  const handleTriageResult = (result) => {
    setBug((prev) => ({
      ...prev,
      priority: result.suggested_priority || prev.priority,
      severity: result.suggested_severity || prev.severity,
    }));
    setNotice('AI triage suggestions applied to this view');
  };

  const handleAiAssign = async (userId) => {
    const updated = await bugService.assign(id, userId);
    setBug((prev) => ({ ...prev, ...updated }));
    setAssignee(userId);
    setNotice('Bug assigned successfully');
  };

  if (loading) return <p className="muted">Loading bug…</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (!bug) return <p className="muted">Bug not found.</p>;

  return (
    <section>
      <p>
        <Link to="/bugs">← Back to bugs</Link>
      </p>
      <h1 className="page-title">{bug.title}</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <p>
          <span className={priorityClass(bug.priority)}>{bug.priority}</span>{' '}
          <span className="badge">{titleCase(bug.status)}</span>
        </p>
        <p>{bug.description || <span className="muted">No description provided.</span>}</p>
        <p className="muted">
          Reported {formatDateTime(bug.created_at)} · Updated {formatDateTime(bug.updated_at)}
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Assignment</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label htmlFor="assignee">Assigned to</label>
            <select
              id="assignee"
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={handleAssign} disabled={!assignee}>
            Assign
          </Button>
        </div>
      </div>

      <AIAssistPanel
        bugId={bug.id}
        triagePayload={{
          title: bug.title,
          description: bug.description,
          steps_to_reproduce: bug.steps_to_reproduce,
        }}
        onTriageResult={handleTriageResult}
        onAssign={handleAiAssign}
        triageDisabled={!bug.title}
      />

      <div className="card">
        <h2>Comments</h2>
        {(!bug.comments || bug.comments.length === 0) && (
          <p className="muted">No comments yet.</p>
        )}
        <ul className="bug-list">
          {(bug.comments || []).map((item) => (
            <li key={item.id} className="card">
              <p style={{ margin: 0 }}>{item.message}</p>
              <small className="muted">{formatDateTime(item.created_at)}</small>
            </li>
          ))}
        </ul>
        <form onSubmit={handleComment} style={{ marginTop: 12 }}>
          <div className="form-field">
            <label htmlFor="comment">Add a comment</label>
            <textarea
              id="comment"
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={!comment.trim()}>
            Post comment
          </Button>
        </form>
      </div>

      {notice && <p className="muted">{notice}</p>}
    </section>
  );
}
