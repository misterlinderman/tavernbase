import { useAuth0 } from '@auth0/auth0-react';

function Profile() {
  const { user } = useAuth0();

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>

      <div className="card">
        <div className="flex items-start gap-6">
          {user.picture && (
            <img
              src={user.picture}
              alt={user.name || 'User'}
              className="w-24 h-24 rounded-full"
            />
          )}
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-gray-900 mb-1">
              {user.name}
            </h2>
            <p className="text-gray-600 mb-4">{user.email}</p>

            {user.email_verified && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Email Verified
              </span>
            )}
          </div>
        </div>

        <hr className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                User ID
              </label>
              <p className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg break-all">
                {user.sub}
              </p>
            </div>

            {user.nickname && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Nickname
                </label>
                <p className="text-gray-900">{user.nickname}</p>
              </div>
            )}

            {user.updated_at && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Last Updated
                </label>
                <p className="text-gray-900">
                  {new Date(user.updated_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        <hr className="my-6" />

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Raw User Data</h3>
          <p className="text-sm text-gray-500">
            This is the full user object from Auth0. Useful for debugging.
          </p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default Profile;
