import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/roster";
import { Text, useString } from "~stencil/ui/strings";
import type { StringKey } from "~stencil/types/strings";
import { Button } from "~/components/ui/button";
import {
  PageContainer,
  PageHeader,
  SectionHeading,
  Panel,
  PanelBody,
  StatusBadge,
  EmptyState,
} from "~/components/design";
import { cn } from "~/lib/utils";
import { FIGHTERS, type FighterDef, type Role } from "~/lib/fighters";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fighters | NPC Arena" },
    { name: "description", content: "Meet the 16 fighters of NPC Arena and their powers." },
  ];
}

const ROLE_TONE: Record<Role, "neutral" | "info" | "success" | "warning" | "danger"> = {
  attacker: "danger",
  control: "info",
  tank: "warning",
  support: "success",
  trickster: "neutral",
};

const ROLES: Role[] = ["attacker", "control", "tank", "support", "trickster"];

type Fighter = FighterDef;

function TopBar() {
  const navLabel = useString("roster.navLabel");
  return (
    <nav aria-label={navLabel} className="mb-6 flex flex-wrap items-center gap-2">
      <Text id="common.appName" className="mr-auto font-display text-lg" />
      <Button asChild variant="ghost" size="sm">
        <Link to="/">
          <Text id="common.arena" />
        </Link>
      </Button>
      <Button asChild variant="secondary" size="sm">
        <Link to="/roster" aria-current="page">
          <Text id="common.fighters" />
        </Link>
      </Button>
    </nav>
  );
}

function FighterCard({ fighter, index }: { fighter: Fighter; index: number }) {
  return (
    <Panel className="h-full">
      <PanelBody className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full border-4 border-foreground font-display text-xl text-foreground"
            style={{ backgroundColor: fighter.color }}
          >
            {fighter.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <Text
              id="roster.card.number"
              vars={{ n: index + 1 }}
              className="text-xs uppercase tracking-widest text-muted-foreground tabular-nums"
            />
            <h3 className="font-display text-xl text-foreground">{fighter.name}</h3>
          </div>
          <StatusBadge tone={ROLE_TONE[fighter.role]}>
            <Text id={`roster.role.${fighter.role}` as StringKey} />
          </StatusBadge>
        </div>
        <div>
          <Text id="roster.card.power" as="p" className="text-xs uppercase tracking-widest text-muted-foreground" />
          <p className="text-foreground">{fighter.power}</p>
        </div>
        <div>
          <Text id="roster.card.ability" as="p" className="text-xs uppercase tracking-widest text-muted-foreground" />
          <p className="text-foreground-secondary">{fighter.ability}</p>
        </div>
        <div className="mt-auto border-t-2 border-border-subtle pt-4">
          <Text id="roster.card.moves" vars={{ count: fighter.moves.length }} as="p" className="text-xs uppercase tracking-widest text-muted-foreground tabular-nums" />
          <ul className="mt-2 flex flex-col gap-2">
            {fighter.moves.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-semibold text-foreground">{m.name}</span>
                <Text id={`roster.kind.${m.kind}` as StringKey} className="shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </div>
      </PanelBody>
    </Panel>
  );
}

export default function Roster() {
  const [role, setRole] = useState<Role | "all">("all");
  const shown = FIGHTERS.map((f, i) => ({ f, i })).filter(({ f }) => role === "all" || f.role === role);

  return (
    <PageContainer>
      <TopBar />
      <PageHeader
        eyebrow={<Text id="roster.eyebrow" />}
        title={<Text id="roster.title" />}
        subtitle={<Text id="roster.subtitle" />}
        actions={
          <Button asChild>
            <Link to="/">
              <Text id="roster.cta" />
            </Link>
          </Button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2 py-1.5">
        <Text id="roster.filter.label" className="mr-2 text-sm text-muted-foreground" />
        <Button size="sm" variant={role === "all" ? "default" : "outline"} onClick={() => setRole("all")}>
          <Text id="roster.filter.all" />
        </Button>
        {ROLES.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={role === r ? "default" : "outline"}
            onClick={() => setRole(r)}
            aria-pressed={role === r}
          >
            <Text id={`roster.role.${r}` as StringKey} />
          </Button>
        ))}
      </div>

      <div className="mt-6">
        <SectionHeading
          title={<Text id="roster.sectionAll" />}
          action={
            <Text id="roster.count" vars={{ count: shown.length }} className="text-sm text-muted-foreground tabular-nums" />
          }
        />
        {shown.length === 0 ? (
          <EmptyState
            title={<Text id="roster.empty.title" />}
            body={<Text id="roster.empty.body" />}
            action={
              <Button variant="outline" onClick={() => setRole("all")}>
                <Text id="roster.empty.action" />
              </Button>
            }
          />
        ) : (
          <ul className={cn("grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4")}>
            {shown.map(({ f, i }) => (
              <li key={f.id}>
                <FighterCard fighter={f} index={i} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
