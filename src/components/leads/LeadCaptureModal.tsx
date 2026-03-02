import { useState } from 'react';
import { X } from 'lucide-react';
import { StructuredVehicle } from '../../types/specs';
import { supabase } from '../../lib/supabase';

interface LeadCaptureModalProps {
  vehicle: StructuredVehicle;
  trim?: string;
  price?: number;
  onClose: () => void;
}

const TIMELINE_OPTIONS = ['This week', '1–3 months', '3–6 months', 'Just exploring'];
const PAYMENT_OPTIONS = ['Cash', 'Finance', 'Undecided'];

const INPUT = 'w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 text-sm transition-colors';
const LABEL = 'block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2';

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex justify-center gap-2 mb-8">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`w-2 h-2 rounded-full transition-colors ${
            n <= step ? 'bg-slate-900' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

function PillGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
            value === opt
              ? 'bg-slate-900 text-white border-slate-900'
              : 'border-slate-300 text-slate-700 hover:border-slate-900'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function LeadCaptureModal({ vehicle, trim, price, onClose }: LeadCaptureModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Step 2
  const [timeline, setTimeline] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [postcode, setPostcode] = useState('');
  const [mobile, setMobile] = useState('');

  // Step 3
  const [password, setPassword] = useState('');

  const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}${trim ? ` · ${trim}` : ''}`;

  const handleStep1 = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Please enter your name and email.');
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase
      .from('leads')
      .insert({
        session_id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        selected_vehicles: [{ id: vehicle.id, make: vehicle.make, model: vehicle.model, year: vehicle.year, trim: trim ?? null, price_aud: price ?? null }],
      })
      .select('id')
      .single();
    setLoading(false);
    if (err) {
      setError('Something went wrong. Please try again.');
      return;
    }
    setLeadId((data as { id: string }).id);
    setStep(2);
  };

  const handleStep2 = async () => {
    setError(null);
    if (leadId) {
      setLoading(true);
      const { error: err } = await supabase
        .from('leads')
        .update({
          timeline: timeline ?? null,
          payment_method: paymentMethod ?? null,
          postcode: postcode.trim() || null,
          mobile: mobile.trim() || null,
        })
        .eq('id', leadId);
      setLoading(false);
      if (err) {
        setError('Something went wrong. Please try again.');
        return;
      }
    }
    setStep(3);
  };

  const handleCreateAccount = async () => {
    if (!password.trim()) {
      setError('Please enter a password.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl max-w-md w-full p-8 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <StepDots step={step} />

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Find dealers</h2>
            <p className="text-sm text-slate-500 mb-6">{vehicleLabel}{price ? ` · $${price.toLocaleString()}` : ''}</p>

            <div className="space-y-4 mb-6">
              <div>
                <label className={LABEL}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={INPUT}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <button
              type="button"
              onClick={handleStep1}
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-6">A bit more about you</h2>

            <div className="space-y-5 mb-6">
              <div>
                <label className={LABEL}>When are you looking to buy?</label>
                <PillGroup options={TIMELINE_OPTIONS} value={timeline} onChange={setTimeline} />
              </div>
              <div>
                <label className={LABEL}>How will you pay?</label>
                <PillGroup options={PAYMENT_OPTIONS} value={paymentMethod} onChange={setPaymentMethod} />
              </div>
              <div>
                <label className={LABEL}>Postcode</label>
                <input
                  type="text"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  placeholder="e.g. 2000"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Mobile <span className="normal-case font-normal text-slate-400">(optional)</span></label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="04xx xxx xxx"
                  className={INPUT}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <button
              type="button"
              onClick={handleStep2}
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              {loading ? 'Saving…' : 'Continue'}
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Save your shortlist</h2>
            <p className="text-sm text-slate-500 mb-6">Create an account to access your shortlist anytime.</p>

            <div className="mb-6">
              <label className={LABEL}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password"
                className={INPUT}
              />
            </div>

            {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

            <button
              type="button"
              onClick={handleCreateAccount}
              disabled={loading}
              className="w-full px-4 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg font-semibold text-sm transition-colors mb-3"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
