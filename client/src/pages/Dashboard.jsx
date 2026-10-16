import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useBugs } from '../hooks/useBugs.js';
import { titleCase } from '../utils/format.js';

export default function Dashboard() {
  const { bugs, loading, error } = useBugs();

  const stats = useMemo(() => {
    const byStatus = bugs.reduce((acc, bug) => {
      acc[bug.status] = (acc[bug.status] || 0) + 1;
      return acc;
    }, {});
    return {
      total: bugs.length,
      open: byStatus.open || 0,
      assigned: byStatus.assigned || 0,
      resolved: byStatus.resolved || 0,
      byStatus,
    };
  }, [bugs]);

  return (
    <section>
      <h1 className="page-title">Dashboard</h1>

      {loading && <p className="muted">Loading bugs…</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid">
            <div className="card">
              <div className="stat__value">{stats.total}</div>
              <div className="stat__label">Total bugs</div>
            </div>
            <div className="card">
              <div className="stat__value">{stats.open}</div>
              <div className="stat__label">Open</div>
            </div>
            <div className="card">
              <div className="stat__value">{stats.assigned}</div>
              <div className="stat__label">Assigned</div>
            </div>
            <div className="card">
              <div className="stat__value">{stats.resolved}</div>
              <div className="stat__label">Resolved</div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <h2>Status breakdown</h2>
            {Object.keys(stats.byStatus).length === 0 ? (
              <p className="muted">No bugs reported yet.</p>
            ) : (
              <ul className="bug-list">
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <li key={status} className="bug-card">
                    <span>{titleCase(status)}</span>
                    <span className="badge">{count}</span>
                  </li>
                ))}
              </ul>
            )}
            <p style={{ marginTop: 16 }}>
              <Link to="/bugs">View all bugs →</Link>
            </p>
          </div>
        </>
      )}
    </section>
  );
}
