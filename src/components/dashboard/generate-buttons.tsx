'use client'
import { useState } from 'react'
import { Platform } from '@/constants/enums'
import { generateFileAction } from '@/lib/actions/generate-file'
import { Button } from '@/components/ui/button'

/*
 * GenerateButtons
 * One download button per platform, CSV default; link opens the file URL.
 */
export function GenerateButtons({ productId, platforms }: { productId: string; platforms: Platform[] }) {
  const [pending, setPending] = useState<Platform | ''>('')
  const [url, setUrl] = useState('')
  const [version, setVersion] = useState('')
  const [error, setError] = useState('')
  async function run(p: Platform) {
    setPending(p)
    setError('')
    setUrl('')
    setVersion('')
    const res = await generateFileAction(productId, p, 'csv')
    if (!('error' in res)) {
      setUrl(res.downloadUrl)
      setVersion(res.templateVersion)
      setPending('')
      return
    }
    setError(res.error)
    setPending('')
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {platforms.map((p) => (
          <Button key={p} variant="outline" size="sm" disabled={pending !== ''} onClick={() => run(p)}>
            {pending === p ? 'Generating…' : `Generate ${p}`}
          </Button>
        ))}
      </div>
      {url && (
        <div className="space-y-1">
          <a className="text-sm font-medium text-brand-primary underline" href={url}>
            Download file
          </a>
          {version && <p className="text-xs text-brand-foreground-muted">Template v{version}</p>}
        </div>
      )}
      {error && <p className="text-sm text-brand-danger">{error}</p>}
    </div>
  )
}