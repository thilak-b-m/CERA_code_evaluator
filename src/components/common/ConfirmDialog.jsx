import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary' }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Confirm Action'} size="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-14 h-14 rounded-full bg-cera-warning/10 flex items-center justify-center mb-4">
          <AlertTriangle size={28} className="text-cera-warning" />
        </div>
        <p className="text-cera-muted text-sm mb-6">{message}</p>
        <div className="flex gap-3 w-full">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={variant} className="flex-1" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
