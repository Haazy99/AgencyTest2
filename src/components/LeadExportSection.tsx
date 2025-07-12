import { useState } from 'react';
import type { D7Lead } from '@/types';
import { FacebookScanner } from '@/lib/apify/facebook-scanner';

export default function LeadExportSection({ leads }: { leads: D7Lead[] }) {
  const [scanning, setScanning] = useState(false);
  const [scannedLeads, setScannedLeads] = useState<D7Lead[]>([]);

  const handleScanAds = async () => {
    setScanning(true);
    try {
      // Limit to first 20 leads
      const limitedLeads = leads.slice(0, 20);
      const scanner = new FacebookScanner();
      const results = await scanner.scanPages(limitedLeads);
      setScannedLeads(results);
    } catch (error) {
      console.error('Error scanning ads:', error);
      // Show error notification or message to user
    } finally {
      setScanning(false);
    }
  };

  // Get the leads to display (either scanned or original, limited to 20)
  const displayLeads = (scannedLeads.length > 0 ? scannedLeads : leads).slice(0, 20);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Lead Results</h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Showing {displayLeads.length} of {leads.length} leads
          </span>
          <button
            onClick={handleScanAds}
            disabled={scanning || leads.length === 0}
            className={`px-4 py-2 rounded ${
              scanning || leads.length === 0
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {scanning ? 'Scanning Ads...' : 'Scan Facebook Ads'}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Facebook Page</th>
              <th className="px-4 py-2 text-left">Active Ads</th>
              <th className="px-4 py-2 text-left">Ad Library</th>
              <th className="px-4 py-2 text-left">Last Scanned</th>
            </tr>
          </thead>
          <tbody>
            {displayLeads.map((lead) => (
              <tr key={lead.id} className="border-b">
                <td className="px-4 py-2">{lead.companyName || `${lead.firstName} ${lead.lastName}` || 'Unnamed Lead'}</td>
                <td className="px-4 py-2">
                  {lead.facebookPage ? (
                    <a
                      href={lead.facebookPage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View Page
                    </a>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="px-4 py-2">
                  {lead.hasActiveAds !== undefined ? (
                    lead.hasActiveAds ? (
                      <a
                        href={lead.adLibraryUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-500 hover:underline flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Yes</span>
                      </a>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>No</span>
                      </span>
                    )
                  ) : (
                    'Not Scanned'
                  )}
                </td>
                <td className="px-4 py-2">
                  {lead.adLibraryUrl ? (
                    <a
                      href={lead.adLibraryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View Ads
                    </a>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="px-4 py-2">
                  {lead.lastAdScanDate
                    ? new Date(lead.lastAdScanDate).toLocaleString()
                    : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 