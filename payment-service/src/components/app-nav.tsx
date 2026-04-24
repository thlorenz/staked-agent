import Link from "next/link";

type AppNavProps = {
  current: "home" | "stakers";
};

export function AppNav({ current }: AppNavProps) {
  return (
    <nav className="app-nav" aria-label="Primary">
      <Link
        href="/"
        className={current === "home" ? "nav-link nav-link-active" : "nav-link"}
      >
        Stake
      </Link>
      <Link
        href="/stakers"
        className={
          current === "stakers" ? "nav-link nav-link-active" : "nav-link"
        }
      >
        Stakers
      </Link>
    </nav>
  );
}
