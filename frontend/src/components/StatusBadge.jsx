const MAP = {
  green:      'badge-green',
  amber:      'badge-amber',
  orange:     'badge-orange',
  red:        'badge-red',
  grey:       'badge-grey',
  blue:       'badge-blue',
  navy:       'badge-navy',
  'green-dark': 'badge-green',
};

const DOT = {
  green:  'bg-g-500',
  amber:  'bg-amber-500',
  orange: 'bg-orange-500',
  red:    'bg-red-500',
  grey:   'bg-slate-400',
  blue:   'bg-blue-500',
};

export default function StatusBadge({ label, colour, dot = false }) {
  const cls = MAP[colour] || 'badge-grey';
  return (
    <span className={cls}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${DOT[colour] || 'bg-slate-400'}`} />}
      {label}
    </span>
  );
}
