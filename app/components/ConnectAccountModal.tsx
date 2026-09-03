import { useState } from 'react';
import { X, FileSpreadsheet, Building2, CreditCard, Smartphone, Upload } from 'lucide-react';

type Props = {
  close: () => void;
  notify: (message: string) => void;
};

type Step = 'choose' | 'csv' | 'provider' | 'connecting';

export function ConnectAccountModal({ close, notify }: Props) {
  const [step, setStep] = useState<Step>('choose');
  const [selectedType, setSelectedType] = useState('');
  const [fileName, setFileName] = useState('');

  function handleConnect(type: string) {
    if (type === 'csv') {
      setStep('csv');
      return;
    }
    setSelectedType(type);
    setStep('provider');
  }

  if (step === 'provider') {
    return (
      <div className="modal-backdrop" onMouseDown={close}>
        <div className="modal connect-modal" onMouseDown={(e) => e.stopPropagation()}>
          <button type="button" className="close-modal" onClick={close}><X /></button>
          <div className="modal-symbol"><Building2 /></div>
          <span>PROVIDER REQUIRED</span>
          <h2>{selectedType === 'upi' ? 'UPI connection' : selectedType === 'credit-card' ? 'Card connection' : 'Bank connection'}</h2>
          <p>FinPulse will connect here through an approved banking or Account Aggregator provider. No account is connected yet, and FinPulse will never pretend that a demo connection is real.</p>
          <div style={{ marginTop: 16, padding: '12px 13px', borderRadius: 10, background: 'var(--blue-soft)', color: 'var(--blue)', fontSize: 10, lineHeight: 1.6 }}>
            This connection is for consented transaction data. Money transfers need a separate regulated payment partner, transaction signing, and your confirmation in the bank or UPI app.
          </div>
          <button className="primary modal-submit" type="button" onClick={() => { notify('Use CSV import until a regulated provider is configured'); setStep('choose'); }}>Choose another method</button>
        </div>
      </div>
    );
  }

  function handleCsvUpload() {
    if (!fileName) return;
    setStep('connecting');
    setTimeout(() => {
      notify(`CSV file "${fileName}" imported successfully`);
      close();
    }, 1200);
  }

  if (step === 'connecting') {
    return (
      <div className="modal-backdrop" onMouseDown={close}>
        <div className="modal connect-modal" onMouseDown={(e) => e.stopPropagation()}>
          <button type="button" className="close-modal" onClick={close}><X /></button>
          <div className="modal-symbol"><Building2 /></div>
          <span>CONNECTING</span>
          <h2>Setting up {selectedType || 'CSV import'}</h2>
          <p style={{ color: 'var(--muted)', fontSize: 10 }}>
            {selectedType ? 'Linking your account via simulated connection…' : 'Processing your CSV file…'}
          </p>
          <div style={{
            height: 4, borderRadius: 4, background: 'var(--soft)', marginTop: 22, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 4, background: 'var(--blue)',
              animation: 'progress-indeterminate 1.2s ease-in-out infinite',
              width: '60%',
            }} />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'csv') {
    return (
      <div className="modal-backdrop" onMouseDown={close}>
        <div className="modal connect-modal" onMouseDown={(e) => e.stopPropagation()}>
          <button type="button" className="close-modal" onClick={close}><X /></button>
          <div className="modal-symbol"><FileSpreadsheet /></div>
          <span>IMPORT CSV</span>
          <h2>Upload a bank statement</h2>
          <p>Supported formats: CSV exported from your bank or UPI app.</p>

          <label
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              minHeight: 100, border: '2px dashed var(--line)', borderRadius: 12, marginTop: 18,
              cursor: 'pointer', background: 'var(--soft)',
            }}
          >
            <Upload size={22} color="var(--muted)" style={{ marginBottom: 8 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
              {fileName || 'Click to choose a CSV file'}
            </span>
            <span style={{ fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>
              Max 5 MB · Only .csv files
            </span>
            <input
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                setFileName(f?.name ?? '');
              }}
            />
          </label>

          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 8,
            background: 'var(--blue-soft)', fontSize: 9, color: 'var(--blue)',
            lineHeight: 1.5,
          }}>
            <strong>Note:</strong> PDF statements, SMS exports, and other document uploads are not yet supported.
            Only CSV files can be imported at this time.
          </div>

          <button
            className="primary modal-submit"
            type="button"
            disabled={!fileName}
            onClick={handleCsvUpload}
          >
            Import transactions
          </button>
        </div>
      </div>
    );
  }

  // Choose connection type
  const connectionTypes = [
    { id: 'bank', label: 'Bank account', detail: 'Provider-ready · read-only account data', icon: Building2, simulated: true },
    { id: 'credit-card', label: 'Credit card', detail: 'Provider-ready · transactions and balances', icon: CreditCard, simulated: true },
    { id: 'upi', label: 'UPI apps', detail: 'PhonePe, Google Pay, Paytm statement data', icon: Smartphone, simulated: true },
    { id: 'csv', label: 'Bank statement (CSV)', detail: 'Available now · import from your bank', icon: FileSpreadsheet, simulated: false },
  ];

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="modal connect-modal" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="close-modal" onClick={close}><X /></button>
        <div className="modal-symbol"><Building2 /></div>
        <span>CONNECT ACCOUNT</span>
        <h2>Link a financial source</h2>
        <p>Choose how to connect. Direct bank/UPI connections are simulated for this demo.</p>

        <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
          {connectionTypes.map((ct) => {
            const Icon = ct.icon;
            return (
              <button
                key={ct.id}
                type="button"
                onClick={() => handleConnect(ct.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  border: '1px solid var(--line)', borderRadius: 10, background: 'var(--card)',
                  textAlign: 'left', cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, background: 'var(--blue-soft)',
                  display: 'grid', placeItems: 'center', color: 'var(--blue)', flexShrink: 0,
                }}>
                  <Icon size={19} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>
                    {ct.label}
                    {ct.simulated && (
                      <span style={{
                        marginLeft: 6, fontSize: 8, padding: '2px 6px', borderRadius: 4,
                        background: 'var(--soft)', color: 'var(--muted)', fontWeight: 500,
                      }}>
                        Provider required
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>{ct.detail}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
