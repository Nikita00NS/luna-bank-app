import React, { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function Modal({ open, onClose, children, title }: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div onClick={e => e.stopPropagation()}
        className="relative w-full max-w-lg bg-[#0c0c0c] rounded-t-3xl animate-slide-up max-h-[90vh] overflow-y-auto border-t border-white/5">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-white/15" />
        </div>
        {title && <h3 className="text-lg font-bold px-6 pb-3 pt-1">{title}</h3>}
        <div className="px-6 pb-8">{children}</div>
      </div>
    </div>
  );
}
