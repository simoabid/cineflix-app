import { Helmet } from 'react-helmet-async'

interface SEOHeadProps {
  readonly title: string
  readonly description: string
  readonly image?: string
  readonly url?: string
  readonly type?: 'website' | 'video.movie' | 'video.tv_show'
  readonly publishedTime?: string
  readonly section?: string
}

/**
 * Injects Open Graph, Twitter Card, and standard SEO meta tags
 * into the document head via react-helmet-async.
 */
export function SEOHead({
  title,
  description,
  image,
  url,
  type = 'website',
  publishedTime,
  section
}: SEOHeadProps): JSX.Element {
  const siteName: string = 'CINEFLIX'
  const fullTitle: string = `${title} | ${siteName}`
  const currentUrl: string = url ?? window.location.href
  const defaultImage: string = `${window.location.origin}/web-app-manifest-512x512.png`
  const resolvedImage: string = image ?? defaultImage
  return (
    <Helmet>
      {/* Standard */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={currentUrl} />
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:locale" content="en_US" />
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />
      {/* Optional — Article metadata */}
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {section && <meta property="article:section" content={section} />}
    </Helmet>
  )
}
