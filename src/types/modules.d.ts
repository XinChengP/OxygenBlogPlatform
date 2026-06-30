// TypeScript 模块声明文件，解决路径别名问题
declare module '@/setting/blogSetting' {
  export const categories: string[];
  export type CCLicenseType = 
    | "CC BY"
    | "CC BY-SA"
    | "CC BY-NC"
    | "CC BY-NC-SA"
    | "CC BY-ND"
    | "CC BY-NC-ND";
  export const copyrightConfig: {
    showCopyright: boolean;
    defaultLicense: CCLicenseType;
    author: string;
    siteName: string;
    siteUrl: string;
  };
  export const EndWord: string;
  export const getCCLicenseInfo: (type: CCLicenseType) => {
    name: string;
    url: string;
    description: string;
  };
}

declare module '@/hooks/useBackgroundStyle' {
  type PageType = 'home' | 'blogs' | 'about' | 'blog-detail' | 'archive' | 'guestbook' | 'tools' | 'gallery' | 'friends' | 'links';
  
  interface StyleConfig {
    className: string;
    style?: React.CSSProperties;
  }
  
  export function useBackgroundStyle(pageType: PageType): {
    containerStyle: StyleConfig;
    sectionStyle: StyleConfig;
    navigationStyle: StyleConfig;
    isBackgroundEnabled: boolean;
  };
}

declare module '@/components/TableOfContents' {
  interface TableOfContentsProps {
    content: string;
  }
  
  const TableOfContents: React.FC<TableOfContentsProps>;
  export default TableOfContents;
}

declare module '@/components/ScrollToTop' {
  const ScrollToTop: React.FC;
  export default ScrollToTop;
}

declare module '@/components/GiscusComments' {
  interface GiscusCommentsProps {
    id: string;
    title?: string;
  }
  
  const GiscusComments: React.FC<GiscusCommentsProps>;
  export default GiscusComments;
}

declare module '@/components/CopyrightNotice' {
  interface CopyrightNoticeProps {
    title: string;
    publishDate: string;
    slug: string;
    reference?: Array<{
      description: string;
      link: string;
    }>;
    licenseType?: "CC BY" | "CC BY-SA" | "CC BY-NC" | "CC BY-NC-SA" | "CC BY-ND" | "CC BY-NC-ND";
  }
  
  const CopyrightNotice: React.FC<CopyrightNoticeProps>;
  export default CopyrightNotice;
}