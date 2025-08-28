import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSupabase } from '@/lib/contexts/Supabase'
import { toast } from 'react-hot-toast'

interface CMSPage {
  id: string
  slug: string
  title: string | null
  enabled: boolean
}

const CMSPages: React.FC = () => {
  const { supabase } = useSupabase()
  const [pages, setPages] = useState<CMSPage[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const navigate = useNavigate()

  const loadPages = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cms_pages')
      .select('id, slug, title, enabled')
      .order('slug', { ascending: true })
    if (error) {
      toast.error(`Erreur chargement pages: ${error.message}`)
    } else {
      setPages(data as CMSPage[])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createPage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!slug.trim()) return toast.error('Slug requis')
    setCreating(true)
    const { data, error } = await supabase
      .from('cms_pages')
      .insert({ slug: slug.trim(), title: title || null })
      .select('slug')
      .single()
    setCreating(false)
    if (error) return toast.error(`Création échouée: ${error.message}`)
    toast.success('Page créée')
    await loadPages()
    navigate(`/admin/cms/${data!.slug}`)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">CMS - Pages</h1>
        <Link to="/admin/media" className="text-lime-700 underline">
          Gérer les médias
        </Link>
      </div>

      <form onSubmit={createPage} className="bg-white p-4 rounded shadow mb-6 grid md:grid-cols-3 gap-3">
        <input
          className="border rounded p-2"
          placeholder="slug (ex: landing)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <input
          className="border rounded p-2"
          placeholder="Titre (optionnel)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          className="bg-lime-600 text-white rounded p-2 disabled:opacity-60"
          disabled={creating}
        >
          {creating ? 'Création…' : 'Créer une page'}
        </button>
      </form>

      {loading ? (
        <div>Chargement…</div>
      ) : (
        <div className="bg-white rounded shadow">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="p-3">Slug</th>
                <th className="p-3">Titre</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono">{p.slug}</td>
                  <td className="p-3">{p.title || '-'}</td>
                  <td className="p-3">{p.enabled ? 'Activée' : 'Désactivée'}</td>
                  <td className="p-3">
                    <Link className="text-lime-700 underline" to={`/admin/cms/${p.slug}`}>
                      Éditer
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default CMSPages
