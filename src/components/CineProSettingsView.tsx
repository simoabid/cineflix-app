import { useEffect, useState } from 'react';
import { Server, ToggleLeft, ToggleRight, CheckCircle2, AlertCircle, RefreshCw, EyeOff, Eye } from 'lucide-react';
import { useCineProStore } from '@/stores/cinepro';

export function CineProSettingsView() {
  const {
    serverUrl,
    isEnabled,
    connectionStatus,
    availableProviders,
    disabledProviderIds,
    preferCinePro,
    setServerUrl,
    setIsEnabled,
    setPreferCinePro,
    toggleProvider,
    checkConnection,
  } = useCineProStore();

  const [inputUrl, setInputUrl] = useState(serverUrl);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setInputUrl(serverUrl);
  }, [serverUrl]);

  // Load providers on mount if connected
  useEffect(() => {
    if (connectionStatus === 'connected' && availableProviders.length === 0) {
      void useCineProStore.getState().checkConnection();
    }
  }, [connectionStatus, availableProviders.length]);

  const handleTestConnection = async () => {
    setTesting(true);
    // Save URL first
    setServerUrl(inputUrl);
    await checkConnection();
    setTesting(false);
  };

  const handleToggleEnabled = () => {
    setIsEnabled(!isEnabled);
  };

  const handleTogglePrefer = () => {
    setPreferCinePro(!preferCinePro);
  };

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="auth-card rounded-2xl p-6 mb-4 animate-scale-in">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-netflix-red/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Server className="w-5 h-5 text-netflix-red" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">CinePro Core Integration</h3>
            <p className="text-sm text-gray-400 mt-1">
              Configure your serverless or self-hosted CinePro backend for supplementary premium scrapers.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Enabled Row */}
          <div className="flex items-center justify-between py-4 border-b border-gray-700/50">
            <div>
              <p className="text-white font-medium">Enable Integration</p>
              <p className="text-sm text-gray-400 mt-0.5">Toggle CinePro Core backend on or off</p>
            </div>
            <button
              onClick={handleToggleEnabled}
              role="switch"
              aria-checked={isEnabled}
              aria-label="Enable CinePro Integration"
              className="text-gray-400 hover:text-white transition-colors focus:outline-none"
            >
              {isEnabled ? (
                <ToggleRight className="w-10 h-10 text-netflix-red" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-gray-600" />
              )}
            </button>
          </div>

          {/* Prefer CinePro Row */}
          <div className="flex items-center justify-between py-4 border-b border-gray-700/50">
            <div>
              <p className="text-white font-medium">Prefer CinePro Streams</p>
              <p className="text-sm text-gray-400 mt-0.5">Prioritize CinePro server streams over local P-Stream scrapers</p>
            </div>
            <button
              onClick={handleTogglePrefer}
              role="switch"
              aria-checked={preferCinePro && isEnabled}
              aria-label="Prefer CinePro Streams"
              className="text-gray-400 hover:text-white transition-colors focus:outline-none"
              disabled={!isEnabled}
            >
              {preferCinePro && isEnabled ? (
                <ToggleRight className="w-10 h-10 text-netflix-red" />
              ) : (
                <ToggleLeft className="w-10 h-10 text-gray-600 opacity-50" />
              )}
            </button>
          </div>

          {/* Server URL Input */}
          <div className="space-y-2 pt-2">
            <label className="block text-sm text-gray-300 font-medium">Server URL</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                disabled={!isEnabled}
                placeholder="http://localhost:3000"
                className="flex-1 bg-gray-800/80 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-netflix-red transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleTestConnection}
                disabled={!isEnabled || testing}
                className="px-4 py-2 bg-netflix-red hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {testing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {/* Connection Status Panel */}
          {isEnabled && (
            <div className="pt-2">
              {connectionStatus === 'checking' && (
                <div className="flex items-center gap-2 text-yellow-400 text-sm py-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking connection to server...</span>
                </div>
              )}
              {connectionStatus === 'connected' && (
                <div className="flex items-center gap-2 text-green-400 text-sm py-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Successfully connected! Server status operational.</span>
                </div>
              )}
              {connectionStatus === 'disconnected' && (
                <div className="flex items-center gap-2 text-red-400 text-sm py-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Unable to reach CinePro server. Please check the URL and server logs.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Providers Management Card */}
      {isEnabled && connectionStatus === 'connected' && availableProviders.length > 0 && (
        <div className="auth-card rounded-2xl p-6 mb-4 animate-scale-in">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white">Active Scrapers</h3>
            <p className="text-sm text-gray-400 mt-1">
              Select which server-side provider scripts to scrape when fetching streams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {availableProviders.map((provider) => {
              const isProviderEnabled = !disabledProviderIds.includes(provider.id);
              return (
                <button
                  key={provider.id}
                  onClick={() => toggleProvider(provider.id)}
                  aria-pressed={isProviderEnabled}
                  aria-label={`Toggle provider ${provider.name}`}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 text-left ${
                    isProviderEnabled
                      ? 'bg-gray-800/40 border-gray-700 hover:border-gray-600'
                      : 'bg-gray-900/40 border-gray-800/80 opacity-50 hover:opacity-75'
                  }`}
                >
                  <div className="pr-4">
                    <p className={`font-medium ${isProviderEnabled ? 'text-white' : 'text-gray-400'}`}>
                      {provider.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isProviderEnabled ? 'Active' : 'Disabled'}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {isProviderEnabled ? (
                      <Eye className="w-5 h-5 text-green-400" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
