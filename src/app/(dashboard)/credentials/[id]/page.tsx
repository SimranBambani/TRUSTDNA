import type { Metadata } from "next";

export const metadata: Metadata = { title: "Credential Detail" };

export default async function CredentialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div id="credential-detail-page" data-id={id}>{/* CredentialDetail component */}</div>;
}
