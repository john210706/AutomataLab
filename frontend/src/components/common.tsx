import { AlertCircle } from "lucide-react";
import type { ApiError } from "../types";

export function ErrorNotice({ error }: { error: ApiError | null }) {
  if (!error) return null;
  return (
    <div className="error-notice" role="alert">
      <AlertCircle size={17} />
      <div>
        <b>
          {error.field === "left"
            ? "Expression A: "
            : error.field === "right"
              ? "Expression B: "
              : ""}
          {error.message}
        </b>
        {error.position !== undefined && error.position !== null && (
          <span>Character {error.position + 1}</span>
        )}
        {error.details?.map((item) => (
          <span key={item.field}>
            {item.field}: {item.message}
          </span>
        ))}
      </div>
    </div>
  );
}
