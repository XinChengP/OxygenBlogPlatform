/// <reference types="next/image-types/global" />

declare module '*.png' {
  const content: import('next/dist/shared/lib/get-img-props').StaticImageData
  export default content
}

declare module '*.jpg' {
  const content: import('next/dist/shared/lib/get-img-props').StaticImageData
  export default content
}

declare module '*.jpeg' {
  const content: import('next/dist/shared/lib/get-img-props').StaticImageData
  export default content
}

declare module '*.gif' {
  const content: import('next/dist/shared/lib/get-img-props').StaticImageData
  export default content
}

declare module '*.webp' {
  const content: import('next/dist/shared/lib/get-img-props').StaticImageData
  export default content
}

declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>
  export default content
}