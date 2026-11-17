import { useEffect, useRef, useState } from 'react';
// ─── Shared UI ────────────────────────────────────────────────────────────────
export function PageHeader({ title, sub }) {
    return (<div className="component-page-header">
      <h1 className="component-page-title">
        {title}
      </h1>
      {sub && <p className="component-page-subtitle">{sub}</p>}
    </div>);
}
export function Panel({ children, style }) {
    return (<div className="component-panel" style={style}>
      {children}
    </div>);
}
export function PanelHeader({ title, right }) {
    return (<div className="panel-header component-panel-header">
      <span className="component-panel-title">{title}</span>
      {right && <span className="component-panel-caption">{right}</span>}
    </div>);
}
export function StatusDot({ status }) {
    const statusClassNames = {
        'Awaiting receipt': 'component-status-dot--review',
        'For review': 'component-status-dot--review',
        'Flagged': 'component-status-dot--flagged',
        'Receipt overdue': 'component-status-dot--overdue',
        'Archived': 'component-status-dot--archived',
        'Approved': 'component-status-dot--approved',
    };
    return <span className={`component-status-dot ${statusClassNames[status] ?? ''}`}/>;
}
export function DeadlineBar({ label, pct, overdue }) {
    return (<div className={`component-deadline${overdue ? ' is-overdue' : ''}`}>
      <div className="component-deadline-label">{label}</div>
      <div className="component-deadline-track">
        <div className="component-deadline-progress" style={{ '--component-deadline-pct': `${pct}%` }}/>
      </div>
    </div>);
}
export function ApiField({ label, name, id = name, type = 'text', placeholder, required = true, min, step, defaultValue, hint, }) {
    return (<div>
      <label className="component-field-label" htmlFor={id}>{label}</label>
      <input className="component-field-input" id={id} name={name} type={type} placeholder={placeholder} required={required} min={min} step={step} defaultValue={defaultValue}/>
      {hint && <p className="component-field-hint">{hint}</p>}
    </div>);
}
export function ProofUpload({ id = 'proof', label = 'Proof of payment (optional)', accept = 'image/jpeg,image/png,image/webp', formats = 'JPEG, PNG, or WebP', }) {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState('');
    useEffect(() => {
        const form = inputRef.current?.form;
        const clearPreview = () => setPreview('');
        form?.addEventListener('reset', clearPreview);
        return () => form?.removeEventListener('reset', clearPreview);
    }, []);
    useEffect(() => {
        if (!preview)
            return undefined;
        // Release the temporary browser URL when the selected file changes or the form unmounts.
        return () => URL.revokeObjectURL(preview);
    }, [preview]);
    return (<div>
      <label className="component-field-label" htmlFor={id}>{label}</label>
      <input className="component-field-input component-file-input" ref={inputRef} id={id} name="proof" type="file" accept={accept} onChange={event => setPreview(event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : '')}/>
      <div className="component-proof-preview">
        {preview
            ? <><img src={preview} alt="Selected proof preview" className="component-proof-thumbnail"/><span>Image preview</span></>
            : <span>No proof image selected. {formats}; maximum 5 MB.</span>}
      </div>
    </div>);
}
export function Modal({ title, onClose, children, width = 720, }) {
    return (<div className="modal-backdrop component-modal-backdrop" role="presentation" onClick={onClose} style={{ '--component-modal-z-index': 1100 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="app-modal-title" onClick={event => event.stopPropagation()} className="app-modal component-modal" style={{ '--component-modal-width': `${width}px` }}>
        <div className="component-modal-header">
          <h2 id="app-modal-title" className="component-modal-title">{title}</h2>
          <button type="button" className="component-modal-close" onClick={onClose} aria-label="Close dialog">Close</button>
        </div>
        {children}
      </section>
    </div>);
}
export function ProofModal({ transaction, kind = 'fund', onClose, zIndex = 1000, }) {
    const [imageFailed, setImageFailed] = useState(false);
    if (!transaction)
        return null;
    const isReceipt = kind === 'receipt';
    const hasProof = Number(isReceipt ? transaction.has_receipt_proof : transaction.has_proof) === 1;
    const name = (isReceipt ? transaction.purpose : transaction.source_name) || '';
    const fileName = isReceipt ? transaction.receipt_proof_name : transaction.proof_name;
    const proofUrl = isReceipt
        ? `/api.php?action=receipt-proof&id=${encodeURIComponent(transaction.id)}`
        : `/api.php?action=proof&id=${encodeURIComponent(transaction.id)}`;
    return (<div className="modal-backdrop component-modal-backdrop" role="presentation" onClick={onClose} style={{ '--component-modal-z-index': zIndex }}>
      <section role="dialog" aria-modal="true" aria-labelledby="proof-modal-title" onClick={event => event.stopPropagation()} className="app-modal component-modal component-modal--proof" style={{ '--component-modal-width': '760px' }}>
        <div className="component-modal-header component-modal-header--start">
          <div>
            <h2 id="proof-modal-title" className="component-modal-title">{isReceipt ? 'Receipt proof' : 'Proof of payment'}</h2>
            <div className="component-proof-meta">{name} · {fileName || 'No file name'}</div>
          </div>
          <button type="button" className="component-modal-close" onClick={onClose} aria-label="Close proof preview">Close</button>
        </div>
        {hasProof && !imageFailed
            ? <img src={proofUrl} alt={`${isReceipt ? 'Receipt' : 'Payment'} proof for ${name}`} onError={() => setImageFailed(true)} className="component-proof-image"/>
            : <div className="component-proof-empty">
              {imageFailed ? 'The proof image could not be loaded. Check that the stored file is available.' : `No ${isReceipt ? 'receipt ' : ''}proof image was uploaded for this transaction.`}
            </div>}
      </section>
    </div>);
}
export function EmptyState({ children = 'No records yet.' }) {
    return <div className="component-empty-state">{children}</div>;
}
