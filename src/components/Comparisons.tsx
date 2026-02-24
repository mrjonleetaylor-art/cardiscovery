import ComparisonPage from './ComparisonPage';

export default function Comparisons({ prefillVehicleId }: { prefillVehicleId?: string | null }) {
  return <ComparisonPage prefillVehicleId={prefillVehicleId} />;
}
