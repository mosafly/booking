import React, { useEffect, useState } from 'react'
import { useSupabase } from '@/lib/contexts/Supabase'
import { toast } from 'react-hot-toast'

interface Obj {
  id: string
  name: string
  bucket_id: string
  updated_at: string
  metadata?: any
}

const BUCKETS = ['landing', 'courts'] as const

type BucketId = typeof BUCKETS[number]

const MediaManager: React.FC = () => {
  const { supabase } = useSupabase()
  const [bucket, setBucket] = useState<BucketId>('landing')
  const [objects, setObjects] = useState<Obj[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)

  const list = async () => {
    setLoading(true)
    const { data, error } = await supabase.storage.from(bucket).list(undefined, {
      limit: 1000,
      sortBy: { column: 'updated_at', order: 'desc' },
    })
    if (error) {
      toast.error(`Liste échouée: ${error.message}`)
    } else {
      const rows = (data || []).map((d: any) => ({
        id: d.id ?? `${bucket}/${d.name}`,
        name: d.name,
        bucket_id: bucket,
        updated_at: d.updated_at,
        metadata: d.metadata,
      }))
      setObjects(rows)
    }
    setLoading(false)
  }

  useEffect(() => {
    list()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket])

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const filepath = `${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from(bucket).upload(filepath, file, {
      cacheControl: '3600',
      upsert: false,
    })
    setUploading(false)
    if (error) return toast.error(`Upload échoué: ${error.message}`)
    toast.success('Fichier téléversé')
    await list()
  }

  const remove = async (name: string) => {
    if (!confirm('Supprimer ce fichier ?')) return
    const { error } = await supabase.storage.from(bucket).remove([name])
    if (error) return toast.error(`Suppression échouée: ${error.message}`)
    toast.success('Supprimé')
    await list()
  }

  const publicUrl = (name: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(name)
    return data.publicUrl
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Médias</h1>
        <div className="flex gap-2">
          <select className="border rounded p-2" value={bucket} onChange={(e) => setBucket(e.target.value as BucketId)}>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <label className="bg-lime-600 text-white rounded px-3 py-2 cursor-pointer">
            {uploading ? 'Téléversement…' : 'Téléverser'}
            <input type="file" className="hidden" onChange={upload} disabled={uploading} />
          </label>
        </div>
      </div>

      {loading ? (
        <div>Chargement…</div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {objects.map((o) => (
            <div key={o.id} className="bg-white rounded shadow p-3">
              <div className="font-mono text-sm break-all mb-2">{o.name}</div>
              <img
                src={publicUrl(o.name)}
                alt={o.name}
                className="w-full h-40 object-cover rounded mb-2"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              <div className="flex gap-2">
                <a className="text-lime-700 underline" href={publicUrl(o.name)} target="_blank" rel="noreferrer">
                  Ouvrir
                </a>
                <button className="text-red-600 underline" onClick={() => remove(o.name)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MediaManager
