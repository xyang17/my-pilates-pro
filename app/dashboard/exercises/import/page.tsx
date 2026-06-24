'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function ImportExercisesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [file, setFile] = useState<File | null>(null)
  const [xlsxReady, setXlsxReady] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading])

  // Load XLSX library once on mount
  useEffect(() => {
    if ((window as any).XLSX) {
      setXlsxReady(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
    script.async = true
    script.onload = () => {
      setXlsxReady(true)
    }
    script.onerror = () => {
      console.error('Failed to load XLSX library')
      setXlsxReady(false)
    }
    document.head.appendChild(script)
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a file')
      return
    }

    if (!xlsxReady) {
      setError('Excel parser library is still loading. Please wait a moment and try again.')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess(false)

    try {
      const reader = new FileReader()

      reader.onload = async (event) => {
        try {
          const data = event.target?.result as ArrayBuffer
          const XLSX = (window as any).XLSX

          if (!XLSX) {
            throw new Error('Excel parser library not loaded. Please refresh the page and try again.')
          }

          const workbook = XLSX.read(data, { type: 'array' })
          const worksheet = workbook.Sheets['Exercises']

          if (!worksheet) {
            throw new Error('Sheet "Exercises" not found in the Excel file')
          }

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          if (jsonData.length === 0) {
            throw new Error('No exercises found in the Excel file')
          }

          // Send to API
          const response = await fetch('/api/exercises/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': user?.id || '',
            },
            body: JSON.stringify({
              exercises: jsonData,
            }),
          })

          const result = await response.json()

          if (!response.ok) {
            throw new Error(result.error || 'Failed to import exercises')
          }

          setResults(result)
          setSuccess(true)
          setFile(null)
          setIsLoading(false)
        } catch (err: any) {
          setError(err.message)
          setIsLoading(false)
        }
      }

      reader.readAsArrayBuffer(file)
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  const downloadTemplate = () => {
    const link = document.createElement('a')
    link.href = '/Exercise_Import_Template_v2.xlsx'
    link.download = 'Exercise_Import_Template_v2.xlsx'
    link.click()
  }

  const downloadTestData = () => {
    const link = document.createElement('a')
    link.href = '/Test_Exercises_v2.xlsx'
    link.download = 'Test_Exercises_v2.xlsx'
    link.click()
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#9B7DB5',
        color: 'white',
        padding: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <Link href="/dashboard/exercises" style={{ color: 'white', textDecoration: 'none' }}>
            ← Back
          </Link>
        </div>
        <h1 style={{ margin: 0 }}>Import Exercises from Excel</h1>
        <div></div>
      </header>

      {/* Main Content */}
      <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
        {/* Success Message */}
        {success && results && (
          <div style={{
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            padding: '20px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #4caf50',
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>✅ Import Successful!</h3>
            <p style={{ margin: '0 0 5px 0' }}>
              Created: <strong>{results.created}</strong> exercises
            </p>
            {results.failed > 0 && (
              <p style={{ margin: '5px 0', color: '#c62828' }}>
                Failed: <strong>{results.failed}</strong> exercises
              </p>
            )}
            {results.errors.length > 0 && (
              <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #4caf50' }}>
                <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Errors:</p>
                {results.errors.map((err: any, i: number) => (
                  <p key={i} style={{ margin: '5px 0', fontSize: '13px' }}>
                    • {err.exercise || 'Unknown'}: {err.error}
                  </p>
                ))}
              </div>
            )}
            <Link
              href="/dashboard/exercises"
              style={{
                display: 'inline-block',
                marginTop: '15px',
                color: '#2e7d32',
                fontWeight: 'bold',
                textDecoration: 'none',
              }}
            >
              Go to Exercise Library →
            </Link>
          </div>
        )}

        {/* Library Loading Status */}
        {!xlsxReady && (
          <div style={{
            backgroundColor: '#fff3e0',
            color: '#e65100',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #ff9800',
          }}>
            ⏳ Loading Excel parser library... Please wait a moment.
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '15px',
            borderRadius: '4px',
            marginBottom: '20px',
            border: '1px solid #f44336',
          }}>
            ❌ {error}
          </div>
        )}

        {/* Instructions Card */}
        <div style={{
          backgroundColor: 'white',
          padding: '25px',
          borderRadius: '8px',
          marginBottom: '30px',
          border: '1px solid #ddd',
        }}>
          <h2 style={{ margin: '0 0 15px 0' }}>How to Import Exercises</h2>

          <ol style={{ marginLeft: '20px', lineHeight: '1.8' }}>
            <li>
              <strong>Download the template</strong> - Click the button below to get the Excel template with all columns
            </li>
            <li>
              <strong>Fill in your exercises</strong> - Add your exercises to the "Exercises" sheet
              <ul style={{ marginTop: '8px' }}>
                <li>Required: Exercise name (English + Chinese)</li>
                <li>Important: Type (Pilates Mat, Reformer, etc.), Difficulty (Beginner/Intermediate/Advanced), Target Muscles</li>
                <li>Optional: Description, instructions, default parameters (sets, reps, weight, duration)</li>
                <li>Optional: Image URLs and captions</li>
              </ul>
            </li>
            <li>
              <strong>Use the template</strong> - Template has data validation for Type, Difficulty, and Weight/Duration units
            </li>
            <li>
              <strong>Save the file</strong> - Save it as .xlsx format
            </li>
            <li>
              <strong>Upload here</strong> - Select and upload the file below
            </li>
          </ol>

          <div style={{ marginTop: '20px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <button
              onClick={downloadTemplate}
              style={{
                padding: '12px 24px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              📥 Download Blank Template
            </button>
            <button
              onClick={downloadTestData}
              style={{
                padding: '12px 24px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
              }}
            >
              ⭐ Download Test Data (10 exercises)
            </button>
          </div>
        </div>

        {/* Upload Form */}
        {!success && (
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            border: '1px solid #ddd',
          }}>
            <h2 style={{ margin: '0 0 20px 0' }}>Upload Your Exercises</h2>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="file-input"
                  style={{
                    display: 'block',
                    padding: '40px',
                    border: '2px dashed #9B7DB5',
                    borderRadius: '8px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: '#fafafa',
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#f0f0f0'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#fafafa'
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📄</div>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>
                    {file ? file.name : 'Drag and drop your Excel file here or click to select'}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
                    .xlsx format only
                  </p>
                </label>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <Link
                  href="/dashboard/exercises"
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    backgroundColor: '#f0f0f0',
                    color: '#333',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={!file || isLoading || !xlsxReady}
                  style={{
                    padding: '12px',
                    backgroundColor: '#9B7DB5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: file && !isLoading && xlsxReady ? 'pointer' : 'not-allowed',
                    fontWeight: 'bold',
                    opacity: file && !isLoading && xlsxReady ? 1 : 0.5,
                  }}
                >
                  {!xlsxReady ? 'Loading...' : isLoading ? 'Importing...' : 'Import Exercises'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  )
}
