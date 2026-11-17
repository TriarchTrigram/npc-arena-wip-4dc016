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

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fighters | NPC Arena" },
    { name: "description", content: "Meet the 16 fighters of NPC Arena and their powers." },
  ];
}

type Role = "attacker" | "control" | "tank" | "support" | "trickster";

const ROLE_TONE: Record<Role, "neutral" | "info" | "success" | "warning" | "danger"> = {
  attacker: "danger",
  control: "info",
  tank: "warning",
  support: "success",
  trickster: "neutral",
};

const ROLES: Role[] = ["attacker", "control", "tank", "support", "trickster"];

type Fighter = {
  id: string;
  name: string;
  power: string;
  color: string;
  ability: string;
  role: Role;
};

const FIGHTERS: Fighter[] = [
  { id: "pyro", name: "Pyro", power: "Pyrokinesis", color: "oklch(0.66 0.21 35)", ability: "Shoots fireballs that leave a short burn.", role: "attacker" },
  { id: "cryo", name: "Cryo", power: "Cryokinesis", color: "oklch(0.78 0.11 225)", ability: "Ice shard that slows its target.", role: "control" },
  { id: "electro", name: "Electro", power: "Electrokinesis", color: "oklch(0.88 0.18 95)", ability: "Lightning that chains to a second nearby enemy.", role: "attacker" },
  { id: "terra", name: "Terra", power: "Geokinesis", color: "oklch(0.52 0.09 55)", ability: "Ground slam that knocks back everyone close. Very tanky.", role: "tank" },
  { id: "aero", name: "Aero", power: "Aerokinesis", color: "oklch(0.84 0.08 185)", ability: "Gust that pushes enemies back. The fastest mover.", role: "control" },
  { id: "hydro", name: "Hydro", power: "Hydrokinesis", color: "oklch(0.6 0.16 250)", ability: "Water wave that hits everything in a line.", role: "attacker" },
  { id: "umbra", name: "Umbra", power: "Shadow manipulation", color: "oklch(0.42 0.17 300)", ability: "Blinks behind its target for a critical strike.", role: "trickster" },
  { id: "lux", name: "Lux", power: "Light manipulation", color: "oklch(0.92 0.1 90)", ability: "Light beam that blinds, so the target misses for a moment.", role: "control" },
  { id: "gravi", name: "Gravi", power: "Gravity control", color: "oklch(0.48 0.18 275)", ability: "Pulls enemies in, then damages them.", role: "control" },
  { id: "tele", name: "Tele", power: "Teleportation", color: "oklch(0.62 0.25 330)", ability: "Teleports at random to dodge attacks.", role: "trickster" },
  { id: "vita", name: "Vita", power: "Healing", color: "oklch(0.7 0.18 145)", ability: "Heals itself and allies over time. Weak attack.", role: "support" },
  { id: "toxi", name: "Toxi", power: "Poison", color: "oklch(0.85 0.2 128)", ability: "Poison cloud that deals damage over time.", role: "attacker" },
  { id: "chrono", name: "Chrono", power: "Time manipulation", color: "oklch(0.78 0.16 70)", ability: "Slows the cooldowns of every enemy nearby.", role: "control" },
  { id: "magneto", name: "Magneto", power: "Magnetism", color: "oklch(0.58 0.2 25)", ability: "Pulls projectiles away and fires metal shards.", role: "tank" },
  { id: "psy", name: "Psy", power: "Telekinesis", color: "oklch(0.76 0.15 350)", ability: "Throws an enemy and stuns it.", role: "control" },
  { id: "shift", name: "Shift", power: "Shapeshifting", color: "oklch(0.8 0.13 200)", ability: "Copies the last power that hit it.", role: "trickster" },
];

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
