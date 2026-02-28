import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { VehicleConfigSelection } from '../../types/config';
import { ResolvedVehicle } from '../../lib/resolveConfiguredVehicle';
import { StructuredVehicle } from '../../types/specs';
import { VehicleConfigurationControls } from '../config/VehicleConfigurationControls';

export function VehicleProfileContent({
  vehicle,
  allVehicles,
  selection,
  resolvedData,
  onSelectionChange,
  mode,
  showTrimOptions,
}: {
  vehicle: StructuredVehicle;
  allVehicles: StructuredVehicle[];
  selection: VehicleConfigSelection;
  resolvedData: ResolvedVehicle | null;
  onSelectionChange: (patch: Partial<VehicleConfigSelection>) => void;
  mode: 'page' | 'modal';
  showTrimOptions: boolean;
}) {
  const isModal = mode === 'modal';
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroError, setHeroError] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['trim-options', 'efficiency', 'performance', 'connectivity', 'safety']),
  );

  const similarVehicles = useMemo(() => {
    const bodyType = vehicle.trims[0]?.specs.overview.bodyType;
    return allVehicles
      .filter((v) => v.id !== vehicle.id && v.trims[0]?.specs.overview.bodyType === bodyType)
      .slice(0, 3);
  }, [vehicle, allVehicles]);

  const specs = resolvedData?.specs;
  const heroSrc =
    resolvedData?.heroImageUrl ??
    resolvedData?.resolvedImages[heroIndex] ??
    vehicle.images[heroIndex] ??
    vehicle.images[0] ??
    null;
  const gallery = resolvedData?.resolvedImages ?? vehicle.images;

  useEffect(() => {
    setHeroIndex(0);
  }, [resolvedData?.resolvedImages.join(',')]);

  useEffect(() => {
    setHeroError(false);
  }, [heroSrc]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <>
      {isModal ? (
        <div className="h-[180px] sm:h-[220px] mb-4 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
          {heroSrc && !heroError ? (
            <img
              src={heroSrc}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="max-w-full max-h-full object-contain"
              onError={() => setHeroError(true)}
            />
          ) : (
            <span className="text-sm text-slate-400">No Image Available</span>
          )}
        </div>
      ) : (
        <div className="bg-slate-200 rounded-xl overflow-hidden aspect-[16/9] mb-3">
          {heroSrc && !heroError ? (
            <img
              src={heroSrc}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover"
              onError={() => setHeroError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              No Image Available
            </div>
          )}
        </div>
      )}

      {gallery.length > 1 && (
        <div className={`flex overflow-x-auto pb-1 ${isModal ? 'gap-1.5 mb-4' : 'gap-2 mb-6'}`}>
          {gallery.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setHeroIndex(i)}
              className={`flex-shrink-0 rounded overflow-hidden border-2 transition-all ${
                isModal ? 'w-12 h-8' : 'w-16 h-11'
              } ${
                i === heroIndex ? 'border-slate-900' : 'border-transparent hover:border-slate-300'
              }`}
            >
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  const btn = (e.target as HTMLImageElement).closest('button') as HTMLElement | null;
                  if (btn) btn.style.display = 'none';
                }}
              />
            </button>
          ))}
        </div>
      )}

      <div className={`bg-white rounded-xl ${isModal ? 'p-6 mb-4' : 'p-8 mb-6'}`}>
        <h2 className={`${isModal ? 'text-lg mb-4' : 'text-xl mb-6'} font-bold text-slate-900`}>Overview</h2>

        <div className={`grid md:grid-cols-2 ${isModal ? 'gap-6' : 'gap-8'}`}>
          <div className="space-y-4">
            <SpecRow label="Body Type" value={specs?.overview.bodyType || 'N/A'} />
            <SpecRow label="Fuel Type" value={specs?.overview.fuelType || 'N/A'} />
            <SpecRow label="Drivetrain" value={specs?.overview.drivetrain || 'N/A'} />
            <SpecRow label="Transmission" value={specs?.overview.transmission || 'N/A'} />
            <SpecRow label="Seating" value={specs?.overview.seating ? `${specs.overview.seating} seats` : 'N/A'} />
            <SpecRow label="Warranty" value={specs?.overview.warranty || 'N/A'} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Positioning</h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {vehicle.aiSummary || `The ${vehicle.year} ${vehicle.make} ${vehicle.model} offers a compelling blend of practicality and performance.`}
            </p>
          </div>
        </div>
      </div>

      {showTrimOptions && (
        <AccordionSection
          title="Trim & Options"
          isExpanded={expandedSections.has('trim-options')}
          onToggle={() => toggleSection('trim-options')}
          compact={isModal}
        >
          <VehicleConfigurationControls
            vehicle={vehicle}
            selection={selection}
            onChange={onSelectionChange}
            onHeroReset={() => setHeroIndex(0)}
            mode="panel"
            showPacks={true}
            showConfigGroups={true}
            showDescriptions={true}
          />
        </AccordionSection>
      )}

      <AccordionSection
        title="Efficiency"
        isExpanded={expandedSections.has('efficiency')}
        onToggle={() => toggleSection('efficiency')}
        compact={isModal}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <SpecRow label="Fuel Economy" value={specs?.efficiency.fuelEconomy || 'N/A'} />
            <SpecRow label="Real-World Estimate" value={specs?.efficiency.realWorldEstimate || 'N/A'} />
            <SpecRow label="Fuel Tank" value={specs?.efficiency.fuelTank || 'N/A'} />
            <SpecRow label="Range Estimate" value={specs?.efficiency.estimatedRange || 'N/A'} />
            <SpecRow label="Service Interval" value={specs?.efficiency.serviceInterval || 'N/A'} />
            <SpecRow label="Annual Running Cost" value={specs?.efficiency.annualRunningCost || 'N/A'} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Ownership Feel</h4>
            <p className="text-sm text-slate-600">
              {specs?.efficiency.ownershipSummary || 'Affordable daily operation with standard servicing needs'}
            </p>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Performance"
        isExpanded={expandedSections.has('performance')}
        onToggle={() => toggleSection('performance')}
        compact={isModal}
      >
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <SpecRow label="Power" value={specs?.performance.power || 'N/A'} />
              <SpecRow label="Torque" value={specs?.performance.torque || 'N/A'} />
              <SpecRow label="0-100 km/h" value={specs?.performance.zeroToHundred || 'N/A'} />
              <SpecRow label="Top Speed" value={specs?.performance.topSpeed || 'N/A'} />
            </div>
            <div className="space-y-4">
              <SpecRow label="Weight" value={specs?.performance.weight || 'N/A'} />
              <SpecRow label="Power to Weight" value={specs?.performance.powerToWeight || 'N/A'} />
              <SpecRow label="Engine" value={specs?.performance.engine || 'N/A'} />
              <SpecRow label="Suspension" value={specs?.performance.suspension || 'N/A'} />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Driving Character</h4>
            <p className="text-sm text-slate-600">
              {specs?.performance.drivingCharacter || 'Comfortable and composed driving experience with a focus on refinement.'}
            </p>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Connectivity"
        isExpanded={expandedSections.has('connectivity')}
        onToggle={() => toggleSection('connectivity')}
        compact={isModal}
      >
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <SpecRow label="Screen Size" value={specs?.connectivity.screenSize || 'N/A'} />
              <SpecRow label="Digital Cluster" value={specs?.connectivity.digitalCluster || 'N/A'} />
              <SpecRow label="Apple CarPlay" value={specs?.connectivity.appleCarPlay || 'N/A'} />
              <SpecRow label="Android Auto" value={specs?.connectivity.androidAuto || 'N/A'} />
            </div>
            <div className="space-y-4">
              <SpecRow label="Wireless Charging" value={specs?.connectivity.wirelessCharging || 'N/A'} />
              <SpecRow label="Sound System" value={specs?.connectivity.soundSystem || 'N/A'} />
              <SpecRow label="App Support" value={specs?.connectivity.appSupport || 'N/A'} />
              <SpecRow label="OTA Updates" value={specs?.connectivity.otaUpdates || 'N/A'} />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-2">Tech Summary</h4>
            <p className="text-sm text-slate-600">
              {specs?.connectivity.techSummary || 'Modern connectivity suite with intuitive interfaces.'}
            </p>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="Safety"
        isExpanded={expandedSections.has('safety')}
        onToggle={() => toggleSection('safety')}
        compact={isModal}
      >
        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <SpecRow label="ANCAP Rating" value={specs?.safety.ancapRating || 'N/A'} />
              <SpecRow label="Airbags" value={specs?.safety.airbags ? `${specs.safety.airbags} airbags` : 'N/A'} />
              <SpecRow label="AEB" value={specs?.safety.aeb || 'N/A'} />
              <SpecRow label="Lane Keep Assist" value={specs?.safety.laneKeepAssist || 'N/A'} />
            </div>
            <div className="space-y-4">
              <SpecRow label="Adaptive Cruise" value={specs?.safety.adaptiveCruise || 'N/A'} />
              <SpecRow label="Blind Spot Monitor" value={specs?.safety.blindSpotMonitoring || 'N/A'} />
              <SpecRow label="Rear Cross Traffic" value={specs?.safety.rearCrossTraffic || 'N/A'} />
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-600">
              {specs?.safety.safetySummary || 'Comprehensive safety package with strong crash test ratings and modern active safety features.'}
            </p>
          </div>
        </div>
      </AccordionSection>

      {similarVehicles.length > 0 && (
        <div className={`bg-white rounded-xl ${isModal ? 'p-6 mt-4' : 'p-8 mt-6'}`}>
          <h2 className={`${isModal ? 'text-lg mb-4' : 'text-xl mb-6'} font-bold text-slate-900`}>Similar Alternatives</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {similarVehicles.map((similar) => (
              <div
                key={similar.id}
                className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => window.dispatchEvent(new CustomEvent('view-vehicle', { detail: { vehicleId: similar.id } }))}
              >
                <div className="aspect-video bg-slate-100">
                  {similar.images[0] && (
                    <img src={similar.images[0]} alt={`${similar.make} ${similar.model}`} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-slate-900">{similar.make} {similar.model}</h4>
                  <p className="text-sm text-slate-600">{similar.year}</p>
                  <p className="text-sm font-bold text-slate-900 mt-2">
                    ${similar.trims[0]?.basePrice.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function AccordionSection({
  title,
  isExpanded,
  onToggle,
  children,
  compact = false,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl overflow-hidden mb-4">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center justify-between hover:bg-slate-50 transition-colors ${compact ? 'p-4' : 'p-6'}`}
      >
        <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-bold text-slate-900`}>{title}</h2>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-slate-600" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-600" />
        )}
      </button>
      {isExpanded && (
        <div className={compact ? 'px-4 pb-4' : 'px-6 pb-6'}>
          {children}
        </div>
      )}
    </div>
  );
}
