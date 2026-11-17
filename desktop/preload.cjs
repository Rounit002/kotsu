// Runs inside the window before the page does.
// The Mac window has no title bar, so this leaves a strip above the top bar for the
// window buttons and makes that strip the place to drag the window by.
const { webFrame } = require('electron')

if (process.platform === 'darwin')
  webFrame.insertCSS(`
    html:root { --topbar: calc(var(--bar) + var(--s-4) + 28px) }
    html .topbar { top: 28px; margin-top: 28px }
    html body::before { content: ''; position: fixed; inset: 0 0 auto; height: 28px; z-index: 9; -webkit-app-region: drag }
  `)
