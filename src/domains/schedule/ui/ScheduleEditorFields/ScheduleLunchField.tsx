import Coffee from "lucide-react/dist/esm/icons/coffee.js";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/Input/Input";
import { Label } from "@/shared/ui/Label/Label";

export interface ScheduleLunchFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ScheduleLunchField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  className,
}: Readonly<ScheduleLunchFieldProps>) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label htmlFor={id} className="flex items-center gap-1.5">
        <Coffee className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span>{label}</span>
      </Label>
      <Input
        id={id}
        type="number"
        step="5"
        min="0"
        max="180"
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
