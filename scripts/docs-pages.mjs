// One page identity across languages; Markdown remains the editable source.
export const locales = {
  'zh-TW': {
    label: '臺灣華語', docs: '文件', guide: '使用指南', maintenance: '專案維護',
    language: '語言', navigation: '文件導覽', outline: '本頁內容',
    previous: '上一頁', next: '下一頁', skip: '跳到主要內容',
    source: '共用規格', englishOnly: '這份共用規格目前以英文維護。',
    diagramError: '圖表無法顯示，以下保留 Mermaid 原始碼。',
  },
  en: {
    label: 'English', docs: 'Documentation', guide: 'Guide', maintenance: 'Maintenance',
    language: 'Language', navigation: 'Documentation navigation', outline: 'On this page',
    previous: 'Previous', next: 'Next', skip: 'Skip to content',
    source: 'Shared specification', englishOnly: '',
    diagramError: 'The diagram could not be rendered. Mermaid source is shown below.',
  },
};

export const pages = [
  { slug: '', group: 'guide',
    en: ['Getting started', 'README.md'], 'zh-TW': ['開始使用', 'README.zh-TW.md'] },
  { slug: 'workflow', group: 'guide',
    en: ['Workflow', 'references/workflow.md'], 'zh-TW': ['工作流程', 'docs/workflow-zh-tw.md'] },
  { slug: 'marp', group: 'guide',
    en: ['Marp authoring', 'references/marp.md'], 'zh-TW': ['Marp 撰寫', 'docs/marp-zh-tw.md'] },
  { slug: 'review', group: 'guide',
    en: ['Review and verification', 'references/review.md'], 'zh-TW': ['審閱與驗證', 'docs/review-zh-tw.md'] },
  { slug: 'image-rights', group: 'guide',
    en: ['Image rights and credits', 'references/image-rights.md'], 'zh-TW': ['圖片權利與標示', 'docs/image-rights-zh-tw.md'] },
  { slug: 'memory', group: 'guide',
    en: ['Project memory', 'references/memory.md'], 'zh-TW': ['專案記憶', 'docs/memory-zh-tw.md'] },
  { slug: 'development', group: 'maintenance',
    en: ['Development', 'docs/development.md'], 'zh-TW': ['開發與自動化', 'docs/development-zh-tw.md'] },
  { slug: 'dependencies', group: 'maintenance',
    en: ['Dependencies', 'docs/dependencies.md'], 'zh-TW': ['相依套件', 'docs/dependencies-zh-tw.md'] },
  { slug: 'validation', group: 'maintenance',
    en: ['Validation record', 'docs/validation.md'], 'zh-TW': ['驗證紀錄', 'docs/validation-zh-tw.md'] },
];

export const sharedSources = new Set([
  'SKILL.md', 'profiles/wei.md', 'LICENSE', 'NOTICE.md',
  ...['chu2', 'layer', 'pareo', 'lock', 'masking'].map(role => `agents/${role}.md`),
  ...['command-router', 'create', 'revise', 'review', 'export', 'remember', 'retro'].map(operation => `skills/${operation}/SKILL.md`),
]);

export const pageUrl = (locale, slug = '') => `/${locale}/${slug}`;
export const sourcePages = new Map(pages.flatMap(page => Object.keys(locales).map(locale => [page[locale][1], { page, locale }])));
