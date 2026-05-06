import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

/**
 * Maintenance Page
 * Shown when the application is under maintenance
 */
export default function MaintenancePage() {
  const [estimatedTime, setEstimatedTime] = useState('30 minutes');

  useEffect(() => {
    // In production, fetch actual maintenance status from API
    const timer = setTimeout(() => {
      // Auto-refresh after certain time
      window.location.reload();
    }, 60000); // Try refreshing every minute

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <AlertCircle className="text-amber-600" size={64} />
            <Clock className="absolute bottom-0 right-0 text-amber-500" size={32} />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Scheduled Maintenance</h1>
        <p className="text-gray-600 mb-6">
          We're performing scheduled maintenance to improve your experience. We'll be back soon!
        </p>

        <div className="bg-white rounded-lg p-6 mb-6 border border-amber-200">
          <p className="text-sm text-gray-600 mb-2">Estimated downtime</p>
          <p className="text-2xl font-semibold text-amber-600">{estimatedTime}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-amber-600 font-bold">•</span>
            <p className="text-left text-sm text-gray-600">
              No action is needed on your part—all your data is safe
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-amber-600 font-bold">•</span>
            <p className="text-left text-sm text-gray-600">
              We'll notify you when the service is restored
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-amber-600 font-bold">•</span>
            <p className="text-left text-sm text-gray-600">
              Check our status page for updates
            </p>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-8 w-full px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-semibold"
        >
          Refresh Page
        </button>

        <p className="mt-6 text-xs text-gray-500">
          Page will auto-refresh every minute • Last checked at {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
