import { useState } from 'react';
export default function AuthPage({ csrfToken, busy, error, success, onLogin, onRegister, onRetry, }) {
    const [mode, setMode] = useState('login');
    async function submitLogin(event) {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget).entries());
        await onLogin(values);
    }
    async function submitRegistration(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form).entries());
        const registered = await onRegister(values);
        if (registered) {
            form.reset();
            setMode('login');
        }
    }
    return (<main className="auth-page auth-shell">
      <input className="auth-tab-control" id="login-tab" name="auth-tab" type="radio" checked={mode === 'login'} onChange={() => setMode('login')}/>
      <input className="auth-tab-control" id="register-tab" name="auth-tab" type="radio" checked={mode === 'register'} onChange={() => setMode('register')}/>

      <section className="auth-card" aria-label="Papertrail account access">
        <aside className="auth-intro">
          <div className="brand">
            <img className="brand-mark" src="/papertrail-logo.png" alt="" />
            <span className="brand-name">Papertrail</span>
          </div>
          <div className="intro-copy">
            <p className="eyebrow">Secure account access</p>
            <h1>Every peso,<br />accounted for.</h1>
            <p className="intro-description">A clear record of funds received, money released, receipts submitted, and every decision made along the way.</p>
          </div>
          <div className="trust-note"><span className="trust-line"/><p>Built for responsible financial stewardship.</p></div>
        </aside>

        <div className="auth-content">
          <div className="mobile-brand">
            <img className="brand-mark" src="/papertrail-logo.png" alt="" />
            <span className="brand-name">Papertrail</span>
          </div>
          <nav className="auth-tabs" aria-label="Choose an access option">
            <label htmlFor="login-tab">Log in</label>
            <label htmlFor="register-tab">Register</label>
          </nav>

          {(error || success) && <p className={`auth-message ${error ? 'auth-message-error' : 'auth-message-success'}`} role={error ? 'alert' : 'status'}>{error || success}</p>}
          {!csrfToken && error && <button className="primary-button auth-retry" type="button" onClick={onRetry}>Retry connection</button>}

          <div className="form-panel login-panel">
            <div className="form-heading">
              <p className="eyebrow">Welcome back</p>
              <h2>Sign in to the ledger</h2>
              <p>Use your approved account credentials.</p>
            </div>
            <form className="auth-form" onSubmit={submitLogin}>
              <div className="field">
                <label htmlFor="login-email">Email address</label>
                <input id="login-email" name="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required type="email"/>
              </div>
              <div className="field">
                <label htmlFor="login-password">Password</label>
                <input id="login-password" name="password" autoComplete="current-password" maxLength={72} placeholder="Enter your password" required type="password"/>
              </div>
              <button className="primary-button" type="submit" disabled={busy || !csrfToken}>{busy ? 'Signing in…' : 'Log in'}</button>
            </form>
            <p className="switch-prompt">New to the ledger? <label htmlFor="register-tab">Create an account</label></p>
          </div>

          <div className="form-panel register-panel">
            <div className="form-heading">
              <p className="eyebrow">Account registration</p>
              <h2>Create your account</h2>
              <p>Your account will be available after Admin approval.</p>
            </div>
            <form className="auth-form" onSubmit={submitRegistration}>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="register-first-name">First name</label>
                  <input id="register-first-name" name="first_name" autoComplete="given-name" maxLength={80} required type="text"/>
                </div>
                <div className="field">
                  <label htmlFor="register-last-name">Last name</label>
                  <input id="register-last-name" name="last_name" autoComplete="family-name" maxLength={80} required type="text"/>
                </div>
              </div>
              <div className="field">
                <label htmlFor="register-email">Email address</label>
                <input id="register-email" name="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required type="email"/>
              </div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="register-password">Password</label>
                  <input id="register-password" name="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="At least 8 characters" required type="password"/>
                </div>
                <div className="field">
                  <label htmlFor="confirm-password">Confirm password</label>
                  <input id="confirm-password" name="confirm_password" autoComplete="new-password" minLength={8} maxLength={72} required type="password"/>
                </div>
              </div>
              <button className="primary-button" type="submit" disabled={busy || !csrfToken}>{busy ? 'Registering…' : 'Register'}</button>
            </form>
            <p className="switch-prompt">Already registered? <label htmlFor="login-tab">Return to login</label></p>
          </div>
          <p className="prototype-note">Registered accounts require Admin approval before access.</p>
        </div>
      </section>
    </main>);
}
