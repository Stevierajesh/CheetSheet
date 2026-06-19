'use client';

import { use } from 'react';
import dynamic from 'next/dynamic';

const EditorShell = dynamic(() => import('@/components/editor/EditorShell'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center text-gray-400">
      Loading editor...
    </div>
  ),
});

export default function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <EditorShell documentId={id} />;
}
