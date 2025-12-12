export default function Home() {
  return (
    <div className="min-h-screen p-8 pb-20 sm:p-20">
      <main className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          California Conservatorship & Trust Accounting
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Automated court petition generation for GC-400 series forms
        </p>

        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <p className="text-gray-700 mb-4">
            This application helps prepare California Judicial Council forms for conservatorship and trust accountings.
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Upload bank statements (PDF or CSV)</li>
            <li>Enter case and asset information</li>
            <li>Review and categorize transactions</li>
            <li>Generate GC-400 series forms</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
