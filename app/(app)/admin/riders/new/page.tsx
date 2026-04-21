import { RiderForm } from "@/components/forms/rider-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewRiderPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Riders"
        title="Add rider"
        description="Set up a rider profile, contact number, bike/vehicle, and active status."
      />
      <RiderForm />
    </div>
  );
}
