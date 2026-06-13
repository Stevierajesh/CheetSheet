'use client';

import dynamic from 'next/dynamic';

const EditorShell = dynamic(() => import('@/components/editor/EditorShell'), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center text-gray-400">
      Loading editor...
    </div>
  ),
});

export default function Home() {
  return <EditorShell />;
}
