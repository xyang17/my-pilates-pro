'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [status, setStatus] = useState('Testing connection...')

  useEffect(() => {
    const test = async () => {
      try {
        const { count, error } = await supabase
          .from('class')
          .select('*', { count: 'exact', head: true })

        if (error) throw error

        setStatus(`✅ Connected to Supabase! Found ${count} classes.`)
      } catch (error: any) {
        setStatus(`❌ Connection failed: ${error.message}`)
      }
    }

    test()
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>MyPilatesPro</h1>
      <p style={{ fontSize: '1.2rem' }}>{status}</p>
    </div>
  )
}