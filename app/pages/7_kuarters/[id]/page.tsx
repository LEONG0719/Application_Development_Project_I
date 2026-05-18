import KuartersCategoryDetailPageClient from "./components/KuartersCategoryDetailPageClient";

export const dynamic = "force-dynamic";

type KuartersCategoryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function KuartersCategoryDetailPage({
  params,
}: KuartersCategoryDetailPageProps) {
  const { id } = await params;

  return <KuartersCategoryDetailPageClient categoryId={id} />;
}
