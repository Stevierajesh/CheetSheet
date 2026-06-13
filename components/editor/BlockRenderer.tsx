'use client';

import React from 'react';
import katex from 'katex';
import { BlockModel } from '@/types/document';

function KaTeXDisplay({ source, style }: { source: string; style: React.CSSProperties }) {
  if (!source.trim()) {
    return (
      <div style={style}>
        <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Edit text here</span>
      </div>
    );
  }
  let html = '';
  try {
    html = katex.renderToString(source, { displayMode: true, throwOnError: false });
  } catch {
    html = `<span style="color:#ef4444">${source}</span>`;
  }
  return (
    <div
      style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

type Props = {
  block: BlockModel;
};

const PLACEHOLDER_STYLE: React.CSSProperties = {
  color: '#9ca3af',
  fontStyle: 'italic',
  pointerEvents: 'none',
  userSelect: 'none',
};

function isEmpty(block: BlockModel): boolean {
  if (block.type === 'bullet-list') {
    return block.items.length === 0 || (block.items.length === 1 && block.items[0].trim() === '');
  }
  if ('content' in block) return (block.content as string).trim() === '';
  return false;
}

export default function BlockRenderer({ block }: Props) {
  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    fontSize: block.styles.fontSize ?? 14,
    fontWeight: block.styles.fontWeight || 'normal',
    color: block.styles.textColor || '#000',
    backgroundColor: block.styles.backgroundColor || 'transparent',
    textAlign: (block.styles.alignment as React.CSSProperties['textAlign']) || 'left',
    lineHeight: block.styles.lineHeight ? `${block.styles.lineHeight}` : '1.5',
    padding: block.styles.padding || 0,
    borderColor: block.styles.borderColor || 'transparent',
    borderWidth: block.styles.borderWidth || 0,
    borderStyle: block.styles.borderWidth ? 'solid' : 'none',
    boxSizing: 'border-box',
  };

  switch (block.type) {
    case 'text':
      return (
        <div style={baseStyle} className="whitespace-pre-wrap break-words">
          {isEmpty(block)
            ? <span style={PLACEHOLDER_STYLE}>Edit text here</span>
            : block.content}
        </div>
      );

    case 'heading':
      return (
        <div
          style={{
            ...baseStyle,
            fontSize: block.styles.fontSize ?? 24,
            fontWeight: block.styles.fontWeight || 'bold',
          }}
          className="whitespace-pre-wrap break-words"
        >
          {isEmpty(block)
            ? <span style={PLACEHOLDER_STYLE}>Edit text here</span>
            : block.content}
        </div>
      );

    case 'bullet-list': {
      if (isEmpty(block)) {
        return (
          <div style={baseStyle}>
            <span style={PLACEHOLDER_STYLE}>Edit text here</span>
          </div>
        );
      }
      const bulletChar =
        block.bulletStyle === 'dash' ? '— ' : block.bulletStyle === 'dot' ? '• ' : '';
      return (
        <div style={baseStyle}>
          {block.bulletStyle === 'numbered' ? (
            <ol className="list-decimal pl-5 space-y-1">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          ) : (
            <ul className="space-y-1">
              {block.items.map((item, i) => (
                <li key={i}>
                  {bulletChar}
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    case 'formula':
      return <KaTeXDisplay source={block.content} style={baseStyle} />;

    case 'image':
      return block.src ? (
        <img
          src={block.src}
          alt={block.alt || 'Image'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            ...( block.styles.borderWidth ? {
              border: `${block.styles.borderWidth}px solid ${block.styles.borderColor || '#ccc'}`,
            } : {}),
          }}
          draggable={false}
        />
      ) : (
        <div
          style={{
            ...baseStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#9ca3af',
          }}
        >
          Click to add image
        </div>
      );

    case 'divider':
      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <hr
            style={{
              width: '100%',
              border: 'none',
              borderTop: `${block.thickness}px solid ${block.color}`,
            }}
          />
        </div>
      );

    case 'box':
      return <div style={baseStyle} className="rounded" />;

    default:
      return <div style={baseStyle}>Unknown block</div>;
  }
}
