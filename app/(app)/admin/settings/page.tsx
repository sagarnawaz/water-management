import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { businessProfile } from "@/services/mock-data";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Profile and business settings"
        description="Keep the owner profile, business info, and rollout checklist together."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Business info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Name: {businessProfile.businessName}</p>
            <p>Owner: {businessProfile.ownerName}</p>
            <p>Phone: {businessProfile.phone}</p>
            <p>Address: {businessProfile.address}</p>
            <p>Service areas: {businessProfile.serviceAreas.join(", ")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Operational notes</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Use status updates instead of deleting customers, orders, or payments.</p>
            <p>Online claims should remain pending until the owner verifies the transfer.</p>
            <p>Supabase Auth, DB, and Storage are wired through environment variables and migrations in this repo.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
