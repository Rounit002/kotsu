import './home.css'

import { build, usePhase } from '../../ui/build'
import { DownloadIcon } from '../../ui/icons'

/** Addresses on this site; render.yaml hands each one the installer from the current release. */
const file = (name: string) => `/get/Kotsu-${name}`

const INSTALLERS = [
  { os: 'mac', label: 'Mac', detail: 'Apple chip (M1 or later)', href: file('mac-arm64.dmg') },
  { os: 'mac', label: 'Mac', detail: 'Intel', href: file('mac-x64.dmg') },
  { os: 'windows', label: 'Windows', detail: '10 or 11', href: file('win-x64.exe') },
]

/** A browser cannot tell an Apple chip from Intel, so the first match for the system is the one put forward. */
const system = /mac/i.test(navigator.userAgent) ? 'mac' : /win/i.test(navigator.userAgent) ? 'windows' : ''
const suggested = INSTALLERS.find((i) => i.os === system)

/** Where the Mac and Windows programs are handed out. They are the same planner, with the same ID and data. */
export function DownloadPage() {
  return (
    <main className="home" data-phase={usePhase(2600)}>
      <section className="lesson glass" {...build('frame', 3)}>
        <h1 className="label" {...build('print', 10)}>
          Kotsu for your computer
        </h1>
        <p className="download-lead" {...build('print', 11)}>
          The same planner in a window of its own. Sign in with your ID and your goals are there.
        </p>
        <ul className="downloads">
          {INSTALLERS.map((installer, i) => (
            <li key={installer.href}>
              <a className={`btn ${installer === suggested ? 'btn-primary' : 'btn-outline'}`} href={installer.href} download {...build('stamp', 14 + i)}>
                <DownloadIcon size={16} />
                {installer.label}
                <span>{installer.detail}</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="muted" {...build('print', 18)}>
          The first time you open it, your computer will ask you to confirm. On a Mac: System Settings → Privacy &amp; Security → Open
          Anyway. On Windows: More info → Run anyway.
        </p>
      </section>
    </main>
  )
}
