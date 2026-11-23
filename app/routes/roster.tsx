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
import { FIGHTERS, defOf, type FighterDef, type Role } from "~/lib/fighters";
import { FORMS, FORM_NAME, PERFECTED_FLAME, formsOf, type Form, type FormKind } from "~/lib/forms";
import { useHybrids } from "~/lib/hybrids";
import { FusionSheet, HybridParents } from "~/components/fusion-sheet";

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

function FighterCard({ fighter, index }: { fighter: Fighter; index: number | null }) {
  const hybrid = !!fighter.parents;
  return (
    <Panel className="h-full">
      <PanelBody className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full border-4 border-foreground font-display text-xl text-foreground"
            style={{ background: hybrid ? `linear-gradient(90deg, ${fighter.color} 50%, ${fighter.glow} 50%)` : fighter.color }}
          >
            {fighter.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            {index == null ? (
              <Text id="roster.card.hybrid" className="text-xs uppercase tracking-widest text-muted-foreground" />
            ) : (
              <Text
                id="roster.card.number"
                vars={{ n: index + 1 }}
                className="text-xs uppercase tracking-widest text-muted-foreground tabular-nums"
              />
            )}
            <h3 className="font-display text-xl text-foreground">{fighter.name}</h3>
            <HybridParents def={fighter} className="block text-sm text-muted-foreground" />
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
        {!hybrid && formsOf(fighter.id).map((fm) => <FormBlock key={fm.kind} form={fm} />)}
        <div className="mt-auto border-t-2 border-border-subtle pt-4">
          <Text id="roster.card.moves" vars={{ count: fighter.moves.length }} as="p" className="text-xs uppercase tracking-widest text-muted-foreground tabular-nums" />
          <ul className="mt-2 flex flex-col gap-2">
            {fighter.moves.map((m) => (
              <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className={cn("text-foreground", m.id.startsWith("mix-") ? "font-extrabold" : "font-semibold")}>{m.name}</span>
                <Text id={`roster.kind.${m.kind}` as StringKey} className="shrink-0 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </div>
      </PanelBody>
    </Panel>
  );
}

const FORM_TONE: Record<FormKind, "neutral" | "info" | "success" | "warning" | "danger"> = {
  rage: "danger",
  perfected: "danger",
  awakened: "warning",
  mastery: "info",
  mystic: "success",
};

/** A fighter's form: its mode, its own name, what it does and the moves it adds. */
function FormBlock({ form }: { form: Form }) {
  return (
    <div
      data-form-block
      className="rounded-md border-2 border-border-subtle p-3"
      style={{ borderLeftColor: form.a, borderLeftWidth: 6 }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone={FORM_TONE[form.kind]}>{FORM_NAME[form.kind]}</StatusBadge>
        <span className="text-sm font-extrabold tracking-wide text-foreground">{form.title}</span>
      </div>
      <p className="mt-2 text-sm text-foreground-secondary">{form.blurb}</p>
      <Text id="roster.card.formAt" vars={{ at: Math.round(form.at * 100) }} as="p" className="mt-1 text-xs text-muted-foreground tabular-nums" />
      <ul className="mt-2 flex flex-col gap-1">
        {form.moves.map((m) => (
          <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-extrabold text-foreground">{m.name}</span>
            <Text id={`roster.kind.${m.kind}` as StringKey} className="shrink-0 text-muted-foreground" />
          </li>
        ))}
      </ul>
    </div>
  );
}

const FORM_GROUPS: FormKind[] = ["rage", "awakened", "mastery", "mystic", "perfected"];

/** Who has which form, at a glance. */
function FormsOverview() {
  return (
    <section className="mt-8" data-forms-overview>
      <SectionHeading title={<Text id="roster.forms.title" />} />
      <Text id="roster.forms.subtitle" as="p" className="-mt-2 mb-6 max-w-prose text-foreground-secondary" />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {FORM_GROUPS.map((kind) => {
          const members = kind === "perfected" ? [PERFECTED_FLAME] : FIGHTERS.map((f) => FORMS[f.id]).filter((fm) => fm.kind === kind);
          return (
            <li key={kind}>
              <Panel className="h-full">
                <PanelBody className="flex h-full flex-col gap-3">
                  <StatusBadge tone={FORM_TONE[kind]}>{FORM_NAME[kind]}</StatusBadge>
                  <Text id={`roster.forms.${kind}` as StringKey} as="p" className="text-sm text-muted-foreground" />
                  <ul className="flex flex-col gap-2">
                    {members.map((fm) => (
                      <li key={fm.power + fm.kind} className="flex items-center gap-2 text-sm">
                        <span aria-hidden="true" className="size-3 shrink-0 rounded-full border-2 border-foreground" style={{ background: kind === "perfected" ? `linear-gradient(90deg, ${fm.a} 50%, ${fm.b} 50%)` : fm.a }} />
                        <span className="font-semibold text-foreground">{FIGHTERS.find((f) => f.id === fm.power)?.name}</span>
                        <span className="ml-auto truncate text-xs text-muted-foreground">{fm.title}</span>
                      </li>
                    ))}
                  </ul>
                </PanelBody>
              </Panel>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function Roster() {
  const [role, setRole] = useState<Role | "all">("all");
  const shown = FIGHTERS.map((f, i) => ({ f, i })).filter(({ f }) => role === "all" || f.role === role);
  const hybridKeys = useHybrids();
  const hybrids = hybridKeys.map(defOf);
  const shownHybrids = hybrids.filter((f) => role === "all" || f.role === role);

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

      <FormsOverview />

      <div className="mt-12 flex flex-wrap items-center gap-2 py-1.5">
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

      <section className="mt-12" data-roster-hybrids>
        <SectionHeading
          title={<Text id="roster.sectionHybrids" />}
          action={
            <div className="flex items-center gap-3">
              {hybrids.length > 0 && (
                <Text id="roster.hybridCount" vars={{ count: shownHybrids.length }} className="text-sm text-muted-foreground tabular-nums" />
              )}
              <FusionSheet saved={hybridKeys} />
            </div>
          }
        />
        {hybrids.length === 0 ? (
          <EmptyState title={<Text id="roster.hybridsEmpty.title" />} body={<Text id="roster.hybridsEmpty.body" />} />
        ) : shownHybrids.length === 0 ? (
          <Text id="roster.hybridsFiltered" as="p" className="text-sm text-muted-foreground" />
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shownHybrids.map((f, k) => (
              <li key={hybridKeys[hybrids.indexOf(f)] ?? k}>
                <FighterCard fighter={f} index={null} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
