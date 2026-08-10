import { redirect } from "next/navigation";

/*
 * HomePage
 * PRD v1 has no landing page — send everyone to the app shell.
 */
export default function HomePage() {
  redirect("/dashboard");
}