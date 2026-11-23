import { Home, type Screen } from "@/components/home";
import { getCatalog } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{ variant?: string | string[]; tab?: string | string[]; q?: string | string[] }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { variant, tab, q } = await searchParams;
  const screen: Screen = tab === "search" || tab === "favorites" || tab === "library" ? tab : "home";

  return (
    <Home
      tracks={getCatalog()}
      initialVariant={variant === "b" ? "b" : "a"}
      initialScreen={screen}
      initialQuery={typeof q === "string" ? q : ""}
    />
  );
}
