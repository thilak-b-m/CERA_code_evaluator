import { useEffect, useId, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  icon: Icon,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = useId();

  const focusOption = (index) => {
    if (!options.length) return;
    const boundedIndex = Math.max(0, Math.min(index, options.length - 1));
    optionRefs.current[boundedIndex]?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
    };
  }, []);

  const selected = options.find((opt) => opt.value === value);
  const selectedIndex = options.findIndex((option) => option.value === value);

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    setIsOpen(true);
    const firstIndex = selectedIndex >= 0 ? selectedIndex : 0;
    requestAnimationFrame(() => focusOption(event.key === 'ArrowUp' ? (selectedIndex >= 0 ? selectedIndex : options.length - 1) : firstIndex));
  };

  const handleOptionKeyDown = (event, index) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption((index + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption((index - 1 + options.length) % options.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className="input-base flex w-full items-center justify-between gap-2 cursor-pointer px-3 text-sm"
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={selected?.label || placeholder}
        aria-expanded={isOpen}
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon && <Icon size={15} className="shrink-0 text-cera-muted" />}
          <span className={`truncate ${selected ? 'text-cera-text' : 'text-cera-muted'}`}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-cera-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id={listboxId}
            role="listbox"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-30 mt-1 w-full min-w-max bg-cera-elevated border border-cera-border rounded-lg shadow-xl max-h-60 overflow-y-auto py-1"
          >
            {options.map((opt, index) => (
              <button
                ref={(element) => { optionRefs.current[index] = element; }}
                key={opt.value}
                type="button"
                role="option"
                aria-selected={opt.value === value}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors duration-150 hover:bg-cera-card ${
                  opt.value === value ? 'text-cera-highlight bg-cera-card' : 'text-cera-text'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
