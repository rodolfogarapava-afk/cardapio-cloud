import { Navigate } from 'react-router-dom';

// Compat: /login redirects to the new access hub.
export default function Login() {
  return <Navigate to="/acesso" replace />;
}
