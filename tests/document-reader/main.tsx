import { useState } from "react";
import { createRoot } from "react-dom/client";
import { DocumentPrefillSandbox } from "../../src/components/DocumentPrefillSandbox";
import { mergeReviewedDocumentFields } from "../../src/lib/document-prefill-review";
import type { Answers } from "../../src/lib/engine";
import "../../src/styles.css";

function ReaderTest() {
  const [answers, setAnswers] = useState<Answers>({ partita_iva: "00000000000" });
  return (
    <main className="mx-auto max-w-4xl p-4">
      <DocumentPrefillSandbox
        mode="local"
        answers={answers}
        onApply={(kind, proposals, pages, ownership) =>
          setAnswers(
            (current) =>
              mergeReviewedDocumentFields(current, kind, proposals, pages, ownership).answers,
          )
        }
      />
      <output className="block break-all" id="reader-values">
        {JSON.stringify(answers)}
      </output>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<ReaderTest />);
