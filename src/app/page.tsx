import { redirect } from "next/navigation";

// The public Legal Q&A page is now the landing page.
// The lawyer/product marketing page lives at /lawyers.
export default function Home() {
  redirect("/ask");
}
