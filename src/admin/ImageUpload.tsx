import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { uploadImage } from '@/lib/storage'
import { errMsg } from '@/lib/format'
import { useToast } from '@/hooks/useToast'

export function ImageUpload({ label, value, folder, onChange }: { label: string; value: string | null; folder: string; onChange: (url: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try { onChange(await uploadImage(file, folder)) } catch (err) { toast(errMsg(err), 'error') } finally { setBusy(false) }
  }

  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-cream-200">
          {value ? <img src={value} alt={`${label} preview`} className="h-full w-full object-cover" /> : <ImagePlus className="text-choco-300" aria-hidden />}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => input.current?.click()} disabled={busy}>
            {busy && <Loader2 size={14} className="animate-spin" />} {value ? 'Replace' : 'Upload'}
          </button>
          {value && <button type="button" className="btn btn-sm text-berry-600 hover:bg-berry-50" onClick={() => onChange(null)}><Trash2 size={14} /> Remove</button>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pick} aria-label={`Choose ${label}`} />
      </div>
    </div>
  )
}
