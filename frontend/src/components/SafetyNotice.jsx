import React from 'react'

function SafetyNotice() {
  return (
    <div className="safety-notice">
      <strong>Gentle, safety-aware generation:</strong>{' '}
      The system aims to avoid extreme, violent, or demeaning descriptions
      and to stay within the tone you have chosen. If a draft feels off,
      uncomfortable, or simply wrong, you can delete it or fully rewrite it.
    </div>
  )
}

export default SafetyNotice
