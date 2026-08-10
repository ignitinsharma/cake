import { ImportWizard } from '@/components/import/import-wizard'

/*
 * ImportPage
 * Shell page — the wizard is a client component (file parsing is client-side).
 */
export default function ImportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import products</h1>
        <p className="mt-1 text-sm text-brand-foreground-muted">
          Upload a catalog CSV or XLSX — we auto-map the headers, you confirm, then everything loads in one go.
        </p>
      </div>
      <ImportWizard />
    </div>
  )
}
