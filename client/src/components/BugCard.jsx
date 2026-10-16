import { Link } from 'react-router-dom';
import { priorityClass } from '../utils/format.js';

export default function BugCard({ bug }) {
  return (
    <li className="card bug-card">
      <div>
        <h3 className="bug-card__title">
          <Link to={`/bugs/${bug.id}`}>{bug.title}</Link>
        </h3>
        <p className="bug-card__meta">
          #{bug.id} · status: {bug.status} · assigned to:{' '}
          {bug.assigned_to ?? 'unassigned'}
        </p>
      </div>
      <span className={priorityClass(bug.priority)}>{bug.priority}</span>
    </li>
  );
}
