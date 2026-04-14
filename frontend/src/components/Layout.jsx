import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import uonLogo from '../assets/uon-logo.png'

function Layout({ children }) {
  const location = useLocation()

  return (
    <div className="app-shell">
      <header className="app-header app-header-uon">
        <div className="app-header-inner">
          <Link to="/" aria-label="Back to home" className="brand-link">
            <div className="logo-row">
              {/* UoN logo */}
              <img
                className="uon-logo"
                src={uonLogo}
                alt="University of Nottingham"
              />
              <div className="brand-text">
                <div className="logo-text-main">MemoryTree</div>
              </div>
            </div>
          </Link>

          <nav className="app-nav app-nav-uon" aria-label="Main navigation">
            <Link to="/session/new">Start a session</Link>
            <Link to="/tree">MemoryTree</Link>
            <Link to="/settings">Settings & privacy</Link>
          </nav>
        </div>
      </header>

      <main className="app-main">{children}</main>

      <footer className="app-footer">
        <a
          href="https://www.nottingham.ac.uk/utilities/privacy/privacy.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Privacy Policy
        </a>
        <span className="footer-text">
          MemoryTree research prototype • You remain in control of your stories.
        </span>
      </footer>
    </div>
  )
}

export default Layout
