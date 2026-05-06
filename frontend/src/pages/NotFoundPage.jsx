import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

/**
 * 404 Not Found Page
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center mb-6">
          <AlertCircle className="text-gray-400" size={64} />
        </div>

        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        <div className="space-y-3">
          <Link
            to="/"
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Go to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-semibold"
          >
            Go Back
          </button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            If you think this is a mistake, please <a href="/" className="underline font-semibold">contact support</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
