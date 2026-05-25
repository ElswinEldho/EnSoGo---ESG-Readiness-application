import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { useUpload } from '../lib/uploadContext.jsx';
import { sectorName } from '../lib/sectors.js';
import {
  IconHome, IconUser, IconLogout, IconSettings,
  IconGovernance, IconSummary, IconReadiness,
} from './SidebarIcons.jsx';

function NavItem({ icon, label, onClick, active, number, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? 'Upload at least one data file to unlock this step' : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group
        ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
        ${active && !disabled ? 'text-white' : !disabled ? 'hover:text-white' : ''}`}
      style={
        active && !disabled
          ? { background: 'rgba(255,255,255,0.22)', boxShadow: '0 1px 6px rgba(0,0,0,0.12)' }
          : !disabled
          ? { color: 'rgba(255,255,255,0.7)' }
          : { color: 'rgba(255,255,255,0.3)' }
      }
    >
      {number != null && (
        <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
              style={active && !disabled
                ? { background: 'rgba(255,255,255,0.95)', color: '#0284c7' }
                : { background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.7)' }}>
          {number}
        </span>
      )}
      {!number && (
        <span className="shrink-0"
              style={{ color: active && !disabled ? 'white' : 'rgba(255,255,255,0.6)' }}>
          {icon}
        </span>
      )}
      <span className="truncate">{label}</span>
      {active && !disabled && <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.8)' }} />}
      {disabled && (
        <span className="ml-auto shrink-0 text-slate-600">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ assessmentId }) {
  const { user, logout } = useAuth();
  const { hasUpload } = useUpload();
  const nav = useNavigate();
  const loc = useLocation();
  const path = loc.pathname;
  const wfActive = (seg) => assessmentId && path.includes(seg);
  const uploadReady = assessmentId ? hasUpload(assessmentId) : false;

  return (
    <aside className="w-[200px] shrink-0 flex flex-col h-screen sticky top-0 overflow-y-auto"
           style={{
             background: 'linear-gradient(160deg, #0369a1 0%, #0284c7 40%, #0ea5e9 100%)',
             borderRight: '1px solid rgba(255,255,255,0.12)',
             position: 'relative',
             // overflow:hidden clips the decorative orbs that sit at top:-40px and
             // right:-40px — without this the orbs paint outside the sidebar bounds
             // and any layout change that moves the sidebar causes viewport CLS.
             overflow: 'hidden',
           }}>
      {/* Subtle decorative orbs matching login page */}
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '120px', left: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none', zIndex: 0 }} />

      <div className="px-4 py-3 relative z-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="flex items-center gap-2.5">
          {/* width/height HTML attributes reserve the 40×40 box before CSS
              loads, preventing image-load CLS in the sidebar header */}
          <img src="/EnSoGo%20Logo.png" alt="EnSoGo"
               width="40" height="40"
               className="w-10 h-10 rounded-xl shrink-0 object-cover"
               style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }} />
          <div>
            <div className="text-[13px] font-bold text-white leading-none tracking-tight">EnSoGo</div>
            <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Readiness Suite</div>
          </div>
        </div>
        {/* Fixed-height block: always reserves the same vertical space whether
            user data is available or not.  Without this, the nav items below
            shift down when the /auth/me rehydration fires setUser(), causing
            a large CLS hit for every authenticated page load. */}
        <div className="mt-3 px-1" style={{ minHeight: '32px' }}>
          {user && (
            <>
              <div className="text-[11px] text-white/80 truncate">{user.organizationName}</div>
              <div className="text-[10px] text-white/45 truncate">{sectorName(user.sectorCode)}</div>
            </>
          )}
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 relative z-10">
        <div className="px-2 mb-1.5 mt-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Workflow</span>
        </div>
        <NavItem icon={<IconHome />} label="Dashboard" number={null}
          onClick={() => nav('/')} active={path === '/'} />
        {assessmentId && (
          <>
            <NavItem number="1" label="Data Load"
              onClick={() => nav(`/assessment/${assessmentId}/data-load`)}
              active={wfActive('data-load')} />
            <NavItem icon={<IconSummary />} label="Summary"
              onClick={() => nav(`/assessment/${assessmentId}/summary`)}
              active={wfActive('summary')}
              disabled={!uploadReady} />
            <NavItem icon={<IconReadiness />} label="Readiness"
              onClick={() => nav(`/assessment/${assessmentId}/readiness`)}
              active={wfActive('readiness')}
              disabled={!uploadReady} />
            <NavItem icon={<IconGovernance />} label="Governance"
              onClick={() => nav(`/assessment/${assessmentId}/governance`)}
              active={wfActive('governance')} />
          </>
        )}

        <div className="px-2 mb-1.5 mt-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Reference</span>
        </div>
        <NavItem icon={<IconSettings />} label="Guidelines"
          onClick={() => nav('/brd-guidelines')} active={path.includes('brd-guidelines')} />

        <div className="px-2 mb-1.5 mt-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(255,255,255,0.45)' }}>Account</span>
        </div>
        <NavItem icon={<IconUser />} label="Profile"
          onClick={() => nav('/org-profile?edit=1')} active={path.includes('org-profile')} />
        <NavItem icon={<IconLogout />} label="Log Out"
          onClick={async () => { await logout(); nav('/login'); }} active={false} />
      </nav>

      {assessmentId && (
        <div className="mx-2 mb-3 p-3 rounded-xl relative z-10"
             style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.18)' }}>
          <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Status</div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-g-400 animate-pulse" />
            <span className="text-[11px] text-white/80">Live</span>
          </div>
        </div>
      )}
    </aside>
  );
}
