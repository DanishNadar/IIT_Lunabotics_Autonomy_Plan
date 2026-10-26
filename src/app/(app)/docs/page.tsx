import { loadContext } from "@/lib/server/data";
import { DocsClient } from "./docs-client";

export const metadata = { title: "Knowledge Base" };

export default async function DocsPage() {
  const { db } = await loadContext();
  const docs = db.documents.map((d) => ({ id: d.id, slug: d.slug, title: d.title, category: d.category, tags: d.tags, status: d.status, updatedAt: d.updatedAt, ownerId: d.ownerId, adrStatus: d.adr?.status ?? null, excerpt: d.body.replace(/[#>*`|_-]/g, "").slice(0, 160), body: d.body.toLowerCase() }));
  return <DocsClient docs={docs} />;
}
