"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Home from "../page";

// Pre-fills the join form when visiting /join?code=ABC123
function JoinWithCode() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  if (!code) return <Home />;

  // Redirect to home with join flow pre-selected
  if (typeof window !== "undefined") {
    sessionStorage.setItem("prefill_code", code);
    window.location.href = `/?join=${code}`;
  }
  return null;
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinWithCode />
    </Suspense>
  );
}
