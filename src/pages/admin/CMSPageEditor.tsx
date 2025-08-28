import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSupabase } from '@/lib/contexts/Supabase'
import { toast } from 'react-hot-toast'

interface CMSPage {
  id: string
  slug: string
  title: string | null
  enabled: boolean
}

interface CMSSection {
  id: string
  key: string
  type: string
  locale: string
  content: any
  sort_order: number
}

const sectionTypes = [
  { value: 'hero', label: 'Héro' },
  { value: 'rich_text', label: 'Texte riche' },
  { value: 'gallery', label: 'Galerie' },
  { value: 'cards', label: 'Cartes' },
  { value: 'cta', label: 'Appel à l\'action' },
]

const CMSPageEditor: React.FC = () => {
  const { supabase } = useSupabase()
  const { slug } = useParams()
  const [page, setPage] = useState<CMSPage | null>(null)
  const [sections, setSections] = useState<CMSSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [newSectionKey, setNewSectionKey] = useState('')
  const [newSectionType, setNewSectionType] = useState('hero')
  const [newSectionLocale, setNewSectionLocale] = useState('fr')
  const [newSectionContent, setNewSectionContent] = useState<string>('{}')

  const pageTitle = useMemo(() => page?.title || slug, [page, slug])

  const load = async () => {
    setLoading(true)
    const { data: p, error: pe } = await supabase
      .from('cms_pages')
      .select('id, slug, title, enabled')
      .eq('slug', slug)
      .single()
    if (pe) {
      toast.error(`Erreur page: ${pe.message}`)
      setLoading(false)
      return
    }
    setPage(p as CMSPage)
    const { data: s, error: se } = await supabase
      .from('cms_sections')
      .select('id, key, type, locale, content, sort_order')
      .eq('page_id', p!.id)
      .order('sort_order', { ascending: true })
    if (se) toast.error(`Erreur sections: ${se.message}`)
    setSections((s || []) as CMSSection[])
    setLoading(false)
  }

  useEffect(() => {
    if (slug) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  const toggleEnabled = async () => {
    if (!page) return
    const { error } = await supabase
      .from('cms_pages')
      .update({ enabled: !page.enabled })
      .eq('id', page.id)
    if (error) return toast.error(error.message)
    setPage({ ...page, enabled: !page.enabled })
    toast.success(page.enabled ? 'Page désactivée' : 'Page activée')
  }

  const addSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!page) return
    let parsed: any
    try {
      parsed = newSectionContent ? JSON.parse(newSectionContent) : {}
    } catch (e) {
      return toast.error('JSON invalide pour le contenu')
    }
    const maxOrder = sections.reduce((m, s) => Math.max(m, s.sort_order), 0)
    const { data, error } = await supabase
      .from('cms_sections')
      .insert({
        page_id: page.id,
        key: newSectionKey || newSectionType,
        type: newSectionType,
        locale: newSectionLocale,
        content: parsed,
        sort_order: maxOrder + 1,
      })
      .select('id')
      .single()
    if (error) return toast.error(`Ajout section: ${error.message}`)
    toast.success('Section ajoutée')
    setNewSectionKey('')
    setNewSectionContent('{}')
    await load()
  }

  const updateSection = async (sec: CMSSection, next: Partial<CMSSection>) => {
    if (!page) return
    setSaving(true)
    const payload: any = {}
    if (next.key !== undefined) payload.key = next.key
    if (next.type !== undefined) payload.type = next.type
    if (next.locale !== undefined) payload.locale = next.locale
    if (next.sort_order !== undefined) payload.sort_order = next.sort_order
    if (next.content !== undefined) payload.content = next.content

    const { error } = await supabase
      .from('cms_sections')
      .update(payload)
      .eq('id', sec.id)
    setSaving(false)
    if (error) return toast.error(`Sauvegarde: ${error.message}`)
    toast.success('Section mise à jour')
    setSections((prev) => prev.map((s) => (s.id === sec.id ? { ...s, ...payload } : s)))
  }

  const removeSection = async (sec: CMSSection) => {
    if (!confirm('Supprimer cette section ?')) return
    const { error } = await supabase.from('cms_sections').delete().eq('id', sec.id)
    if (error) return toast.error(error.message)
    toast.success('Section supprimée')
    setSections((prev) => prev.filter((s) => s.id !== sec.id))
  }

  const move = async (sec: CMSSection, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === sec.id)
    const targetIdx = idx + dir
    if (targetIdx < 0 || targetIdx >= sections.length) return
    const swap = sections[targetIdx]
    await Promise.all([
      updateSection(sec, { sort_order: swap.sort_order }),
      updateSection(swap, { sort_order: sec.sort_order }),
    ])
    await load()
  }

  const contentToString = (c: any) => {
    try {
      return JSON.stringify(c, null, 2)
    } catch {
      return '{}'
    }
  }

  if (loading) return <div className="p-6">Chargement…</div>
  if (!page) return <div className="p-6">Page introuvable</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">CMS - {pageTitle}</h1>
          <div className="text-sm text-gray-600">Slug: <span className="font-mono">{page.slug}</span></div>
        </div>
        <div className="flex gap-3">
          <button onClick={toggleEnabled} className="bg-lime-600 text-white rounded px-3 py-2">
            {page.enabled ? 'Désactiver' : 'Activer'} la page
          </button>
          <Link to="/admin/cms" className="text-lime-700 underline">Retour aux pages</Link>
        </div>
      </div>

      {/* Ajouter une section */}
      <form onSubmit={addSection} className="bg-white p-4 rounded shadow mb-6 grid gap-3">
        <div className="grid md:grid-cols-4 gap-3">
          <input className="border rounded p-2" placeholder="Clé (ex: hero)" value={newSectionKey} onChange={(e) => setNewSectionKey(e.target.value)} />
          <select className="border rounded p-2" value={newSectionType} onChange={(e) => setNewSectionType(e.target.value)}>
            {sectionTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input className="border rounded p-2" placeholder="Locale" value={newSectionLocale} onChange={(e) => setNewSectionLocale(e.target.value)} />
          <button className="bg-lime-600 text-white rounded p-2">Ajouter une section</button>
        </div>
        <textarea className="border rounded p-2 font-mono" rows={8} placeholder="Contenu JSON" value={newSectionContent} onChange={(e) => setNewSectionContent(e.target.value)} />
      </form>

      {/* Liste sections */}
      <div className="space-y-4">
        {sections.map((sec) => (
          <div key={sec.id} className="bg-white p-4 rounded shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">{sec.key} — <span className="text-gray-600">{sec.type}</span> — <span className="text-gray-600">{sec.locale}</span></div>
              <div className="flex gap-2">
                <button className="px-2 py-1 border rounded" onClick={() => move(sec, -1)}>↑</button>
                <button className="px-2 py-1 border rounded" onClick={() => move(sec, 1)}>↓</button>
                <button className="px-2 py-1 border rounded text-red-600" onClick={() => removeSection(sec)}>Supprimer</button>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3 mb-3">
              <input className="border rounded p-2" value={sec.key} onChange={(e) => updateSection(sec, { key: e.target.value })} />
              <select className="border rounded p-2" value={sec.type} onChange={(e) => updateSection(sec, { type: e.target.value })}>
                {sectionTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input className="border rounded p-2" value={sec.locale} onChange={(e) => updateSection(sec, { locale: e.target.value })} />
            </div>
            <textarea
              className="border rounded p-2 font-mono w-full"
              rows={10}
              value={contentToString(sec.content)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  updateSection(sec, { content: parsed })
                } catch (err) {
                  // show a lightweight warning but don't block typing
                }
              }}
            />
          </div>
        ))}
      </div>

      {saving && <div className="fixed bottom-4 right-4 bg-black text-white px-3 py-2 rounded">Sauvegarde…</div>}
    </div>
  )
}

export default CMSPageEditor
