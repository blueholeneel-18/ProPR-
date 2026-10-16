import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.email || !form.password) {
      setError('Email and password are required');
      return;
    }
    // Placeholder authentication until the backend auth endpoint lands.
    login({ name: form.email.split('@')[0], email: form.email });
    navigate('/');
  };

  return (
    <section style={{ maxWidth: 420, margin: '0 auto' }}>
      <h1 className="page-title">Sign in</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <Button type="submit">Log in</Button>
        </form>
      </div>
    </section>
  );
}
