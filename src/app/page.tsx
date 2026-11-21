import { Home } from "@/components/home";
import { getCatalog } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ variant?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { variant } = await searchParams;

  return <Home tracks={getCatalog()} initialVariant={variant === "b" ? "b" : "a"} />;
}
