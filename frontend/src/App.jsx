import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import HomePage from './pages/HomePage.jsx'
import NewSessionPage from './pages/NewSessionPage.jsx'
import EditorPage from './pages/EditorPage.jsx'
import TreePage from './pages/TreePage.jsx'
import MemoryDetailPage from './pages/MemoryDetailPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import YearMemoriesPage from './pages/YearMemoriesPage.jsx'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session/new" element={<NewSessionPage />} />
        <Route path="/session/:sessionId/editor" element={<EditorPage />} />
        <Route path="/tree" element={<TreePage />} />
        <Route path="/memory/:memoryId" element={<MemoryDetailPage />} />
        <Route path="/tree/year/:year" element={<YearMemoriesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  )
}

export default App
