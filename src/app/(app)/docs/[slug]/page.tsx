import { notFound } from "next/navigation";
import { loadContext } from "@/lib/server/data";
import { DocClient } from "./doc-client";

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { db } = await loadContext();
  const doc = db.documents.find((d) => d.slug === slug);
  if (!doc) notFound();
  return <DocClient doc={doc} revisions={db.documentRevisions.filter((r) => r.documentId === doc.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))} />;
}
