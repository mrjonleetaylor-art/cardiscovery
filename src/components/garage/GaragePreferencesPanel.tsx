import { UserPreferences } from '../../types';

export function GaragePreferencesPanel({
  preferences,
  setPreferences,
  onCancel,
  onSave,
}: {
  preferences: Partial<UserPreferences>;
  setPreferences: (next: Partial<UserPreferences>) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
      <h3 className="text-xl font-bold text-slate-900 mb-4">Tell us about your driving habits</h3>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Monthly kilometers driven
          </label>
          <input
            type="number"
            value={preferences.monthly_kms || ''}
            onChange={(e) => setPreferences({ ...preferences, monthly_kms: Number(e.target.value) })}
            placeholder="e.g., 1500"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Driving type</label>
          <select
            value={preferences.driving_type}
            onChange={(e) => setPreferences({ ...preferences, driving_type: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="city">Mostly City</option>
            <option value="highway">Mostly Highway</option>
            <option value="mixed">Mixed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Can you charge a car at home?
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={preferences.can_charge_at_home === true}
                onChange={() => setPreferences({ ...preferences, can_charge_at_home: true })}
                className="w-4 h-4"
              />
              <span className="text-slate-700">Yes</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={preferences.can_charge_at_home === false}
                onChange={() => setPreferences({ ...preferences, can_charge_at_home: false })}
                className="w-4 h-4"
              />
              <span className="text-slate-700">No</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            What matters more to you?
          </label>
          <select
            value={preferences.priority}
            onChange={(e) => setPreferences({ ...preferences, priority: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="reliability">Reliability</option>
            <option value="performance">Performance</option>
            <option value="efficiency">Efficiency</option>
            <option value="luxury">Luxury</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            When do you plan on securing a car?
          </label>
          <select
            value={preferences.timeline}
            onChange={(e) => setPreferences({ ...preferences, timeline: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="0-2 weeks">0-2 weeks</option>
            <option value="2-6 weeks">2-6 weeks</option>
            <option value="6+ weeks">6+ weeks</option>
            <option value="just browsing">Just browsing</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
}
