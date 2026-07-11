export interface ChangelogSection {
  title?: string;
  items: string[];
}

export interface ChangelogItem {
  id: string;
  title: string;
  date: string;
  version: string;
  isLatest?: boolean;
  type: 'feature' | 'fix' | 'alert' | 'stability';
  sections: ChangelogSection[];
}

export const changelogData: ChangelogItem[] = [
  {
    id: 'v1.0.0',
    title: 'CINEFLIX Initial Release v1.0.0 🎉',
    date: 'July 11, 2026',
    version: 'v1.0.0',
    isLatest: true,
    type: 'feature',
    sections: [
      {
        items: [
          'Official launch of CINEFLIX v1.0.0 developed by simoabid.',
          'Visit the official website: cineflix.dev',
          'Explore the source code on our GitHub Repository: github.com/simoabid/cineflix-app'
        ]
      }
    ]
  }
];
