import type { Profile } from "@/lib/types";
import Bug from "@/components/game/Bug";

export default function Footer({ profile }: { profile: Profile }) {
  return (
    <footer className="relative border-t border-ink-200/70 py-10 dark:border-ink-900">
      <Bug id="footer" slot={17} className="left-1/2 top-2 -translate-x-1/2" />
      <div className="container-x flex flex-col items-center justify-between gap-4 text-sm text-ink-500 sm:flex-row">
        <p>
          © {new Date().getFullYear()} {profile.name} · {profile.role}
        </p>
        <p className="inline-flex items-center gap-2 font-mono text-xs">
          <span className="h-2 w-2 rounded-full bg-pass-500" />
          all checks passing
        </p>
      </div>
    </footer>
  );
}
