import { useEffect, useRef, useState } from 'react';
import { c } from '../config/theme';
// ─── Shared UI ────────────────────────────────────────────────────────────────
export function PageHeader({ title, sub }) {
    return (<div style={{ marginBottom: 28 }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: c.text, margin: 0, lineHeight: 1.2 }}>
        {title}
      </h1>
      {sub && <p style={{ color: c.muted, marginTop: 8, lineHeight: 1.5, maxWidth: 560, fontSize: 13 }}>{sub}</p>}
    </div>);
}
export function Panel({ children, style }) {
    return (<div style={{
            background: c.white,
            border: `1px solid ${c.border}`,
            borderRadius: 6,
            marginBottom: 20,
            ...style,
        }}>
      {children}
    </div>);
}
export function PanelHeader({ title, right }) {
    return (<div className="panel-header" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: `1px solid ${c.border}`,
        }}>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400, color: c.text }}>{title}</span>
      {right && <span style={{ fontSize: 12, color: c.muted }}>{right}</span>}
    </div>);
}
export function StatusDot({ status }) {
    const styles = {
        'Awaiting receipt': { background: c.review, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
        'For review': { background: c.review, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
        'Flagged': { background: 'transparent', border: `1.5px solid ${c.flagged}`, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
        'Receipt overdue': { background: c.overdue, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
        'Archived': { background: c.faint, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
        'Approved': { background: c.greenBar, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
    };
    return <span style={styles[status] ?? { display: 'inline-block', width: 10, height: 10, marginRight: 6 }}/>;
}
export function DeadlineBar({ label, pct, overdue }) {
    return (<div>
      <div style={{ fontSize: 12, color: overdue ? c.overdue : c.text, fontWeight: overdue ? 500 : 400, marginBottom: 4 }}>{label}</div>
      <div style={{ height: 4, background: c.borderLight, borderRadius: 2, width: 120 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: overdue ? c.redBar : c.greenBar, borderRadius: 2 }}/>
      </div>
    </div>);
}
export function ApiField({ label, name, id = name, type = 'text', placeholder, required = true, min, step, defaultValue, hint, }) {
    return (<div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>{label}</label>
      <input id={id} name={name} type={type} placeholder={placeholder} required={required} min={min} step={step} defaultValue={defaultValue} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}/>
      {hint && <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{hint}</p>}
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
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>{label}</label>
      <input ref={inputRef} id={id} name="proof" type="file" accept={accept} onChange={event => setPreview(event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : '')} style={{ width: '100%', padding: 8, border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}/>
      <div style={{ minHeight: 52, marginTop: 8, padding: 8, border: `1px dashed ${c.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 12, color: c.muted, fontSize: 12 }}>
        {preview
            ? <><img src={preview} alt="Selected proof preview" style={{ maxWidth: 100, maxHeight: 72, objectFit: 'contain' }}/><span>Image preview</span></>
            : <span>No proof image selected. {formats}; maximum 5 MB.</span>}
      </div>
    </div>);
}
export function Modal({ title, onClose, children, width = 720, }) {
    return (<div className="modal-backdrop" role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(10, 20, 35, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="app-modal-title" onClick={event => event.stopPropagation()} className="app-modal" style={{ width: `min(${width}px, 100%)`, maxHeight: '90vh', overflow: 'auto', padding: 20, borderRadius: 6, background: c.white, border: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <h2 id="app-modal-title" style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: c.text }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 10px', background: c.surface, color: c.text, cursor: 'pointer' }}>Close</button>
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
    return (<div className="modal-backdrop" role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex, background: 'rgba(10, 20, 35, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="proof-modal-title" onClick={event => event.stopPropagation()} className="app-modal" style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflow: 'auto', padding: 20, borderRadius: 6, background: c.white, border: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16, marginBottom: 16 }}>
          <div>
            <h2 id="proof-modal-title" style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>{isReceipt ? 'Receipt proof' : 'Proof of payment'}</h2>
            <div style={{ marginTop: 4, color: c.muted, fontSize: 12 }}>{name} · {fileName || 'No file name'}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close proof preview" style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 10px', background: c.surface, color: c.text, cursor: 'pointer' }}>Close</button>
        </div>
        {hasProof && !imageFailed
            ? <img src={proofUrl} alt={`${isReceipt ? 'Receipt' : 'Payment'} proof for ${name}`} onError={() => setImageFailed(true)} style={{ display: 'block', maxWidth: '100%', maxHeight: '68vh', margin: '0 auto', objectFit: 'contain' }}/>
            : <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', padding: 24, border: `1px dashed ${c.border}`, borderRadius: 4, color: c.muted, textAlign: 'center' }}>
              {imageFailed ? 'The proof image could not be loaded. Check that the stored file is available.' : `No ${isReceipt ? 'receipt ' : ''}proof image was uploaded for this transaction.`}
            </div>}
      </section>
    </div>);
}
export function EmptyState({ children = 'No records yet.' }) {
    return <div style={{ padding: 20, color: c.muted, fontSize: 13 }}>{children}</div>;
}
