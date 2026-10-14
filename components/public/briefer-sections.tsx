import Image from "next/image";
import { ArrowRight, CheckCircle2, Handshake, MapPin } from "lucide-react";
import {
  OKB_CHALLENGES,
  OKB_DEFINITION,
  OKB_DREDGING_EQUIPMENT,
  OKB_FLOW,
  OKB_ISSUANCES,
  OKB_LAUNCHINGS,
  OKB_MITIGATION,
  OKB_PARADIGM,
  OKB_PARTNERSHIPS,
  OKB_TASK_FORCE,
  OKB_WHOLE_OF_NATION,
} from "@/lib/config/okb-briefer";
import { PublicPageContainer } from "@/components/public/public-page-container";
import { cn } from "@/utils/cn";

/**
 * Sections built from the OKB briefer (see lib/config/okb-briefer.ts). Each one is a full-width band: `home` bands use
 * the Home page's padding and background, the others sit between the public pages' own sections.
 */

function Band({ children, alt = false, id }: { children: React.ReactNode; alt?: boolean; id?: string }) {
  return (
    <section id={id} className={cn("okb-home-section", alt && "okb-home-section--alt")}>
      <PublicPageContainer className="space-y-5">{children}</PublicPageContainer>
    </section>
  );
}

function Head({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return (
    <div>
      <p className="okb-home-kicker">{kicker}</p>
      <h2 className="okb-home-h2">{title}</h2>
      {children ? <p className="okb-home-body mt-2">{children}</p> : null}
    </div>
  );
}

function Bullets({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item) => (
        <li key={item} className="okb-public-body flex gap-2 text-[0.9375rem] leading-snug">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--dpwh-orange)]" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** What Oplan Kontra Baha is, in Filipino and English, with examples. */
export function BrieferWhatIs({ alt = false }: { alt?: boolean } = {}) {
  return (
    <Band alt={alt}>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="space-y-4">
          <Head kicker="The program" title={OKB_DEFINITION.filipino.title} />
          <div className="okb-public-card rounded-sm p-4 sm:p-5">
            {OKB_DEFINITION.filipino.lines.map((line) => (
              <p key={line} className="okb-public-heading text-base leading-snug sm:text-lg">
                {line}
              </p>
            ))}
            <p className="okb-public-body mt-2 text-sm">{OKB_DEFINITION.english}</p>
          </div>
          <div>
            <p className="okb-public-heading text-sm font-semibold uppercase tracking-wide">{OKB_DEFINITION.examplesTitle}</p>
            <Bullets items={OKB_DEFINITION.examples} className="mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Image
            src="/okb-briefer/excavator.webp"
            alt="An amphibious excavator clearing a creek bank"
            width={800}
            height={533}
            className="col-span-2 h-auto w-full rounded-sm object-cover"
            sizes="(min-width: 1024px) 40vw, 100vw"
          />
          <Image
            src="/okb-briefer/cleanup-garbage.webp"
            alt="Workers clearing garbage from a waterway"
            width={700}
            height={875}
            className="aspect-[4/3] w-full rounded-sm object-cover"
            sizes="(min-width: 1024px) 20vw, 50vw"
          />
          <Image
            src="/okb-briefer/cleanup-street.webp"
            alt="Declogging a street drain, Quezon City Second District Engineering Office"
            width={700}
            height={875}
            className="aspect-[4/3] w-full rounded-sm object-cover"
            sizes="(min-width: 1024px) 20vw, 50vw"
          />
        </div>
      </div>
    </Band>
  );
}

/** Then (build, expand, deliver) and now (maintain, preserve, restore). */
export function BrieferParadigm({ alt = true }: { alt?: boolean } = {}) {
  const cols = [
    { data: OKB_PARADIGM.then, image: "/okb-briefer/then.webp", tone: "border-t-[var(--dpwh-border)]" },
    { data: OKB_PARADIGM.now, image: "/okb-briefer/now.webp", tone: "border-t-[var(--dpwh-orange)]" },
  ];
  return (
    <Band alt={alt}>
      <Head kicker="Paradigm shift" title="From building to maintaining">
        Flood control is no longer measured only by what is built, but by whether what exists keeps working.
      </Head>
      <div className="grid gap-4 md:grid-cols-2">
        {cols.map(({ data, image, tone }) => (
          <article key={data.label} className={cn("okb-public-card overflow-hidden rounded-sm border-t-4", tone)}>
            <Image src={image} alt="" width={1000} height={560} className="aspect-video w-full object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
            <div className="space-y-3 p-4 sm:p-5">
              <p className="text-[0.6875rem] font-extrabold uppercase tracking-[0.18em] text-[var(--dpwh-orange-dark)]">{data.label}</p>
              <h3 className="okb-public-heading text-xl sm:text-2xl">{data.motto}</h3>
              <Bullets items={data.points} />
            </div>
          </article>
        ))}
      </div>
    </Band>
  );
}

/** The five challenges and the solution for each. */
export function BrieferChallenges({ alt = false }: { alt?: boolean } = {}) {
  return (
    <Band alt={alt}>
      <Head kicker="Challenges and solutions" title="What stops the water, and what clears it" />
      <ol className="grid gap-3 md:grid-cols-2">
        {OKB_CHALLENGES.map((item, i) => (
          <li key={item.challenge} className="okb-public-card flex gap-3 rounded-sm p-4">
            <span className="okb-public-accent-blue text-3xl font-bold leading-none">{i + 1}</span>
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--dpwh-orange-dark)]">Challenge</p>
              <p className="okb-public-heading text-base leading-snug">{item.challenge}</p>
              <p className="flex items-start gap-1.5 text-sm font-semibold text-[var(--dpwh-blue)]">
                <ArrowRight className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{item.solution}</span>
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Band>
  );
}

/** The four launchings so far. */
export function BrieferLaunchings({ alt = true }: { alt?: boolean } = {}) {
  return (
    <Band alt={alt}>
      <Head kicker="On the ground" title="Previous OKB launchings" />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {OKB_LAUNCHINGS.map((l) => (
          <li key={l.place} className="okb-public-card overflow-hidden rounded-sm">
            <Image src={l.image} alt={`${l.place}: ${l.where}`} width={800} height={450} className="aspect-video w-full object-cover" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" />
            <div className="space-y-1 p-3">
              <p className="okb-public-heading text-base">{l.place}</p>
              <p className="okb-public-body flex items-start gap-1 text-sm leading-snug">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--dpwh-orange)]" aria-hidden />
                {l.where}
              </p>
              <p className="text-xs font-semibold text-[var(--dpwh-blue)]">{l.date}</p>
            </div>
          </li>
        ))}
      </ul>
    </Band>
  );
}

/** Short-term and long-term flood mitigation. */
export function BrieferMitigation({ alt = false }: { alt?: boolean } = {}) {
  return (
    <Band alt={alt}>
      <Head kicker="Flood control concept" title="Short-term and long-term mitigation" />
      <div className="grid gap-4 md:grid-cols-2">
        <article className="okb-public-card rounded-sm p-4 sm:p-5">
          <h3 className="okb-public-heading text-lg">Short-term flood mitigation</h3>
          <p className="okb-public-body mt-1 text-sm">What Oplan Kontra Baha does now.</p>
          <Bullets items={OKB_MITIGATION.shortTerm} className="mt-3" />
        </article>
        <article className="okb-public-card okb-public-card-blue rounded-sm p-4 sm:p-5">
          <h3 className="okb-public-heading text-lg">Long-term flood mitigation</h3>
          <p className="okb-public-body mt-1 text-sm">The lasting infrastructure that follows.</p>
          <Bullets items={OKB_MITIGATION.longTerm} className="mt-3" />
        </article>
      </div>
    </Band>
  );
}

/** The five steps of an OKB operation. */
export function BrieferFlow({ alt = true }: { alt?: boolean } = {}) {
  return (
    <Band alt={alt}>
      <Head kicker="How an operation runs" title="General flow of activities" />
      <ol className="grid gap-2 sm:grid-cols-5">
        {OKB_FLOW.map((step, i) => (
          <li key={step} className="flex items-center gap-3 rounded-sm bg-[var(--dpwh-blue-dark)] p-3 text-white sm:flex-col sm:items-start sm:gap-2">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--dpwh-orange)] text-sm font-extrabold">{i + 1}</span>
            <span className="text-sm font-semibold leading-snug">{step}</span>
          </li>
        ))}
      </ol>
    </Band>
  );
}

/** Dredging equipment status: totals and a table that stacks on phones. */
export function BrieferEquipment({ alt = false }: { alt?: boolean } = {}) {
  const e = OKB_DREDGING_EQUIPMENT;
  const stats = [
    { label: "Operating", value: e.operating, tone: "text-[#15803d]" },
    { label: "Idle", value: e.idle, tone: "text-[var(--dpwh-blue)]" },
    { label: "For repair", value: e.forRepair, tone: "text-[var(--dpwh-orange-dark)]" },
    { label: "For disposal", value: e.forDisposal, tone: "text-[#b91c1c]" },
  ];
  return (
    <Band alt={alt}>
      <Head kicker="Equipment" title="Dredging equipment status">
        {e.total} units listed in the OKB briefer; {Math.round((e.operating / e.total) * 1000) / 10}% are operating. The reporting date is not stated in the source.
      </Head>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="okb-public-card rounded-sm p-4">
            <dd className={cn("text-4xl font-bold leading-none tabular-nums", s.tone)}>{s.value}</dd>
            <dt className="okb-public-body mt-1 text-xs font-semibold uppercase tracking-wide">{s.label}</dt>
          </div>
        ))}
      </dl>
      {/* Phones: one card per equipment type. */}
      <ul className="space-y-2 sm:hidden">
        {e.rows.map((r) => (
          <li key={r.type} className="okb-public-card rounded-sm p-3">
            <p className="okb-public-heading text-sm">
              {r.type} <span className="text-[var(--dpwh-muted)]">· {r.total} units</span>
            </p>
            <p className="okb-public-body mt-1 text-xs">
              Operating {r.operating} · Idle {r.idle} · For repair {r.forRepair} · For disposal {r.forDisposal}
            </p>
          </li>
        ))}
      </ul>
      <div className="okb-public-card hidden overflow-x-auto rounded-sm sm:block">
        <table className="w-full text-sm">
          <thead className="bg-[var(--dpwh-blue-dark)] text-left text-white">
            <tr>
              {["Equipment type", "Operating", "Idle", "For repair", "For disposal", "Total"].map((h, i) => (
                <th key={h} className={cn("px-3 py-2 font-semibold", i > 0 && "text-right")}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--dpwh-border)]">
            {e.rows.map((r) => (
              <tr key={r.type}>
                <th scope="row" className="px-3 py-2 text-left font-medium text-[var(--dpwh-blue-dark)]">
                  {r.type}
                </th>
                {[r.operating, r.idle, r.forRepair, r.forDisposal, r.total].map((v, i) => (
                  <td key={i} className={cn("px-3 py-2 text-right tabular-nums", i === 4 && "font-semibold")}>
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-[var(--dpwh-blue-dark)] font-bold">
            <tr>
              <th scope="row" className="px-3 py-2 text-left">Total</th>
              {[e.operating, e.idle, e.forRepair, e.forDisposal, e.total].map((v, i) => (
                <td key={i} className="px-3 py-2 text-right tabular-nums">
                  {v}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </Band>
  );
}

/** The Task Force leadership. */
export function BrieferTaskForce({ alt = true }: { alt?: boolean } = {}) {
  return (
    <Band alt={alt}>
      <Head kicker="Leadership" title="Oplan Kontra Baha Task Force" />
      <ul className="grid gap-3 sm:grid-cols-3">
        {OKB_TASK_FORCE.map((p) => (
          <li key={p.name} className="okb-public-card flex items-center gap-4 rounded-sm p-3 sm:flex-col sm:items-start sm:p-4">
            <Image src={p.image} alt={p.name} width={480} height={480} className="size-20 shrink-0 rounded-full border-4 border-[var(--dpwh-orange)] object-cover sm:size-28" />
            <div className="min-w-0">
              <p className="okb-public-heading text-base leading-snug">{p.name}</p>
              <p className="okb-public-body text-sm leading-snug">{p.role}</p>
              <p className="text-xs font-semibold text-[var(--dpwh-blue)]">{p.office}</p>
            </div>
          </li>
        ))}
      </ul>
    </Band>
  );
}

/** Who is in charge, and the inter-agency support the whole-of-nation approach needs. */
export function BrieferWholeOfNation({ alt = false }: { alt?: boolean } = {}) {
  const w = OKB_WHOLE_OF_NATION;
  return (
    <Band alt={alt}>
      <Head kicker="Whole of Nation (WON)" title="Sino-sino ang in charge?">
        {w.lead}
      </Head>
      <div className="grid gap-4 lg:grid-cols-2">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {w.partners.map((p) => (
            <li key={p.who} className="okb-public-card rounded-sm p-3">
              <p className="okb-public-heading text-base">{p.who}</p>
              <p className="okb-public-body text-sm leading-snug">{p.detail}</p>
            </li>
          ))}
          <li className="okb-public-card okb-public-card-blue rounded-sm p-3 sm:col-span-2 lg:col-span-1">
            <p className="okb-public-heading text-base">Private sectors involved</p>
            <p className="okb-public-body text-sm">{w.privateSector.join(" · ")}</p>
          </li>
        </ul>
        <div className="okb-public-card rounded-sm p-4 sm:p-5">
          <h3 className="okb-public-heading text-lg">Inter-agency support needed</h3>
          <Bullets items={w.support} className="mt-3" />
        </div>
      </div>
    </Band>
  );
}

/** National–local and government–private partnership. */
export function BrieferPartnerships({ alt = true }: { alt?: boolean } = {}) {
  const blocks = [OKB_PARTNERSHIPS.nationalLocal, OKB_PARTNERSHIPS.publicPrivate];
  return (
    <Band alt={alt}>
      <Head kicker="Partnerships" title="Shared responsibility, shared results" />
      <div className="grid gap-4 lg:grid-cols-2">
        {blocks.map((b) => (
          <article key={b.title} className="okb-public-card rounded-sm p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <Handshake className="mt-1 size-6 shrink-0 text-[var(--dpwh-orange)]" aria-hidden />
              <div>
                <h3 className="okb-public-heading text-lg leading-snug">{b.title}</h3>
                <p className="okb-public-body text-sm">{b.subtitle}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[b.left, b.right].map((side) => (
                <div key={side.label}>
                  <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--dpwh-orange-dark)]">{side.label}</p>
                  <Bullets items={side.items} className="mt-2" />
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-sm bg-[var(--dpwh-blue-dark)] p-3 text-white">
              <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--dpwh-gold)]">Shared commitments</p>
              <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {b.shared.map((s) => (
                  <li key={s}>• {s}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </Band>
  );
}

/** The presidential directives and DPWH special orders behind the program. */
export function BrieferIssuances({ alt = false }: { alt?: boolean } = {}) {
  return (
    <Band alt={alt}>
      <Head kicker="Legal basis" title="Issuances" />
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {OKB_ISSUANCES.map((i) => (
          <li key={i.code} className="okb-public-card rounded-sm p-3">
            <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--dpwh-orange-dark)]">{i.kind}</p>
            <p className="okb-public-heading text-base leading-snug">{i.code}</p>
          </li>
        ))}
      </ul>
    </Band>
  );
}
