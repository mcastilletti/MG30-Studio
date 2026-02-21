import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MG30 Studio Professional Editor',
    short_name: 'MG30 Studio',
    description: 'Editor professionale web per la pedaliera NUX MG-30.',
    start_url: '/',
    display: 'standalone',
    background_color: '#13111a',
    theme_color: '#673AB7',
    icons: [
      {
        src: 'https://picsum.photos/seed/mg30-192/192/192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: 'https://picsum.photos/seed/mg30-512/512/512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
