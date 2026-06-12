"use client";

import { useParams } from "next/navigation";
import UnifiedChatLayout from "@/components/chats/UnifiedChatLayout";

export default function ChatDetailPage() {
  const { id } = useParams();
  const chatId = String(id);

  return <UnifiedChatLayout activeChatId={chatId} />;
}