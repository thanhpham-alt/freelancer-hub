import Modal from './Modal';

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Xác nhận', 
  message, 
  confirmText = 'Xác nhận', 
  cancelText = 'Hủy',
  variant = 'danger' 
}) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      size="sm" 
      footer={
        <>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>{cancelText}</button>
          <button className={`btn btn-${variant} btn-sm`} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</button>
        </>
      }
    >
      <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', lineHeight: 1.5 }}>
        {message}
      </p>
    </Modal>
  );
}
