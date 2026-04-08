let _setMsg: ((m: string) => void) | null = null;
let timer: ReturnType<typeof setTimeout>;

export function toast(msg: string) {
  _setMsg?.(msg);
  clearTimeout(timer);
  timer = setTimeout(() => _setMsg?.(''), 2400);
}

import React, { useState, useEffect } from 'react';

export const ToastContainer: React.FC = () => {
  const [msg, setMsg] = useState('');
  useEffect(() => { _setMsg = setMsg; return () => { _setMsg = null; }; }, []);
  return (
    <div
      style={{ left: '50%' }}
      className={`
        fixed bottom-24 z-50 pointer-events-none
        -translate-x-1/2 transition-all duration-300
        ${msg
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2'
        }
      `}
    >
      <div className="bg-[var(--ink4)] border border-[var(--line2)] text-[var(--bright)]
        rounded-full px-4 py-2 text-xs font-medium whitespace-nowrap
        shadow-[0_6px_24px_rgba(0,0,0,.5)]">
        {msg}
      </div>
    </div>
  );
};
