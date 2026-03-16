import { useState, useEffect } from 'react'

function App() {
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    // Test IPC connection
    if (window.electron) {
      window.electron.ping().then((result) => {
        setMessage(`IPC test: ${result}`)
      })
    }
  }, [])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      color: 'white',
      textAlign: 'center',
      padding: '20px',
    }}>
      <h1 style={{
        fontSize: '48px',
        marginBottom: '16px',
        textShadow: '2px 2px 4px rgba(0,0,0,0.2)',
      }}>
        🤖 Vibe Research
      </h1>
      <p style={{
        fontSize: '24px',
        opacity: 0.9,
        marginBottom: '8px',
      }}>
        AI-powered Research Assistant for Zotero
      </p>
      <p style={{
        fontSize: '16px',
        opacity: 0.7,
        marginBottom: '24px',
      }}>
        {message || 'Electron is running...'}
      </p>
      <div style={{
        marginTop: '20px',
        padding: '16px 32px',
        background: 'rgba(255,255,255,0.2)',
        borderRadius: '12px',
        backdropFilter: 'blur(10px)',
      }}>
        <p style={{ fontSize: '14px', opacity: 0.8 }}>
          ✨ Chat interface coming soon...
        </p>
      </div>
    </div>
  )
}

export default App

// Type declaration for window.electron
declare global {
  interface Window {
    electron: {
      ping: () => Promise<string>
    }
  }
}
