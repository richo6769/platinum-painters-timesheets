'use client'

import { useEffect, useState, useTransition } from 'react'
import { clockIn, clockOut } from '@/lib/actions/timesheet'

type Site = { id: string; label: string }
type OpenEntry = {
  id: string
  clock_in_at: string
  site_name: string
}
type Coords = { lat: number | null; lng: number | null }

const BREAK_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: '30', label: '30 mins' },
  { value: '45', label: '45 mins' },
  { value: '60', label: '60 mins' },
  { value: 'custom', label: 'Custom' },
] as const

function getPosition(): Promise<Coords> {
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

function formatDuration(ms: number) {
  const diff = Math.max(0, ms)
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0')
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0')
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function formatTimestamp(ms: number) {
  const d = new Date(ms)
  return {
    time: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    date: d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }),
  }
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [active])

  return now
}

export function ClockWidget({
  sites,
  openEntry,
}: {
  sites: Site[]
  openEntry: OpenEntry | null
}) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const [stopped, setStopped] = useState(false)
  const [endedAtMs, setEndedAtMs] = useState<number | null>(null)
  const [endCoords, setEndCoords] = useState<Coords>({ lat: null, lng: null })
  const [breakChoice, setBreakChoice] = useState<(typeof BREAK_OPTIONS)[number]['value']>('none')
  const [customBreak, setCustomBreak] = useState('')

  const startMs = openEntry ? new Date(openEntry.clock_in_at).getTime() : null
  const now = useNow(Boolean(openEntry) && !stopped)
  const durationMs = startMs === null ? 0 : (stopped && endedAtMs ? endedAtMs : now) - startMs

  function handleClockIn() {
    setError('')
    startTransition(async () => {
      const { lat, lng } = await getPosition()
      const result = await clockIn({ siteId, lat, lng })
      if (result?.error) setError(result.error)
    })
  }

  function handleStop() {
    setError('')
    startTransition(async () => {
      const coords = await getPosition()
      setEndCoords(coords)
      setEndedAtMs(Date.now())
      setStopped(true)
    })
  }

  function handleSave() {
    if (!openEntry || endedAtMs === null) return

    const breakMinutes =
      breakChoice === 'none'
        ? 0
        : breakChoice === 'custom'
          ? Math.max(0, parseInt(customBreak, 10) || 0)
          : Number(breakChoice)

    setError('')
    startTransition(async () => {
      const result = await clockOut({
        entryId: openEntry.id,
        notes,
        breakMinutes,
        clockOutAt: new Date(endedAtMs).toISOString(),
        lat: endCoords.lat,
        lng: endCoords.lng,
      })
      if (result?.error) setError(result.error)
    })
  }

  if (openEntry && startMs !== null) {
    const started = formatTimestamp(startMs)
    const ended = stopped && endedAtMs ? formatTimestamp(endedAtMs) : null

    return (
      <div className="w-full max-w-sm space-y-4">
        <p className="text-center text-sm text-black/60">{openEntry.site_name}</p>

        <div className="grid grid-cols-2 gap-4 rounded-lg border border-black/10 p-4 text-center">
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Started</p>
            <p className="font-medium">{started.time}</p>
            <p className="text-xs text-black/50">{started.date}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-black/50">Ended</p>
            {ended ? (
              <>
                <p className="font-medium">{ended.time}</p>
                <p className="text-xs text-black/50">{ended.date}</p>
              </>
            ) : (
              <p className="font-medium text-black/40">— — —</p>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-black/50">Duration</p>
          <p className="text-3xl font-semibold tabular-nums">{formatDuration(durationMs)}</p>
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
        />

        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        {!stopped ? (
          <button
            onClick={handleStop}
            disabled={pending}
            className="w-full rounded-md bg-red-600 px-4 py-3 text-white disabled:opacity-50"
          >
            {pending ? 'Stopping…' : 'Stop'}
          </button>
        ) : (
          <div className="space-y-3 rounded-lg border border-black/10 p-4">
            <p className="text-sm font-medium">Breaks</p>
            <div className="flex flex-wrap gap-2">
              {BREAK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBreakChoice(option.value)}
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    breakChoice === option.value
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {breakChoice === 'custom' && (
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={customBreak}
                onChange={(e) => setCustomBreak(e.target.value)}
                placeholder="Minutes"
                className="w-full rounded-md border border-black/20 px-3 py-2 text-sm"
              />
            )}
            <button
              onClick={handleSave}
              disabled={pending}
              className="w-full rounded-md bg-black px-4 py-3 text-white disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-4 text-center">
      {sites.length === 0 ? (
        <p className="text-sm text-black/60">
          No active sites yet — ask your admin to add one.
        </p>
      ) : (
        <>
          <div className="space-y-1 text-left">
            <label htmlFor="site" className="text-sm font-medium">
              Site
            </label>
            <select
              id="site"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full rounded-md border border-black/20 px-3 py-2"
            >
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.label}
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
