import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const handle = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative animate-scale-in" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center text-gray-700 transition-colors">
          <span className="text-lg">&times;</span>
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
