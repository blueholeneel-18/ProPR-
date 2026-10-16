import { useState } from 'react';
import BugCard from '../components/BugCard.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import { useBugs } from '../hooks/useBugs.js';
import { bugService } from '../services/api.js';

const STATUSES = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SEVERITIES = ['minor', 'moderate', 'major', 'critical'];

const EMPTY_FORM = {
  title: '',
  description: '',
  priority: 'medium',
  severity: 'moderate',
};

export default function BugList() {
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const activeFilters = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value)
  );
  const { bugs, loading, error, refetch } = useBugs(activeFilters);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const handleFilter = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await bugService.create(form);
      setForm(EMPTY_FORM);
      setModalOpen(false);
      await refetch();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="page-title">Bugs</h1>
        <Button onClick={() => setModalOpen(true)}>Report bug</Button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid">
          <div className="form-field">
            <label htmlFor="filter-status">Status</label>
            <select id="filter-status" name="status" value={filters.status} onChange={handleFilter}>
              <option value="">All</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="filter-priority">Priority</label>
            <select
              id="filter-priority"
              name="priority"
              value={filters.priority}
              onChange={handleFilter}
            >
              <option value="">All</option>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <p className="muted">Loading bugs…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && bugs.length === 0 && (
        <p className="muted">No bugs match the current filters.</p>
      )}

      <ul className="bug-list">
        {bugs.map((bug) => (
          <BugCard key={bug.id} bug={bug} />
        ))}
      </ul>

      <Modal open={modalOpen} title="Report a bug" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="bug-title">Title</label>
            <input
              id="bug-title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="bug-description">Description</label>
            <textarea
              id="bug-description"
              name="description"
              rows={4}
              value={form.description}
              onChange={handleChange}
            />
          </div>
          <div className="form-field">
            <label htmlFor="bug-priority">Priority</label>
            <select id="bug-priority" name="priority" value={form.priority} onChange={handleChange}>
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="bug-severity">Severity</label>
            <select id="bug-severity" name="severity" value={form.severity} onChange={handleChange}>
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </div>

          {formError && <p className="error-text">{formError}</p>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Create bug'}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
