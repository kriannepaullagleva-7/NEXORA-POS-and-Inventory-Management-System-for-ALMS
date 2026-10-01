// ─── Formatters & Utility Functions ──────────────────────────────────────────

export const fmt = {
  peso: (v: number) => `₱${(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  date: (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return d;
    }
  },
  datetime: (d: string) => {
    try {
      return new Date(d).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
      return d;
    }
  },
  shortDate: (d: string) => {
    try {
      return new Date(d.split(' ')[0]).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
    } catch {
      return d;
    }
  },
};
