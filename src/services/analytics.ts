interface DataLayerEvent {
  event: string
  [key: string]: unknown
}

declare global {
  interface Window {
    dataLayer: DataLayerEvent[]
  }
}

function pushEvent(event: DataLayerEvent): void {
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({
    ...event,
    environment: import.meta.env.MODE || 'development'
  })
}

export const analytics = {
  trackPageView(path: string, title: string): void {
    pushEvent({
      event: 'page_view',
      page_path: path,
      page_title: title
    })
  },

  trackContentClick(params: {
    contentId: number
    contentTitle: string
    contentType: 'movie' | 'tv'
    section: string
  }): void {
    pushEvent({
      event: 'content_click',
      content_id: params.contentId,
      content_title: params.contentTitle,
      content_type: params.contentType,
      section: params.section
    })
  },

  trackWatchStart(params: {
    contentId: number
    contentTitle: string
    contentType: 'movie' | 'tv'
    source: string
  }): void {
    pushEvent({
      event: 'watch_start',
      content_id: params.contentId,
      content_title: params.contentTitle,
      content_type: params.contentType,
      source: params.source
    })
  },

  trackSearch(query: string, resultsCount: number): void {
    pushEvent({
      event: 'search',
      search_term: query,
      results_count: resultsCount
    })
  },

  trackAddToList(contentId: number, contentType: 'movie' | 'tv'): void {
    pushEvent({
      event: 'add_to_list',
      content_id: contentId,
      content_type: contentType
    })
  },

  trackAuth(action: 'login' | 'signup' | 'logout'): void {
    pushEvent({
      event: `user_${action}`
    })
  },

  trackFilter(filterType: string, filterValue: string): void {
    pushEvent({
      event: 'filter_applied',
      filter_type: filterType,
      filter_value: filterValue
    })
  }
} as const;
