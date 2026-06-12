"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import UnifiedChatLayout from "@/components/chats/UnifiedChatLayout";

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const chatId = searchParams.get("chatId") || undefined;

  return <UnifiedChatLayout activeChatId={chatId} />;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center font-black text-primary animate-pulse uppercase tracking-[0.25em]">
        Loading Workspace...
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  );
}