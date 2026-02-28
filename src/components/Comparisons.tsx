import { StructuredVehicle } from '../types/specs';
import ComparisonPage from './ComparisonPage';

export default function Comparisons({
  vehicles,
  prefillVehicleIdA,
  prefillVehicleIdB,
}: {
  vehicles: StructuredVehicle[];
  prefillVehicleIdA?: string | null;
  prefillVehicleIdB?: string | null;
}) {
  return (
    <ComparisonPage
      vehicles={vehicles}
      prefillVehicleIdA={prefillVehicleIdA}
      prefillVehicleIdB={prefillVehicleIdB}
    />
  );
}
