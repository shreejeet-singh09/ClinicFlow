export default function manifest() {
  return {
    name: 'ClinicFlow Queue',
    short_name: 'ClinicFlow',
    description: 'Offline-ready clinic queue workspace',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f9fc',
    theme_color: '#2563eb',
    icons: [
      { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
      { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
    ],
  }
}
