import type { Metadata } from "next";
import StoriesClient from "./stories-client";

export const metadata: Metadata = {
  title: "Success Stories — పెళ్లయిన జంటలు",
  description:
    "మన వివాహ ద్వారా కలిసిన జంటలు — real success stories. మీకు కూడా ఇలాంటి సంబంధం కావాలంటే ₹99 సంబంధం, మొదటి 3 FREE.",
  alternates: { canonical: "https://manavivaha.in/stories" },
};

export default function StoriesPage() {
  return <StoriesClient />;
}
