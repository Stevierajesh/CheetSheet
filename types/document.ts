export type PageSize = 'letter-portrait' | 'letter-landscape' | 'a4-portrait' | 'a4-landscape';

export const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number }> = {
  'letter-portrait': { width: 816, height: 1056 },
  'letter-landscape': { width: 1056, height: 816 },
  'a4-portrait': { width: 794, height: 1123 },
  'a4-landscape': { width: 1123, height: 794 },
};

export type BulletStyle = 'dot' | 'dash' | 'numbered';

export type BlockStyles = {
  fontSize?: number;
  fontWeight?: string;
  textColor?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
  lineHeight?: number;
  padding?: number;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
};

export type BaseBlock = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  naturalWidth?: number;
  naturalHeight?: number;
  naturalFontSize?: number;
  rotation?: number;
  zIndex: number;
  styles: BlockStyles;
};

export type TextBlock = BaseBlock & {
  type: 'text';
  content: string;
};

export type HeadingBlock = BaseBlock & {
  type: 'heading';
  content: string;
};

export type BulletListBlock = BaseBlock & {
  type: 'bullet-list';
  items: string[];
  bulletStyle: BulletStyle;
};

export type FormulaBlock = BaseBlock & {
  type: 'formula';
  content: string;
};

export type ImageBlock = BaseBlock & {
  type: 'image';
  src: string; // base64 data URL
  alt?: string;
};

export type DividerBlock = BaseBlock & {
  type: 'divider';
  thickness: number;
  color: string;
};

export type BoxBlock = BaseBlock & {
  type: 'box';
};

export type BlockModel =
  | TextBlock
  | HeadingBlock
  | BulletListBlock
  | FormulaBlock
  | ImageBlock
  | DividerBlock
  | BoxBlock;

export type BlockType = BlockModel['type'];

export type PageModel = {
  id: string;
  size: PageSize;
  backgroundColor: string;
  blocks: BlockModel[];
};

export type DocumentModel = {
  id: string;
  title: string;
  pages: PageModel[];
  createdAt: string;
  updatedAt: string;
};
