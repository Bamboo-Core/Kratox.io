
import PageHeader from "@/components/layout/page-header";
import AiSuggestionsClientPage from "./client-page"; // Import the client component

export default function AiSuggestionsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="AI Rule Suggestions" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <AiSuggestionsClientPage />
      </main>
    </div>
  );
}
