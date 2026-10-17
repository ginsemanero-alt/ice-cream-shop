import { useSettings } from '@/hooks/useSettings'
import { ContactLines } from '@/components/Layout'
import { CupStack } from '@/components/ui'

export function About() {
  const { settings: s, name } = useSettings()
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-4xl sm:text-5xl">About {name}</h1>
      <div className="card mt-8">
        {s.about ? <p className="whitespace-pre-line text-lg">{s.about}</p> : (
          <div className="flex items-center gap-4 text-choco-500">
            <CupStack className="hidden h-20 w-24 shrink-0 sm:block" />
            <p>The shop's story hasn't been added yet. The owner can write it in <b>Admin → Store Settings</b>.</p>
          </div>
        )}
      </div>
      {s.ordering_instructions && (
        <div className="card mt-6"><h2 className="mb-2 text-2xl">How to order</h2><p className="whitespace-pre-line">{s.ordering_instructions}</p></div>
      )}
    </div>
  )
}

export function Contact() {
  const { name } = useSettings()
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-4xl sm:text-5xl">Contact {name}</h1>
      <div className="card mt-8 text-lg"><ContactLines /></div>
    </div>
  )
}
