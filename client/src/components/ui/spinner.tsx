import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn("size-5 animate-spin text-cyan-300", className)}
      {...props}
    />
  );
}

export { Spinner };