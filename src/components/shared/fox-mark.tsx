import { cn } from "@/lib/utils";

interface FoxMarkProps {
  className?: string;
  title?: string;
}

export function FoxMark({ className, title = "Timely fox mark" }: Readonly<FoxMarkProps>) {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5", className)}
      role="img"
      aria-label={title}
    >
      <path d="M11 4L7.2 2.8L5.3 7.4C3.4 9 3.1 13.4 5.1 15.9C6.8 18.1 9 19.3 11 19.7C13 19.3 15.2 18.1 16.9 15.9C18.9 13.4 18.6 9 16.7 7.4L14.8 2.8L11 4ZM8.5 10.9C8.9 10.3 10 10 11 10C12 10 13.1 10.3 13.5 10.9C12.7 11.8 11.9 12.3 11 12.4C10.1 12.3 9.3 11.8 8.5 10.9ZM7.4 13.3C8.4 14.7 9.6 15.4 11 15.5C12.4 15.4 13.6 14.7 14.6 13.3C13.5 16.5 12.3 17.8 11 18.1C9.7 17.8 8.5 16.5 7.4 13.3Z" />
    </svg>
  );
}
