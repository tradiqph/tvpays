"use client";

import { useParams } from "next/navigation";
import { PageHeader } from "@/components/hq/ui";
import { MemberAuditView } from "@/components/hq/MemberAuditView";

export default function MemberAuditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <>
      <PageHeader
        title="Member audit"
        back={{ href: `/hq/members/${id}`, label: "Member" }}
      />
      <MemberAuditView memberId={id} backHref={`/hq/members/${id}`} />
    </>
  );
}
