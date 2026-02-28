import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props  { children: ReactNode; }
interface State  { hasError: boolean; error?: string; }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: Error) {
    // Log sans exposer de données sensibles à l'utilisateur
    console.error('[CarbTracker] Erreur non gérée:', error.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: '2rem', textAlign: 'center',
          fontFamily: 'Outfit, sans-serif', background: 'var(--bg-color)',
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ color: '#EF4444', marginBottom: '0.5rem', fontSize: '1.25rem' }}>
            Une erreur est survenue
          </h2>
          <p style={{ color: '#64748B', marginBottom: '1.5rem', fontSize: '0.9rem', maxWidth: '320px' }}>
            L'application a rencontré un problème inattendu. Vos données sont sécurisées.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#10B981', color: 'white', border: 'none',
              padding: '0.75rem 1.5rem', borderRadius: '12px',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 600,
            }}
          >
            Recharger l'application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
