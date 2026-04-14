import React from 'react'

function ConfirmGate({ agreedContent, agreedControl, onChange, onSubmit, disabled }) {
  return (
    <div className="confirm-gate">
      <div className="confirm-row">
        <div className="confirm-option">
          <input
            type="checkbox"
            id="agree-content"
            checked={agreedContent}
            onChange={(e) => onChange({ agreedContent: e.target.checked })}
          />
          <label htmlFor="agree-content">
            I feel this text is suitable to keep as one of our shared memories.
          </label>
        </div>
        <div className="confirm-option">
          <input
            type="checkbox"
            id="agree-control"
            checked={agreedControl}
            onChange={(e) => onChange({ agreedControl: e.target.checked })}
          />
          <label htmlFor="agree-control">
            I understand that I can change, delete, or export this story at any time later.
          </label>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSubmit}
          disabled={!agreedContent || !agreedControl || disabled}
        >
          Add to MemoryTree
        </button>
      </div>
    </div>
  )
}

export default ConfirmGate
