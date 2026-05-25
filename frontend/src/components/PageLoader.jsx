// Minimal loading fallback — invisible spinner so no layout shift occurs.
// Used by Suspense boundaries around all lazy-loaded routes.
export default function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px' }}>
      <div style={{ width: '28px', height: '28px', border: '3px solid #e0f2fe', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'app-spin 0.65s linear infinite' }} />
      <style>{`@keyframes app-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
