import React, { useEffect, useState } from 'react'
import { useSupabase } from '@/lib/contexts/Supabase'
import toast from 'react-hot-toast'
import { Spinner } from '@/components/dashboard/spinner'
import { Court } from '@/components/booking/court-card'
import { format } from 'date-fns'

interface Unavailability {
  id: string
  court_id: string
  start_time: string
  end_time: string
  reason: string | null
}

function toLocalInputValue(date: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0')
  const yyyy = date.getFullYear()
  const MM = pad(date.getMonth() + 1)
  const dd = pad(date.getDate())
  const HH = pad(date.getHours())
  const mm = pad(date.getMinutes())
  return `${yyyy}-${MM}-${dd}T${HH}:${mm}`
}

const UnavailabilityManagement: React.FC = () => {
  const { supabase } = useSupabase()

  const [courts, setCourts] = useState<Court[]>([])
  const [selectedCourtId, setSelectedCourtId] = useState<string>('')
  const [items, setItems] = useState<Unavailability[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const [startValue, setStartValue] = useState<string>(() => {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    return toLocalInputValue(d)
  })
  const [endValue, setEndValue] = useState<string>(() => {
    const d = new Date()
    d.setHours(d.getHours() + 1, 0, 0, 0)
    return toLocalInputValue(d)
  })
  const [reason, setReason] = useState<string>('')

  useEffect(() => {
    const loadCourts = async () => {
      try {
        const { data, error } = await supabase.rpc('get_all_courts')
        if (error) throw error
        setCourts(data || [])
        if (data && data.length > 0) {
          setSelectedCourtId((prev) => prev || data[0].id)
        }
      } catch (e: any) {
        console.error(e)
        toast.error('Failed to load courts')
      } finally {
        setLoading(false)
      }
    }
    loadCourts()
  }, [supabase])

  const loadItems = async (courtId: string) => {
    if (!courtId) return
    try {
      const nowISO = new Date().toISOString()
      const { data, error } = await supabase
        .from('court_unavailabilities')
        .select('id, court_id, start_time, end_time, reason')
        .eq('court_id', courtId)
        .gte('end_time', nowISO)
        .order('start_time', { ascending: true })
      if (error) throw error
      setItems(data || [])
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to load unavailability')
    }
  }

  useEffect(() => {
    if (selectedCourtId) loadItems(selectedCourtId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourtId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourtId) return

    try {
      setCreating(true)
      const start = new Date(startValue)
      const end = new Date(endValue)
      if (!(start instanceof Date) || isNaN(start.getTime())) {
        toast.error('Invalid start time')
        return
      }
      if (!(end instanceof Date) || isNaN(end.getTime())) {
        toast.error('Invalid end time')
        return
      }
      if (end <= start) {
        toast.error('End time must be after start time')
        return
      }

      const payload: any = {
        court_id: selectedCourtId,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      }
      if (reason.trim()) payload.reason = reason.trim()
      // created_by is optional and handled via RLS; omit to avoid mismatch

      const { error } = await supabase.from('court_unavailabilities').insert([payload])
      if (error) throw error

      toast.success('Unavailability created')
      setReason('')
      await loadItems(selectedCourtId)
    } catch (e: any) {
      console.error(e)
      toast.error(e?.message || 'Failed to create unavailability')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('court_unavailabilities')
        .delete()
        .eq('id', id)
      if (error) throw error
      toast.success('Unavailability deleted')
      await loadItems(selectedCourtId)
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to delete unavailability')
    }
  }

  // No memoized selected court needed currently

  if (loading) {
    return (
      <div className="p-6">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-4">Court Unavailability</h1>

      <div className="bg-white rounded-md shadow p-4 mb-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Court</label>
          <select
            className="w-full border rounded-md p-2"
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
          >
            {courts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Start</label>
            <input
              type="datetime-local"
              className="w-full border rounded-md p-2"
              value={startValue}
              onChange={(e) => setStartValue(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End</label>
            <input
              type="datetime-local"
              className="w-full border rounded-md p-2"
              value={endValue}
              onChange={(e) => setEndValue(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason (optional)</label>
            <input
              type="text"
              className="w-full border rounded-md p-2"
              placeholder="Maintenance, event, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={creating || !selectedCourtId}
              className="btn btn-primary"
            >
              {creating ? 'Creating…' : 'Create Unavailability'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-md shadow">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Upcoming unavailability</h2>
        </div>
        <div className="divide-y">
          {items.length === 0 && (
            <div className="p-4 text-gray-500">No entries</div>
          )}
          {items.map((u) => (
            <div key={u.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {format(new Date(u.start_time), 'PPpp')} — {format(new Date(u.end_time), 'PPpp')}
                </div>
                {u.reason && <div className="text-sm text-gray-600">{u.reason}</div>}
              </div>
              <div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDelete(u.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default UnavailabilityManagement
