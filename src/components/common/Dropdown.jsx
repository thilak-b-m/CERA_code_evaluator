import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const openByGroup = new Map();
function registerOpen(groupKey, close) {
  const prev = openByGroup.get(groupKey);
  if (prev && prev !== close) prev.close();
  openByGroup.set(groupKey, close);
  return () => { if (openByGroup.get(groupKey) === close) openByGroup.delete(groupKey); };
}

export default function Dropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  icon: Icon,
  className = '',
  group,
}) {
  const groupKey = group || '__global__';
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const [anchorRect, setAnchorRect] = useState(null);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);
  const listboxId = useId();
  const close = useCallback(() => setIsOpen(false), []);
  const focusOption = (index) => {
    if (!options.length) return;
    const boundedIndex = Math.max(0, Math.min(index, options.length - 1));
    optionRefs.current[boundedIndex]?.focus();
  };

  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setAnchorRect(rect);
    setMenuStyle({ position: 'fixed', zIndex: 50, top: rect.bottom + 8, left: rect.left, width: rect.width });
    return registerOpen(groupKey, close);
  }, [isOpen, groupKey, close]);

  useEffect(() => {
    if (!isOpen || !menuRef.current || !anchorRect) return;
    const menuRect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, margin = 8;
    let top = anchorRect.top, left = anchorRect.left, width = anchorRect.width;
    const belowSpace = vh - anchorRect.bottom - margin;
    const aboveSpace = anchorRect.top - margin;
    if (menuRect.height > belowSpace && aboveSpace > belowSpace) top = anchorRect.top - menuRect.height - margin;
    else top = anchorRect.bottom + margin;
    if (left + width > vw - margin) left = vw - width - margin;
    if (left < margin) left = margin;
    top = Math.max(margin, Math.min(top, vh - menuRect.height - margin));
    setMenuStyle({ position: 'fixed', zIndex: 50, top, left, width: Math.max(width, 160) });
  }, [isOpen, anchorRect]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const inWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const inMenu = menuRef.current && menuRef.current.contains(e.target);
      if (!inWrap && !inMenu) setIsOpen(false);
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const selected = options.find((opt) => opt.value === value);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const handleTriggerKeyDown = (event) => {
    if (event.key === 'Escape' && isOpen) { event.preventDefault(); setIsOpen(false); triggerRef.current?.focus(); return; }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault(); setIsOpen(true);
    const firstIndex = selectedIndex >= 0 ? selectedIndex : 0;
    requestAnimationFrame(() => focusOption(event.key === 'ArrowUp' ? (selectedIndex >= 0 ? selectedIndex : options.length - 1) : firstIndex));
  };
  const handleOptionKeyDown = (event, index) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); focusOption((index + 1) % options.length); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); focusOption((index - 1 + options.length) % options.length); }
    else if (event.key === 'Home') { event.preventDefault(); focusOption(0); }
    else if (event.key === 'End') { event.preventDefault(); focusOption(options.length - 1); }
    else if (event.key === 'Escape') { event.preventDefault(); setIsOpen(false); triggerRef.current?.focus(); }
  };
  const handleSelect = (opt) => { onChange(opt.value); setIsOpen(false); triggerRef.current?.focus(); };

  return (
    <div ref={wrapRef} className={className}>
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
        <ChevronDown size={16} className={`shrink-0 text-cera-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          createPortal(
            <motion.div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              style={menuStyle}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="mt-1 bg-cera-elevated border border-cera-border rounded-lg shadow-xl max-h-60 overflow-y-auto py-1"
            >
              {options.map((opt, index) => (
                <button
                  ref={(element) => { optionRefs.current[index] = element; }}
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  onKeyDown={(event) => handleOptionKeyDown(event, index)}
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors duration-150 hover:bg-cera-card ${
                    opt.value === value ? 'text-cera-highlight bg-cera-card' : 'text-cera-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>,
            document.body
          )
        )}
      </AnimatePresence>
    </div>
  );
}
