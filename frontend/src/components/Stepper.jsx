export default function Stepper({ current = 1 }) {
  const steps = [
    { n: 1, label: 'Data Load' },
    { n: 2, label: 'Upload Summary' },
    { n: 3, label: 'Readiness Results' },
  ];
  return (
    <div className="flex items-center gap-1 px-6 py-3 bg-white border-b border-slate-100">
      {steps.map((s, i) => {
        const isActive = s.n === current;
        const isDone   = s.n < current;
        return (
          <div key={s.n} className="flex items-center gap-1">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all
              ${isActive ? 'bg-g-500 text-white shadow-sm' : isDone ? 'bg-g-100 text-g-700' : 'text-slate-400'}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold
                ${isActive ? 'bg-white/20' : isDone ? 'bg-g-200 text-g-700' : 'bg-slate-200 text-slate-500'}`}>
                {isDone ? '✓' : s.n}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <svg className={`w-4 h-4 mx-0.5 ${isDone ? 'text-g-400' : 'text-slate-200'}`} fill="none" viewBox="0 0 16 16">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}
