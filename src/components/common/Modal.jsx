import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const previousFocus = document.activeElement;
      const dialog = dialogRef.current;
      const focusable = dialog?.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      (focusable?.[0] || dialog)?.focus();

      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          onCloseRef.current();
          return;
        }
        if (event.key !== 'Tab' || !dialog) return;
        const currentFocusable = dialog.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        );
        if (!currentFocusable.length) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        const first = currentFocusable[0];
        const last = currentFocusable[currentFocusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
        previousFocus?.focus?.();
      };
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      if (!isOpen) document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`relative w-full ${sizes[size]} bg-cera-card border border-cera-border rounded-xl shadow-2xl`}
          >
            <div className="flex items-center justify-between p-5 border-b border-cera-border">
              <h3 id={titleId} className="text-lg font-semibold text-cera-text">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Close ${title}`}
                className="text-cera-muted hover:text-cera-text transition-colors p-1 rounded-lg hover:bg-cera-elevated"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
