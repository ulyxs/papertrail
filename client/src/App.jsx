import { useEffect, useRef, useState } from 'react';
import './App.css';
import './pages.css';
import './components/components.css';
import './login.css';
import { c } from './config/theme';
import AuthPage from './components/AuthPage';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import { ROLE_PAGES } from './config/navigation';
import { loadAuthState, loadDashboard, postAction, postAuthAction } from './services/api';
import OverviewPage from './pages/OverviewPage';
import FundsPage from './pages/FundsPage';
import DisbursementsPage from './pages/DisbursementsPage';
import ReleasePage from './pages/ReleasePage';
import LiquidationPage from './pages/LiquidationPage';
import ReviewPage from './pages/ReviewPage';
import ArchivePage from './pages/ArchivePage';
import PersonnelPage from './pages/PersonnelPage';
import AuditPage from './pages/AuditPage';
import AccountManagementPage from './pages/AccountManagementPage';

function getPageFromHash() {
    return window.location.hash.slice(2) || 'overview';
}

export default function App() {
    const [page, setPage] = useState(getPageFromHash);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [csrfToken, setCsrfToken] = useState('');
    const [authBusy, setAuthBusy] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authSuccess, setAuthSuccess] = useState('');
    const [dashboard, setDashboard] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const initialAuthRequest = useRef(null);
    useEffect(() => {
        const syncPageFromHash = () => setPage(getPageFromHash());
        window.addEventListener('hashchange', syncPageFromHash);
        return () => window.removeEventListener('hashchange', syncPageFromHash);
    }, []);
    useEffect(() => {
        let active = true;
        const authRequest = initialAuthRequest.current ?? loadAuthState();
        initialAuthRequest.current = authRequest;
        async function initialize() {
            try {
                const session = await authRequest;
                if (!active)
                    return;
                setCsrfToken(session.csrf_token);
                setUser(session.user);
                if (session.user) {
                    try {
                        setDashboard(await loadDashboard());
                    }
                    catch (loadError) {
                        if (loadError.status === 401) {
                            setUser(null);
                            setAuthError('Your session has ended. Please sign in again.');
                            const anonymousSession = await loadAuthState();
                            setCsrfToken(anonymousSession.csrf_token);
                        }
                        else {
                            setError(loadError.message);
                        }
                    }
                }
            }
            catch (loadError) {
                if (active)
                    setAuthError(loadError.message);
            }
        }
        initialize();
        return () => { active = false; };
    }, []);
    useEffect(() => {
        if (!sidebarOpen)
            return undefined;
        const closeOnEscape = (event) => {
            if (event.key === 'Escape')
                setSidebarOpen(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [sidebarOpen]);
    async function handleLogin(values) {
        setAuthBusy(true);
        setAuthError('');
        setAuthSuccess('');
        try {
            const result = await postAuthAction('login', values, csrfToken);
            if (!result.user || !result.csrf_token) {
                throw new Error('The login response was incomplete. Please try again.');
            }
            setCsrfToken(result.csrf_token);
            setUser(result.user);
            goToPage('overview');
            setError('');
            setSuccess('');
            try {
                setDashboard(await loadDashboard());
            }
            catch (loadError) {
                setDashboard(null);
                if (loadError.status === 401) {
                    setUser(null);
                    await retryAuthentication();
                    setAuthError('Your session has ended. Please sign in again.');
                }
                else {
                    setError(loadError.message);
                }
            }
        }
        catch (loginError) {
            if (loginError.status === 401) {
                setUser(null);
                setDashboard(null);
            }
            setAuthError(loginError.message);
        }
        finally {
            setAuthBusy(false);
        }
    }
    async function handleRegister(values) {
        setAuthBusy(true);
        setAuthError('');
        setAuthSuccess('');
        try {
            await postAuthAction('register', values, csrfToken);
            setAuthSuccess('Registration submitted. Your account is pending Admin approval before you can sign in.');
            return true; 
        }
        catch (registrationError) {
            setAuthError(registrationError.message);
            return false;
        }
        finally {
            setAuthBusy(false);
        }
    }
    async function retryAuthentication() {
        setAuthError('');
        try {
            const session = await loadAuthState();
            setCsrfToken(session.csrf_token);
            setUser(session.user);
            if (session.user) {
                try {
                    setDashboard(await loadDashboard());
                    setError('');
                }
                catch (loadError) {
                    if (loadError.status === 401) {
                        setUser(null);
                        setAuthError(loadError.message);
                    }
                    else {
                        setError(loadError.message);
                    }
                }
            }
        }
        catch (loadError) {
            setAuthError(loadError.message);
        }
    }
    async function handleLogout() {
        setBusy(true);
        setError('');
        try {
            await postAuthAction('logout', {}, csrfToken);
            setUser(null);
            setDashboard(null);
            goToPage('overview');
            setSuccess('');
            setAuthError('');
            try {
                const session = await loadAuthState();
                setCsrfToken(session.csrf_token);
            }
            catch (sessionError) {
                setCsrfToken('');
                setAuthError(`You have been logged out. ${sessionError.message}`);
            }
        }
        catch (logoutError) {
            if (logoutError.status === 401) {
                setUser(null);
                setDashboard(null);
                await retryAuthentication();
            }
            else {
                setError(logoutError.message);
            }
        }
        finally {
            setBusy(false);
        }
    }
    const role = user?.role ?? 'User';
    const allowedPages = ROLE_PAGES[role];
    const currentPage = allowedPages.includes(page) ? page : 'overview';
    useEffect(() => {
        if (user && !allowedPages.includes(page)) {
            goToPage('overview');
        }
    }, [user, allowedPages, page]);
    function goToPage(nextPage) {
        setPage(nextPage);
        const nextHash = `#/${nextPage}`;
        if (window.location.hash !== nextHash) {
            window.location.hash = nextHash;
        }
    }
    function navigate(nextPage) {
        if (allowedPages.includes(nextPage)) {
            goToPage(nextPage);
            setSidebarOpen(false);
            setError('');
            setSuccess('');
        }
    }
    async function handleSessionExpired(message) {
        setUser(null);
        setDashboard(null);
        goToPage('overview');
        setAuthError(message);
        try {
            const session = await loadAuthState();
            setCsrfToken(session.csrf_token);
            setAuthError(message);
        }
        catch (sessionError) {
            setCsrfToken('');
            setAuthError(`${message} ${sessionError.message}`);
        }
    }
    async function handleSubmit(action, values) {
        setBusy(true);
        setError('');
        setSuccess('');
        try {
            const result = await postAction(action, values, csrfToken);
            setSuccess(result.voucher_number ? `Funds released as ${result.voucher_number}.` : 'Your change has been saved.');
            try {
                setDashboard(await loadDashboard());
            }
            catch (refreshError) {
                if (refreshError.status === 401)
                    handleSessionExpired(refreshError.message);
                else
                    setError(`Saved successfully, but the latest ledger could not be loaded: ${refreshError.message}`);
            }
            return true;
        }
        catch (submitError) {
            if (submitError.status === 401)
                handleSessionExpired(submitError.message);
            else
                setError(submitError.message);
            return false;
        }
        finally {
            setBusy(false);
        }
    }
    async function handleReview(action, values) {
        setBusy(true);
        setError('');
        setSuccess('');
        try {
            await postAction(action, values, csrfToken);
            setSuccess(values.decision === 'approve' ? 'The transaction was approved.' : values.decision === 'resolve' ? 'The flagged transaction was resolved.' : 'The discrepancy was flagged.');
            try {
                setDashboard(await loadDashboard());
            }
            catch (refreshError) {
                if (refreshError.status === 401)
                    handleSessionExpired(refreshError.message);
                else
                    setError(`Saved successfully, but the latest ledger could not be loaded: ${refreshError.message}`);
            }
            return true;
        }
        catch (reviewError) {
            if (reviewError.status === 401)
                handleSessionExpired(reviewError.message);
            else
                setError(reviewError.message);
            return false;
        }
        finally {
            setBusy(false);
        }
    }
    if (!user) {
        return <AuthPage csrfToken={csrfToken} busy={authBusy} error={authError} success={authSuccess} onLogin={handleLogin} onRegister={handleRegister} onRetry={retryAuthentication}/>;
    }
    const pageContent = !dashboard
        ? <div style={{ color: c.muted }}>{error ? 'Ledger data is unavailable.' : 'Loading ledger…'}</div>
        : {
            overview: <OverviewPage dashboard={dashboard}/>,
            funds: <FundsPage dashboard={dashboard} onSubmit={handleSubmit} busy={busy} actor={`${user.first_name} ${user.last_name}`} canManage={['Treasurer', 'Admin'].includes(role)}/>,
            disbursements: <DisbursementsPage dashboard={dashboard}/>,
            release: <ReleasePage dashboard={dashboard} onSubmit={handleSubmit} busy={busy} actor={`${user.first_name} ${user.last_name}`}/>,
            liquidation: <LiquidationPage dashboard={dashboard} onSubmit={handleSubmit} busy={busy} actor={`${user.first_name} ${user.last_name}`} canSubmitReceipt={['Treasurer', 'Admin'].includes(role)}/>,
            review: <ReviewPage dashboard={dashboard} onSubmit={handleReview} busy={busy} actor={`${user.first_name} ${user.last_name}`}/>,
            archive: <ArchivePage dashboard={dashboard}/>,
            personnel: <PersonnelPage dashboard={dashboard}/>,
            audit: <AuditPage dashboard={dashboard}/>,
            accounts: <AccountManagementPage accounts={dashboard.accounts} onSubmit={handleSubmit} busy={busy} currentUser={user}/>,
        }[currentPage];
    return (<div className="app-shell" style={{ minHeight: '100vh', background: c.bg }}>
      <Navbar account={user} sidebarOpen={sidebarOpen} busy={busy} onToggleSidebar={() => setSidebarOpen(isOpen => !isOpen)} onLogout={handleLogout}/>

      <div className="app-body">
        <button type="button" className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`} aria-label="Close navigation menu" tabIndex={sidebarOpen ? 0 : -1} onClick={() => setSidebarOpen(false)}/>
        <Sidebar page={currentPage} onNavigate={navigate} summary={dashboard?.summary} role={role} open={sidebarOpen}/>
        <main className="main">
          {error && <div role="alert" style={{ marginBottom: 16, padding: '12px 16px', background: '#fdf2f2', border: '1px solid #e8c4c4', borderRadius: 4, color: c.overdue }}>
            {error}
            {!dashboard && <button type="button" onClick={async () => {
                    setError('');
                    try {
                        setDashboard(await loadDashboard());
                    }
                    catch (loadError) {
                        if (loadError.status === 401)
                            handleSessionExpired(loadError.message);
                        else
                            setError(loadError.message);
                    }
                }} style={{ marginLeft: 12, border: 'none', background: 'transparent', color: c.link, cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>}
          </div>}
          {success && <div role="status" style={{ marginBottom: 16, padding: '12px 16px', background: '#eff8f0', border: '1px solid #b7d8bd', borderRadius: 4, color: c.greenBar }}>{success}</div>}
          {pageContent}
        </main>
      </div>
    </div>);
}
