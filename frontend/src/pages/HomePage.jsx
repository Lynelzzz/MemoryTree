import React from 'react'
import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <div>
      <section className="hero-grid">
        <div className="card hero-main card-soft">
          <div className="badge" aria-hidden="true">
            <span className="badge-dot" />
            a gentle digital space
          </div>
          <h1 className="page-title">
            Slowly gather the stories you would like to keep, together with someone who matters.
          </h1>
          <p className="page-subtitle">
            MemoryTree is a research prototype that uses prompt cards, a controllable AI helper,
            and shared editing to help you turn fragile memories into short, meaningful pieces of text.
          </p>

          <div className="hero-actions">
            <Link to="/session/new">
              <button className="btn btn-primary" type="button">
                Start a co-creation session
              </button>
            </Link>
            <Link to="/tree">
              <button className="btn btn-secondary" type="button">
                View your MemoryTree
              </button>
            </Link>
          </div>

          <div className="hero-highlights" aria-label="design highlights">
            <div>• All stories are stored in your own browser. You can export or delete them at any time.</div>
            <div>• You choose tone and length. AI is only a constrained writing assistant.</div>
            <div>• Before anything joins the tree, you can review, edit, reject, or abandon it.</div>
          </div>
        </div>

        <div className="card card-soft">
          <div className="info-card-title">This is a research prototype</div>
          <p className="info-card-body">
            The system is built for a final year dissertation project, not as a commercial product.
          </p>
          <div className="info-card-title" style={{ marginTop: '0.7rem' }}>
            You stay in control:
          </div>
          <div className="chip-row">
            <span className="chip">Use nicknames instead of real names</span>
            <span className="chip">Export all memories whenever you like</span>
            <span className="chip chip-strong">Clear your MemoryTree in one step</span>
          </div>
        </div>
      </section>

      <section className="info-grid" aria-label="How it works">
        <div className="card card-soft">
          <div className="info-card-title">1. Start from a gentle prompt card</div>
          <p className="info-card-body">
            Choose a small, concrete starting point such as "the first time you met"
            or "a small moment that made you both laugh".
          </p>
        </div>
        <div className="card card-soft">
          <div className="info-card-title">2. Let AI suggest a first draft</div>
          <p className="info-card-body">
            You set the tone and length. The AI gives you a draft that you can keep, edit, or
            completely rewrite. You can also skip AI entirely and write on your own.
          </p>
        </div>
        <div className="card card-soft">
          <div className="info-card-title">3. Edit together and decide what belongs in the tree</div>
          <p className="info-card-body">
            Only the text you agree on is added to the MemoryTree. You can also keep drafts,
            or simply close the page without saving.
          </p>
        </div>
      </section>
    </div>
  )
}

export default HomePage
