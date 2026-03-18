import Link from "next/link";
import { IntakeForm } from "@/components/intake-form";

export default function NewIntakePage() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to intakes
        </Link>
      </div>
      <IntakeForm />
    </div>
  );
}
