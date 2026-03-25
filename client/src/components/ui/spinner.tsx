import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn(
        "size-4 animate-spin text-cyan-300/90 drop-shadow-[0_0_8px_rgba(34,211,238,0.25)]",
        className
      )}
      {...props}
    />
  );
}

export { Spinner };