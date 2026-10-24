import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PublicPageHero, PublicPageSection } from "@/components/public";
import { PRIVACY_POLICY } from "@/lib/config/privacy-policy";
import { APP, PUBLIC_ROUTES } from "@/lib/constants";

/*
 * Privacy Policy for the public website, OKB Mobile (/report-flood), the OKB Command Center and Admin.
 * Every statement about how the system works comes from docs/privacy-policy-audit.md; keep the two in step
 * when a feature changes. Organizational facts the code cannot tell (controller, DPO, retention) come from
 * lib/config/privacy-policy.ts and show as marked placeholders until confirmed.
 */

const draft = PRIVACY_POLICY.status === "draft";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How the ${APP.program} website, OKB Mobile flood reports and the OKB Command Center collect, use and share information.`,
  // A draft with placeholders stays out of search results.
  robots: draft ? { index: false, follow: true } : { index: true, follow: true },
};

function longDate(iso: string): string {
  return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Manila" }).format(
    new Date(`${iso}T00:00:00+08:00`),
  );
}

/** A detail the responsible office still has to supply. */
function Pending({ children }: { children: ReactNode }) {
  return (
    <mark className="rounded-sm bg-amber-100 px-1 py-0.5 font-semibold text-amber-900 not-italic">
      [To be confirmed: {children}]
    </mark>
  );
}

function Value({ value, missing }: { value: string | null; missing: string }) {
  return value ? <>{value}</> : <Pending>{missing}</Pending>;
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="okb-public-link break-words">
      {children}
    </a>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="mt-3">{children}</p>;
}

function List({ children }: { children: ReactNode }) {
  return <ul className="mt-3 list-disc space-y-2 pl-5 marker:text-[var(--dpwh-blue)]">{children}</ul>;
}

function Sub({ children }: { children: ReactNode }) {
  return <h3 className="okb-public-heading mt-6 text-lg">{children}</h3>;
}

/** Stacked cards on phones, a table where it fits. */
function DataTable({ head, rows }: { head: readonly [string, string, string]; rows: readonly (readonly [string, ReactNode, ReactNode])[] }) {
  return (
    <>
      <ul className="mt-4 space-y-3 md:hidden">
        {rows.map(([what, detail, why]) => (
          <li key={what} className="okb-public-card rounded-sm p-4">
            <p className="font-semibold text-[var(--dpwh-blue-dark)]">{what}</p>
            <p className="mt-2 text-sm">
              <span className="okb-public-label block">{head[1]}</span>
              {detail}
            </p>
            <p className="mt-2 text-sm">
              <span className="okb-public-label block">{head[2]}</span>
              {why}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-[var(--dpwh-blue)] text-[var(--dpwh-blue-dark)]">
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-2 align-bottom font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([what, detail, why]) => (
              <tr key={what} className="border-b border-slate-200 align-top">
                <th scope="row" className="w-1/5 px-3 py-3 font-semibold text-[var(--dpwh-blue-dark)]">
                  {what}
                </th>
                <td className="px-3 py-3">{detail}</td>
                <td className="w-1/3 px-3 py-3">{why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface PolicySection {
  id: string;
  title: string;
  body: ReactNode;
}

const SECTIONS: readonly PolicySection[] = [
  {
    id: "scope",
    title: "Introduction and scope",
    body: (
      <>
        <P>
          This Privacy Policy explains what information is collected when you use the {APP.program} (OKB) website, how it is
          used, who receives it and what choices you have. It is written to meet the transparency requirements of the Data
          Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations.
        </P>
        <P>It covers these parts of the same website:</P>
        <List>
          <li>
            <strong>The public website</strong> — program information, accomplishments, the Gallery and the other public pages.
          </li>
          <li>
            <strong>OKB Mobile</strong> (<Link href={PUBLIC_ROUTES.reportFlood} className="okb-public-link">/report-flood</Link>) —
            a phone page where members of the public send geotagged flood photos and videos and see reported floods on a map.
          </li>
          <li>
            <strong>The OKB Command Center</strong> (<Link href={PUBLIC_ROUTES.commandCenter} className="okb-public-link">/command</Link>) —
            maps, dashboards and report views used for flood operations. Some of its pages can be viewed without signing in;
            some areas ask for an operator access key.
          </li>
          <li>
            <strong>Admin</strong> — pages for the site administrators, opened only with an administrator key.
          </li>
        </List>
        <P>
          It also describes, at a general level, the flood reports that reach the Command Center from WhatsApp and Viber
          monitoring groups through a separate system, the OKB Report Bridge.
        </P>
        <P>
          This policy does not cover other websites we link to, such as the DPWH official website, Google Drive, YouTube or
          Floodwatch. They have their own policies.
        </P>
      </>
    ),
  },
  {
    id: "controller",
    title: "Who is responsible for your information",
    body: (
      <>
        <P>
          The Personal Information Controller for this website is <Value value={PRIVACY_POLICY.controller} missing="legal name of the responsible office" />.
        </P>
        <List>
          <li>
            Address: <Value value={PRIVACY_POLICY.address} missing="mailing address" />
          </li>
          <li>
            Privacy e-mail: <Value value={PRIVACY_POLICY.privacyEmail} missing="privacy contact e-mail" />
          </li>
          <li>
            Data Protection Officer: <Value value={PRIVACY_POLICY.dpo} missing="Data Protection Officer and contact" />
          </li>
        </List>
        <P>
          The website carries the {APP.program} name and refers to the Department of Public Works and Highways (DPWH). This
          policy does not by itself state that the website is an official DPWH website; see the{" "}
          <Ext href="https://www.dpwh.gov.ph">DPWH official website</Ext>{" "}for DPWH&apos;s own privacy notice.
        </P>
      </>
    ),
  },
  {
    id: "collect",
    title: "Information we collect",
    body: (
      <>
        <P>We collect only what each feature below needs. Features you do not use collect nothing from you.</P>

        <Sub>When you visit any page</Sub>
        <DataTable
          head={["Information", "What exactly", "Why"]}
          rows={[
            [
              "Page views",
              <>
                The page address and title, the website you came from (first page of a visit only), your screen size and
                browser language, and the device type, browser and operating system read from your browser&apos;s user agent.
              </>,
              "To count visits and see which pages are used, shown to administrators as totals.",
            ],
            [
              "Approximate location",
              <>
                The city, region and country our hosting provider (Vercel) estimates from your connection. <strong>Your IP
                address is not stored</strong> with page views.
              </>,
              "To see where visitors are, at city level.",
            ],
            [
              "Visitor and session codes",
              <>Two random codes kept in cookies (see Cookies below). They contain no name or contact details.</>,
              "To tell new from returning visitors and group pages into one visit.",
            ],
          ]}
        />
        <P>Page views on the Admin pages and requests from known bots are not recorded.</P>

        <Sub>When you send a flood report on OKB Mobile</Sub>
        <DataTable
          head={["Information", "What exactly", "Required?"]}
          rows={[
            [
              "Photos and video",
              <>
                Up to 5 photos and optionally one short video (no sound). The page prints the time and GPS position on each
                photo and saves them in the photo file (EXIF). While a video is recorded, the page also records where the
                phone is about once a second.
              </>,
              "At least one photo or a video is required.",
            ],
            [
              "Location",
              <>
                Your phone&apos;s GPS position and its accuracy, asked for with your browser&apos;s permission, plus the place
                name and road we look up from those coordinates.
              </>,
              "Required — a report must show where the flood is.",
            ],
            [
              "Flood details",
              <>
                Flood level or depth, whether the road is passable, the weather, when the flood started and receded, the
                location text, a landmark, remarks and, optionally, the District Engineering Office.
              </>,
              "Level, location and times are required; the rest is optional.",
            ],
            ["Your name", "Whatever you type in the name box.", "Optional. Leave it empty to report anonymously."],
            ["Your mobile number", "Whatever you type in the number box.", "Optional."],
            [
              "Edit key",
              <>
                A random secret returned to your phone so that you, and only someone with the key, can edit or delete your
                report. We keep only a one-way fingerprint (hash) of it.
              </>,
              "Created automatically.",
            ],
          ]}
        />
        <P>
          Your IP address is used briefly to limit how many requests one connection can send and to check whether a report
          comes from an address listed for testing. It is not saved in the report.
        </P>

        <Sub>When you react to or comment on a photo or video</Sub>
        <P>
          Your reaction or comment (up to 500 characters) and a random visitor code kept in your browser, so that each person
          has one reaction per item and comments can be rate-limited. Comments are always shown as &ldquo;Anonymous&rdquo;. No
          name, e-mail or IP address is stored.
        </P>

        <Sub>When you use &ldquo;Report a problem&rdquo;</Sub>
        <P>
          The category and message you write, the page you were on, your device type, browser user agent and screen size, and
          — only if you add them — a screenshot and an e-mail address or mobile number for a reply. Your IP address is used
          only to limit repeated sending and is not stored.
        </P>

        <Sub>Reports from WhatsApp and Viber monitoring groups</Sub>
        <P>
          The OKB Report Bridge passes flood reports posted in WhatsApp and Viber flood-monitoring groups to the Command
          Center. For each message it stores the group name, the sender&apos;s name and identifier as shown by the messaging
          app, the message text and time, attached media, and information extracted from the message (see AI processing).
          This website does not read anyone&apos;s private chats. <Pending>which groups take part, how messages are captured and on whose authority</Pending>
        </P>

        <Sub>Operators and administrators</Sub>
        <P>
          When staff open protected areas, the name they type is kept in a signed sign-in cookie for up to 12 hours and is
          recorded with the reviews, notes and changes they make.
        </P>

        <Sub>Technical logs</Sub>
        <P>
          Our servers keep technical logs (for example, errors and report reference numbers) to keep the service running and
          secure. Keys and passwords are removed from these logs.
        </P>
      </>
    ),
  },
  {
    id: "purposes",
    title: "How we use information",
    body: (
      <List>
        <li>To show current flood reports on the public OKB Mobile map and on the Command Center flood maps.</li>
        <li>To let OKB operators review, verify, classify and link reports to incidents, and coordinate a response.</li>
        <li>To draw a flood as a stretch of road when photos or a video were taken at different spots along it.</li>
        <li>To prepare situation summaries and consolidated reports for flood operations.</li>
        <li>To contact a reporter or someone who reported a problem, only if they left contact details.</li>
        <li>To understand how the website is used, fix problems and improve it.</li>
        <li>To protect the service from abuse, spam and attacks.</li>
      </List>
    ),
  },
  {
    id: "legal-basis",
    title: "Legal basis",
    body: (
      <>
        <P>
          The Data Privacy Act allows personal information to be processed only on a lawful basis listed in Sections 12 and
          13 — for example, consent, the performance of a public authority&apos;s mandate, protecting life and health, or
          legitimate interests. The responsible office must name the basis for each activity.
        </P>
        <List>
          <li>
            OKB Mobile reports and &ldquo;Report a problem&rdquo;: the form tells you, before you send, that your photos and
            details appear on the public flood map and are used by the Command Center. <Pending>legal basis (e.g. consent, or the agency&apos;s disaster-response mandate under RA 10121)</Pending>
          </li>
          <li>
            WhatsApp / Viber group reports: <Pending>legal basis and authority for collecting these messages</Pending>
          </li>
          <li>
            Visitor statistics and security logs: <Pending>legal basis (e.g. legitimate interest in running a secure website)</Pending>
          </li>
        </List>
        <P>
          Flood photos can show people, vehicles, plate numbers and homes. We do not ask for sensitive personal information
          (such as health, religion or government ID numbers); please do not include it in remarks, comments or messages.
        </P>
      </>
    ),
  },
  {
    id: "public",
    title: "What is public and what is restricted",
    body: (
      <>
        <Sub>Public — anyone can see it</Sub>
        <List>
          <li>
            OKB Mobile reports on the map: the photos and video (including the time and GPS position printed on them and
            saved in the photo files), the location, flood details, landmark, remarks, and <strong>the name you entered</strong>,
            if any.
          </li>
          <li>
            Flood locations and text from WhatsApp / Viber group reports, with phone numbers and e-mail addresses removed and
            without the sender&apos;s name.
          </li>
          <li>Reactions and anonymous comments on photos and videos.</li>
          <li>Program information, accomplishments and Gallery content.</li>
        </List>
        <Sub>Not shown on public pages</Sub>
        <List>
          <li>Mobile numbers entered in OKB Mobile reports.</li>
          <li>The GPS track recorded while a video is filmed (the map shows only its start, end or one pin).</li>
          <li>The full WhatsApp / Viber messages, sender names and identifiers.</li>
          <li>&ldquo;Report a problem&rdquo; messages, contact details and screenshots (administrators only).</li>
          <li>Individual visitor records (administrators see them in Admin).</li>
          <li>Edit keys (only a fingerprint is stored).</li>
        </List>
        <P>
          Before you take a photo, please avoid showing faces, plate numbers or the inside of homes where you can. If a public
          photo shows you and you want it removed, contact us (see Contact).
        </P>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI processing",
    body: (
      <>
        <Sub>OKB Mobile photo check</Sub>
        <P>
          When the photos of one report were taken far enough apart to draw a flooded stretch of road, the photos (or the
          first and last frames of the video) are sent to <strong>Anthropic&apos;s Claude</strong>{" "}API, which answers whether
          each one shows floodwater. A photo judged as not showing a flood is left out of the stretch. The photos include the
          printed time and GPS stamp. Your name and mobile number are not sent. The result only shapes the drawing on the map;
          every OKB Mobile report still waits for an operator&apos;s review.
        </P>
        <Sub>WhatsApp / Viber reports</Sub>
        <P>
          The OKB Report Bridge uses AI to read group messages, pull out locations, flood heights and times, classify the
          message and write a short summary. The original message is always kept next to the AI output and is never replaced
          by it. AI output can be wrong; reports are marked by review status, and an AI summary is not an official finding
          until a person has checked it. <Pending>AI provider used by the OKB Report Bridge</Pending>
        </P>
        <P>
          We have not verified how long the AI provider keeps the content it receives or whether it may use it, beyond its
          published terms: see <Ext href="https://www.anthropic.com/legal/privacy">Anthropic&apos;s privacy policy</Ext>.{" "}
          <Pending>AI provider data-retention and training settings for this account</Pending>
        </P>
      </>
    ),
  },
  {
    id: "messaging",
    title: "WhatsApp, Viber and the automated report",
    body: (
      <>
        <P>
          Messages reach the Command Center only from flood-monitoring groups connected to the OKB Report Bridge. The Bridge
          also prepares an automated consolidated flood report (text and PDF with photos) for WhatsApp.
        </P>
        <List>
          <li>
            OKB Mobile reports from the public are <strong>not</strong> included in that automated report unless they are
            specially marked when sent; today only reports from addresses listed for testing are marked.
          </li>
          <li>WhatsApp / Viber reports are deleted through the Bridge, which also removes them from later automated reports.</li>
          <li>
            Recipients of the automated report: <Pending>groups or offices that receive it</Pending>
          </li>
        </List>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and browser storage",
    body: (
      <>
        <DataTable
          head={["Name", "What it does", "How long"]}
          rows={[
            ["okb_vid (cookie)", "Random visitor code for visit statistics.", "400 days"],
            ["okb_sid (cookie)", "Random session code; a visit ends after 30 minutes without a page view.", "30 minutes"],
            ["okb_admin (cookie)", "Keeps an administrator signed in. Staff only.", "12 hours"],
            ["okb_reports_access (cookie)", "Keeps an operator signed in to protected Command Center areas. Staff only.", "12 hours"],
            [
              "Browser storage (not cookies)",
              <>
                Saved only on your device and not sent with every request: light/dark theme, tips you closed, display
                preferences, the random code used for reactions and comments, and the edit keys of reports you sent.
              </>,
              "Until you clear your browser data",
            ],
          ]}
        />
        <P>
          All cookies are first-party (set by this website), and none is used for advertising. The visitor statistics run
          without a consent banner and have no separate switch; you can block or delete cookies in your browser settings, and
          the website still works. Clearing browser storage also removes your saved edit keys, so keep your edit link if you
          may want to change a report.
        </P>
        <P>
          Some pages load content from other services in your browser — map and radar tiles (CARTO, OpenFreeMap, Esri,
          OpenTopoMap, RainViewer), images from Google, and Google Drive or YouTube (privacy-enhanced mode) videos when you
          open them. Those services receive your IP address and normal browser information and may set their own cookies under
          their own policies.
        </P>
      </>
    ),
  },
  {
    id: "advertising",
    title: "Advertising",
    body: (
      <>
        <P>
          <strong>This website currently shows no advertising and uses no advertising or Google Analytics cookies.</strong>
        </P>
        <P>
          If advertising such as Google AdSense is added, this section will be updated before ads appear. It will then explain
          that third-party vendors, including Google, use cookies to serve ads based on a user&apos;s prior visits to this and
          other websites; that you can turn off personalized ads in{" "}
          <Ext href="https://adssettings.google.com">Google&apos;s Ads Settings</Ext> and opt out of other vendors at{" "}
          <Ext href="https://www.aboutads.info/choices">aboutads.info</Ext>; and how consent is asked where the law requires
          it. See{" "}
          <Ext href="https://policies.google.com/technologies/partner-sites">how Google uses information from sites that use its services</Ext>.
        </P>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Sharing and service providers",
    body: (
      <>
        <P>We do not sell personal information. Information is shared only as follows:</P>
        <List>
          <li>
            <strong>The public</strong> — what is listed as public above.
          </li>
          <li>
            <strong>OKB operators and administrators</strong> — to review reports and run the service.
          </li>
          <li>
            <strong>Government offices involved in flood response</strong> — consolidated reports and verified information.{" "}
            <Pending>which offices</Pending>
          </li>
          <li>
            <strong>Service providers</strong> that host or process data for us: Vercel (website hosting), Supabase (database),
            Cloudflare R2 (photo, video and file storage), Anthropic (AI photo check), OpenStreetMap Nominatim and the FOSSGIS
            routing service (place names and routes, from coordinates only).
          </li>
          <li>
            <strong>When required by law</strong> — for example, a lawful order of a court or competent authority.
          </li>
        </List>
      </>
    ),
  },
  {
    id: "security",
    title: "How we protect information",
    body: (
      <>
        <List>
          <li>The website is served only over encrypted connections (HTTPS).</li>
          <li>
            The database cannot be read or written with public keys; only our server can access it, and protected pages
            require an administrator or operator key.
          </li>
          <li>Sign-in cookies are signed and cannot be read by page scripts.</li>
          <li>Edit keys are stored only as one-way fingerprints.</li>
          <li>Public forms limit repeated sending and filter automated spam.</li>
          <li>Phone numbers and e-mail addresses are removed from group-report text shown on the public map.</li>
        </List>
        <P>
          No system is perfectly secure. We have not described every measure here, so as not to weaken them.
        </P>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep information",
    body: (
      <>
        <List>
          <li>
            A flood report leaves the public map after a few hours (depending on the weather) or once it has receded, but the
            report itself is kept until you or an operator deletes it. Deleting a report removes its photos, videos, reactions
            and comments.
          </li>
          <li>Visitor statistics, feedback and comments are kept until an administrator deletes them.</li>
          <li>Cookies expire as listed in the Cookies section.</li>
          <li>Deleted information may remain in our providers&apos; backups and logs for a time before it is overwritten.</li>
        </List>
        <P>
          Retention schedule: <Value value={PRIVACY_POLICY.retention} missing="approved retention periods for each kind of record" />
        </P>
      </>
    ),
  },
  {
    id: "rights",
    title: "Your rights",
    body: (
      <>
        <P>Under the Data Privacy Act you have the right, subject to the limits the law sets:</P>
        <List>
          <li>to be informed about how your personal information is processed;</li>
          <li>to access it;</li>
          <li>to have inaccurate information corrected;</li>
          <li>to object to processing, and to withdraw consent where consent is the basis;</li>
          <li>to have it erased or blocked where the law allows;</li>
          <li>to data portability where it applies;</li>
          <li>to damages for harm caused by inaccurate or unlawfully obtained information; and</li>
          <li>
            to file a complaint with the <Ext href="https://privacy.gov.ph">National Privacy Commission</Ext>.
          </li>
        </List>
        <P>
          <strong>Your own OKB Mobile reports:</strong> on the phone and browser you sent from (or by opening your private edit
          link) you can edit a report, mark it receded, add or delete photos and delete it, without contacting us. A report
          already linked to an incident cannot be deleted this way; contact us instead.
        </P>
        <P>
          For any other request, write to the privacy contact below. We may ask for information to confirm the request is
          yours — for an anonymous report, for example, the edit link. Some requests may be refused or limited where the law
          allows, for instance where a record is needed for disaster response; we will tell you why.
        </P>
      </>
    ),
  },
  {
    id: "breach",
    title: "Security incidents",
    body: (
      <P>
        If a personal data breach occurs, the responsible office will assess it and, where the law requires, notify the
        National Privacy Commission and the people affected, in line with the Commission&apos;s rules on breach management.{" "}
        <Pending>breach-response procedure and responsible officer</Pending>
      </P>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <P>
        The website is meant for the general public and is not aimed at children. It does not ask for anyone&apos;s age. We ask
        that children do not send personal details, and that people avoid photographing children in flood reports. If you
        believe a child&apos;s information was sent to us, contact us so it can be removed.
      </P>
    ),
  },
  {
    id: "transfers",
    title: "Processing outside the Philippines",
    body: (
      <P>
        Our hosting, database, storage, mapping and AI providers are international companies and may store or process
        information outside the Philippines. Where information is transferred, the responsible office remains accountable for
        it under the Data Privacy Act. <Pending>hosting regions and data processing agreements with each provider</Pending>
      </P>
    ),
  },
  {
    id: "third-party",
    title: "Other websites and services",
    body: (
      <>
        <P>Links and embedded content from other services are governed by their own policies, including:</P>
        <List>
          <li>
            <Ext href="https://policies.google.com/privacy">Google (Drive, YouTube, Sheets)</Ext>
          </li>
          <li>
            <Ext href="https://vercel.com/legal/privacy-policy">Vercel</Ext>,{" "}
            <Ext href="https://supabase.com/privacy">Supabase</Ext>,{" "}
            <Ext href="https://www.cloudflare.com/privacypolicy/">Cloudflare</Ext>,{" "}
            <Ext href="https://www.anthropic.com/legal/privacy">Anthropic</Ext>
          </li>
          <li>
            <Ext href="https://osmfoundation.org/wiki/Privacy_Policy">OpenStreetMap Foundation</Ext>
          </li>
          <li>
            <Ext href="https://www.whatsapp.com/legal/privacy-policy">WhatsApp</Ext> and{" "}
            <Ext href="https://www.viber.com/en/terms/viber-privacy-policy/">Viber</Ext>, for messages you post in groups
          </li>
        </List>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <P>
        When we change how information is handled, we will update this page and its &ldquo;last updated&rdquo; date before the
        change takes effect. Important changes will also be pointed out on the website.
      </P>
    ),
  },
  {
    id: "contact",
    title: "Contact and complaints",
    body: (
      <>
        <P>
          For questions, requests or concerns about your personal information, contact{" "}
          <Value value={PRIVACY_POLICY.privacyEmail} missing="privacy contact e-mail" />
          {PRIVACY_POLICY.dpo ? <> or the Data Protection Officer, {PRIVACY_POLICY.dpo}</> : null}.
        </P>
        <P>
          If you are not satisfied with the answer, you may complain to the National Privacy Commission:{" "}
          <Ext href="https://privacy.gov.ph">privacy.gov.ph</Ext>.
        </P>
      </>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      <PublicPageHero
        compact
        eyebrow="Data privacy"
        title="Privacy Policy"
        description="What information this website collects, why, who sees it, and your rights under the Data Privacy Act of 2012."
      />

      <PublicPageSection containerClassName="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-12">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <dl className="okb-public-body text-sm">
            <div>
              <dt className="okb-public-label">Last updated</dt>
              <dd className="mt-1 text-[#1a1a1a]">{longDate(PRIVACY_POLICY.lastUpdated)}</dd>
            </div>
            <div className="mt-3">
              <dt className="okb-public-label">Effective</dt>
              <dd className="mt-1 text-[#1a1a1a]">
                {PRIVACY_POLICY.effectiveDate ? longDate(PRIVACY_POLICY.effectiveDate) : <Pending>effective date</Pending>}
              </dd>
            </div>
          </dl>

          <details className="okb-public-card group mt-6 rounded-sm lg:hidden">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 font-semibold text-[var(--dpwh-blue-dark)]">
              Contents
            </summary>
            <Toc className="px-4 pb-4" />
          </details>
          <nav aria-label="Privacy Policy contents" className="mt-8 hidden lg:block">
            <p className="okb-public-label">Contents</p>
            <Toc className="mt-2" />
          </nav>
        </aside>

        <article className="okb-public-body okb-public-prose mt-10 min-w-0 text-[#1a1a1a] lg:mt-0">
          {draft ? (
            <p role="note" className="rounded-sm border-l-4 border-amber-500 bg-amber-50 p-4 text-sm text-amber-950">
              <strong>Draft for review.</strong>{" "}Items marked &ldquo;To be confirmed&rdquo; must be completed by the responsible
              office before this policy is final.
            </p>
          ) : null}
          {SECTIONS.map((s, i) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="mt-10 scroll-mt-24 first:mt-8">
              <h2 id={`${s.id}-title`} className="okb-public-heading text-2xl">
                {i + 1}. {s.title}
              </h2>
              {s.body}
            </section>
          ))}
        </article>
      </PublicPageSection>
    </>
  );
}

function Toc({ className }: { className?: string }) {
  return (
    <ol className={`space-y-0.5 text-sm ${className ?? ""}`}>
      {SECTIONS.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`} className="okb-public-link flex min-h-10 items-center py-1 lg:min-h-0">
            {i + 1}. {s.title}
          </a>
        </li>
      ))}
    </ol>
  );
}
