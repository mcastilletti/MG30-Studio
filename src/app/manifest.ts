import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MG30 Studio Professional Editor',
    short_name: 'MG30 Studio',
    description: 'Editor professionale web per la pedaliera NUX MG-30.',
    start_url: '/',
    display: 'standalone',
    background_color: '#121212',
    theme_color: '#673AB7',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
