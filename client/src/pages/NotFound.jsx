import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section>
      <h1 className="page-title">404 - Page not found</h1>
      <p className="muted">
        The page you are looking for does not exist. <Link to="/">Return to the dashboard</Link>.
      </p>
    </section>
  );
}
