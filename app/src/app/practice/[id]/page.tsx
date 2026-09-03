"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp } from "@/store/useApp";
import { Briefing } from "@/components/practice/Briefing";
import { Chat } from "@/components/practice/Chat";
import { Debrief } from "@/components/practice/Debrief";

export default function PracticePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const session = useApp((s) => s.sessions.find((x) => x.id === id));
  const hydrated = useApp((s) => s.hydrated);

  useEffect(() => {
    if (hydrated && !session) router.replace("/");
  }, [hydrated, session, router]);

  if (!session) return null;
  if (session.status === "briefing") return <Briefing session={session} />;
  if (session.status === "active") return <Chat session={session} />;
  return <Debrief session={session} />;
}
