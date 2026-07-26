'use client'

import { useEffect, useState, useTransition } from 'react'
import { clockIn, clockOut } from '@/lib/actions/timesheet'

type Job = { id: string; customer_name: string; site_address: string }
type OpenEntry = {
  id: string
  clock_in_at: string
  job_name: string
}

function getPosition(): Promise<{ lat: number | null; lng: number | null }> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ lat: null, lng: null })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: null, lng: null }),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  })
}

function useElapsed(startIso: string) {
  const [elapsed, setElapsed] = useState('0h 00m 00s')

  useEffect(() => {
    const start = new Date(startIso).getTime()
    const tick = () => {
      const diff = Math.max(0, Date.now() - start)
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [startIso])

  return elapsed
}

export function ClockWidget({
  jobs,
  openEntry,
}: {
  jobs: Job[]
  openEntry: OpenEntry | null
}) {
  const [jobId, setJobId] = useState(jobs[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const elapsed = useElapsed(openEntry?.clock_in_at ?? new Date().toISOString())

  function handleClockIn() {
    setError('')
    startTransition(async () => {
      const { lat, lng } = await getPosition()
      const result = await clockIn({ jobId, lat, lng })
      if (result?.error) setError(result.error)
    })
  }

  function handleClockOut() {
    if (!openEntry) return
    setError('')
    startTransition(async () => {
      const { lat, lng } = await getPosition()
      const result = await clockOut({ entryId: openEntry.id, notes, lat, lng })
      if (result?.error) setError(result.error)
    })
  }

  if (openEntry) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-sm text-black/60">Clocked in — {openEntry.job_name}</p>
        <p className="text-3xl font-semibold tabular-nums">{elapsed}</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          onClick={handleClockOut}
          disabled={pending}
          className="w-full rounded-md bg-black px-4 py-3 text-white disabled:opacity-50"
        >
          {pending ? 'Clocking out…' : 'Clock Out'}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-4 text-center">
      {jobs.length === 0 ? (
        <p className="text-sm text-black/60">
          No active jobs yet — ask your admin to add one.
        </p>
      ) : (
        <>
          <div className="space-y-1 text-left">
            <label htmlFor="job" className="text-sm font-medium">
              Job
            </label>
            <select
              id="job"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className="w-full rounded-md border border-black/20 px-3 py-2"
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.customer_name} — {job.site_address}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleClockIn}
            disabled={pending}
            className="w-full rounded-md bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            {pending ? 'Clocking in…' : 'Clock In'}
          </button>
        </>
      )}
    </div>
  )
}
