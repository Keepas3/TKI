import type { Metadata } from 'next';
import { NAV_BAR_HEIGHT } from '@/components/NavBar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Terms & Privacy — TKI',
};

const EFFECTIVE_DATE = 'September 5, 2026';
const GITHUB_URL = 'https://github.com/Keepas3/TKI';
const CONTACT_EMAIL = 'bfun679@gmail.com';

function DocLabel({ n, of: total }: { n: number; of: number }) {
  return (
    <div style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--tt-accent)', marginBottom: 10, opacity: 0.8 }}>
      Document {n} of {total}
    </div>
  );
}

function DocTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--tt-text)', margin: '0 0 8px', textWrap: 'balance' as React.CSSProperties['textWrap'] }}>
      {children}
    </h1>
  );
}

function DocMeta() {
  return (
    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--tt-text-faint)', marginBottom: 32 }}>
      Effective {EFFECTIVE_DATE} · Last updated {EFFECTIVE_DATE}
    </div>
  );
}

function Summary({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(79,209,255,0.05)',
      border: '1px solid var(--tt-border)',
      borderLeft: '3px solid var(--tt-accent)',
      borderRadius: 6,
      padding: '14px 18px',
      marginBottom: 40,
    }}>
      <div style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--tt-accent)', marginBottom: 8, opacity: 0.8 }}>
        Plain-English Summary
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--tt-text-muted)', lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 10 }}>
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--tt-text-dim)', flexShrink: 0, width: 24 }}>{n}</span>
        <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--tt-text)' }}>{title}</span>
      </div>
      <div style={{ paddingLeft: 38, fontSize: 14, color: 'var(--tt-text-muted)', lineHeight: 1.75 }}>
        {children}
      </div>
    </div>
  );
}

function Rule() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--tt-border)', margin: '0 0 28px', opacity: 0.6 }} />;
}

function Divider() {
  return (
    <div style={{ position: 'relative', margin: '60px 0' }}>
      <hr style={{ border: 'none', borderTop: '1px solid var(--tt-border)' }} />
      <span style={{
        position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--tt-bg)', padding: '0 12px',
        fontFamily: 'monospace', fontSize: 14, color: 'var(--tt-text-dim)',
      }}>§</span>
    </div>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul style={{ margin: '6px 0 10px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</ul>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 10px' }}>{children}</p>;
}

export default function LegalPage() {
  return (
    <div style={{ paddingTop: NAV_BAR_HEIGHT }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px 0' }}>

        {/* ── TERMS OF SERVICE ── */}

        <DocLabel n={1} of={2} />
        <DocTitle>Terms of Service</DocTitle>
        <DocMeta />

        <Summary>
          <P>TKI is a free, non-commercial learning hub for block-stacking games. You can use it to study techniques, solve puzzles, and compete on sprint leaderboards. We ask that you don&apos;t abuse the platform or post content that harms others. Your study posts and puzzle submissions remain yours.</P>
          <P>This summary is for convenience only — the full terms below govern your use.</P>
        </Summary>

        <Section n="01" title="About the Service">
          <P>TKI (&ldquo;the Service&rdquo;) is a non-commercial, independently operated learning platform for block-stacking puzzle games. It provides study content, puzzles, and community tools. The Service is provided free of charge with no monetisation. Access may be modified, suspended, or discontinued at any time without notice.</P>
        </Section>

        <Rule />

        <Section n="02" title="Accounts">
          <P>You may create an account using an email address and password. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. You must provide an accurate email address and must not impersonate any other person.</P>
          <P>You may delete your account at any time from your <strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Settings</strong> page. Deletion is immediate and permanent — your authentication record, profile data, puzzle history, and avatar image are removed automatically. Submitted study posts and puzzle submissions you authored may remain but will no longer be linked to an identifiable account.</P>
        </Section>

        <Rule />

        <Section n="03" title="User Content">
          <P>You retain ownership of any study posts, puzzle submissions, or other content you create (&ldquo;User Content&rdquo;). By submitting content to the Service you grant us a non-exclusive, worldwide, royalty-free licence to store, display, and distribute that content as part of normal Service operation. You may request removal of your content at any time.</P>
          <P>You are solely responsible for the content you submit. You agree not to submit content that:</P>
          <UL>
            <li>Infringes any third-party intellectual property or privacy rights</li>
            <li>Contains harassment, hate speech, or targeted abuse of any individual</li>
            <li>Is deliberately false or misleading</li>
            <li>Contains malicious code or links to harmful resources</li>
          </UL>
          <P>We reserve the right to remove content that violates these terms without prior notice.</P>
        </Section>

        <Rule />

        <Section n="04" title="Acceptable Use">
          <P>You agree not to use the Service to:</P>
          <UL>
            <li>Attempt to disrupt, overload, or gain unauthorised access to any part of the Service or its infrastructure</li>
            <li>Scrape, harvest, or systematically collect data from the Service without permission</li>
            <li>Use automated tools to submit content at scale</li>
            <li>Circumvent any technical measure intended to protect the Service or its users</li>
          </UL>
        </Section>

        <Rule />

        <Section n="05" title="Intellectual Property">
          <P>The Service&apos;s source code, design, and non-user-generated content are the property of the operator. Nothing in these terms grants you a licence to copy or redistribute the Service&apos;s code for commercial purposes.</P>
          <P>Study content that discusses third-party games, techniques, and terminology does so for educational purposes. Any trademarked terms appearing in user-submitted educational content are the property of their respective owners and are used nominatively.</P>
        </Section>

        <Rule />

        <Section n="06" title="Disclaimers & Limitation of Liability">
          <P>The Service is provided <strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>&ldquo;as is&rdquo;</strong> without warranties of any kind. We do not guarantee uptime, data persistence, or fitness for any particular purpose. Because the Service is non-commercial and free of charge, our liability to you for any claim is limited to the maximum extent permitted by applicable law.</P>
          <P>Leaderboard entries, community content, and puzzle submissions may be lost or reset at any time as part of normal sandbox operation.</P>
        </Section>

        <Rule />

        <Section n="07" title="Changes to These Terms">
          <P>We may update these terms at any time. Continued use of the Service after changes are posted constitutes your acceptance of the revised terms. If the changes are material, we will update the &ldquo;Last updated&rdquo; date at the top of this document.</P>
        </Section>

        {/* ── DIVIDER ── */}
        <Divider />

        {/* ── PRIVACY POLICY ── */}

        <DocLabel n={2} of={2} />
        <DocTitle>Privacy Policy</DocTitle>
        <DocMeta />

        <Summary>
          <P>We collect the minimum data needed to run the Service: your email address, a chosen username, your submitted content, and sprint leaderboard entries. We don&apos;t sell your data, run advertising, or share it with anyone except our hosting provider (Supabase). Your settings are stored locally in your browser and never sent to a server.</P>
          <P>This summary is for convenience only — the full policy below governs our practices.</P>
        </Summary>

        <Section n="01" title="What We Collect">
          <P><strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Account data</strong> — when you create an account: email address, hashed password (handled by Supabase Auth — we never see the plaintext), and any username or profile visuals (avatar, banner) you choose.</P>
          <P><strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Content you submit</strong> — study posts, puzzle submissions, and any text or board data included in them.</P>
          <P><strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Puzzle activity</strong> — a record of which puzzles you have solved and when, stored in our database and used to compute your solve count and daily streak on your profile.</P>
          <P><strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Avatar images</strong> — if you upload a profile photo, it is stored in Supabase Storage (a sub-service of our hosting provider) and served via a public URL. You can replace it at any time from your profile page.</P>
          <P><strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Leaderboard entries</strong> — a display name you enter and your sprint completion time. These are public.</P>
          <P><strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Local settings</strong> — keybinds, handling tuning, and colour theme are stored in your browser&apos;s <code style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--tt-kbd-bg)', padding: '1px 5px', borderRadius: 3 }}>localStorage</code> only and never transmitted to our servers.</P>
          <P>We do not collect IP addresses beyond what Supabase&apos;s infrastructure records as part of standard API request logging, and we do not run any analytics or tracking scripts.</P>
        </Section>

        <Rule />

        <Section n="02" title="How We Use Your Data">
          <P>Data is used solely to provide the Service:</P>
          <UL>
            <li>Your email authenticates you and allows password reset</li>
            <li>Your username and profile visuals are displayed on your profile page</li>
            <li>Submitted content is displayed to other users as part of the study and puzzle features</li>
            <li>Puzzle solve records are used to display your solve count and daily streak on your profile</li>
            <li>Your uploaded avatar image is displayed on your profile and next to your username</li>
            <li>Leaderboard names and times are displayed publicly on the sprint leaderboard</li>
          </UL>
          <P>We do not use your data for advertising, profiling, or any purpose unrelated to operating the Service.</P>
        </Section>

        <Rule />

        <Section n="03" title="Data Storage & Security">
          <P>All account data, user content, and leaderboard entries are stored in <strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Supabase</strong> — a hosted Postgres backend with row-level security policies that restrict client access to only what each user is permitted to see. Supabase processes data in accordance with their own privacy policy.</P>
          <P>Authentication (passwords, sessions, password-reset tokens) is handled entirely by Supabase Auth. We do not store or have access to plaintext passwords.</P>
          <P>Uploaded avatar images are stored in <strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Supabase Storage</strong> and served via a public CDN URL. Images are not processed or analysed beyond storage and delivery.</P>
          <P>Because this is a non-commercial sandbox project, you should not store sensitive personal information in study posts or puzzle descriptions.</P>
        </Section>

        <Rule />

        <Section n="04" title="Cookies & Local Storage">
          <P>The Service sets one functional cookie: <code style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--tt-kbd-bg)', padding: '1px 5px', borderRadius: 3 }}>tt-theme</code>, which stores your light/dark preference. This cookie contains no personal data and is not shared with any third party.</P>
          <P>Your game settings (keybinds, handling, theme) are stored in <code style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--tt-kbd-bg)', padding: '1px 5px', borderRadius: 3 }}>localStorage</code> in your browser. This data never leaves your device.</P>
          <P>We do not use advertising cookies, tracking pixels, or third-party analytics scripts of any kind.</P>
        </Section>

        <Rule />

        <Section n="05" title="Third-Party Services">
          <P>The only third-party service with access to your data is <strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Supabase</strong>, which provides our database and authentication infrastructure. No other third party receives your data. We do not use Google Analytics, Meta Pixel, or any similar tracking service.</P>
        </Section>

        <Rule />

        <Section n="06" title="Data Retention & Deletion">
          <P>Your data is retained for as long as your account exists or for as long as the Service operates. Because this is a sandbox project with no SLA, data may be reset or lost at any time.</P>
          <P>You can delete your account at any time from your <strong style={{ color: 'var(--tt-text)', fontWeight: 500 }}>Settings</strong> page. Deletion is immediate: your authentication record, profile metadata, puzzle solve history, and uploaded avatar image are permanently removed. If you are unable to access your account, contact us using the details below and we will action the deletion manually.</P>
          <P>Sprint leaderboard entries submitted under a display name cannot be individually deleted as they contain no identifying information beyond the name you chose to enter.</P>
        </Section>

        <Rule />

        <Section n="07" title="Your Rights">
          <P>Depending on your jurisdiction, you may have the right to access, correct, or delete personal data we hold about you. To exercise any of these rights, contact us using the details below. We will respond within 30 days.</P>
          <P>Because the Service is operated by a single individual on a non-commercial basis, responses may not meet formal regulatory timelines, but we will make every reasonable effort to honour your request promptly.</P>
        </Section>

        <Rule />

        <Section n="08" title="Changes to This Policy">
          <P>We may update this policy at any time. If the changes are material, we will update the &ldquo;Last updated&rdquo; date. Continued use of the Service after changes are posted constitutes acceptance of the revised policy.</P>
        </Section>

        {/* Contact block */}
        <div style={{
          margin: '8px 0 48px',
          padding: '14px 18px',
          background: 'var(--tt-surface)',
          border: '1px solid var(--tt-border)',
          borderRadius: 6,
          fontSize: 13,
          color: 'var(--tt-text-muted)',
          lineHeight: 1.6,
        }}>
          <strong style={{ display: 'block', marginBottom: 4, color: 'var(--tt-text)', fontWeight: 600 }}>Contact</strong>
          Questions, access requests, or deletion requests can be sent via{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--tt-accent)', textDecoration: 'none' }}>{CONTACT_EMAIL}</a>
          {' '}or opened as a{' '}
          <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tt-accent)', textDecoration: 'none' }}>
            GitHub issue
          </a>.
        </div>

      </div>

      <Footer />
    </div>
  );
}
