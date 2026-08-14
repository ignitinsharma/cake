import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/*
 * HistoryPage
 * Table of generated files with download links.
 * ponytail: Intl.DateTimeFormat instead of date-fns — plan's own constraints defer date-fns.
 */
export default async function HistoryPage() {
  const session = await auth()
  const generations = await db.generation.findMany({
    where: { userId: session?.user?.id as string },
    include: { product: true },
    orderBy: { createdAt: 'desc' },
  })
  const formatDate = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Generation history</h1>
      {generations.length === 0 && <p className="text-brand-foreground-muted">No files generated yet.</p>}
      {generations.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl border border-brand-border">
            <table className="w-full text-sm">
              <thead className="bg-brand-surface">
                <tr>
                  {['Product', 'Platform', 'Version', 'Date', 'File'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {generations.map((g) => (
                  <tr key={g.id} className="border-t border-brand-border">
                    <td className="px-4 py-3">{g.product.title}</td>
                    <td className="px-4 py-3">{g.platform}</td>
                    <td className="px-4 py-3">{g.templateVersion}</td>
                    <td className="px-4 py-3">{formatDate.format(g.createdAt)}</td>
                    <td className="px-4 py-3">
                      <a className="font-medium text-brand-primary underline" href={`/api/generate/${g.id}?format=csv`}>
                        {g.fileName}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-brand-foreground-muted">
            Downloads re-render from the current template version — the version shown is the one recorded when the file was generated.
          </p>
        </>
      )}
    </div>
  )
}