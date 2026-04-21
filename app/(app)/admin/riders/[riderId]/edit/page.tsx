import { notFound } from "next/navigation";

import { RiderForm } from "@/components/forms/rider-form";
import { PageHeader } from "@/components/layout/page-header";
import { getRider } from "@/services/data";

type EditRiderProps = {
  params: Promise<{ riderId: string }>;
};

export default async function EditRiderPage({ params }: EditRiderProps) {
  const { riderId } = await params;
  const detail = await getRider(riderId);

  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Riders"
        title={`Edit ${detail.rider.name}`}
        description="Update rider details, status, and vehicle information."
      />
      <RiderForm rider={detail.rider} />
    </div>
  );
}
